import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiConfigService } from '../../../core/services/api-config.service';
import { CategoryOfflineStorageService } from './category-offline-storage.service';
import { CategoryServiceWorkerRegistrationService } from './category-sw-registration.service';
import { 
  Category, 
  CategoryListParams 
} from '../models/category.models';
import {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryListResponse,
  CategoryDetailResponse,
  CategoryValidationResponse,
  CategoryDeletionValidationResponse,
  CategoryDeletionRequest,
  CategoryDeletionResponse,
  BulkCategoryDeletionRequest,
  BulkCategoryDeletionResponse,
  UndoCategoryDeletionRequest,
  UndoCategoryDeletionResponse,
  CategoryDeletionAuditEntry
} from '../models/category-dto.models';
import { ApiError, ErrorCodes } from '../../../data-access/models/auth.models';

/**
 * HTTP service for category CRUD operations with establishment context
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryHttpService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfigService);
  private offlineStorage = inject(CategoryOfflineStorageService);
  private swRegistration = inject(CategoryServiceWorkerRegistrationService);



  /**
   * Gets all categories for a specific establishment
   */
  getCategories(estabelecimentoId: number, params?: CategoryListParams): Observable<CategoryListResponse> {
    this.validateEstablishmentId(estabelecimentoId);
    
    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'list', { 
      estabelecimentoId: estabelecimentoId.toString() 
    });
    const httpParams = this.buildHttpParams(params);

    return this.http.get<CategoryListResponse>(url, { params: httpParams }).pipe(
      tap(response => {
        // Cache categories for offline use
        this.offlineStorage.cacheCategories(estabelecimentoId, response.categorias);
        // Also cache in service worker
        this.swRegistration.cacheCategoryData(estabelecimentoId, response.categorias);
      }),
      catchError(error => {
        // If online request fails and we're offline, try cached data
        if (!navigator.onLine) {
          const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
          if (cachedCategories.length > 0) {
            const response: CategoryListResponse = {
              categorias: cachedCategories,
              total: cachedCategories.length,
              pagina: params?.page || 1,
              totalPaginas: Math.ceil(cachedCategories.length / (params?.limit || 10))
            };
            return of(response);
          }
        }
        return this.handleError(error, 'Erro ao carregar categorias');
      })
    );
  }

  /**
   * Gets a specific category by ID
   */
  getCategoryById(estabelecimentoId: number, categoryId: number): Observable<Category> {
    this.validateEstablishmentId(estabelecimentoId);
    this.validateCategoryId(categoryId);

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'detail', {
      estabelecimentoId: estabelecimentoId.toString(),
      id: categoryId.toString()
    });

    return this.http.get<Category>(url).pipe(
      catchError(error => this.handleError(error, `Erro ao carregar categoria ${categoryId}`))
    );
  }

  /**
   * Gets detailed category information including related products
   */
  getCategoryDetail(estabelecimentoId: number, categoryId: number): Observable<CategoryDetailResponse> {
    this.validateEstablishmentId(estabelecimentoId);
    this.validateCategoryId(categoryId);

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'detail', {
      estabelecimentoId: estabelecimentoId.toString(),
      id: categoryId.toString()
    });

    // Add query parameter to get detailed response with products
    const params = new HttpParams().set('includeProducts', 'true');

    return this.http.get<CategoryDetailResponse>(url, { params }).pipe(
      catchError(error => this.handleError(error, `Erro ao carregar detalhes da categoria ${categoryId}`))
    );
  }

  /**
   * Creates a new category
   */
  createCategory(estabelecimentoId: number, request: CreateCategoryRequest): Observable<Category> {
    this.validateEstablishmentId(estabelecimentoId);
    this.validateCreateRequest(request);

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'create', { 
      estabelecimentoId: estabelecimentoId.toString() 
    });
    
    // Sanitize input data
    const sanitizedRequest = this.sanitizeCreateRequest(request);

    return this.http.post<Category>(url, sanitizedRequest).pipe(
      tap(category => {
        // Update cache with new category
        const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
        cachedCategories.push(category);
        this.offlineStorage.cacheCategories(estabelecimentoId, cachedCategories);
        this.swRegistration.cacheCategoryData(estabelecimentoId, cachedCategories);
      }),
      catchError(error => {
        // If offline, queue the operation
        if (!navigator.onLine) {
          this.offlineStorage.addOfflineOperation({
            type: 'create',
            estabelecimentoId,
            data: sanitizedRequest
          });
          // Register for background sync
          this.swRegistration.registerBackgroundSync('category-sync');
          
          // Return a temporary category for optimistic UI
          const tempCategory: Category = {
            id: -Date.now(),
            nome: sanitizedRequest.nome,
            descricao: sanitizedRequest.descricao,
            estabelecimentoId,
            ativo: true,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
            produtosCount: 0
          };
          return of(tempCategory);
        }
        return this.handleError(error, 'Erro ao criar categoria');
      })
    );
  }

  /**
   * Updates an existing category
   */
  updateCategory(estabelecimentoId: number, categoryId: number, request: UpdateCategoryRequest): Observable<Category> {
    this.validateEstablishmentId(estabelecimentoId);
    this.validateCategoryId(categoryId);
    this.validateUpdateRequest(request);

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'update', {
      estabelecimentoId: estabelecimentoId.toString(),
      id: categoryId.toString()
    });

    // Sanitize input data
    const sanitizedRequest = this.sanitizeUpdateRequest(request);

    return this.http.put<Category>(url, sanitizedRequest).pipe(
      catchError(error => this.handleError(error, `Erro ao atualizar categoria ${categoryId}`))
    );
  }

  /**
   * Deletes a category
   */
  deleteCategory(estabelecimentoId: number, categoryId: number): Observable<void> {
    this.validateEstablishmentId(estabelecimentoId);
    this.validateCategoryId(categoryId);

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'delete', {
      estabelecimentoId: estabelecimentoId.toString(),
      id: categoryId.toString()
    });

    return this.http.delete<void>(url).pipe(
      catchError(error => this.handleError(error, `Erro ao excluir categoria ${categoryId}`))
    );
  }

  /**
   * Deletes a category with enhanced options (hard/soft delete, product migration)
   */
  deleteCategoryEnhanced(estabelecimentoId: number, request: CategoryDeletionRequest): Observable<CategoryDeletionResponse> {
    this.validateEstablishmentId(estabelecimentoId);
    this.validateCategoryId(request.categoryId);

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'deleteEnhanced', {
      estabelecimentoId: estabelecimentoId.toString(),
      id: request.categoryId.toString()
    });

    return this.http.post<CategoryDeletionResponse>(url, request).pipe(
      catchError(error => this.handleError(error, `Erro ao excluir categoria ${request.categoryId}`))
    );
  }

  /**
   * Deletes multiple categories in bulk
   */
  deleteBulkCategories(estabelecimentoId: number, request: BulkCategoryDeletionRequest): Observable<BulkCategoryDeletionResponse> {
    this.validateEstablishmentId(estabelecimentoId);
    
    if (!request.categoryIds || request.categoryIds.length === 0) {
      return throwError(() => this.createValidationError('Lista de categorias é obrigatória'));
    }

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'bulkDelete', {
      estabelecimentoId: estabelecimentoId.toString()
    });

    return this.http.post<BulkCategoryDeletionResponse>(url, request).pipe(
      catchError(error => this.handleError(error, 'Erro ao excluir categorias em lote'))
    );
  }

  /**
   * Undoes a category deletion
   */
  undoCategoryDeletion(request: UndoCategoryDeletionRequest): Observable<UndoCategoryDeletionResponse> {
    if (!request.undoToken) {
      return throwError(() => this.createValidationError('Token de desfazer é obrigatório'));
    }

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'undo');

    return this.http.post<UndoCategoryDeletionResponse>(url, request).pipe(
      catchError(error => this.handleError(error, 'Erro ao desfazer exclusão da categoria'))
    );
  }

  /**
   * Gets deletion audit trail for an establishment
   */
  getCategoryDeletionAuditTrail(estabelecimentoId: number, limit: number = 50): Observable<CategoryDeletionAuditEntry[]> {
    this.validateEstablishmentId(estabelecimentoId);

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'auditTrail', {
      estabelecimentoId: estabelecimentoId.toString()
    });

    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<CategoryDeletionAuditEntry[]>(url, { params }).pipe(
      catchError(error => this.handleError(error, 'Erro ao carregar histórico de exclusões'))
    );
  }

  /**
   * Validates if a category name is unique within the establishment
   */
  validateCategoryName(estabelecimentoId: number, nome: string, excludeId?: number): Observable<boolean> {
    this.validateEstablishmentId(estabelecimentoId);
    
    if (!nome || nome.trim().length === 0) {
      return throwError(() => this.createValidationError('Nome da categoria é obrigatório'));
    }

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'validate', { 
      estabelecimentoId: estabelecimentoId.toString() 
    });
    
    let params = new HttpParams().set('nome', nome.trim());
    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }

    return this.http.get<CategoryValidationResponse>(url, { params }).pipe(
      map(response => response.valid),
      catchError(error => this.handleError(error, 'Erro ao validar nome da categoria'))
    );
  }

  /**
   * Validates if a category can be deleted (checks for product dependencies)
   */
  validateCategoryDeletion(estabelecimentoId: number, categoryId: number): Observable<CategoryDeletionValidationResponse> {
    this.validateEstablishmentId(estabelecimentoId);
    this.validateCategoryId(categoryId);

    const url = this.apiConfig.getConfiguredEndpoint('categoria', 'deletionValidation', {
      estabelecimentoId: estabelecimentoId.toString(),
      id: categoryId.toString()
    });

    return this.http.get<CategoryDeletionValidationResponse>(url).pipe(
      catchError(error => this.handleError(error, `Erro ao validar exclusão da categoria ${categoryId}`))
    );
  }

  /**
   * Searches categories by name within an establishment
   */
  searchCategories(estabelecimentoId: number, query: string, limit: number = 10): Observable<Category[]> {
    this.validateEstablishmentId(estabelecimentoId);
    
    if (!query || query.trim().length === 0) {
      return throwError(() => this.createValidationError('Termo de busca é obrigatório'));
    }

    const params: CategoryListParams = {
      search: query.trim(),
      limit,
      page: 1
    };

    return this.getCategories(estabelecimentoId, params).pipe(
      map(response => response.categorias)
    );
  }

  // Private helper methods

  /**
   * Builds HTTP query parameters from CategoryListParams
   */
  private buildHttpParams(params?: CategoryListParams): HttpParams {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.limit !== undefined) {
        httpParams = httpParams.set('limit', params.limit.toString());
      }
      if (params.search) {
        httpParams = httpParams.set('search', params.search.trim());
      }
      if (params.ativo !== undefined) {
        httpParams = httpParams.set('ativo', params.ativo.toString());
      }
      if (params.sortBy) {
        httpParams = httpParams.set('sortBy', params.sortBy);
      }
      if (params.sortOrder) {
        httpParams = httpParams.set('sortOrder', params.sortOrder);
      }
    }

    return httpParams;
  }

  /**
   * Validates establishment ID
   */
  private validateEstablishmentId(estabelecimentoId: number): void {
    if (!estabelecimentoId || estabelecimentoId <= 0) {
      throw this.createValidationError('ID do estabelecimento é obrigatório e deve ser maior que zero');
    }
  }

  /**
   * Validates category ID
   */
  private validateCategoryId(categoryId: number): void {
    if (!categoryId || categoryId <= 0) {
      throw this.createValidationError('ID da categoria é obrigatório e deve ser maior que zero');
    }
  }

  /**
   * Validates create category request
   */
  private validateCreateRequest(request: CreateCategoryRequest): void {
    if (!request) {
      throw this.createValidationError('Dados da categoria são obrigatórios');
    }
    if (!request.nome || request.nome.trim().length === 0) {
      throw this.createValidationError('Nome da categoria é obrigatório');
    }
    if (request.nome.trim().length < 2) {
      throw this.createValidationError('Nome da categoria deve ter pelo menos 2 caracteres');
    }
    if (request.nome.trim().length > 100) {
      throw this.createValidationError('Nome da categoria deve ter no máximo 100 caracteres');
    }
    if (request.descricao && request.descricao.length > 500) {
      throw this.createValidationError('Descrição da categoria deve ter no máximo 500 caracteres');
    }
  }

  /**
   * Validates update category request
   */
  private validateUpdateRequest(request: UpdateCategoryRequest): void {
    if (!request) {
      throw this.createValidationError('Dados da categoria são obrigatórios');
    }
    if (!request.nome || request.nome.trim().length === 0) {
      throw this.createValidationError('Nome da categoria é obrigatório');
    }
    if (request.nome.trim().length < 2) {
      throw this.createValidationError('Nome da categoria deve ter pelo menos 2 caracteres');
    }
    if (request.nome.trim().length > 100) {
      throw this.createValidationError('Nome da categoria deve ter no máximo 100 caracteres');
    }
    if (request.descricao && request.descricao.length > 500) {
      throw this.createValidationError('Descrição da categoria deve ter no máximo 500 caracteres');
    }
    if (typeof request.ativo !== 'boolean') {
      throw this.createValidationError('Status ativo da categoria deve ser verdadeiro ou falso');
    }
  }

  /**
   * Sanitizes create request input to prevent XSS
   */
  private sanitizeCreateRequest(request: CreateCategoryRequest): CreateCategoryRequest {
    return {
      nome: this.sanitizeString(request.nome),
      descricao: this.sanitizeString(request.descricao || '')
    };
  }

  /**
   * Sanitizes update request input to prevent XSS
   */
  private sanitizeUpdateRequest(request: UpdateCategoryRequest): UpdateCategoryRequest {
    return {
      nome: this.sanitizeString(request.nome),
      descricao: this.sanitizeString(request.descricao || ''),
      ativo: request.ativo
    };
  }

  /**
   * Sanitizes string input to prevent XSS attacks
   */
  private sanitizeString(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  /**
   * Creates a validation error
   */
  private createValidationError(message: string): ApiError {
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      details: null,
      timestamp: new Date()
    };
  }

  /**
   * Handles HTTP errors and maps them to ApiError
   */
  private handleError(error: any, defaultMessage: string): Observable<never> {
    let apiError: ApiError;

    // If it's already an ApiError (from interceptor), use it
    if (error.code && error.message && error.timestamp) {
      apiError = error as ApiError;
    } else {
      // Map HTTP errors to ApiError
      let code: ErrorCodes;
      let message: string;

      switch (error.status) {
        case 400:
          code = ErrorCodes.VALIDATION_ERROR;
          message = error.error?.message || 'Dados inválidos';
          break;
        case 401:
          code = ErrorCodes.UNAUTHORIZED;
          message = 'Não autorizado. Faça login novamente';
          break;
        case 403:
          code = ErrorCodes.UNAUTHORIZED;
          message = 'Acesso negado à categoria';
          break;
        case 404:
          code = ErrorCodes.VALIDATION_ERROR;
          message = 'Categoria não encontrada';
          break;
        case 409:
          code = ErrorCodes.VALIDATION_ERROR;
          message = error.error?.message || 'Conflito: categoria já existe';
          break;
        case 422:
          code = ErrorCodes.VALIDATION_ERROR;
          message = error.error?.message || 'Erro de validação';
          break;
        case 0:
          code = ErrorCodes.NETWORK_ERROR;
          message = 'Erro de conexão. Verifique sua internet';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = ErrorCodes.SERVER_ERROR;
          message = 'Erro interno do servidor. Tente novamente';
          break;
        default:
          code = ErrorCodes.SERVER_ERROR;
          message = defaultMessage;
      }

      apiError = {
        code,
        message,
        details: error.error || error,
        timestamp: new Date()
      };
    }

    console.error('CategoryHttpService Error:', apiError);
    return throwError(() => apiError);
  }
}
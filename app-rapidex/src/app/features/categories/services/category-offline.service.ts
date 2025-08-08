import { Injectable } from '@angular/core';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, switchMap, map } from 'rxjs/operators';
import { CategoryHttpService } from './category-http.service';
import { CategoryOfflineStorageService } from './category-offline-storage.service';
import { CategoryOfflineSyncService } from './category-offline-sync.service';
import { Category } from '../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest, CategoryListResponse } from '../models/category-dto.models';

@Injectable({
  providedIn: 'root'
})
export class CategoryOfflineService {
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  constructor(
    private categoryHttpService: CategoryHttpService,
    private offlineStorage: CategoryOfflineStorageService,
    private syncService: CategoryOfflineSyncService
  ) {}

  /**
   * Get categories with offline support
   */
  getCategories(estabelecimentoId: number, page?: number, limit?: number): Observable<CategoryListResponse> {
    if (this.syncService.isOnline()) {
      // Online: fetch from server and cache
      return this.categoryHttpService.getCategories(estabelecimentoId, { page, limit }).pipe(
        tap(response => {
          this.offlineStorage.cacheCategories(estabelecimentoId, response.categorias);
          this.categoriesSubject.next(response.categorias);
        }),
        catchError(error => {
          // If online request fails, fallback to cached data
          const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
          if (cachedCategories.length > 0) {
            const response: CategoryListResponse = {
              categorias: cachedCategories,
              total: cachedCategories.length,
              pagina: page || 1,
              totalPaginas: Math.ceil(cachedCategories.length / (limit || 10))
            };
            this.categoriesSubject.next(cachedCategories);
            return of(response);
          }
          return throwError(() => error);
        })
      );
    } else {
      // Offline: return cached data
      const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
      const response: CategoryListResponse = {
        categorias: cachedCategories,
        total: cachedCategories.length,
        pagina: page || 1,
        totalPaginas: Math.ceil(cachedCategories.length / (limit || 10))
      };
      this.categoriesSubject.next(cachedCategories);
      return of(response);
    }
  }

  /**
   * Get category by ID with offline support
   */
  getCategoryById(estabelecimentoId: number, categoryId: number): Observable<Category> {
    if (this.syncService.isOnline()) {
      // Online: fetch from server
      return this.categoryHttpService.getCategoryById(estabelecimentoId, categoryId).pipe(
        catchError(error => {
          // If online request fails, try cached data
          const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
          const cachedCategory = cachedCategories.find(c => c.id === categoryId);
          if (cachedCategory) {
            return of(cachedCategory);
          }
          return throwError(() => error);
        })
      );
    } else {
      // Offline: return from cache
      const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
      const cachedCategory = cachedCategories.find(c => c.id === categoryId);
      if (cachedCategory) {
        return of(cachedCategory);
      }
      return throwError(() => new Error('Category not found in offline cache'));
    }
  }

  /**
   * Create category with offline support
   */
  createCategory(estabelecimentoId: number, request: CreateCategoryRequest): Observable<Category> {
    if (this.syncService.isOnline()) {
      // Online: create on server
      return this.categoryHttpService.createCategory(estabelecimentoId, request).pipe(
        tap(category => {
          // Update cache with new category
          const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
          cachedCategories.push(category);
          this.offlineStorage.cacheCategories(estabelecimentoId, cachedCategories);
          this.categoriesSubject.next(cachedCategories);
        }),
        catchError(error => {
          // If online request fails, queue for offline sync
          this.queueOfflineOperation(estabelecimentoId, 'create', undefined, request);
          return throwError(() => error);
        })
      );
    } else {
      // Offline: queue operation and apply optimistically
      const operation = {
        type: 'create' as const,
        estabelecimentoId,
        data: request
      };
      
      this.offlineStorage.addOfflineOperation(operation);
      this.offlineStorage.applyOfflineOperation({
        ...operation,
        id: 'temp',
        timestamp: Date.now(),
        retryCount: 0
      });

      // Create temporary category for immediate feedback
      const tempCategory: Category = {
        id: -Date.now(), // Temporary negative ID
        nome: request.nome,
        descricao: request.descricao,
        estabelecimentoId,
        ativo: true,
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
        produtosCount: 0
      };

      // Update local state
      const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
      this.categoriesSubject.next(cachedCategories);

      return of(tempCategory);
    }
  }

  /**
   * Update category with offline support
   */
  updateCategory(estabelecimentoId: number, categoryId: number, request: UpdateCategoryRequest): Observable<Category> {
    if (this.syncService.isOnline()) {
      // Online: update on server
      return this.categoryHttpService.updateCategory(estabelecimentoId, categoryId, request).pipe(
        tap(category => {
          // Update cache
          const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
          const index = cachedCategories.findIndex(c => c.id === categoryId);
          if (index !== -1) {
            cachedCategories[index] = category;
            this.offlineStorage.cacheCategories(estabelecimentoId, cachedCategories);
            this.categoriesSubject.next(cachedCategories);
          }
        }),
        catchError(error => {
          // If online request fails, queue for offline sync
          this.queueOfflineOperation(estabelecimentoId, 'update', categoryId, request);
          return throwError(() => error);
        })
      );
    } else {
      // Offline: queue operation and apply optimistically
      const operation = {
        type: 'update' as const,
        categoryId,
        estabelecimentoId,
        data: request
      };
      
      this.offlineStorage.addOfflineOperation(operation);
      this.offlineStorage.applyOfflineOperation({
        ...operation,
        id: 'temp',
        timestamp: Date.now(),
        retryCount: 0
      });

      // Update local state
      const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
      const updatedCategory = cachedCategories.find(c => c.id === categoryId);
      this.categoriesSubject.next(cachedCategories);

      if (updatedCategory) {
        return of(updatedCategory);
      } else {
        return throwError(() => new Error('Category not found for update'));
      }
    }
  }

  /**
   * Delete category with offline support
   */
  deleteCategory(estabelecimentoId: number, categoryId: number): Observable<void> {
    if (this.syncService.isOnline()) {
      // Online: delete on server
      return this.categoryHttpService.deleteCategory(estabelecimentoId, categoryId).pipe(
        tap(() => {
          // Remove from cache
          const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
          const filteredCategories = cachedCategories.filter(c => c.id !== categoryId);
          this.offlineStorage.cacheCategories(estabelecimentoId, filteredCategories);
          this.categoriesSubject.next(filteredCategories);
        }),
        catchError(error => {
          // If online request fails, queue for offline sync
          this.queueOfflineOperation(estabelecimentoId, 'delete', categoryId);
          return throwError(() => error);
        })
      );
    } else {
      // Offline: queue operation and apply optimistically
      const operation = {
        type: 'delete' as const,
        categoryId,
        estabelecimentoId
      };
      
      this.offlineStorage.addOfflineOperation(operation);
      this.offlineStorage.applyOfflineOperation({
        ...operation,
        id: 'temp',
        timestamp: Date.now(),
        retryCount: 0
      });

      // Update local state
      const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
      this.categoriesSubject.next(cachedCategories);

      return of(void 0);
    }
  }

  /**
   * Search categories with offline support
   */
  searchCategories(estabelecimentoId: number, query: string): Observable<Category[]> {
    const searchInCategories = (categories: Category[]) => 
      categories.filter(category => 
        category.nome.toLowerCase().includes(query.toLowerCase()) ||
        category.descricao.toLowerCase().includes(query.toLowerCase())
      );

    if (this.syncService.isOnline()) {
      // Online: search on server if available, otherwise search in cache
      return this.categoryHttpService.searchCategories(estabelecimentoId, query).pipe(
        catchError(() => {
          // Fallback to local search
          const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
          return of(searchInCategories(cachedCategories));
        })
      );
    } else {
      // Offline: search in cached data
      const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
      return of(searchInCategories(cachedCategories));
    }
  }

  /**
   * Validate category name with offline support
   */
  validateCategoryName(estabelecimentoId: number, nome: string, excludeId?: number): Observable<boolean> {
    if (this.syncService.isOnline()) {
      // Online: validate on server
      return this.categoryHttpService.validateCategoryName(estabelecimentoId, nome, excludeId).pipe(
        catchError(() => {
          // Fallback to local validation
          return of(this.validateCategoryNameLocally(estabelecimentoId, nome, excludeId));
        })
      );
    } else {
      // Offline: validate locally
      return of(this.validateCategoryNameLocally(estabelecimentoId, nome, excludeId));
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): Observable<any> {
    return this.syncService.syncStatus$;
  }

  /**
   * Force sync for establishment
   */
  forceSyncEstablishment(estabelecimentoId: number): Observable<void> {
    return this.syncService.forceSyncEstablishment(estabelecimentoId);
  }

  /**
   * Check if there are pending operations
   */
  hasPendingOperations(estabelecimentoId: number): boolean {
    return this.offlineStorage.hasPendingOperations(estabelecimentoId);
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(estabelecimentoId: number): number {
    return this.offlineStorage.getLastSyncTime(estabelecimentoId);
  }

  /**
   * Clear offline data
   */
  clearOfflineData(estabelecimentoId: number): void {
    this.offlineStorage.clearOfflineData(estabelecimentoId);
    this.syncService.clearSyncData(estabelecimentoId);
  }

  /**
   * Queue offline operation
   */
  private queueOfflineOperation(
    estabelecimentoId: number, 
    type: 'create' | 'update' | 'delete', 
    categoryId?: number, 
    data?: CreateCategoryRequest | UpdateCategoryRequest
  ): void {
    this.offlineStorage.addOfflineOperation({
      type,
      categoryId,
      estabelecimentoId,
      data
    });
  }

  /**
   * Validate category name locally
   */
  private validateCategoryNameLocally(estabelecimentoId: number, nome: string, excludeId?: number): boolean {
    const cachedCategories = this.offlineStorage.getCachedCategories(estabelecimentoId);
    const existingCategory = cachedCategories.find(c => 
      c.nome.toLowerCase() === nome.toLowerCase() && c.id !== excludeId
    );
    return !existingCategory; // Return true if name is available
  }
}
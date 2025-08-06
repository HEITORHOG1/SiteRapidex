import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, EMPTY, of } from 'rxjs';
import { map, catchError, tap, finalize, switchMap } from 'rxjs/operators';
import { CategoryHttpService } from './category-http.service';
import { CategoryCacheService } from './category-cache.service';
import { 
  Category, 
  CategoryState, 
  CategoryFilters, 
  PaginationState,
  CategoryListParams 
} from '../models/category.models';
import {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryListResponse
} from '../models/category-dto.models';

/**
 * State management service for categories with RxJS
 * Provides reactive state management with optimistic updates
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryStateService {
  private categoryHttpService = inject(CategoryHttpService);
  private categoryCache = inject(CategoryCacheService);

  // Private state subjects
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  private selectedCategorySubject = new BehaviorSubject<Category | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private filtersSubject = new BehaviorSubject<CategoryFilters>({
    search: '',
    ativo: null,
    sortBy: 'nome',
    sortOrder: 'asc'
  });
  private paginationSubject = new BehaviorSubject<PaginationState>({
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  });

  // Public observables
  readonly categories$ = this.categoriesSubject.asObservable();
  readonly selectedCategory$ = this.selectedCategorySubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly filters$ = this.filtersSubject.asObservable();
  readonly pagination$ = this.paginationSubject.asObservable();

  // Computed observables
  readonly state$: Observable<CategoryState> = combineLatest([
    this.categories$,
    this.selectedCategory$,
    this.loading$,
    this.error$,
    this.filters$,
    this.pagination$
  ]).pipe(
    map(([categories, selectedCategory, loading, error, filters, pagination]) => ({
      categories,
      selectedCategory,
      loading,
      error,
      filters,
      pagination
    }))
  );

  readonly hasCategories$ = this.categories$.pipe(
    map(categories => categories.length > 0)
  );

  readonly filteredCategories$ = combineLatest([
    this.categories$,
    this.filters$
  ]).pipe(
    map(([categories, filters]) => this.applyFilters(categories, filters))
  );

  // Current establishment ID for context
  private currentEstablishmentId: number | null = null;

  /**
   * Sets the current establishment context
   */
  setEstablishmentContext(estabelecimentoId: number): void {
    if (this.currentEstablishmentId !== estabelecimentoId) {
      // Invalidate cache for previous establishment
      if (this.currentEstablishmentId) {
        this.categoryCache.invalidateCategoryCache(this.currentEstablishmentId);
      }
      
      this.currentEstablishmentId = estabelecimentoId;
      this.clearState();
    }
  }

  /**
   * Gets the current establishment ID
   */
  getCurrentEstablishmentId(): number | null {
    return this.currentEstablishmentId;
  }

  /**
   * Loads categories for the current establishment
   */
  loadCategories(estabelecimentoId?: number, params?: CategoryListParams): Observable<CategoryListResponse> {
    const targetEstablishmentId = estabelecimentoId || this.currentEstablishmentId;
    
    if (!targetEstablishmentId) {
      const error = 'Estabelecimento não selecionado';
      this.setError(error);
      return EMPTY;
    }

    this.setLoading(true);
    this.clearError();

    // Build request parameters from current filters and pagination
    const currentFilters = this.filtersSubject.value;
    const currentPagination = this.paginationSubject.value;
    
    const requestParams: CategoryListParams = {
      page: currentPagination.currentPage,
      limit: currentPagination.pageSize,
      search: currentFilters.search || undefined,
      ativo: currentFilters.ativo ?? undefined,
      sortBy: currentFilters.sortBy,
      sortOrder: currentFilters.sortOrder,
      ...params // Override with provided params
    };

    // Check cache first
    const cachedCategories = this.categoryCache.getCategoryList(targetEstablishmentId, requestParams);
    if (cachedCategories && !params) { // Only use cache if no specific params provided
      this.setCategories(cachedCategories);
      this.setLoading(false);
      return of({ 
        categorias: cachedCategories, 
        total: cachedCategories.length, 
        pagina: 1, 
        totalPaginas: 1 
      });
    }

    return this.categoryHttpService.getCategories(targetEstablishmentId, requestParams).pipe(
      tap(response => {
        this.setCategories(response.categorias);
        this.updatePagination({
          currentPage: response.pagina,
          totalItems: response.total,
          totalPages: response.totalPaginas,
          pageSize: this.paginationSubject.value.pageSize
        });
        
        // Cache the response with intelligent warming
        this.categoryCache.setCategoryList(targetEstablishmentId, response.categorias, requestParams);
        this.categoryCache.intelligentWarmup(targetEstablishmentId, response.categorias);
      }),
      catchError(error => {
        this.setError(this.extractErrorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Reloads categories with current parameters
   */
  reloadCategories(): Observable<CategoryListResponse> {
    return this.loadCategories();
  }

  /**
   * Selects a category by ID
   */
  selectCategory(categoryId: number): Observable<Category> {
    if (!this.currentEstablishmentId) {
      const error = 'Estabelecimento não selecionado';
      this.setError(error);
      return EMPTY;
    }

    // Check if category is already in local state
    const existingCategory = this.categoriesSubject.value.find(c => c.id === categoryId);
    if (existingCategory) {
      this.selectedCategorySubject.next(existingCategory);
      return of(existingCategory);
    }

    // Check cache
    const cachedCategory = this.categoryCache.getCategory(this.currentEstablishmentId, categoryId);
    if (cachedCategory) {
      this.selectedCategorySubject.next(cachedCategory);
      this.updateCategoryInList(cachedCategory);
      return of(cachedCategory);
    }

    this.setLoading(true);
    this.clearError();

    return this.categoryHttpService.getCategoryById(this.currentEstablishmentId, categoryId).pipe(
      tap(category => {
        this.selectedCategorySubject.next(category);
        // Update category in list if it exists
        this.updateCategoryInList(category);
        // Cache the category
        if (this.currentEstablishmentId) {
          this.categoryCache.setCategory(this.currentEstablishmentId, category);
        }
      }),
      catchError(error => {
        this.setError(this.extractErrorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Creates a new category with optimistic update
   */
  createCategory(request: CreateCategoryRequest): Observable<Category> {
    if (!this.currentEstablishmentId) {
      const error = 'Estabelecimento não selecionado';
      this.setError(error);
      return EMPTY;
    }

    this.setLoading(true);
    this.clearError();

    // Create optimistic category
    const optimisticCategory: Category = {
      id: Date.now(), // Temporary ID
      nome: request.nome,
      descricao: request.descricao,
      estabelecimentoId: this.currentEstablishmentId,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
      produtosCount: 0
    };

    // Apply optimistic update
    this.addCategoryOptimistically(optimisticCategory);

    return this.categoryHttpService.createCategory(this.currentEstablishmentId, request).pipe(
      tap(createdCategory => {
        // Replace optimistic category with real one
        this.replaceCategoryInList(optimisticCategory.id, createdCategory);
        this.selectedCategorySubject.next(createdCategory);
        
        // Invalidate cache to ensure fresh data on next load
        if (this.currentEstablishmentId) {
          this.categoryCache.invalidateCategoryCache(this.currentEstablishmentId);
          // Cache the new category
          this.categoryCache.setCategory(this.currentEstablishmentId, createdCategory);
        }
      }),
      catchError(error => {
        // Revert optimistic update
        this.removeCategoryFromList(optimisticCategory.id);
        this.setError(this.extractErrorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Updates a category with optimistic update
   */
  updateCategory(categoryId: number, request: UpdateCategoryRequest): Observable<Category> {
    if (!this.currentEstablishmentId) {
      const error = 'Estabelecimento não selecionado';
      this.setError(error);
      return EMPTY;
    }

    const existingCategory = this.categoriesSubject.value.find(c => c.id === categoryId);
    if (!existingCategory) {
      const error = 'Categoria não encontrada';
      this.setError(error);
      return EMPTY;
    }

    this.setLoading(true);
    this.clearError();

    // Create optimistic update
    const optimisticCategory: Category = {
      ...existingCategory,
      nome: request.nome,
      descricao: request.descricao,
      ativo: request.ativo,
      dataAtualizacao: new Date()
    };

    // Apply optimistic update
    this.updateCategoryInList(optimisticCategory);

    return this.categoryHttpService.updateCategory(this.currentEstablishmentId, categoryId, request).pipe(
      tap(updatedCategory => {
        // Replace with server response
        this.updateCategoryInList(updatedCategory);
        if (this.selectedCategorySubject.value?.id === categoryId) {
          this.selectedCategorySubject.next(updatedCategory);
        }
        
        // Update cache
        if (this.currentEstablishmentId) {
          this.categoryCache.setCategory(this.currentEstablishmentId, updatedCategory);
          // Invalidate list caches as they might be stale
          this.categoryCache.invalidateByPattern(
            new RegExp(`establishment-${this.currentEstablishmentId}-categories-list`)
          );
        }
      }),
      catchError(error => {
        // Revert optimistic update
        this.updateCategoryInList(existingCategory);
        this.setError(this.extractErrorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Deletes a category with optimistic update
   */
  deleteCategory(categoryId: number): Observable<void> {
    if (!this.currentEstablishmentId) {
      const error = 'Estabelecimento não selecionado';
      this.setError(error);
      return EMPTY;
    }

    const existingCategory = this.categoriesSubject.value.find(c => c.id === categoryId);
    if (!existingCategory) {
      const error = 'Categoria não encontrada';
      this.setError(error);
      return EMPTY;
    }

    this.setLoading(true);
    this.clearError();

    // Apply optimistic update
    this.removeCategoryFromList(categoryId);
    if (this.selectedCategorySubject.value?.id === categoryId) {
      this.selectedCategorySubject.next(null);
    }

    return this.categoryHttpService.deleteCategory(this.currentEstablishmentId, categoryId).pipe(
      tap(() => {
        // Deletion confirmed, invalidate cache
        if (this.currentEstablishmentId) {
          this.categoryCache.invalidateCategory(this.currentEstablishmentId, categoryId);
        }
      }),
      catchError(error => {
        // Revert optimistic update
        this.addCategoryToList(existingCategory);
        this.setError(this.extractErrorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Updates filters and triggers reload
   */
  updateFilters(filters: Partial<CategoryFilters>): void {
    const currentFilters = this.filtersSubject.value;
    const newFilters = { ...currentFilters, ...filters };
    this.filtersSubject.next(newFilters);
    
    // Reset pagination when filters change
    this.updatePagination({ ...this.paginationSubject.value, currentPage: 1 });
    
    // Reload with new filters
    this.loadCategories();
  }

  /**
   * Updates pagination and triggers reload
   */
  updatePagination(pagination: Partial<PaginationState>): void {
    const currentPagination = this.paginationSubject.value;
    const newPagination = { ...currentPagination, ...pagination };
    this.paginationSubject.next(newPagination);
    
    // Reload with new pagination if page changed
    if (pagination.currentPage !== undefined) {
      this.loadCategories();
    }
  }

  /**
   * Searches categories with caching
   */
  searchCategories(query: string): Observable<Category[]> {
    if (!this.currentEstablishmentId) {
      return of([]);
    }

    // Check cache first for search results
    const cachedResults = this.categoryCache.getSearchResults(this.currentEstablishmentId, query);
    if (cachedResults) {
      return of(cachedResults);
    }

    return this.categoryHttpService.searchCategories(this.currentEstablishmentId, query).pipe(
      tap(results => {
        // Cache the search results
        if (this.currentEstablishmentId) {
          this.categoryCache.setSearchResults(this.currentEstablishmentId, query, results);
        }
      }),
      catchError(error => {
        this.setError(this.extractErrorMessage(error));
        return of([]);
      })
    );
  }

  /**
   * Clears all state
   */
  clearState(): void {
    this.categoriesSubject.next([]);
    this.selectedCategorySubject.next(null);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
    this.filtersSubject.next({
      search: '',
      ativo: null,
      sortBy: 'nome',
      sortOrder: 'asc'
    });
    this.paginationSubject.next({
      currentPage: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0
    });
  }

  /**
   * Clears selected category
   */
  clearSelectedCategory(): void {
    this.selectedCategorySubject.next(null);
  }

  /**
   * Clears error state
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Invalidates cache and reloads data
   */
  invalidateCache(): void {
    this.loadCategories();
  }

  // Private helper methods

  private setCategories(categories: Category[]): void {
    this.categoriesSubject.next(categories);
  }

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private setError(error: string): void {
    this.errorSubject.next(error);
  }

  private addCategoryOptimistically(category: Category): void {
    const currentCategories = this.categoriesSubject.value;
    this.categoriesSubject.next([category, ...currentCategories]);
  }

  private addCategoryToList(category: Category): void {
    const currentCategories = this.categoriesSubject.value;
    if (!currentCategories.find(c => c.id === category.id)) {
      this.categoriesSubject.next([...currentCategories, category]);
    }
  }

  private updateCategoryInList(category: Category): void {
    const currentCategories = this.categoriesSubject.value;
    const updatedCategories = currentCategories.map(c => 
      c.id === category.id ? category : c
    );
    this.categoriesSubject.next(updatedCategories);
  }

  private replaceCategoryInList(oldId: number, newCategory: Category): void {
    const currentCategories = this.categoriesSubject.value;
    const updatedCategories = currentCategories.map(c => 
      c.id === oldId ? newCategory : c
    );
    this.categoriesSubject.next(updatedCategories);
  }

  private removeCategoryFromList(categoryId: number): void {
    const currentCategories = this.categoriesSubject.value;
    const filteredCategories = currentCategories.filter(c => c.id !== categoryId);
    this.categoriesSubject.next(filteredCategories);
  }

  private applyFilters(categories: Category[], filters: CategoryFilters): Category[] {
    let filtered = [...categories];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(category => 
        category.nome.toLowerCase().includes(searchTerm) ||
        category.descricao.toLowerCase().includes(searchTerm)
      );
    }

    // Apply active filter
    if (filters.ativo !== null) {
      filtered = filtered.filter(category => category.ativo === filters.ativo);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'nome':
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
          break;
        case 'dataCriacao':
          aValue = new Date(a.dataCriacao).getTime();
          bValue = new Date(b.dataCriacao).getTime();
          break;
        case 'dataAtualizacao':
          aValue = new Date(a.dataAtualizacao).getTime();
          bValue = new Date(b.dataAtualizacao).getTime();
          break;
        default:
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  private extractErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Erro desconhecido';
  }
}
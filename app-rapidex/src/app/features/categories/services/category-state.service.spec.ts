import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CategoryStateService } from './category-state.service';
import { CategoryHttpService } from './category-http.service';
import { CategoryCacheService } from './category-cache.service';
import { 
  Category, 
  CategoryFilters, 
  PaginationState 
} from '../models/category.models';
import {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryListResponse
} from '../models/category-dto.models';

describe('CategoryStateService', () => {
  let service: CategoryStateService;
  let categoryHttpService: jasmine.SpyObj<CategoryHttpService>;

  const mockCategories: Category[] = [
    {
      id: 1,
      nome: 'Bebidas',
      descricao: 'Categoria de bebidas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-01'),
      dataAtualizacao: new Date('2024-01-01'),
      produtosCount: 5
    },
    {
      id: 2,
      nome: 'Comidas',
      descricao: 'Categoria de comidas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-02'),
      dataAtualizacao: new Date('2024-01-02'),
      produtosCount: 10
    }
  ];

  const mockCategoryListResponse: CategoryListResponse = {
    categorias: mockCategories,
    total: 2,
    pagina: 1,
    totalPaginas: 1
  };

  beforeEach(() => {
    const categoryHttpServiceSpy = jasmine.createSpyObj('CategoryHttpService', [
      'getCategories',
      'getCategoryById',
      'createCategory',
      'updateCategory',
      'deleteCategory',
      'searchCategories'
    ]);

    const categoryCacheSpy = jasmine.createSpyObj('CategoryCacheService', [
      'getCategoryList',
      'setCategoryList',
      'getCategory',
      'setCategory',
      'getSearchResults',
      'setSearchResults',
      'invalidateCategoryCache',
      'invalidateCategory',
      'invalidateByPattern',
      'intelligentWarmup'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CategoryStateService,
        { provide: CategoryHttpService, useValue: categoryHttpServiceSpy },
        { provide: CategoryCacheService, useValue: categoryCacheSpy }
      ]
    });

    service = TestBed.inject(CategoryStateService);
    categoryHttpService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should have empty initial state', (done) => {
      service.state$.subscribe(state => {
        expect(state.categories).toEqual([]);
        expect(state.selectedCategory).toBeNull();
        expect(state.loading).toBeFalse();
        expect(state.error).toBeNull();
        expect(state.filters.search).toBe('');
        expect(state.filters.ativo).toBeNull();
        expect(state.filters.sortBy).toBe('nome');
        expect(state.filters.sortOrder).toBe('asc');
        expect(state.pagination.currentPage).toBe(1);
        expect(state.pagination.pageSize).toBe(20);
        expect(state.pagination.totalItems).toBe(0);
        expect(state.pagination.totalPages).toBe(0);
        done();
      });
    });

    it('should have hasCategories$ as false initially', (done) => {
      service.hasCategories$.subscribe(hasCategories => {
        expect(hasCategories).toBeFalse();
        done();
      });
    });
  });

  describe('Establishment Context', () => {
    it('should set establishment context', () => {
      service.setEstablishmentContext(1);
      expect(service.getCurrentEstablishmentId()).toBe(1);
    });

    it('should clear state when establishment context changes', (done) => {
      // Set initial data
      service.setEstablishmentContext(1);
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        // Change establishment context
        service.setEstablishmentContext(2);
        
        service.state$.subscribe(state => {
          expect(state.categories).toEqual([]);
          expect(state.selectedCategory).toBeNull();
          done();
        });
      });
    });
  });

  describe('Load Categories', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
    });

    it('should load categories successfully', (done) => {
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));

      service.loadCategories().subscribe(() => {
        service.categories$.subscribe(categories => {
          expect(categories).toEqual(mockCategories);
          expect(categoryHttpService.getCategories).toHaveBeenCalledWith(1, jasmine.any(Object));
          done();
        });
      });
    });

    it('should update pagination after loading categories', (done) => {
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));

      service.loadCategories().subscribe(() => {
        service.pagination$.subscribe(pagination => {
          expect(pagination.currentPage).toBe(1);
          expect(pagination.totalItems).toBe(2);
          expect(pagination.totalPages).toBe(1);
          done();
        });
      });
    });

    it('should set loading state during load', (done) => {
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      let loadingStates: boolean[] = [];
      service.loading$.subscribe(loading => loadingStates.push(loading));

      service.loadCategories().subscribe(() => {
        expect(loadingStates).toContain(true);
        expect(loadingStates[loadingStates.length - 1]).toBeFalse();
        done();
      });
    });

    it('should handle load error', (done) => {
      const errorMessage = 'Erro ao carregar categorias';
      categoryHttpService.getCategories.and.returnValue(throwError(() => ({ message: errorMessage })));

      service.loadCategories().subscribe({
        complete: () => {
          service.error$.subscribe(error => {
            expect(error).toBe(errorMessage);
            done();
          });
        }
      });
    });

    it('should not load without establishment context', (done) => {
      service.setEstablishmentContext(0);
      service['currentEstablishmentId'] = null;

      service.loadCategories().subscribe({
        complete: () => {
          service.error$.subscribe(error => {
            expect(error).toBe('Estabelecimento não selecionado');
            expect(categoryHttpService.getCategories).not.toHaveBeenCalled();
            done();
          });
        }
      });
    });
  });

  describe('Select Category', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
    });

    it('should select category from existing list', (done) => {
      // First load categories
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        service.selectCategory(1).subscribe(category => {
          expect(category).toEqual(mockCategories[0]);
          
          service.selectedCategory$.subscribe(selected => {
            expect(selected).toEqual(mockCategories[0]);
            expect(categoryHttpService.getCategoryById).not.toHaveBeenCalled();
            done();
          });
        });
      });
    });

    it('should fetch category if not in list', (done) => {
      const categoryId = 3;
      const mockCategory = { ...mockCategories[0], id: categoryId };
      
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.selectCategory(categoryId).subscribe(category => {
        expect(category).toEqual(mockCategory);
        expect(categoryHttpService.getCategoryById).toHaveBeenCalledWith(1, categoryId);
        
        service.selectedCategory$.subscribe(selected => {
          expect(selected).toEqual(mockCategory);
          done();
        });
      });
    });

    it('should handle select category error', (done) => {
      const errorMessage = 'Categoria não encontrada';
      categoryHttpService.getCategoryById.and.returnValue(throwError(() => ({ message: errorMessage })));

      service.selectCategory(999).subscribe({
        complete: () => {
          service.error$.subscribe(error => {
            expect(error).toBe(errorMessage);
            done();
          });
        }
      });
    });
  });

  describe('Create Category', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
    });

    it('should create category with optimistic update', (done) => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Nova Categoria',
        descricao: 'Descrição da nova categoria'
      };
      
      const createdCategory: Category = {
        id: 3,
        nome: createRequest.nome,
        descricao: createRequest.descricao,
        estabelecimentoId: 1,
        ativo: true,
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
        produtosCount: 0
      };

      categoryHttpService.createCategory.and.returnValue(of(createdCategory));

      // Track category list changes
      let categoryUpdates: Category[][] = [];
      service.categories$.subscribe(categories => categoryUpdates.push([...categories]));

      service.createCategory(createRequest).subscribe(category => {
        expect(category).toEqual(createdCategory);
        expect(categoryHttpService.createCategory).toHaveBeenCalledWith(1, createRequest);
        
        // Should have optimistic update first, then real update
        expect(categoryUpdates.length).toBeGreaterThan(1);
        expect(categoryUpdates[categoryUpdates.length - 1]).toContain(createdCategory);
        done();
      });
    });

    it('should revert optimistic update on create error', (done) => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Nova Categoria',
        descricao: 'Descrição da nova categoria'
      };
      
      const errorMessage = 'Erro ao criar categoria';
      categoryHttpService.createCategory.and.returnValue(throwError(() => ({ message: errorMessage })));

      let categoryUpdates: Category[][] = [];
      service.categories$.subscribe(categories => categoryUpdates.push([...categories]));

      service.createCategory(createRequest).subscribe({
        complete: () => {
          // Should revert to empty list
          const finalCategories = categoryUpdates[categoryUpdates.length - 1];
          expect(finalCategories).toEqual([]);
          
          service.error$.subscribe(error => {
            expect(error).toBe(errorMessage);
            done();
          });
        }
      });
    });
  });

  describe('Update Category', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
    });

    it('should update category with optimistic update', (done) => {
      const updateRequest: UpdateCategoryRequest = {
        nome: 'Bebidas Atualizadas',
        descricao: 'Descrição atualizada',
        ativo: false
      };
      
      const updatedCategory: Category = {
        ...mockCategories[0],
        ...updateRequest,
        dataAtualizacao: new Date()
      };

      categoryHttpService.updateCategory.and.returnValue(of(updatedCategory));

      // First load categories
      service.loadCategories().subscribe(() => {
        service.updateCategory(1, updateRequest).subscribe(category => {
          expect(category).toEqual(updatedCategory);
          expect(categoryHttpService.updateCategory).toHaveBeenCalledWith(1, 1, updateRequest);
          
          service.categories$.subscribe(categories => {
            const updated = categories.find(c => c.id === 1);
            expect(updated).toEqual(updatedCategory);
            done();
          });
        });
      });
    });

    it('should revert optimistic update on update error', (done) => {
      const updateRequest: UpdateCategoryRequest = {
        nome: 'Bebidas Atualizadas',
        descricao: 'Descrição atualizada',
        ativo: false
      };
      
      const errorMessage = 'Erro ao atualizar categoria';
      categoryHttpService.updateCategory.and.returnValue(throwError(() => ({ message: errorMessage })));

      // First load categories
      service.loadCategories().subscribe(() => {
        service.updateCategory(1, updateRequest).subscribe({
          complete: () => {
            service.categories$.subscribe(categories => {
              const category = categories.find(c => c.id === 1);
              expect(category).toEqual(mockCategories[0]); // Should revert to original
              done();
            });
          }
        });
      });
    });

    it('should handle update of non-existent category', (done) => {
      const updateRequest: UpdateCategoryRequest = {
        nome: 'Categoria Inexistente',
        descricao: 'Descrição',
        ativo: true
      };

      service.updateCategory(999, updateRequest).subscribe({
        complete: () => {
          service.error$.subscribe(error => {
            expect(error).toBe('Categoria não encontrada');
            expect(categoryHttpService.updateCategory).not.toHaveBeenCalled();
            done();
          });
        }
      });
    });
  });

  describe('Delete Category', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
    });

    it('should delete category with optimistic update', (done) => {
      categoryHttpService.deleteCategory.and.returnValue(of(void 0));

      // First load categories
      service.loadCategories().subscribe(() => {
        service.deleteCategory(1).subscribe(() => {
          expect(categoryHttpService.deleteCategory).toHaveBeenCalledWith(1, 1);
          
          service.categories$.subscribe(categories => {
            expect(categories.find(c => c.id === 1)).toBeUndefined();
            done();
          });
        });
      });
    });

    it('should revert optimistic update on delete error', (done) => {
      const errorMessage = 'Erro ao excluir categoria';
      categoryHttpService.deleteCategory.and.returnValue(throwError(() => ({ message: errorMessage })));

      // First load categories
      service.loadCategories().subscribe(() => {
        service.deleteCategory(1).subscribe({
          complete: () => {
            service.categories$.subscribe(categories => {
              expect(categories.find(c => c.id === 1)).toEqual(mockCategories[0]); // Should revert
              done();
            });
          }
        });
      });
    });

    it('should clear selected category if deleted', (done) => {
      categoryHttpService.deleteCategory.and.returnValue(of(void 0));

      // First load categories and select one
      service.loadCategories().subscribe(() => {
        service.selectCategory(1).subscribe(() => {
          service.deleteCategory(1).subscribe(() => {
            service.selectedCategory$.subscribe(selected => {
              expect(selected).toBeNull();
              done();
            });
          });
        });
      });
    });
  });

  describe('Filters and Search', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
    });

    it('should update filters and reload', (done) => {
      const newFilters: Partial<CategoryFilters> = {
        search: 'bebidas',
        ativo: true
      };

      service.loadCategories().subscribe(() => {
        categoryHttpService.getCategories.calls.reset();
        
        service.updateFilters(newFilters);
        
        service.filters$.subscribe(filters => {
          expect(filters.search).toBe('bebidas');
          expect(filters.ativo).toBe(true);
          expect(categoryHttpService.getCategories).toHaveBeenCalled();
          done();
        });
      });
    });

    it('should apply local filters to categories', (done) => {
      service.loadCategories().subscribe(() => {
        service.updateFilters({ search: 'bebidas' });
        
        service.filteredCategories$.subscribe(filtered => {
          expect(filtered.length).toBe(1);
          expect(filtered[0].nome).toBe('Bebidas');
          done();
        });
      });
    });

    it('should search categories via HTTP service', (done) => {
      const searchResults = [mockCategories[0]];
      categoryHttpService.searchCategories.and.returnValue(of(searchResults));

      service.searchCategories('bebidas').subscribe(results => {
        expect(results).toEqual(searchResults);
        expect(categoryHttpService.searchCategories).toHaveBeenCalledWith(1, 'bebidas');
        done();
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
    });

    it('should update pagination and reload', (done) => {
      const newPagination: Partial<PaginationState> = {
        currentPage: 2,
        pageSize: 10
      };

      service.loadCategories().subscribe(() => {
        categoryHttpService.getCategories.calls.reset();
        
        service.updatePagination(newPagination);
        
        service.pagination$.subscribe(pagination => {
          expect(pagination.currentPage).toBe(2);
          expect(pagination.pageSize).toBe(10);
          expect(categoryHttpService.getCategories).toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('State Management', () => {
    it('should clear all state', (done) => {
      service.setEstablishmentContext(1);
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        service.clearState();
        
        service.state$.subscribe(state => {
          expect(state.categories).toEqual([]);
          expect(state.selectedCategory).toBeNull();
          expect(state.loading).toBeFalse();
          expect(state.error).toBeNull();
          done();
        });
      });
    });

    it('should clear selected category', (done) => {
      service.setEstablishmentContext(1);
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategories[0]));
      
      service.selectCategory(1).subscribe(() => {
        service.clearSelectedCategory();
        
        service.selectedCategory$.subscribe(selected => {
          expect(selected).toBeNull();
          done();
        });
      });
    });

    it('should clear error', (done) => {
      service['setError']('Test error');
      
      service.error$.subscribe(error => {
        if (error === 'Test error') {
          service.clearError();
        } else if (error === null) {
          expect(error).toBeNull();
          done();
        }
      });
    });

    it('should invalidate cache and reload', (done) => {
      service.setEstablishmentContext(1);
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        categoryHttpService.getCategories.calls.reset();
        
        service.invalidateCache();
        
        expect(categoryHttpService.getCategories).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Cache Integration', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
    });

    it('should use cached data when available', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      categoryCache.getCategoryList.and.returnValue(mockCategories);

      service.loadCategories().subscribe(response => {
        expect(response.categorias).toEqual(mockCategories);
        expect(categoryHttpService.getCategories).not.toHaveBeenCalled();
        done();
      });
    });

    it('should cache data after successful load', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      categoryCache.getCategoryList.and.returnValue(null);
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));

      service.loadCategories().subscribe(() => {
        expect(categoryCache.setCategoryList).toHaveBeenCalledWith(1, mockCategories, jasmine.any(Object));
        expect(categoryCache.intelligentWarmup).toHaveBeenCalledWith(1, mockCategories);
        done();
      });
    });

    it('should use cached category for selection', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      categoryCache.getCategory.and.returnValue(mockCategories[0]);

      service.selectCategory(1).subscribe(category => {
        expect(category).toEqual(mockCategories[0]);
        expect(categoryHttpService.getCategoryById).not.toHaveBeenCalled();
        done();
      });
    });

    it('should cache category after fetching', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      categoryCache.getCategory.and.returnValue(null);
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategories[0]));

      service.selectCategory(1).subscribe(() => {
        expect(categoryCache.setCategory).toHaveBeenCalledWith(1, mockCategories[0]);
        done();
      });
    });

    it('should use cached search results', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      const searchResults = [mockCategories[0]];
      categoryCache.getSearchResults.and.returnValue(searchResults);

      service.searchCategories('bebidas').subscribe(results => {
        expect(results).toEqual(searchResults);
        expect(categoryHttpService.searchCategories).not.toHaveBeenCalled();
        done();
      });
    });

    it('should cache search results after fetching', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      const searchResults = [mockCategories[0]];
      categoryCache.getSearchResults.and.returnValue(null);
      categoryHttpService.searchCategories.and.returnValue(of(searchResults));

      service.searchCategories('bebidas').subscribe(() => {
        expect(categoryCache.setSearchResults).toHaveBeenCalledWith(1, 'bebidas', searchResults);
        done();
      });
    });

    it('should invalidate cache after create', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      const createRequest: CreateCategoryRequest = {
        nome: 'Nova Categoria',
        descricao: 'Descrição'
      };
      const createdCategory = { ...mockCategories[0], id: 3, nome: 'Nova Categoria' };
      
      categoryHttpService.createCategory.and.returnValue(of(createdCategory));

      service.createCategory(createRequest).subscribe(() => {
        expect(categoryCache.invalidateCategoryCache).toHaveBeenCalledWith(1);
        expect(categoryCache.setCategory).toHaveBeenCalledWith(1, createdCategory);
        done();
      });
    });

    it('should invalidate cache after update', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        const updateRequest: UpdateCategoryRequest = {
          nome: 'Bebidas Atualizadas',
          descricao: 'Descrição atualizada',
          ativo: false
        };
        const updatedCategory = { ...mockCategories[0], ...updateRequest };
        
        categoryHttpService.updateCategory.and.returnValue(of(updatedCategory));

        service.updateCategory(1, updateRequest).subscribe(() => {
          expect(categoryCache.setCategory).toHaveBeenCalledWith(1, updatedCategory);
          expect(categoryCache.invalidateByPattern).toHaveBeenCalled();
          done();
        });
      });
    });

    it('should invalidate cache after delete', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        categoryHttpService.deleteCategory.and.returnValue(of(void 0));

        service.deleteCategory(1).subscribe(() => {
          expect(categoryCache.invalidateCategory).toHaveBeenCalledWith(1, 1);
          done();
        });
      });
    });
  });

  describe('Advanced State Management', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
    });

    it('should handle concurrent operations gracefully', (done) => {
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategories[0]));

      // Start multiple operations concurrently
      const load$ = service.loadCategories();
      const select$ = service.selectCategory(1);

      // Both should complete successfully
      Promise.all([
        load$.toPromise(),
        select$.toPromise()
      ]).then(() => {
        service.state$.subscribe(state => {
          expect(state.categories).toEqual(mockCategories);
          expect(state.selectedCategory).toEqual(mockCategories[0]);
          done();
        });
      });
    });

    it('should maintain state consistency during rapid updates', (done) => {
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        // Rapid filter updates
        service.updateFilters({ search: 'bebidas' });
        service.updateFilters({ ativo: true });
        service.updateFilters({ sortBy: 'dataCriacao' });

        service.filteredCategories$.subscribe(filtered => {
          // Should apply all filters
          expect(filtered.length).toBeLessThanOrEqual(mockCategories.length);
          done();
        });
      });
    });

    it('should handle establishment context changes during operations', (done) => {
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        // Change establishment context during operation
        service.setEstablishmentContext(2);
        
        service.state$.subscribe(state => {
          // State should be cleared
          expect(state.categories).toEqual([]);
          expect(state.selectedCategory).toBeNull();
          done();
        });
      });
    });
  });

  describe('Error Recovery', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
    });

    it('should recover from network errors', (done) => {
      // First call fails
      categoryHttpService.getCategories.and.returnValue(throwError(() => ({ message: 'Network error' })));
      
      service.loadCategories().subscribe({
        complete: () => {
          // Second call succeeds
          categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
          
          service.reloadCategories().subscribe(() => {
            service.categories$.subscribe(categories => {
              expect(categories).toEqual(mockCategories);
              done();
            });
          });
        }
      });
    });

    it('should handle partial failures in optimistic updates', (done) => {
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        const createRequest: CreateCategoryRequest = {
          nome: 'Nova Categoria',
          descricao: 'Descrição'
        };
        
        // Create fails after optimistic update
        categoryHttpService.createCategory.and.returnValue(throwError(() => ({ message: 'Server error' })));

        let categoryUpdates: Category[][] = [];
        service.categories$.subscribe(categories => categoryUpdates.push([...categories]));

        service.createCategory(createRequest).subscribe({
          complete: () => {
            // Should revert to original state
            const finalCategories = categoryUpdates[categoryUpdates.length - 1];
            expect(finalCategories).toEqual(mockCategories);
            done();
          }
        });
      });
    });
  });

  describe('Performance Optimizations', () => {
    beforeEach(() => {
      service.setEstablishmentContext(1);
    });

    it('should debounce rapid filter changes', (done) => {
      categoryHttpService.getCategories.and.returnValue(of(mockCategoryListResponse));
      
      service.loadCategories().subscribe(() => {
        categoryHttpService.getCategories.calls.reset();
        
        // Rapid filter changes
        service.updateFilters({ search: 'a' });
        service.updateFilters({ search: 'ab' });
        service.updateFilters({ search: 'abc' });

        setTimeout(() => {
          // Should only make one API call for the final filter
          expect(categoryHttpService.getCategories).toHaveBeenCalledTimes(1);
          done();
        }, 100);
      });
    });

    it('should avoid unnecessary API calls for cached data', (done) => {
      const categoryCache = TestBed.inject(CategoryCacheService) as jasmine.SpyObj<CategoryCacheService>;
      categoryCache.getCategoryList.and.returnValue(mockCategories);

      // Multiple loads should only hit cache
      service.loadCategories().subscribe(() => {
        service.loadCategories().subscribe(() => {
          service.loadCategories().subscribe(() => {
            expect(categoryHttpService.getCategories).not.toHaveBeenCalled();
            done();
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should extract error message from error object', () => {
      const errorWithMessage = { message: 'Custom error' };
      const result = service['extractErrorMessage'](errorWithMessage);
      expect(result).toBe('Custom error');
    });

    it('should handle string errors', () => {
      const stringError = 'String error';
      const result = service['extractErrorMessage'](stringError);
      expect(result).toBe('String error');
    });

    it('should handle unknown errors', () => {
      const unknownError = { someProperty: 'value' };
      const result = service['extractErrorMessage'](unknownError);
      expect(result).toBe('Erro desconhecido');
    });

    it('should handle null/undefined errors', () => {
      expect(service['extractErrorMessage'](null)).toBe('Erro desconhecido');
      expect(service['extractErrorMessage'](undefined)).toBe('Erro desconhecido');
    });
  });
});
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CategoryStateService } from './category-state.service';
import { CategoryHttpService } from './category-http.service';
import { ApiConfigService } from '../../../core/services/api-config.service';
import { Category } from '../models/category.models';
import { CategoryListResponse } from '../models/category-dto.models';

describe('CategoryStateService Integration', () => {
  let service: CategoryStateService;
  let httpMock: HttpTestingController;
  let apiConfigService: jasmine.SpyObj<ApiConfigService>;

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
    const apiConfigSpy = jasmine.createSpyObj('ApiConfigService', ['getConfiguredEndpoint']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryStateService,
        CategoryHttpService,
        { provide: ApiConfigService, useValue: apiConfigSpy }
      ]
    });

    service = TestBed.inject(CategoryStateService);
    httpMock = TestBed.inject(HttpTestingController);
    apiConfigService = TestBed.inject(ApiConfigService) as jasmine.SpyObj<ApiConfigService>;

    // Setup API config mock
    apiConfigService.getConfiguredEndpoint.and.returnValue('/api/categorias/estabelecimentos/1/categorias');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should integrate with CategoryHttpService to load categories', (done) => {
    service.setEstablishmentContext(1);

    service.loadCategories().subscribe(() => {
      service.categories$.subscribe(categories => {
        expect(categories).toEqual(mockCategories);
        expect(categories.length).toBe(2);
        done();
      });
    });

    const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
    expect(req.request.method).toBe('GET');
    req.flush(mockCategoryListResponse);
  });

  it('should handle HTTP errors and update error state', (done) => {
    service.setEstablishmentContext(1);

    service.loadCategories().subscribe({
      complete: () => {
        service.error$.subscribe(error => {
          expect(error).toBeTruthy();
          expect(error).toContain('Erro ao carregar categorias');
          done();
        });
      }
    });

    const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
  });

  it('should create category and update state optimistically', (done) => {
    service.setEstablishmentContext(1);

    const createRequest = {
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

    let categoryUpdates: Category[][] = [];
    service.categories$.subscribe(categories => categoryUpdates.push([...categories]));

    service.createCategory(createRequest).subscribe(() => {
      // Should have at least 2 updates: optimistic and real
      expect(categoryUpdates.length).toBeGreaterThanOrEqual(2);
      
      // Final state should contain the created category
      const finalCategories = categoryUpdates[categoryUpdates.length - 1];
      expect(finalCategories).toContain(jasmine.objectContaining({
        id: 3,
        nome: 'Nova Categoria'
      }));
      done();
    });

    const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createRequest);
    req.flush(createdCategory);
  });

  it('should update category with optimistic updates', (done) => {
    service.setEstablishmentContext(1);

    // First load categories
    service.loadCategories().subscribe(() => {
      const updateRequest = {
        nome: 'Bebidas Atualizadas',
        descricao: 'Descrição atualizada',
        ativo: false
      };

      const updatedCategory: Category = {
        ...mockCategories[0],
        ...updateRequest,
        dataAtualizacao: new Date()
      };

      service.updateCategory(1, updateRequest).subscribe(() => {
        service.categories$.subscribe(categories => {
          const updated = categories.find(c => c.id === 1);
          expect(updated?.nome).toBe('Bebidas Atualizadas');
          expect(updated?.ativo).toBe(false);
          done();
        });
      });

      const updateReq = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias/1');
      expect(updateReq.request.method).toBe('PUT');
      expect(updateReq.request.body).toEqual(updateRequest);
      updateReq.flush(updatedCategory);
    });

    const loadReq = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
    loadReq.flush(mockCategoryListResponse);
  });

  it('should delete category with optimistic updates', (done) => {
    service.setEstablishmentContext(1);

    // First load categories
    service.loadCategories().subscribe(() => {
      service.deleteCategory(1).subscribe(() => {
        service.categories$.subscribe(categories => {
          expect(categories.find(c => c.id === 1)).toBeUndefined();
          expect(categories.length).toBe(1);
          done();
        });
      });

      const deleteReq = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias/1');
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null);
    });

    const loadReq = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
    loadReq.flush(mockCategoryListResponse);
  });

  it('should handle establishment context changes', (done) => {
    // Set initial establishment
    service.setEstablishmentContext(1);
    
    service.loadCategories().subscribe(() => {
      // Change establishment context
      service.setEstablishmentContext(2);
      
      service.categories$.subscribe(categories => {
        expect(categories).toEqual([]); // Should clear categories
        expect(service.getCurrentEstablishmentId()).toBe(2);
        done();
      });
    });

    const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
    req.flush(mockCategoryListResponse);
  });

  it('should apply filters and reload data', (done) => {
    service.setEstablishmentContext(1);

    service.loadCategories().subscribe(() => {
      // Update filters
      service.updateFilters({ search: 'bebidas', ativo: true });

      service.filters$.subscribe(filters => {
        expect(filters.search).toBe('bebidas');
        expect(filters.ativo).toBe(true);
        done();
      });

      // Should trigger another HTTP request
      const filterReq = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      expect(filterReq.request.params.get('search')).toBe('bebidas');
      expect(filterReq.request.params.get('ativo')).toBe('true');
      filterReq.flush(mockCategoryListResponse);
    });

    const initialReq = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
    initialReq.flush(mockCategoryListResponse);
  });

  it('should handle pagination updates', (done) => {
    service.setEstablishmentContext(1);

    service.loadCategories().subscribe(() => {
      // Update pagination
      service.updatePagination({ currentPage: 2, pageSize: 10 });

      service.pagination$.subscribe(pagination => {
        expect(pagination.currentPage).toBe(2);
        expect(pagination.pageSize).toBe(10);
        done();
      });

      // Should trigger another HTTP request with pagination params
      const paginationReq = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      expect(paginationReq.request.params.get('page')).toBe('2');
      expect(paginationReq.request.params.get('limit')).toBe('10');
      paginationReq.flush(mockCategoryListResponse);
    });

    const initialReq = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
    initialReq.flush(mockCategoryListResponse);
  });
});
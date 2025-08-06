import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CategoryHttpService } from './category-http.service';
import { ApiConfigService } from '../../../core/services/api-config.service';
import { 
  Category, 
  CategoryListParams,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryListResponse,
  CategoryDetailResponse,
  CategoryValidationResponse,
  CategoryDeletionValidationResponse
} from '../models';
import { ErrorCodes } from '../../../data-access/models/auth.models';

describe('CategoryHttpService', () => {
  let service: CategoryHttpService;
  let httpMock: HttpTestingController;
  let apiConfigService: jasmine.SpyObj<ApiConfigService>;

  const mockEstablecimentoId = 1;
  const mockCategoryId = 1;
  const baseUrl = 'http://localhost:3000';

  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas',
    estabelecimentoId: mockEstablecimentoId,
    ativo: true,
    dataCriacao: new Date('2024-01-01'),
    dataAtualizacao: new Date('2024-01-01'),
    produtosCount: 5
  };

  beforeEach(() => {
    const apiConfigSpy = jasmine.createSpyObj('ApiConfigService', ['getConfiguredEndpoint', 'getBaseUrl']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryHttpService,
        { provide: ApiConfigService, useValue: apiConfigSpy }
      ]
    });

    service = TestBed.inject(CategoryHttpService);
    httpMock = TestBed.inject(HttpTestingController);
    apiConfigService = TestBed.inject(ApiConfigService) as jasmine.SpyObj<ApiConfigService>;

    // Setup default API config responses
    apiConfigService.getBaseUrl.and.returnValue(baseUrl);
    apiConfigService.getConfiguredEndpoint.and.callFake((category, endpoint, params) => {
      const endpoints = {
        list: `/api/categorias/estabelecimentos/${params?.['estabelecimentoId']}/categorias`,
        detail: `/api/categorias/estabelecimentos/${params?.['estabelecimentoId']}/categorias/${params?.['id']}`,
        create: `/api/categorias/estabelecimentos/${params?.['estabelecimentoId']}/categorias`,
        update: `/api/categorias/estabelecimentos/${params?.['estabelecimentoId']}/categorias/${params?.['id']}`,
        delete: `/api/categorias/estabelecimentos/${params?.['estabelecimentoId']}/categorias/${params?.['id']}`,
        validate: `/api/categorias/estabelecimentos/${params?.['estabelecimentoId']}/categorias/validate-name`,
        deletionValidation: `/api/categorias/estabelecimentos/${params?.['estabelecimentoId']}/categorias/${params?.['id']}/validate-deletion`
      };
      return baseUrl + endpoints[endpoint as keyof typeof endpoints];
    });
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getCategories', () => {
    it('should get categories for establishment', () => {
      const mockResponse: CategoryListResponse = {
        categorias: [mockCategory],
        total: 1,
        pagina: 1,
        totalPaginas: 1
      };

      service.getCategories(mockEstablecimentoId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include query parameters when provided', () => {
      const params: CategoryListParams = {
        page: 2,
        limit: 10,
        search: 'bebida',
        ativo: true,
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      service.getCategories(mockEstablecimentoId, params).subscribe();

      const req = httpMock.expectOne(req => 
        req.url.includes(`/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias`) &&
        req.params.get('page') === '2' &&
        req.params.get('limit') === '10' &&
        req.params.get('search') === 'bebida' &&
        req.params.get('ativo') === 'true' &&
        req.params.get('sortBy') === 'nome' &&
        req.params.get('sortOrder') === 'asc'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ categorias: [], total: 0, pagina: 1, totalPaginas: 0 });
    });

    it('should throw error for invalid establishment ID', () => {
      expect(() => service.getCategories(0)).toThrowError('ID do estabelecimento é obrigatório e deve ser maior que zero');
      expect(() => service.getCategories(-1)).toThrowError('ID do estabelecimento é obrigatório e deve ser maior que zero');
    });
  });

  describe('getCategoryById', () => {
    it('should get category by ID', () => {
      service.getCategoryById(mockEstablecimentoId, mockCategoryId).subscribe(category => {
        expect(category).toEqual(mockCategory);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias/${mockCategoryId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCategory);
    });

    it('should throw error for invalid category ID', () => {
      expect(() => service.getCategoryById(mockEstablecimentoId, 0)).toThrowError('ID da categoria é obrigatório e deve ser maior que zero');
    });
  });

  describe('getCategoryDetail', () => {
    it('should get category detail with products', () => {
      const mockDetailResponse: CategoryDetailResponse = {
        categoria: mockCategory,
        produtos: [
          { id: 1, nome: 'Coca-Cola', ativo: true },
          { id: 2, nome: 'Pepsi', ativo: true }
        ]
      };

      service.getCategoryDetail(mockEstablecimentoId, mockCategoryId).subscribe(response => {
        expect(response).toEqual(mockDetailResponse);
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias/${mockCategoryId}`) &&
        req.params.get('includeProducts') === 'true'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockDetailResponse);
    });
  });

  describe('createCategory', () => {
    it('should create category with sanitized data', () => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: 'Categoria de bebidas'
      };

      service.createCategory(mockEstablecimentoId, createRequest).subscribe(category => {
        expect(category).toEqual(mockCategory);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush(mockCategory);
    });

    it('should sanitize input data', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: '<script>alert("xss")</script>Bebidas',
        descricao: 'Descrição com <script>alert("xss")</script> script'
      };

      const expectedSanitized: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: 'Descrição com  script'
      };

      service.createCategory(mockEstablecimentoId, maliciousRequest).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias`);
      expect(req.request.body).toEqual(expectedSanitized);
      req.flush(mockCategory);
    });

    it('should validate required fields', () => {
      const invalidRequest: CreateCategoryRequest = {
        nome: '',
        descricao: 'Descrição'
      };

      expect(() => service.createCategory(mockEstablecimentoId, invalidRequest))
        .toThrowError('Nome da categoria é obrigatório');
    });

    it('should validate field lengths', () => {
      const invalidRequest: CreateCategoryRequest = {
        nome: 'A',
        descricao: 'Descrição'
      };

      expect(() => service.createCategory(mockEstablecimentoId, invalidRequest))
        .toThrowError('Nome da categoria deve ter pelo menos 2 caracteres');

      const longNameRequest: CreateCategoryRequest = {
        nome: 'A'.repeat(101),
        descricao: 'Descrição'
      };

      expect(() => service.createCategory(mockEstablecimentoId, longNameRequest))
        .toThrowError('Nome da categoria deve ter no máximo 100 caracteres');

      const longDescRequest: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: 'A'.repeat(501)
      };

      expect(() => service.createCategory(mockEstablecimentoId, longDescRequest))
        .toThrowError('Descrição da categoria deve ter no máximo 500 caracteres');
    });
  });

  describe('updateCategory', () => {
    it('should update category', () => {
      const updateRequest: UpdateCategoryRequest = {
        nome: 'Bebidas Atualizadas',
        descricao: 'Descrição atualizada',
        ativo: false
      };

      const updatedCategory = { ...mockCategory, ...updateRequest };

      service.updateCategory(mockEstablecimentoId, mockCategoryId, updateRequest).subscribe(category => {
        expect(category).toEqual(updatedCategory);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias/${mockCategoryId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateRequest);
      req.flush(updatedCategory);
    });

    it('should validate ativo field type', () => {
      const invalidRequest: any = {
        nome: 'Bebidas',
        descricao: 'Descrição',
        ativo: 'true' // Should be boolean
      };

      expect(() => service.updateCategory(mockEstablecimentoId, mockCategoryId, invalidRequest))
        .toThrowError('Status ativo da categoria deve ser verdadeiro ou falso');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category', () => {
      service.deleteCategory(mockEstablecimentoId, mockCategoryId).subscribe(result => {
        expect(result).toBeUndefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias/${mockCategoryId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('validateCategoryName', () => {
    it('should validate category name', () => {
      const mockValidationResponse: CategoryValidationResponse = {
        valid: true
      };

      service.validateCategoryName(mockEstablecimentoId, 'Bebidas').subscribe(isValid => {
        expect(isValid).toBe(true);
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias/validate-name`) &&
        req.params.get('nome') === 'Bebidas'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockValidationResponse);
    });

    it('should include excludeId when provided', () => {
      service.validateCategoryName(mockEstablecimentoId, 'Bebidas', 2).subscribe();

      const req = httpMock.expectOne(req => 
        req.params.get('nome') === 'Bebidas' &&
        req.params.get('excludeId') === '2'
      );
      req.flush({ valid: true });
    });

    it('should throw error for empty name', () => {
      service.validateCategoryName(mockEstablecimentoId, '').subscribe({
        error: (error) => {
          expect(error.message).toBe('Nome da categoria é obrigatório');
        }
      });
    });
  });

  describe('validateCategoryDeletion', () => {
    it('should validate category deletion', () => {
      const mockValidationResponse: CategoryDeletionValidationResponse = {
        canDelete: false,
        reason: 'Categoria possui produtos associados',
        affectedProductsCount: 3
      };

      service.validateCategoryDeletion(mockEstablecimentoId, mockCategoryId).subscribe(response => {
        expect(response).toEqual(mockValidationResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias/${mockCategoryId}/validate-deletion`);
      expect(req.request.method).toBe('GET');
      req.flush(mockValidationResponse);
    });
  });

  describe('searchCategories', () => {
    it('should search categories', () => {
      const mockResponse: CategoryListResponse = {
        categorias: [mockCategory],
        total: 1,
        pagina: 1,
        totalPaginas: 1
      };

      service.searchCategories(mockEstablecimentoId, 'bebida', 5).subscribe(categories => {
        expect(categories).toEqual([mockCategory]);
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias`) &&
        req.params.get('search') === 'bebida' &&
        req.params.get('limit') === '5' &&
        req.params.get('page') === '1'
      );
      req.flush(mockResponse);
    });

    it('should throw error for empty search query', () => {
      service.searchCategories(mockEstablecimentoId, '').subscribe({
        error: (error) => {
          expect(error.message).toBe('Termo de busca é obrigatório');
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle 404 errors', () => {
      service.getCategoryById(mockEstablecimentoId, mockCategoryId).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
          expect(error.message).toBe('Categoria não encontrada');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias/${mockCategoryId}`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 403 errors', () => {
      service.getCategoryById(mockEstablecimentoId, mockCategoryId).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(error.message).toBe('Acesso negado à categoria');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias/${mockCategoryId}`);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 409 conflicts', () => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: 'Categoria de bebidas'
      };

      service.createCategory(mockEstablecimentoId, createRequest).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
          expect(error.message).toBe('Conflito: categoria já existe');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias`);
      req.flush({ message: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    });

    it('should handle network errors', () => {
      service.getCategories(mockEstablecimentoId).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
          expect(error.message).toBe('Erro de conexão. Verifique sua internet');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias`);
      req.error(new ProgressEvent('Network error'), { status: 0 });
    });

    it('should handle server errors', () => {
      service.getCategories(mockEstablecimentoId).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
          expect(error.message).toBe('Erro interno do servidor. Tente novamente');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/categorias/estabelecimentos/${mockEstablecimentoId}/categorias`);
      req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
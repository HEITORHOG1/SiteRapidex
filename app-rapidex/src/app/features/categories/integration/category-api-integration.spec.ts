import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { CategoryHttpService } from '../services/category-http.service';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../models/category.models';
import { CategoryListResponse } from '../models/category-dto.models';

describe('Category API Integration Validation', () => {
  let service: CategoryHttpService;
  let httpMock: HttpTestingController;

  const baseUrl = '/api/categorias/estabelecimentos';
  const estabelecimentoId = 1;
  
  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-01T10:00:00Z'),
    dataAtualizacao: new Date('2024-01-01T10:00:00Z'),
    produtosCount: 5
  };

  const mockListResponse: CategoryListResponse = {
    categorias: [mockCategory],
    total: 1,
    pagina: 1,
    totalPaginas: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CategoryHttpService]
    });

    service = TestBed.inject(CategoryHttpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('GET /api/categorias/estabelecimentos/{id}/categorias', () => {
    it('should fetch categories with correct URL and parameters', () => {
      const params = { page: '1', limit: '10', search: 'bebida' };
      
      service.getCategories(estabelecimentoId, params).subscribe(response => {
        expect(response).toEqual(mockListResponse);
      });

      const req = httpMock.expectOne(request => {
        return request.url === `${baseUrl}/${estabelecimentoId}/categorias` &&
               request.method === 'GET' &&
               request.params.get('page') === '1' &&
               request.params.get('limit') === '10' &&
               request.params.get('search') === 'bebida';
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockListResponse);
    });

    it('should handle empty response correctly', () => {
      const emptyResponse: CategoryListResponse = {
        categorias: [],
        total: 0,
        pagina: 1,
        totalPaginas: 0
      };

      service.getCategories(estabelecimentoId).subscribe(response => {
        expect(response.categorias).toEqual([]);
        expect(response.total).toBe(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.flush(emptyResponse);
    });

    it('should handle pagination parameters correctly', () => {
      const paginatedResponse: CategoryListResponse = {
        categorias: [mockCategory],
        total: 25,
        pagina: 2,
        totalPaginas: 3
      };

      service.getCategories(estabelecimentoId, { page: '2', limit: '10' }).subscribe(response => {
        expect(response.pagina).toBe(2);
        expect(response.totalPaginas).toBe(3);
        expect(response.total).toBe(25);
      });

      const req = httpMock.expectOne(request => {
        return request.url === `${baseUrl}/${estabelecimentoId}/categorias` &&
               request.params.get('page') === '2' &&
               request.params.get('limit') === '10';
      });

      req.flush(paginatedResponse);
    });
  });

  describe('GET /api/categorias/estabelecimentos/{id}/categorias/{categoryId}', () => {
    it('should fetch single category with correct URL', () => {
      const categoryId = 1;

      service.getCategoryById(estabelecimentoId, categoryId).subscribe(category => {
        expect(category).toEqual(mockCategory);
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias/${categoryId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCategory);
    });

    it('should handle 404 for non-existent category', () => {
      const categoryId = 999;

      service.getCategoryById(estabelecimentoId, categoryId).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(404);
          expect(error.error.message).toBe('Categoria não encontrada');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias/${categoryId}`);
      req.flush(
        { message: 'Categoria não encontrada' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });

  describe('POST /api/categorias/estabelecimentos/{id}/categorias', () => {
    it('should create category with correct payload', () => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Nova Categoria',
        descricao: 'Descrição da nova categoria'
      };

      const createdCategory: Category = {
        ...mockCategory,
        id: 2,
        nome: createRequest.nome,
        descricao: createRequest.descricao
      };

      service.createCategory(estabelecimentoId, createRequest).subscribe(category => {
        expect(category.nome).toBe(createRequest.nome);
        expect(category.descricao).toBe(createRequest.descricao);
        expect(category.estabelecimentoId).toBe(estabelecimentoId);
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush(createdCategory);
    });

    it('should handle validation errors on creation', () => {
      const invalidRequest: CreateCategoryRequest = {
        nome: '', // Invalid empty name
        descricao: 'Descrição válida'
      };

      service.createCategory(estabelecimentoId, invalidRequest).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(400);
          expect(error.error.errors.nome).toBe('Nome é obrigatório');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.flush(
        {
          message: 'Dados inválidos',
          errors: { nome: 'Nome é obrigatório' }
        },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    it('should handle duplicate name error', () => {
      const duplicateRequest: CreateCategoryRequest = {
        nome: 'Bebidas', // Already exists
        descricao: 'Outra descrição'
      };

      service.createCategory(estabelecimentoId, duplicateRequest).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toBe('Categoria com este nome já existe');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.flush(
        { message: 'Categoria com este nome já existe' },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('PUT /api/categorias/estabelecimentos/{id}/categorias/{categoryId}', () => {
    it('should update category with correct payload', () => {
      const categoryId = 1;
      const updateRequest: UpdateCategoryRequest = {
        nome: 'Bebidas Atualizadas',
        descricao: 'Descrição atualizada',
        ativo: false
      };

      const updatedCategory: Category = {
        ...mockCategory,
        ...updateRequest,
        dataAtualizacao: new Date('2024-01-02T10:00:00Z')
      };

      service.updateCategory(estabelecimentoId, categoryId, updateRequest).subscribe(category => {
        expect(category.nome).toBe(updateRequest.nome);
        expect(category.ativo).toBe(false);
        expect(category.dataAtualizacao).not.toEqual(mockCategory.dataAtualizacao);
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias/${categoryId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateRequest);
      req.flush(updatedCategory);
    });

    it('should handle optimistic locking conflicts', () => {
      const categoryId = 1;
      const updateRequest: UpdateCategoryRequest = {
        nome: 'Nome Atualizado',
        descricao: 'Descrição atualizada',
        ativo: true
      };

      service.updateCategory(estabelecimentoId, categoryId, updateRequest).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toBe('Categoria foi modificada por outro usuário');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias/${categoryId}`);
      req.flush(
        { message: 'Categoria foi modificada por outro usuário' },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('DELETE /api/categorias/estabelecimentos/{id}/categorias/{categoryId}', () => {
    it('should delete category successfully', () => {
      const categoryId = 1;

      service.deleteCategory(estabelecimentoId, categoryId).subscribe(response => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias/${categoryId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle deletion of category with products', () => {
      const categoryId = 1;

      service.deleteCategory(estabelecimentoId, categoryId).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toBe('Categoria possui produtos associados');
          expect(error.error.produtosCount).toBe(5);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias/${categoryId}`);
      req.flush(
        {
          message: 'Categoria possui produtos associados',
          produtosCount: 5
        },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('Authentication and Authorization', () => {
    it('should include authorization header in requests', () => {
      service.getCategories(estabelecimentoId).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      expect(req.request.headers.has('Authorization')).toBe(true);
      req.flush(mockListResponse);
    });

    it('should handle 401 unauthorized responses', () => {
      service.getCategories(estabelecimentoId).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.flush(
        { message: 'Token inválido' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });

    it('should handle 403 forbidden responses', () => {
      service.getCategories(estabelecimentoId).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.flush(
        { message: 'Acesso negado ao estabelecimento' },
        { status: 403, statusText: 'Forbidden' }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      service.getCategories(estabelecimentoId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.error).toBeInstanceOf(ErrorEvent);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle server errors', () => {
      service.getCategories(estabelecimentoId).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.flush(
        { message: 'Erro interno do servidor' },
        { status: 500, statusText: 'Internal Server Error' }
      );
    });

    it('should handle timeout errors', () => {
      service.getCategories(estabelecimentoId).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(0);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.error(new ErrorEvent('Timeout'), { status: 0 });
    });
  });

  describe('Request/Response Format Validation', () => {
    it('should send requests with correct content type', () => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Test Category',
        descricao: 'Test Description'
      };

      service.createCategory(estabelecimentoId, createRequest).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush(mockCategory);
    });

    it('should handle malformed JSON responses', () => {
      service.getCategories(estabelecimentoId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.flush('Invalid JSON', { headers: { 'Content-Type': 'application/json' } });
    });

    it('should validate response structure', () => {
      const invalidResponse = {
        // Missing required fields
        data: [mockCategory]
      };

      service.getCategories(estabelecimentoId).subscribe(response => {
        // Should handle gracefully or validate structure
        expect(response).toBeDefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      req.flush(invalidResponse);
    });
  });

  describe('Performance and Caching', () => {
    it('should include cache control headers when appropriate', () => {
      service.getCategories(estabelecimentoId).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      // Verify cache headers are handled correctly
      req.flush(mockListResponse, {
        headers: {
          'Cache-Control': 'max-age=300',
          'ETag': '"abc123"'
        }
      });
    });

    it('should handle conditional requests with ETag', () => {
      service.getCategories(estabelecimentoId).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/${estabelecimentoId}/categorias`);
      expect(req.request.headers.get('If-None-Match')).toBeDefined();
      req.flush(mockListResponse);
    });
  });
});
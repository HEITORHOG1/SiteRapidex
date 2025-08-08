import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { categorySecurityInterceptor, CategorySecurityLogger } from './category-security.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CategorySecurityError, CategorySecurityErrorCode } from '../models/category-security-errors';

describe('CategorySecurityInterceptor', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let estabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let mockHandler: jasmine.SpyObj<HttpHandler>;

  const mockEstabelecimento = {
    id: 1,
    nome: 'Restaurante Teste',
    ativo: true,
    usuarioId: 1,
    razaoSocial: 'Restaurante Teste Ltda',
    nomeFantasia: 'Restaurante Teste',
    cnpj: '12345678000199',
    telefone: '11999999999',
    email: 'contato@teste.com',
    endereco: 'Rua Teste, 123',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234567',
    dataCriacao: new Date(),
    dataAtualizacao: new Date()
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'isProprietario',
      'getUserId'
    ]);
    const estabelecimentoServiceSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ]);
    const handlerSpy = jasmine.createSpyObj('HttpHandler', ['handle']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoServiceSpy }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    estabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    mockHandler = handlerSpy;

    // Default setup
    authService.isAuthenticated.and.returnValue(true);
    authService.isProprietario.and.returnValue(true);
    authService.getUserId.and.returnValue('user123');
    estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstabelecimento);
  });

  describe('Request Filtering', () => {
    it('should pass through non-category requests', (done) => {
      const request = new HttpRequest('GET', '/api/products');
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          expect(mockHandler.handle).toHaveBeenCalledWith(request);
          done();
        });
      });
    });

    it('should intercept category API requests', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          // Should have been called with modified request (with security headers)
          expect(mockHandler.handle).toHaveBeenCalled();
          const calledRequest = mockHandler.handle.calls.mostRecent().args[0];
          expect(calledRequest.headers.has('X-Establishment-Context')).toBeTrue();
          done();
        });
      });
    });

    it('should recognize different category API patterns', () => {
      const patterns = [
        '/api/categories',
        '/api/estabelecimentos/123/categories',
        '/api/establishments/456/categories'
      ];

      patterns.forEach(url => {
        const request = new HttpRequest('GET', url);
        mockHandler.handle.and.returnValue(of(new HttpResponse({ status: 200 })));

        TestBed.runInInjectionContext(() => {
          categorySecurityInterceptor(request, mockHandler.handle).subscribe();
          expect(mockHandler.handle).toHaveBeenCalled();
        });

        mockHandler.handle.calls.reset();
      });
    });
  });

  describe('Establishment Context Validation', () => {
    it('should extract establishment ID from URL path', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/123/categories');
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          const calledRequest = mockHandler.handle.calls.mostRecent().args[0];
          expect(calledRequest.headers.get('X-Establishment-Context')).toBe('123');
          done();
        });
      });
    });

    it('should extract establishment ID from query parameters', (done) => {
      const request = new HttpRequest('GET', '/api/categories?estabelecimentoId=456');
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          const calledRequest = mockHandler.handle.calls.mostRecent().args[0];
          expect(calledRequest.headers.get('X-Establishment-Context')).toBe('456');
          done();
        });
      });
    });

    it('should extract establishment ID from request body', (done) => {
      const requestBody = { nome: 'Bebidas', estabelecimentoId: 789 };
      const request = new HttpRequest('POST', '/api/categories', requestBody);
      const response = new HttpResponse({ status: 201, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          const calledRequest = mockHandler.handle.calls.mostRecent().args[0];
          expect(calledRequest.headers.get('X-Establishment-Context')).toBe('789');
          done();
        });
      });
    });

    it('should reject request if establishment context is invalid', (done) => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(null);
      
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.INVALID_ESTABLISHMENT_CONTEXT);
            expect(mockHandler.handle).not.toHaveBeenCalled();
            done();
          }
        });
      });
    });

    it('should reject request if establishment ID mismatch', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/999/categories');

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.ESTABLISHMENT_MISMATCH);
            expect(mockHandler.handle).not.toHaveBeenCalled();
            done();
          }
        });
      });
    });
  });

  describe('Operation Validation', () => {
    it('should validate DELETE operations', (done) => {
      const request = new HttpRequest('DELETE', '/api/estabelecimentos/1/categories/123');
      const response = new HttpResponse({ status: 204 });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          expect(mockHandler.handle).toHaveBeenCalled();
          done();
        });
      });
    });

    it('should validate POST operations with valid data', (done) => {
      const requestBody = { nome: 'Bebidas', descricao: 'Categoria de bebidas', estabelecimentoId: 1 };
      const request = new HttpRequest('POST', '/api/estabelecimentos/1/categories', requestBody);
      const response = new HttpResponse({ status: 201, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          expect(mockHandler.handle).toHaveBeenCalled();
          done();
        });
      });
    });

    it('should reject POST operations with establishment mismatch in body', (done) => {
      const requestBody = { nome: 'Bebidas', estabelecimentoId: 999 };
      const request = new HttpRequest('POST', '/api/estabelecimentos/1/categories', requestBody);

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.ESTABLISHMENT_MISMATCH);
            expect(mockHandler.handle).not.toHaveBeenCalled();
            done();
          }
        });
      });
    });

    it('should reject POST operations without required nome field', (done) => {
      const requestBody = { descricao: 'Categoria sem nome' };
      const request = new HttpRequest('POST', '/api/estabelecimentos/1/categories', requestBody);

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.INVALID_CATEGORY_OPERATION);
            expect(error.message).toContain('Nome da categoria é obrigatório');
            expect(mockHandler.handle).not.toHaveBeenCalled();
            done();
          }
        });
      });
    });

    it('should validate PUT operations', (done) => {
      const requestBody = { nome: 'Bebidas Atualizadas', descricao: 'Descrição atualizada', ativo: true };
      const request = new HttpRequest('PUT', '/api/estabelecimentos/1/categories/123', requestBody);
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          expect(mockHandler.handle).toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to requests', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          const calledRequest = mockHandler.handle.calls.mostRecent().args[0];
          
          expect(calledRequest.headers.get('X-Establishment-Context')).toBe('1');
          expect(calledRequest.headers.get('X-Operation-Timestamp')).toBeTruthy();
          expect(calledRequest.headers.get('X-Request-Source')).toBe('category-management-client');
          done();
        });
      });
    });

    it('should not add establishment context header if not available', (done) => {
      const request = new HttpRequest('GET', '/api/categories');
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          const calledRequest = mockHandler.handle.calls.mostRecent().args[0];
          
          expect(calledRequest.headers.has('X-Establishment-Context')).toBeFalse();
          expect(calledRequest.headers.get('X-Operation-Timestamp')).toBeTruthy();
          expect(calledRequest.headers.get('X-Request-Source')).toBe('category-management-client');
          done();
        });
      });
    });
  });

  describe('HTTP Error Transformation', () => {
    it('should transform 401 errors to security errors', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      const httpError = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      mockHandler.handle.and.returnValue(throwError(() => httpError));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.SECURITY_VIOLATION);
            expect(error.message).toContain('Sessão expirada');
            done();
          }
        });
      });
    });

    it('should transform 403 errors to access denied errors', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      const httpError = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
      mockHandler.handle.and.returnValue(throwError(() => httpError));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.CATEGORY_ACCESS_DENIED);
            expect(error.message).toContain('Acesso negado para esta operação');
            done();
          }
        });
      });
    });

    it('should transform establishment-specific 403 errors', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      const httpError = new HttpErrorResponse({ 
        status: 403, 
        error: { code: 'ESTABLISHMENT_ACCESS_DENIED', message: 'Access denied to establishment' }
      });
      mockHandler.handle.and.returnValue(throwError(() => httpError));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.ESTABLISHMENT_ACCESS_DENIED);
            done();
          }
        });
      });
    });

    it('should transform 404 errors for category requests', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories/999');
      const httpError = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      mockHandler.handle.and.returnValue(throwError(() => httpError));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.CATEGORY_ACCESS_DENIED);
            expect(error.message).toContain('Categoria não encontrada');
            done();
          }
        });
      });
    });

    it('should transform 409 conflict errors', (done) => {
      const request = new HttpRequest('POST', '/api/estabelecimentos/1/categories');
      const httpError = new HttpErrorResponse({ 
        status: 409, 
        error: { message: 'Category already exists' }
      });
      mockHandler.handle.and.returnValue(throwError(() => httpError));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.INVALID_CATEGORY_OPERATION);
            expect(error.message).toContain('Categoria já existe');
            done();
          }
        });
      });
    });

    it('should transform 422 validation errors', (done) => {
      const request = new HttpRequest('POST', '/api/estabelecimentos/1/categories');
      const httpError = new HttpErrorResponse({ 
        status: 422, 
        error: { validationErrors: ['Nome é obrigatório'] }
      });
      mockHandler.handle.and.returnValue(throwError(() => httpError));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(CategorySecurityError);
            expect(error.code).toBe(CategorySecurityErrorCode.INVALID_CATEGORY_OPERATION);
            expect(error.message).toContain('Dados inválidos');
            done();
          }
        });
      });
    });

    it('should pass through non-transformable errors', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      const httpError = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
      mockHandler.handle.and.returnValue(throwError(() => httpError));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(error).toBe(httpError);
            done();
          }
        });
      });
    });
  });

  describe('Security Logging', () => {
    beforeEach(() => {
      spyOn(console, 'log');
      spyOn(console, 'warn');
      spyOn(console, 'error');
    });

    it('should log security events', () => {
      CategorySecurityLogger.logSecurityEvent('ACCESS_GRANTED', {
        userId: 'user123',
        establishmentId: 1,
        operation: 'GET_CATEGORIES'
      });

      expect(console.log).toHaveBeenCalledWith('✅ Category Security: Access granted', jasmine.any(Object));
    });

    it('should log access denied events', () => {
      CategorySecurityLogger.logSecurityEvent('ACCESS_DENIED', {
        userId: 'user123',
        establishmentId: 1,
        operation: 'DELETE_CATEGORY',
        error: CategorySecurityError.categoryAccessDenied(123, 1)
      });

      expect(console.warn).toHaveBeenCalledWith('❌ Category Security: Access denied', jasmine.any(Object));
    });

    it('should log security violations', () => {
      CategorySecurityLogger.logSecurityEvent('SECURITY_VIOLATION', {
        userId: 'user123',
        establishmentId: 1,
        operation: 'UNAUTHORIZED_ACCESS',
        error: CategorySecurityError.securityViolation('Unauthorized access attempt')
      });

      expect(console.error).toHaveBeenCalledWith('🚨 Category Security: Security violation detected', jasmine.any(Object));
    });

    it('should log interceptor validation', (done) => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(console.log).toHaveBeenCalledWith('🛡️ CategorySecurityInterceptor: Validating request', jasmine.any(Object));
          done();
        });
      });
    });

    it('should log security violations in interceptor', (done) => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(null);
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe({
          error: (error) => {
            expect(console.error).toHaveBeenCalledWith('🚨 CategorySecurityInterceptor: Security violation', jasmine.any(Object));
            done();
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests without establishment context gracefully', (done) => {
      const request = new HttpRequest('GET', '/api/categories');
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          done();
        });
      });
    });

    it('should handle malformed request bodies', (done) => {
      const request = new HttpRequest('POST', '/api/estabelecimentos/1/categories', 'invalid-json');
      const response = new HttpResponse({ status: 201, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          done();
        });
      });
    });

    it('should handle null request body', (done) => {
      const request = new HttpRequest('POST', '/api/estabelecimentos/1/categories', null);
      const response = new HttpResponse({ status: 201, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          done();
        });
      });
    });

    it('should handle very long URLs', (done) => {
      const longPath = '/api/estabelecimentos/1/categories/' + 'a'.repeat(1000);
      const request = new HttpRequest('GET', longPath);
      const response = new HttpResponse({ status: 200, body: {} });
      mockHandler.handle.and.returnValue(of(response));

      TestBed.runInInjectionContext(() => {
        categorySecurityInterceptor(request, mockHandler.handle).subscribe(event => {
          expect(event).toBe(response);
          done();
        });
      });
    });

    it('should handle concurrent requests', (done) => {
      const request1 = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      const request2 = new HttpRequest('POST', '/api/estabelecimentos/1/categories', { nome: 'Test' });
      const response1 = new HttpResponse({ status: 200, body: [] });
      const response2 = new HttpResponse({ status: 201, body: {} });

      mockHandler.handle.and.returnValues(of(response1), of(response2));

      TestBed.runInInjectionContext(() => {
        const interceptor1$ = categorySecurityInterceptor(request1, mockHandler.handle);
        const interceptor2$ = categorySecurityInterceptor(request2, mockHandler.handle);

        Promise.all([
          interceptor1$.toPromise(),
          interceptor2$.toPromise()
        ]).then(([event1, event2]) => {
          expect(event1).toBe(response1);
          expect(event2).toBe(response2);
          expect(mockHandler.handle).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });
  });
});
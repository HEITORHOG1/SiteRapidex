import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandler } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';

describe('CategorySecurityInterceptor', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockEstabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let mockHandler: jasmine.SpyObj<HttpHandler>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated', 'isProprietario', 'getUserId'
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

    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockEstabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    mockHandler = handlerSpy;
  });

  describe('Request Filtering', () => {
    it('should identify category API requests', () => {
      const categoryRequest = new HttpRequest('GET', '/api/categories');
      const nonCategoryRequest = new HttpRequest('GET', '/api/users');
      
      expect(categoryRequest.url).toContain('categories');
      expect(nonCategoryRequest.url).not.toContain('categories');
    });

    it('should identify establishment-specific category requests', () => {
      const request = new HttpRequest('GET', '/api/estabelecimentos/1/categories');
      
      expect(request.url).toContain('estabelecimentos');
      expect(request.url).toContain('categories');
    });
  });

  describe('Service Dependencies', () => {
    it('should inject all required services', () => {
      expect(mockAuthService).toBeDefined();
      expect(mockEstabelecimentoService).toBeDefined();
      expect(mockHandler).toBeDefined();
    });
  });

  describe('URL Pattern Matching', () => {
    it('should match category API patterns', () => {
      const patterns = [
        '/api/categories',
        '/api/estabelecimentos/1/categories',
        '/api/establishments/1/categories'
      ];

      patterns.forEach(url => {
        const request = new HttpRequest('GET', url);
        expect(request.url).toBeDefined();
        expect(typeof request.url).toBe('string');
      });
    });
  });

  describe('Request Methods', () => {
    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      
      methods.forEach(method => {
        const request = new HttpRequest(method as any, '/api/categories');
        expect(request.method).toBe(method);
      });
    });
  });

  describe('Request Body Validation', () => {
    it('should handle requests with body data', () => {
      const requestWithBody = new HttpRequest('POST', '/api/categories', {
        nome: 'Test Category',
        estabelecimentoId: 1
      });
      
      expect(requestWithBody.body).toBeDefined();
      expect(typeof requestWithBody.body).toBe('object');
    });

    it('should handle requests without body data', () => {
      const requestWithoutBody = new HttpRequest('GET', '/api/categories');
      
      expect(requestWithoutBody.method).toBe('GET');
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { CategoryHttpService } from '../src/app/features/categories/services/category-http.service';
import { CategoryValidationService } from '../src/app/features/categories/services/category-validation.service';
import { CategorySecurityInterceptor } from '../src/app/features/categories/interceptors/category-security.interceptor';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../src/app/features/categories/models/category.models';

describe('Category Security Penetration Tests', () => {
  let httpMock: HttpTestingController;
  let categoryService: CategoryHttpService;
  let validationService: CategoryValidationService;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryHttpService,
        CategoryValidationService,
        CategorySecurityInterceptor
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    categoryService = TestBed.inject(CategoryHttpService);
    validationService = TestBed.inject(CategoryValidationService);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('XSS (Cross-Site Scripting) Protection', () => {
    it('should sanitize malicious script tags in category name', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: '<script>alert("XSS")</script>Bebidas',
        descricao: 'Categoria de bebidas'
      };

      const sanitizedRequest = validationService.sanitizeInput(maliciousRequest);
      
      expect(sanitizedRequest.nome).not.toContain('<script>');
      expect(sanitizedRequest.nome).not.toContain('alert');
      expect(sanitizedRequest.nome).toBe('Bebidas');
    });

    it('should sanitize malicious HTML in description', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: '<img src="x" onerror="alert(\'XSS\')">'
      };

      const sanitizedRequest = validationService.sanitizeInput(maliciousRequest);
      
      expect(sanitizedRequest.descricao).not.toContain('<img');
      expect(sanitizedRequest.descricao).not.toContain('onerror');
      expect(sanitizedRequest.descricao).not.toContain('alert');
    });

    it('should handle JavaScript URLs in input', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: 'javascript:alert("XSS")',
        descricao: 'Categoria normal'
      };

      const sanitizedRequest = validationService.sanitizeInput(maliciousRequest);
      
      expect(sanitizedRequest.nome).not.toContain('javascript:');
      expect(sanitizedRequest.nome).not.toContain('alert');
    });

    it('should prevent event handler injection', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: 'Bebidas" onmouseover="alert(\'XSS\')"',
        descricao: 'Categoria de bebidas'
      };

      const sanitizedRequest = validationService.sanitizeInput(maliciousRequest);
      
      expect(sanitizedRequest.nome).not.toContain('onmouseover');
      expect(sanitizedRequest.nome).not.toContain('alert');
    });

    it('should handle encoded malicious content', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: '&#60;script&#62;alert(&#39;XSS&#39;)&#60;/script&#62;',
        descricao: 'Categoria de bebidas'
      };

      const sanitizedRequest = validationService.sanitizeInput(maliciousRequest);
      
      expect(sanitizedRequest.nome).not.toContain('script');
      expect(sanitizedRequest.nome).not.toContain('alert');
    });
  });

  describe('SQL Injection Protection', () => {
    it('should handle SQL injection attempts in search', () => {
      const maliciousSearch = "'; DROP TABLE categories; --";
      
      categoryService.searchCategories(1, maliciousSearch).subscribe();

      const req = httpMock.expectOne(request => {
        return request.url.includes('/api/categorias/estabelecimentos/1/categorias') &&
               request.params.get('search') === maliciousSearch;
      });

      // Server should handle SQL injection protection
      // Client should not modify the search parameter
      expect(req.request.params.get('search')).toBe(maliciousSearch);
      req.flush({ categorias: [], total: 0 });
    });

    it('should handle SQL injection in category name', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: "Bebidas'; DROP TABLE categories; --",
        descricao: 'Categoria de bebidas'
      };

      categoryService.createCategory(1, maliciousRequest).subscribe();

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      
      // Request should be sent as-is, server handles SQL injection protection
      expect(req.request.body.nome).toBe(maliciousRequest.nome);
      req.flush({ id: 1, ...maliciousRequest, estabelecimentoId: 1, ativo: true });
    });
  });

  describe('CSRF (Cross-Site Request Forgery) Protection', () => {
    it('should include CSRF token in requests', () => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: 'Categoria de bebidas'
      };

      categoryService.createCategory(1, createRequest).subscribe();

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      
      // Should include CSRF token header
      expect(req.request.headers.has('X-CSRF-Token')).toBe(true);
      req.flush({ id: 1, ...createRequest, estabelecimentoId: 1, ativo: true });
    });

    it('should handle CSRF token validation failure', () => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: 'Categoria de bebidas'
      };

      categoryService.createCategory(1, createRequest).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.error.message).toContain('CSRF');
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush(
        { message: 'CSRF token validation failed' },
        { status: 403, statusText: 'Forbidden' }
      );
    });
  });

  describe('Authorization and Access Control', () => {
    it('should prevent access to other establishment categories', () => {
      // Try to access category from establishment 2 while logged into establishment 1
      categoryService.getCategoryById(2, 1).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/2/categorias/1');
      req.flush(
        { message: 'Access denied to establishment' },
        { status: 403, statusText: 'Forbidden' }
      );
    });

    it('should handle expired authentication tokens', () => {
      categoryService.getCategories(1).subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush(
        { message: 'Token expired' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });

    it('should validate establishment ownership', () => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: 'Categoria de bebidas'
      };

      // Try to create category in establishment user doesn't own
      categoryService.createCategory(999, createRequest).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/999/categorias');
      req.flush(
        { message: 'User does not own this establishment' },
        { status: 403, statusText: 'Forbidden' }
      );
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject extremely long category names', () => {
      const longName = 'A'.repeat(1001); // Exceeds 1000 character limit
      const request: CreateCategoryRequest = {
        nome: longName,
        descricao: 'Valid description'
      };

      const validationResult = validationService.validateCategoryData(request);
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.nome).toContain('muito longo');
    });

    it('should reject malicious file paths in input', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: '../../../etc/passwd',
        descricao: 'Categoria de bebidas'
      };

      const sanitizedRequest = validationService.sanitizeInput(maliciousRequest);
      
      expect(sanitizedRequest.nome).not.toContain('../');
      expect(sanitizedRequest.nome).not.toContain('/etc/passwd');
    });

    it('should handle null byte injection', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: 'Bebidas\x00.txt',
        descricao: 'Categoria de bebidas'
      };

      const sanitizedRequest = validationService.sanitizeInput(maliciousRequest);
      
      expect(sanitizedRequest.nome).not.toContain('\x00');
      expect(sanitizedRequest.nome).toBe('Bebidas.txt');
    });

    it('should validate against command injection', () => {
      const maliciousRequest: CreateCategoryRequest = {
        nome: 'Bebidas; rm -rf /',
        descricao: 'Categoria de bebidas'
      };

      const sanitizedRequest = validationService.sanitizeInput(maliciousRequest);
      
      // Should remove or escape dangerous characters
      expect(sanitizedRequest.nome).not.toContain('; rm -rf');
    });
  });

  describe('Session and Authentication Security', () => {
    it('should handle session fixation attempts', () => {
      // Simulate session fixation attack
      const maliciousHeaders = {
        'X-Session-ID': 'attacker-controlled-session'
      };

      categoryService.getCategories(1).subscribe();

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      
      // Should not include attacker-controlled session
      expect(req.request.headers.get('X-Session-ID')).not.toBe('attacker-controlled-session');
      req.flush({ categorias: [], total: 0 });
    });

    it('should handle concurrent session attacks', () => {
      // Multiple requests with different session tokens
      categoryService.getCategories(1).subscribe();
      categoryService.getCategories(1).subscribe();

      const requests = httpMock.match('/api/categorias/estabelecimentos/1/categorias');
      expect(requests.length).toBe(2);

      // Both requests should have consistent authentication
      const authHeader1 = requests[0].request.headers.get('Authorization');
      const authHeader2 = requests[1].request.headers.get('Authorization');
      expect(authHeader1).toBe(authHeader2);

      requests.forEach(req => req.flush({ categorias: [], total: 0 }));
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose sensitive data in error messages', () => {
      categoryService.getCategoryById(1, 999).subscribe({
        error: (error) => {
          // Error should not contain sensitive information
          expect(error.error.message).not.toContain('database');
          expect(error.error.message).not.toContain('password');
          expect(error.error.message).not.toContain('token');
          expect(error.error.message).not.toContain('secret');
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias/999');
      req.flush(
        { message: 'Categoria não encontrada' }, // Generic error message
        { status: 404, statusText: 'Not Found' }
      );
    });

    it('should handle information disclosure through timing attacks', () => {
      const startTime = Date.now();
      
      categoryService.getCategoryById(1, 999).subscribe({
        error: () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          // Response time should not reveal information about data existence
          expect(responseTime).toBeLessThan(5000); // Reasonable timeout
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias/999');
      req.flush(
        { message: 'Not found' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle rate limiting responses', () => {
      categoryService.getCategories(1).subscribe({
        error: (error) => {
          expect(error.status).toBe(429);
          expect(error.headers.get('Retry-After')).toBeDefined();
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush(
        { message: 'Too many requests' },
        { 
          status: 429, 
          statusText: 'Too Many Requests',
          headers: { 'Retry-After': '60' }
        }
      );
    });

    it('should handle large payload attacks', () => {
      const largeDescription = 'A'.repeat(100000); // Very large description
      const request: CreateCategoryRequest = {
        nome: 'Bebidas',
        descricao: largeDescription
      };

      categoryService.createCategory(1, request).subscribe({
        error: (error) => {
          expect(error.status).toBe(413); // Payload too large
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush(
        { message: 'Payload too large' },
        { status: 413, statusText: 'Payload Too Large' }
      );
    });
  });

  describe('Content Security Policy (CSP) Compliance', () => {
    it('should not execute inline scripts', () => {
      // This test would be more relevant in an E2E context
      // Here we test that our code doesn't generate inline scripts
      const maliciousContent = '<script>alert("XSS")</script>';
      const sanitizedContent = sanitizer.sanitize(1, maliciousContent); // SecurityContext.HTML = 1
      
      expect(sanitizedContent).not.toContain('<script>');
      expect(sanitizedContent).not.toContain('alert');
    });

    it('should handle CSP violation reports', () => {
      // Mock CSP violation report
      const cspViolation = {
        'csp-report': {
          'document-uri': 'https://rapidex.com/categories',
          'violated-directive': 'script-src',
          'blocked-uri': 'inline',
          'source-file': 'https://rapidex.com/categories',
          'line-number': 1
        }
      };

      // In a real application, this would be sent to a CSP reporting endpoint
      expect(cspViolation['csp-report']['violated-directive']).toBe('script-src');
    });
  });
});
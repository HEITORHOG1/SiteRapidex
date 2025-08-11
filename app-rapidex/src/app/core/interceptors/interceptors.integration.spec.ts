import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';

import { authTokenInterceptor } from './auth-token.interceptor';
import { errorInterceptor } from './error.interceptor';
import { apiResponseInterceptor } from './api-response.interceptor';
import { AuthService } from '../services/auth.service';

describe('Interceptors Integration', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['token', 'logout']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor, apiResponseInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('Auth Token Interceptor', () => {
    it('should add Bearer token to requests', () => {
      const token = 'test-token';
      mockAuthService.token.and.returnValue(token);

      httpClient.get('/api/data').subscribe();

      const req = httpTestingController.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({});
    });

    it('should not add token to auth endpoints', () => {
      httpClient.post('/api/Auth/login', {}).subscribe();

      const req = httpTestingController.expectOne('/api/Auth/login');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });

    it('should proceed without token when none available', () => {
      mockAuthService.token.and.returnValue(null);

      httpClient.get('/api/data').subscribe();

      const req = httpTestingController.expectOne('/api/data');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });
  });

  describe('API Response Interceptor', () => {
    it('should extract data from successful ApiResponse', () => {
      const responseData = { id: 1, name: 'Test' };
      const apiResponse = {
        success: true,
        message: 'Success',
        data: responseData,
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      httpClient.get('/api/data').subscribe(response => {
        expect(response).toEqual(responseData);
      });

      const req = httpTestingController.expectOne('/api/data');
      req.flush(apiResponse);
    });

    it('should throw error for unsuccessful ApiResponse', () => {
      const apiResponse = {
        success: false,
        message: 'Error occurred',
        data: null,
        errors: ['Validation failed', 'Invalid input'],
        timestamp: '2024-01-01T00:00:00Z'
      };

      httpClient.get('/api/data').subscribe({
        next: () => fail('Should not succeed'),
        error: (error: Error) => {
          expect(error.message).toBe('Validation failed, Invalid input');
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      req.flush(apiResponse);
    });

    it('should pass through non-ApiResponse format', () => {
      const regularResponse = { data: 'regular response' };

      httpClient.get('/api/data').subscribe(response => {
        expect(response).toEqual(regularResponse);
      });

      const req = httpTestingController.expectOne('/api/data');
      req.flush(regularResponse);
    });
  });

  describe('Error Interceptor', () => {
    it('should handle 401 errors by logging out', () => {
      httpClient.get('/api/data').subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Sessão expirada. Faça login novamente.');
          expect(mockAuthService.logout).toHaveBeenCalled();
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle network errors', () => {
      httpClient.get('/api/data').subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Erro de conexão. Verifique sua internet.');
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      req.error(new ProgressEvent('Network error'), { status: 0 });
    });

    it('should handle server errors', () => {
      httpClient.get('/api/data').subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Erro interno do servidor. Tente novamente.');
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle 403 forbidden errors', () => {
      httpClient.get('/api/data').subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Acesso negado.');
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Combined Interceptor Flow', () => {
    it('should apply all interceptors in correct order', () => {
      const token = 'test-token';
      const responseData = { id: 1, name: 'Test' };
      const apiResponse = {
        success: true,
        message: 'Success',
        data: responseData,
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockAuthService.token.and.returnValue(token);

      httpClient.get('/api/data').subscribe(response => {
        expect(response).toEqual(responseData);
      });

      const req = httpTestingController.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush(apiResponse);
    });

    it('should handle errors through all interceptors', () => {
      const token = 'test-token';
      mockAuthService.token.and.returnValue(token);

      httpClient.get('/api/data').subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Sessão expirada. Faça login novamente.');
          expect(mockAuthService.logout).toHaveBeenCalled();
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });
  });
});
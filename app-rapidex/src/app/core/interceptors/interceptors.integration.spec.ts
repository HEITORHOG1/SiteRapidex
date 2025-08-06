import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';

import { authTokenInterceptor } from './auth-token.interceptor';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { ErrorCodes, LoginResponse } from '../../data-access/models/auth.models';

describe('Interceptors Integration', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'token',
      'shouldRefreshToken',
      'isLoading',
      'refreshToken',
      'hasRefreshToken',
      'logout'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor, errorInterceptor])),
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
      mockAuthService.shouldRefreshToken.and.returnValue(false);

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
  });

  describe('Error Interceptor', () => {
    it('should handle 401 errors by logging out', () => {
      mockAuthService.hasRefreshToken.and.returnValue(false);

      httpClient.get('/api/data').subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(mockAuthService.logout).toHaveBeenCalled();
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });

    it('should map network errors correctly', () => {
      httpClient.get('/api/data').subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
          expect(error.message).toBe('Erro de conexão. Verifique sua internet.');
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      req.error(new ProgressEvent('Network error'), { status: 0 });
    });

    it('should map server errors correctly', () => {
      httpClient.get('/api/data').subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
          expect(error.message).toBe('Erro interno do servidor. Tente novamente.');
        }
      });

      const req = httpTestingController.expectOne('/api/data');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh token and retry request on 401', () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';
      
      mockAuthService.token.and.returnValues(oldToken, newToken);
      mockAuthService.hasRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.refreshToken.and.returnValue(of({
        token: newToken,
        refreshToken: 'new-refresh-token',
        expiresAt: '2024-12-31T23:59:59Z',
        roles: [],
        user: { id: '1', userName: 'test', email: 'test@test.com', nomeUsuario: 'Test' }
      }));

      httpClient.get('/api/data').subscribe(response => {
        expect(response).toEqual({ success: true });
      });

      // First request fails with 401
      const req1 = httpTestingController.expectOne('/api/data');
      req1.flush({}, { status: 401, statusText: 'Unauthorized' });

      // Second request (retry) should succeed
      const req2 = httpTestingController.expectOne('/api/data');
      expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req2.flush({ success: true });

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });

    it('should handle token refresh before request when token needs refresh', () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';
      
      mockAuthService.token.and.returnValues(oldToken, newToken);
      mockAuthService.shouldRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.refreshToken.and.returnValue(of({
        token: newToken,
        refreshToken: 'new-refresh-token',
        expiresAt: '2024-12-31T23:59:59Z',
        roles: [],
        user: { id: '1', userName: 'test', email: 'test@test.com', nomeUsuario: 'Test' }
      }));

      httpClient.get('/api/data').subscribe(response => {
        expect(response).toEqual({ success: true });
      });

      // Only one request should be made with the new token
      const req = httpTestingController.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req.flush({ success: true });

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });

    it('should handle refresh failure and proceed with original token', () => {
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));

      httpClient.get('/api/data').subscribe(response => {
        expect(response).toEqual({ success: true });
      });

      // Request should proceed with original token
      const req = httpTestingController.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ success: true });

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });
  });

  describe('Retry Logic Integration', () => {
    it('should retry network errors with exponential backoff', fakeAsync(() => {
      let callCount = 0;
      let completed = false;

      httpClient.get('/api/data').subscribe({
        next: (response) => {
          expect(response).toEqual({ success: true });
          completed = true;
        },
        error: () => {
          completed = true;
        }
      });

      // First request fails
      const req1 = httpTestingController.expectOne('/api/data');
      req1.error(new ProgressEvent('Network error'), { status: 0 });
      
      tick(1000); // Wait for first retry delay
      
      // Second request fails
      const req2 = httpTestingController.expectOne('/api/data');
      req2.error(new ProgressEvent('Network error'), { status: 0 });
      
      tick(2000); // Wait for second retry delay
      
      // Third request succeeds
      const req3 = httpTestingController.expectOne('/api/data');
      req3.flush({ success: true });
      
      tick(1000); // Allow completion
      
      expect(completed).toBeTrue();
    }));

    it('should not retry auth endpoints', () => {
      httpClient.post('/api/Auth/login', {}).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
        }
      });

      const req = httpTestingController.expectOne('/api/Auth/login');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      // Should not expect any retry requests
      httpTestingController.verify();
    });

    it('should handle multiple concurrent requests with retries', fakeAsync(() => {
      let completedRequests = 0;

      // Make multiple concurrent requests
      httpClient.get('/api/data1').subscribe({
        next: () => { completedRequests++; },
        error: () => { completedRequests++; }
      });
      
      httpClient.get('/api/data2').subscribe({
        next: () => { completedRequests++; },
        error: () => { completedRequests++; }
      });

      // Both requests fail initially
      const req1 = httpTestingController.expectOne('/api/data1');
      const req2 = httpTestingController.expectOne('/api/data2');
      req1.error(new ProgressEvent('Network error'), { status: 0 });
      req2.error(new ProgressEvent('Network error'), { status: 0 });
      
      tick(1000); // Wait for retry delay
      
      // Both requests succeed on retry
      const retryReq1 = httpTestingController.expectOne('/api/data1');
      const retryReq2 = httpTestingController.expectOne('/api/data2');
      retryReq1.flush({ data: 'data1' });
      retryReq2.flush({ data: 'data2' });
      
      tick(1000); // Allow completion
      
      expect(completedRequests).toBe(2);
    }));
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle token refresh during retry attempts', fakeAsync(() => {
      const oldToken = 'old-token';
      const newToken = 'new-token';
      
      mockAuthService.token.and.returnValues(oldToken, newToken);
      mockAuthService.hasRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.refreshToken.and.returnValue(of({
        token: newToken,
        refreshToken: 'new-refresh-token',
        expiresAt: '2024-12-31T23:59:59Z',
        roles: [],
        user: { id: '1', userName: 'test', email: 'test@test.com', nomeUsuario: 'Test' }
      }));

      let completed = false;
      httpClient.get('/api/data').subscribe({
        next: (response) => {
          expect(response).toEqual({ success: true });
          completed = true;
        }
      });

      // First request fails with 401
      const req1 = httpTestingController.expectOne('/api/data');
      req1.flush({}, { status: 401, statusText: 'Unauthorized' });

      // Token refresh happens, then retry with new token
      const req2 = httpTestingController.expectOne('/api/data');
      expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req2.flush({ success: true });

      expect(completed).toBeTrue();
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    }));

    it('should handle concurrent requests with mixed success/failure', () => {
      const token = 'test-token';
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);

      let successCount = 0;
      let errorCount = 0;

      // Make multiple requests
      httpClient.get('/api/success').subscribe({
        next: () => { successCount++; }
      });
      
      httpClient.get('/api/error').subscribe({
        error: (error) => { 
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
          errorCount++; 
        }
      });

      // Handle requests
      const successReq = httpTestingController.expectOne('/api/success');
      const errorReq = httpTestingController.expectOne('/api/error');
      
      successReq.flush({ success: true });
      errorReq.flush({}, { status: 500, statusText: 'Internal Server Error' });

      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);
    });

    it('should handle logout during concurrent requests', () => {
      mockAuthService.hasRefreshToken.and.returnValue(false);

      let errorCount = 0;

      // Make multiple requests that will fail with 401
      httpClient.get('/api/data1').subscribe({
        error: (error) => { 
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          errorCount++; 
        }
      });
      
      httpClient.get('/api/data2').subscribe({
        error: (error) => { 
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          errorCount++; 
        }
      });

      // Both requests fail with 401
      const req1 = httpTestingController.expectOne('/api/data1');
      const req2 = httpTestingController.expectOne('/api/data2');
      req1.flush({}, { status: 401, statusText: 'Unauthorized' });
      req2.flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(errorCount).toBe(2);
      expect(mockAuthService.logout).toHaveBeenCalledTimes(2);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid successive requests efficiently', () => {
      const token = 'test-token';
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);

      const requestCount = 10;
      let completedCount = 0;

      // Make multiple rapid requests
      for (let i = 0; i < requestCount; i++) {
        httpClient.get(`/api/data${i}`).subscribe({
          next: () => { completedCount++; }
        });
      }

      // Handle all requests
      for (let i = 0; i < requestCount; i++) {
        const req = httpTestingController.expectOne(`/api/data${i}`);
        expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
        req.flush({ data: `data${i}` });
      }

      expect(completedCount).toBe(requestCount);
    });

    it('should handle requests with large payloads', () => {
      const token = 'test-token';
      const largePayload = { data: 'x'.repeat(10000) }; // Large payload
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);

      let completed = false;
      httpClient.post('/api/data', largePayload).subscribe({
        next: () => { completed = true; }
      });

      const req = httpTestingController.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      expect(req.request.body).toEqual(largePayload);
      req.flush({ success: true });

      expect(completed).toBeTrue();
    });

    it('should handle requests with custom headers', () => {
      const token = 'test-token';
      const customHeaders = {
        'X-Custom-Header': 'custom-value',
        'Content-Type': 'application/json'
      };
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);

      httpClient.get('/api/data', { headers: customHeaders }).subscribe();

      const req = httpTestingController.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      expect(req.request.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush({ success: true });
    });
  });
});
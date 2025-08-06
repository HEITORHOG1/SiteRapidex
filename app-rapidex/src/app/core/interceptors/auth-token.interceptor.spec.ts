import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandler, HttpResponse, HttpHeaders } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthService } from '../services/auth.service';
import { LoginResponse } from '../../data-access/models/auth.models';

describe('AuthTokenInterceptor', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNext: jasmine.SpyObj<HttpHandler>;
  let interceptor: HttpInterceptorFn;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'token',
      'shouldRefreshToken',
      'isLoading',
      'refreshToken'
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockNext = jasmine.createSpyObj('HttpHandler', ['handle']);
    interceptor = authTokenInterceptor;
  });

  describe('Auth endpoints', () => {
    it('should skip auth for login endpoint', () => {
      const req = new HttpRequest('POST', '/api/Auth/login', {});
      const mockResponse = new HttpResponse({ status: 200 });
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockNext.handle).toHaveBeenCalledWith(req);
      expect(mockAuthService.token).not.toHaveBeenCalled();
    });

    it('should skip auth for refresh token endpoint', () => {
      const req = new HttpRequest('POST', '/api/Auth/refresh-token', {});
      const mockResponse = new HttpResponse({ status: 200 });
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockNext.handle).toHaveBeenCalledWith(req);
      expect(mockAuthService.token).not.toHaveBeenCalled();
    });

    it('should skip auth for register endpoint', () => {
      const req = new HttpRequest('POST', '/api/Auth/register', {});
      const mockResponse = new HttpResponse({ status: 200 });
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockNext.handle).toHaveBeenCalledWith(req);
      expect(mockAuthService.token).not.toHaveBeenCalled();
    });
  });

  describe('Token handling', () => {
    it('should proceed without auth when no token is available', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      mockAuthService.token.and.returnValue(null);
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockNext.handle).toHaveBeenCalledWith(req);
      expect(req.headers.has('Authorization')).toBeFalse();
    });

    it('should add Bearer token to request when token is available', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockNext.handle).toHaveBeenCalledWith(
        jasmine.objectContaining({
          headers: jasmine.objectContaining({
            lazyInit: jasmine.any(Function)
          })
        })
      );
    });

    it('should refresh token when token needs refresh', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
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
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(mockNext.handle).toHaveBeenCalled();
    });

    it('should proceed with original token when refresh fails', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(mockNext.handle).toHaveBeenCalled();
    });

    it('should not refresh token when already loading', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(true);
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockNext.handle).toHaveBeenCalled();
    });

    it('should proceed without auth when refresh returns no token', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      const oldToken = 'old-token';
      
      mockAuthService.token.and.returnValues(oldToken, null);
      mockAuthService.shouldRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.refreshToken.and.returnValue(of({
        token: '',
        refreshToken: '',
        expiresAt: '',
        roles: [],
        user: { id: '', userName: '', email: '', nomeUsuario: '' }
      }));
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(mockNext.handle).toHaveBeenCalledWith(req);
    });
  });

  describe('Request Header Manipulation', () => {
    it('should preserve existing headers when adding authorization', () => {
      const req = new HttpRequest('GET', '/api/data', null, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value'
        })
      });
      const mockResponse = new HttpResponse({ status: 200 });
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);
      
      let capturedRequest: HttpRequest<any> | undefined;
      mockNext.handle.and.callFake((request) => {
        capturedRequest = request;
        return of(mockResponse);
      });

      interceptor(req, mockNext.handle).subscribe();

      expect(capturedRequest!.headers.get('Authorization')).toBe(`Bearer ${token}`);
      expect(capturedRequest!.headers.get('Content-Type')).toBe('application/json');
      expect(capturedRequest!.headers.get('X-Custom-Header')).toBe('custom-value');
    });

    it('should not modify original request object', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(req.headers.has('Authorization')).toBeFalse();
    });

    it('should handle requests with existing Authorization header', () => {
      const req = new HttpRequest('GET', '/api/data', null, {
        headers: new HttpHeaders({
          'Authorization': 'Basic old-auth'
        })
      });
      const mockResponse = new HttpResponse({ status: 200 });
      const token = 'new-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);
      
      let capturedRequest: HttpRequest<any> | undefined;
      mockNext.handle.and.callFake((request) => {
        capturedRequest = request;
        return of(mockResponse);
      });

      interceptor(req, mockNext.handle).subscribe();

      expect(capturedRequest!.headers.get('Authorization')).toBe(`Bearer ${token}`);
    });
  });

  describe('Concurrent Refresh Scenarios', () => {
    it('should handle multiple requests during token refresh', (done) => {
      const req1 = new HttpRequest('GET', '/api/data1');
      const req2 = new HttpRequest('GET', '/api/data2');
      const mockResponse1 = new HttpResponse({ status: 200, body: { data: 'data1' } });
      const mockResponse2 = new HttpResponse({ status: 200, body: { data: 'data2' } });
      const oldToken = 'old-token';
      const newToken = 'new-token';
      
      mockAuthService.token.and.returnValues(oldToken, oldToken, newToken, newToken);
      mockAuthService.shouldRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      
      const refreshSubject = new Subject<LoginResponse>();
      mockAuthService.refreshToken.and.returnValue(refreshSubject.asObservable());
      
      let completedRequests = 0;
      const responses: any[] = [];
      
      mockNext.handle.and.callFake((request) => {
        if (request.url.includes('data1')) {
          return of(mockResponse1);
        } else {
          return of(mockResponse2);
        }
      });

      const checkCompletion = (response: any) => {
        responses.push(response);
        completedRequests++;
        if (completedRequests === 2) {
          expect(responses).toContain(mockResponse1);
          expect(responses).toContain(mockResponse2);
          expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(2); // Each request triggers refresh
          done();
        }
      };

      // Make concurrent requests
      interceptor(req1, mockNext.handle).subscribe({ next: checkCompletion });
      interceptor(req2, mockNext.handle).subscribe({ next: checkCompletion });

      // Complete the refresh
      refreshSubject.next({
        token: newToken,
        refreshToken: 'new-refresh-token',
        expiresAt: '2024-12-31T23:59:59Z',
        roles: [],
        user: { id: '1', userName: 'test', email: 'test@test.com', nomeUsuario: 'Test' }
      });
      refreshSubject.complete();
    });

    it('should handle refresh failure during concurrent requests', (done) => {
      const req1 = new HttpRequest('GET', '/api/data1');
      const req2 = new HttpRequest('GET', '/api/data2');
      const mockResponse1 = new HttpResponse({ status: 200 });
      const mockResponse2 = new HttpResponse({ status: 200 });
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));
      
      let completedRequests = 0;
      
      mockNext.handle.and.callFake((request) => {
        if (request.url.includes('data1')) {
          return of(mockResponse1);
        } else {
          return of(mockResponse2);
        }
      });

      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === 2) {
          expect(mockNext.handle).toHaveBeenCalledTimes(2);
          done();
        }
      };

      // Both requests should proceed with original token after refresh failure
      interceptor(req1, mockNext.handle).subscribe({ next: checkCompletion });
      interceptor(req2, mockNext.handle).subscribe({ next: checkCompletion });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null token gracefully', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      
      mockAuthService.token.and.returnValue(null);
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockNext.handle).toHaveBeenCalledWith(req);
      expect(mockAuthService.shouldRefreshToken).not.toHaveBeenCalled();
    });

    it('should handle empty token gracefully', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      
      mockAuthService.token.and.returnValue('');
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockNext.handle).toHaveBeenCalledWith(req);
    });

    it('should handle undefined token gracefully', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      
      mockAuthService.token.and.returnValue(undefined as any);
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockNext.handle).toHaveBeenCalledWith(req);
    });

    it('should handle service loading state correctly', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(true); // Service is loading
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe();

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockNext.handle).toHaveBeenCalled();
    });

    it('should handle different HTTP methods correctly', () => {
      const methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);
      
      methods.forEach(method => {
        let req: HttpRequest<any>;
        if (method === 'GET' || method === 'DELETE') {
          req = new HttpRequest(method, '/api/data');
        } else {
          req = new HttpRequest(method, '/api/data', {});
        }
        const mockResponse = new HttpResponse({ status: 200 });
        mockNext.handle.and.returnValue(of(mockResponse));

        let capturedRequest: HttpRequest<any> | undefined;
        mockNext.handle.and.callFake((request) => {
          capturedRequest = request;
          return of(mockResponse);
        });

        interceptor(req, mockNext.handle).subscribe();

        expect(capturedRequest!.headers.get('Authorization')).toBe(`Bearer ${token}`);
      });
    });

    it('should handle requests with different content types', () => {
      const contentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ];
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);
      
      contentTypes.forEach(contentType => {
        const req = new HttpRequest('POST', '/api/data', {}, {
          headers: new HttpHeaders({ 'Content-Type': contentType })
        });
        const mockResponse = new HttpResponse({ status: 200 });
        
        let capturedRequest: HttpRequest<any> | undefined;
        mockNext.handle.and.callFake((request) => {
          capturedRequest = request;
          return of(mockResponse);
        });

        interceptor(req, mockNext.handle).subscribe();

        expect(capturedRequest!.headers.get('Authorization')).toBe(`Bearer ${token}`);
        expect(capturedRequest!.headers.get('Content-Type')).toBe(contentType);
      });
    });
  });

  describe('URL Pattern Matching', () => {
    it('should correctly identify auth endpoints with different base URLs', () => {
      const authUrls = [
        'http://localhost:5283/api/Auth/login',
        'https://api.example.com/api/Auth/login',
        '/api/Auth/login',
        'http://localhost:5283/api/Auth/refresh-token',
        'https://api.example.com/api/Auth/refresh-token',
        '/api/Auth/refresh-token',
        'http://localhost:5283/api/Auth/register',
        'https://api.example.com/api/Auth/register',
        '/api/Auth/register'
      ];
      
      authUrls.forEach(url => {
        const req = new HttpRequest('POST', url, {});
        const mockResponse = new HttpResponse({ status: 200 });
        mockNext.handle.and.returnValue(of(mockResponse));

        interceptor(req, mockNext.handle).subscribe();

        expect(mockNext.handle).toHaveBeenCalledWith(req);
        expect(mockAuthService.token).not.toHaveBeenCalled();
      });
    });

    it('should not treat similar URLs as auth endpoints', () => {
      const nonAuthUrls = [
        '/api/Authentication/login', // Different path
        '/api/Auth/login/verify', // Additional path segment
        '/api/user/login', // Different controller
        '/api/Auth/logout' // Different action
      ];
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      mockAuthService.shouldRefreshToken.and.returnValue(false);
      
      nonAuthUrls.forEach(url => {
        const req = new HttpRequest('POST', url, {});
        const mockResponse = new HttpResponse({ status: 200 });
        
        let capturedRequest: HttpRequest<any> | undefined;
        mockNext.handle.and.callFake((request) => {
          capturedRequest = request;
          return of(mockResponse);
        });

        interceptor(req, mockNext.handle).subscribe();

        expect(capturedRequest!.headers.get('Authorization')).toBe(`Bearer ${token}`);
      });
    });
  });
});
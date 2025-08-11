import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandler, HttpResponse, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthService } from '../services/auth.service';

describe('AuthTokenInterceptor', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNext: jasmine.SpyObj<HttpHandler>;
  let interceptor: HttpInterceptorFn;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['token']);

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



    it('should handle different HTTP methods correctly', () => {
      const methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const token = 'test-token';
      
      mockAuthService.token.and.returnValue(token);
      
      methods.forEach(method => {
        let req: HttpRequest<any>;
        if (method === 'GET') {
          req = new HttpRequest(method, '/api/data');
        } else if (method === 'DELETE') {
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
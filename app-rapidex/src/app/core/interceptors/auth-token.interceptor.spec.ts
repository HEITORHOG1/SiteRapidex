import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandler, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthService } from '../services/auth.service';

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
});
import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandler, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { ErrorCodes, ApiError } from '../../data-access/models/auth.models';

describe('ErrorInterceptor', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockNext: jasmine.SpyObj<HttpHandler>;
  let interceptor: HttpInterceptorFn;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'hasRefreshToken',
      'isLoading',
      'refreshToken',
      'logout',
      'token'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockNext = jasmine.createSpyObj('HttpHandler', ['handle']);
    interceptor = errorInterceptor;
  });

  describe('Successful requests', () => {
    it('should pass through successful requests', () => {
      const req = new HttpRequest('GET', '/api/data');
      const mockResponse = new HttpResponse({ status: 200 });
      mockNext.handle.and.returnValue(of(mockResponse));

      interceptor(req, mockNext.handle).subscribe(response => {
        expect(response).toBe(mockResponse);
      });

      expect(mockNext.handle).toHaveBeenCalledWith(req);
    });
  });

  describe('Network errors', () => {
    it('should retry network errors with exponential backoff', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const networkError = new HttpErrorResponse({
        status: 0,
        statusText: 'Network Error'
      });
      const mockResponse = new HttpResponse({ status: 200 });

      let callCount = 0;
      mockNext.handle.and.callFake(() => {
        callCount++;
        if (callCount <= 2) {
          return throwError(() => networkError);
        }
        return of(mockResponse);
      });

      interceptor(req, mockNext.handle).subscribe({
        next: (response) => {
          expect(response).toBe(mockResponse);
          expect(callCount).toBe(3); // Original + 2 retries
          done();
        },
        error: () => {
          fail('Should not error when retry succeeds');
          done();
        }
      });
    });

    it('should fail after maximum retries for network errors', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const networkError = new HttpErrorResponse({
        status: 0,
        statusText: 'Network Error'
      });

      mockNext.handle.and.returnValue(throwError(() => networkError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
          expect(error.message).toBe('Erro de conexão. Verifique sua internet.');
          done();
        }
      });
    });
  });

  describe('Server errors', () => {
    it('should retry 5xx server errors', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const serverError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });
      const mockResponse = new HttpResponse({ status: 200 });

      let callCount = 0;
      mockNext.handle.and.callFake(() => {
        callCount++;
        if (callCount <= 1) {
          return throwError(() => serverError);
        }
        return of(mockResponse);
      });

      interceptor(req, mockNext.handle).subscribe({
        next: (response) => {
          expect(response).toBe(mockResponse);
          expect(callCount).toBe(2); // Original + 1 retry
          done();
        },
        error: () => {
          fail('Should not error when retry succeeds');
          done();
        }
      });
    });

    it('should not retry auth endpoints', (done) => {
      const req = new HttpRequest('POST', '/api/Auth/login', {});
      const serverError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      mockNext.handle.and.returnValue(throwError(() => serverError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
          expect(mockNext.handle).toHaveBeenCalledTimes(1); // No retries
          done();
        }
      });
    });
  });

  describe('Unauthorized errors', () => {
    it('should refresh token and retry request on 401 error', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const unauthorizedError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });
      const mockResponse = new HttpResponse({ status: 200 });
      const newToken = 'new-token';

      mockAuthService.hasRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.token.and.returnValue(newToken);
      mockAuthService.refreshToken.and.returnValue(of({
        token: newToken,
        refreshToken: 'new-refresh-token',
        expiresAt: '2024-12-31T23:59:59Z',
        roles: [],
        user: { id: '1', userName: 'test', email: 'test@test.com', nomeUsuario: 'Test' }
      }));

      let callCount = 0;
      mockNext.handle.and.callFake((request) => {
        callCount++;
        if (callCount === 1) {
          return throwError(() => unauthorizedError);
        }
        // Second call should have the new token
        expect(request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
        return of(mockResponse);
      });

      interceptor(req, mockNext.handle).subscribe({
        next: (response) => {
          expect(response).toBe(mockResponse);
          expect(mockAuthService.refreshToken).toHaveBeenCalled();
          expect(callCount).toBe(2);
          done();
        },
        error: () => {
          fail('Should not error when refresh succeeds');
          done();
        }
      });
    });

    it('should logout and redirect when refresh token fails', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const unauthorizedError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });

      mockAuthService.hasRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));
      mockNext.handle.and.returnValue(throwError(() => unauthorizedError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(mockAuthService.logout).toHaveBeenCalled();
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        }
      });
    });

    it('should logout immediately when no refresh token available', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const unauthorizedError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });

      mockAuthService.hasRefreshToken.and.returnValue(false);
      mockNext.handle.and.returnValue(throwError(() => unauthorizedError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(mockAuthService.logout).toHaveBeenCalled();
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
          expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should not try to refresh token for auth endpoints', (done) => {
      const req = new HttpRequest('POST', '/api/Auth/login', {});
      const unauthorizedError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });

      mockNext.handle.and.returnValue(throwError(() => unauthorizedError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should logout when refresh returns no token', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const unauthorizedError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });

      mockAuthService.hasRefreshToken.and.returnValue(true);
      mockAuthService.isLoading.and.returnValue(false);
      mockAuthService.token.and.returnValue(null);
      mockAuthService.refreshToken.and.returnValue(of({
        token: '',
        refreshToken: '',
        expiresAt: '',
        roles: [],
        user: { id: '', userName: '', email: '', nomeUsuario: '' }
      }));
      mockNext.handle.and.returnValue(throwError(() => unauthorizedError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(mockAuthService.logout).toHaveBeenCalled();
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        }
      });
    });
  });

  describe('Token expired errors', () => {
    it('should logout and redirect on token expired error', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const tokenExpiredError = new HttpErrorResponse({
        status: 401,
        statusText: 'Token Expired',
        error: { code: 'TOKEN_EXPIRED' }
      });

      mockNext.handle.and.returnValue(throwError(() => tokenExpiredError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(mockAuthService.logout).toHaveBeenCalled();
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        }
      });
    });
  });

  describe('Other errors', () => {
    it('should map 400 errors to validation errors', (done) => {
      const req = new HttpRequest('POST', '/api/data', {});
      const validationError = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid data' }
      });

      mockNext.handle.and.returnValue(throwError(() => validationError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
          expect(error.message).toBe('Invalid data');
          done();
        }
      });
    });

    it('should map 422 errors to validation errors', (done) => {
      const req = new HttpRequest('POST', '/api/data', {});
      const validationError = new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity'
      });

      mockNext.handle.and.returnValue(throwError(() => validationError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
          expect(error.message).toBe('Erro de validação.');
          done();
        }
      });
    });

    it('should map unknown errors to server errors', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const unknownError = new HttpErrorResponse({
        status: 418,
        statusText: "I'm a teapot"
      });

      mockNext.handle.and.returnValue(throwError(() => unknownError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
          expect(error.message).toBe('Erro inesperado.');
          done();
        }
      });
    });
  });

  describe('Retry logic', () => {
    it('should retry on 408 timeout errors', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const timeoutError = new HttpErrorResponse({
        status: 408,
        statusText: 'Request Timeout'
      });
      const mockResponse = new HttpResponse({ status: 200 });

      let callCount = 0;
      mockNext.handle.and.callFake(() => {
        callCount++;
        if (callCount <= 1) {
          return throwError(() => timeoutError);
        }
        return of(mockResponse);
      });

      interceptor(req, mockNext.handle).subscribe({
        next: (response) => {
          expect(response).toBe(mockResponse);
          expect(callCount).toBe(2);
          done();
        },
        error: () => {
          fail('Should not error when retry succeeds');
          done();
        }
      });
    });

    it('should retry on 429 too many requests errors', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const tooManyRequestsError = new HttpErrorResponse({
        status: 429,
        statusText: 'Too Many Requests'
      });
      const mockResponse = new HttpResponse({ status: 200 });

      let callCount = 0;
      mockNext.handle.and.callFake(() => {
        callCount++;
        if (callCount <= 1) {
          return throwError(() => tooManyRequestsError);
        }
        return of(mockResponse);
      });

      interceptor(req, mockNext.handle).subscribe({
        next: (response) => {
          expect(response).toBe(mockResponse);
          expect(callCount).toBe(2);
          done();
        },
        error: () => {
          fail('Should not error when retry succeeds');
          done();
        }
      });
    });
  });
});
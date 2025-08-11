import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandler, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';

describe('ErrorInterceptor', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockNext: jasmine.SpyObj<HttpHandler>;
  let interceptor: HttpInterceptorFn;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);
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
    it('should handle network errors with appropriate message', (done) => {
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
        error: (error: Error) => {
          expect(error.message).toBe('Erro de conexão. Verifique sua internet.');
          done();
        }
      });
    });
  });

  describe('Unauthorized errors', () => {
    it('should logout and redirect on 401 error', (done) => {
      const req = new HttpRequest('GET', '/api/data');
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
        error: (error: Error) => {
          expect(error.message).toBe('Sessão expirada. Faça login novamente.');
          expect(mockAuthService.logout).toHaveBeenCalled();
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        }
      });
    });
  });

  describe('Other HTTP errors', () => {
    it('should handle 403 forbidden errors', (done) => {
      const req = new HttpRequest('GET', '/api/data');
      const forbiddenError = new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden'
      });

      mockNext.handle.and.returnValue(throwError(() => forbiddenError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: Error) => {
          expect(error.message).toBe('Acesso negado.');
          done();
        }
      });
    });

    it('should handle 400 bad request errors', (done) => {
      const req = new HttpRequest('POST', '/api/data', {});
      const badRequestError = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid data' }
      });

      mockNext.handle.and.returnValue(throwError(() => badRequestError));

      interceptor(req, mockNext.handle).subscribe({
        next: () => {
          fail('Should not succeed');
          done();
        },
        error: (error: Error) => {
          expect(error.message).toBe('Invalid data');
          done();
        }
      });
    });

    it('should handle 500 server errors', (done) => {
      const req = new HttpRequest('GET', '/api/data');
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
        error: (error: Error) => {
          expect(error.message).toBe('Erro interno do servidor. Tente novamente.');
          done();
        }
      });
    });

    it('should handle unknown errors', (done) => {
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
        error: (error: Error) => {
          expect(error.message).toBe('Erro desconhecido');
          done();
        }
      });
    });
  });
});
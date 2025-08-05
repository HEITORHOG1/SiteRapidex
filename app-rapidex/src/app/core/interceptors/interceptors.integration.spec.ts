import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { authTokenInterceptor } from './auth-token.interceptor';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { ErrorCodes } from '../../data-access/models/auth.models';

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
  });
});
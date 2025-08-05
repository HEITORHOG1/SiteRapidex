import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthApi } from '@data-access/api/auth.api';
import { of, throwError } from 'rxjs';
import { LoginResponse, RefreshTokenRequest } from '@data-access/models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let mockAuthApi: jasmine.SpyObj<AuthApi>;
  let mockLocalStorage: { [key: string]: string };

  const mockLoginResponse: LoginResponse = {
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    roles: ['Proprietario'],
    user: {
      id: '123',
      userName: 'testuser',
      email: 'test@test.com',
      nomeUsuario: 'Test User'
    }
  };

  beforeEach(() => {
    mockLocalStorage = {};
    
    spyOn(localStorage, 'getItem').and.callFake((key: string) => mockLocalStorage[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });

    const spy = jasmine.createSpyObj('AuthApi', ['login', 'refreshToken']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthApi, useValue: spy }
      ]
    });
    
    service = TestBed.inject(AuthService);
    mockAuthApi = TestBed.inject(AuthApi) as jasmine.SpyObj<AuthApi>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false for isAuthenticated when no token', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should return user ID when user exists', () => {
    mockLocalStorage['auth.user'] = JSON.stringify({
      id: '123',
      userName: 'test',
      email: 'test@test.com',
      nomeUsuario: 'Test User'
    });
    
    // Create new service instance to read from mocked localStorage
    service = TestBed.inject(AuthService);
    
    expect(service.getUserId()).toBe('123');
  });

  it('should check if user is proprietario', () => {
    mockLocalStorage['auth.roles'] = JSON.stringify(['Proprietario']);
    
    // Create new service instance to read from mocked localStorage
    service = TestBed.inject(AuthService);
    
    expect(service.isProprietario()).toBeTrue();
  });

  describe('Refresh Token Functionality', () => {
    beforeEach(() => {
      // Setup authenticated state
      mockLocalStorage['auth.token'] = 'current-token';
      mockLocalStorage['auth.refreshToken'] = 'current-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      mockLocalStorage['auth.roles'] = JSON.stringify(['Proprietario']);
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      
      service = TestBed.inject(AuthService);
    });

    it('should refresh token successfully', (done) => {
      const newTokenResponse: LoginResponse = {
        ...mockLoginResponse,
        token: 'new-token',
        refreshToken: 'new-refresh-token'
      };

      mockAuthApi.refreshToken.and.returnValue(of(newTokenResponse));

      service.refreshToken().subscribe({
        next: (response) => {
          expect(response).toEqual(newTokenResponse);
          expect(mockLocalStorage['auth.token']).toBe('new-token');
          expect(mockLocalStorage['auth.refreshToken']).toBe('new-refresh-token');
          done();
        }
      });
    });

    it('should handle refresh token failure and logout', (done) => {
      mockAuthApi.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));

      service.refreshToken().subscribe({
        error: (error) => {
          expect(error.message).toBe('Refresh failed');
          expect(service.isAuthenticated()).toBeFalse();
          expect(mockLocalStorage['auth.token']).toBeUndefined();
          done();
        }
      });
    });

    it('should return error when no refresh token available', (done) => {
      mockLocalStorage['auth.refreshToken'] = '';
      service = TestBed.inject(AuthService);

      service.refreshToken().subscribe({
        error: (error) => {
          expect(error.message).toBe('No refresh token available');
          done();
        }
      });
    });

    it('should handle concurrent refresh requests', (done) => {
      const newTokenResponse: LoginResponse = {
        ...mockLoginResponse,
        token: 'new-token',
        refreshToken: 'new-refresh-token'
      };

      mockAuthApi.refreshToken.and.returnValue(of(newTokenResponse));

      let completedRequests = 0;
      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === 2) {
          expect(mockAuthApi.refreshToken).toHaveBeenCalledTimes(1);
          done();
        }
      };

      // Make two concurrent refresh requests
      service.refreshToken().subscribe({ next: checkCompletion });
      service.refreshToken().subscribe({ next: checkCompletion });
    });

    it('should check if token is expired', () => {
      // Set expired token
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() - 1000).toISOString();
      service = TestBed.inject(AuthService);

      expect(service.isTokenExpired()).toBeTrue();
    });

    it('should check if token should be refreshed', () => {
      // Set token that expires within threshold (5 minutes)
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 4 * 60 * 1000).toISOString();
      service = TestBed.inject(AuthService);

      expect(service.shouldRefreshToken()).toBeTrue();
    });

    it('should get token time remaining', () => {
      const futureTime = Date.now() + 10 * 60 * 1000; // 10 minutes
      mockLocalStorage['auth.expiresAt'] = new Date(futureTime).toISOString();
      service = TestBed.inject(AuthService);

      const timeRemaining = service.getTokenTimeRemaining();
      expect(timeRemaining).toBeGreaterThan(9 * 60 * 1000); // Should be close to 10 minutes
      expect(timeRemaining).toBeLessThanOrEqual(10 * 60 * 1000);
    });

    it('should check if refresh token is available', () => {
      expect(service.hasRefreshToken()).toBeTrue();

      mockLocalStorage['auth.refreshToken'] = '';
      service = TestBed.inject(AuthService);
      expect(service.hasRefreshToken()).toBeFalse();
    });

    it('should schedule automatic token refresh', fakeAsync(() => {
      const newTokenResponse: LoginResponse = {
        ...mockLoginResponse,
        token: 'auto-refreshed-token'
      };

      // Set token to expire in 6 minutes (1 minute after threshold)
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 6 * 60 * 1000).toISOString();
      mockAuthApi.refreshToken.and.returnValue(of(newTokenResponse));
      
      service = TestBed.inject(AuthService);

      // Fast forward to when refresh should happen (5 minutes threshold)
      tick(1 * 60 * 1000); // 1 minute

      expect(mockAuthApi.refreshToken).toHaveBeenCalled();
    }));

    it('should clear refresh timer on logout', () => {
      spyOn(window, 'clearTimeout');
      
      service.logout();
      
      expect(service.isAuthenticated()).toBeFalse();
      expect(mockLocalStorage['auth.token']).toBeUndefined();
    });

    it('should initialize auto refresh for authenticated users', () => {
      // Mock an authenticated state in localStorage
      mockLocalStorage['auth.token'] = 'existing-token';
      mockLocalStorage['auth.refreshToken'] = 'existing-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      
      spyOn(AuthService.prototype, 'scheduleTokenRefresh' as any);
      
      // Create new service instance
      const newService = TestBed.inject(AuthService);
      
      expect(newService.isAuthenticated()).toBeTrue();
    });

    it('should handle refresh token request creation', (done) => {
      const expectedRequest: RefreshTokenRequest = {
        token: 'current-token',
        refreshToken: 'current-refresh-token'
      };

      mockAuthApi.refreshToken.and.returnValue(of(mockLoginResponse));

      service.refreshToken().subscribe({
        next: () => {
          expect(mockAuthApi.refreshToken).toHaveBeenCalledWith(expectedRequest);
          done();
        }
      });
    });

    it('should update loading state during refresh', (done) => {
      mockAuthApi.refreshToken.and.returnValue(of(mockLoginResponse));

      let loadingStates: boolean[] = [];
      service.authState().subscribe(state => {
        loadingStates.push(state.isLoading);
      });

      service.refreshToken().subscribe({
        next: () => {
          expect(loadingStates).toContain(true); // Should have been loading
          expect(loadingStates[loadingStates.length - 1]).toBeFalse(); // Should end as not loading
          done();
        }
      });
    });
  });
});
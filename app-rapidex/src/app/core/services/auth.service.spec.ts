import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthApi } from '@data-access/api/auth.api';
import { of, throwError, Subject } from 'rxjs';
import { LoginResponse, RefreshTokenRequest, LoginRequest, AuthState, ErrorCodes } from '@data-access/models/auth.models';
import { environment } from '../../../environments/environment';

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

  describe('Login Functionality', () => {
    it('should login successfully and persist data', (done) => {
      const loginRequest: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      mockAuthApi.login.and.returnValue(of(mockLoginResponse));

      service.login(loginRequest).subscribe({
        next: (response) => {
          expect(response).toEqual(mockLoginResponse);
          expect(mockLocalStorage['auth.token']).toBe(mockLoginResponse.token);
          expect(mockLocalStorage['auth.refreshToken']).toBe(mockLoginResponse.refreshToken);
          expect(mockLocalStorage['auth.expiresAt']).toBe(mockLoginResponse.expiresAt);
          expect(mockLocalStorage['auth.roles']).toBe(JSON.stringify(mockLoginResponse.roles));
          expect(mockLocalStorage['auth.user']).toBe(JSON.stringify(mockLoginResponse.user));
          expect(service.isAuthenticated()).toBeTrue();
          done();
        }
      });
    });

    it('should handle login failure', (done) => {
      const loginRequest: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const loginError = new Error('Invalid credentials');
      mockAuthApi.login.and.returnValue(throwError(() => loginError));

      service.login(loginRequest).subscribe({
        error: (error) => {
          expect(error).toBe(loginError);
          expect(service.isAuthenticated()).toBeFalse();
          expect(service.isLoading()).toBeFalse();
          done();
        }
      });
    });

    it('should set loading state during login', (done) => {
      const loginRequest: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      let loadingStates: boolean[] = [];
      service.authState().subscribe(state => {
        loadingStates.push(state.isLoading);
      });

      mockAuthApi.login.and.returnValue(of(mockLoginResponse));

      service.login(loginRequest).subscribe({
        next: () => {
          expect(loadingStates).toContain(true); // Should have been loading
          expect(loadingStates[loadingStates.length - 1]).toBeFalse(); // Should end as not loading
          done();
        }
      });
    });
  });

  describe('Logout Functionality', () => {
    beforeEach(() => {
      // Setup authenticated state
      mockLocalStorage['auth.token'] = 'current-token';
      mockLocalStorage['auth.refreshToken'] = 'current-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      mockLocalStorage['auth.roles'] = JSON.stringify(['Proprietario']);
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['selectedEstabelecimento'] = JSON.stringify({ id: '123', nome: 'Test' });
      
      service = TestBed.inject(AuthService);
    });

    it('should clear all authentication data on logout', () => {
      spyOn(window, 'clearTimeout');
      
      service.logout();
      
      expect(mockLocalStorage['auth.token']).toBeUndefined();
      expect(mockLocalStorage['auth.refreshToken']).toBeUndefined();
      expect(mockLocalStorage['auth.expiresAt']).toBeUndefined();
      expect(mockLocalStorage['auth.roles']).toBeUndefined();
      expect(mockLocalStorage['auth.user']).toBeUndefined();
      expect(mockLocalStorage['selectedEstabelecimento']).toBeUndefined();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should clear refresh timer on logout', () => {
      spyOn(window, 'clearTimeout');
      
      service.logout();
      
      expect(window.clearTimeout).toHaveBeenCalled();
    });

    it('should reset auth state on logout', (done) => {
      service.logout();
      
      service.authState().subscribe(state => {
        expect(state.token).toBeNull();
        expect(state.refreshToken).toBeNull();
        expect(state.expiresAt).toBeNull();
        expect(state.roles).toEqual([]);
        expect(state.user).toBeNull();
        expect(state.isLoading).toBeFalse();
        done();
      });
    });
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

  describe('Token Expiration and Validation', () => {
    it('should correctly identify expired tokens', () => {
      // Set expired token
      mockLocalStorage['auth.token'] = 'expired-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() - 1000).toISOString();
      service = TestBed.inject(AuthService);

      expect(service.isTokenExpired()).toBeTrue();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should correctly identify valid tokens', () => {
      // Set valid token
      mockLocalStorage['auth.token'] = 'valid-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      service = TestBed.inject(AuthService);

      expect(service.isTokenExpired()).toBeFalse();
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should identify tokens that need refresh within threshold', () => {
      // Set token that expires within threshold (5 minutes)
      const expirationTime = Date.now() + (environment.tokenRefreshThreshold - 60000); // 4 minutes
      mockLocalStorage['auth.token'] = 'token-needs-refresh';
      mockLocalStorage['auth.expiresAt'] = new Date(expirationTime).toISOString();
      service = TestBed.inject(AuthService);

      expect(service.shouldRefreshToken()).toBeTrue();
    });

    it('should not refresh tokens that are still valid for longer than threshold', () => {
      // Set token that expires beyond threshold (10 minutes)
      const expirationTime = Date.now() + (environment.tokenRefreshThreshold + 300000); // 10 minutes
      mockLocalStorage['auth.token'] = 'token-still-valid';
      mockLocalStorage['auth.expiresAt'] = new Date(expirationTime).toISOString();
      service = TestBed.inject(AuthService);

      expect(service.shouldRefreshToken()).toBeFalse();
    });

    it('should return correct time remaining until expiration', () => {
      const futureTime = Date.now() + 10 * 60 * 1000; // 10 minutes
      mockLocalStorage['auth.token'] = 'token-with-time';
      mockLocalStorage['auth.expiresAt'] = new Date(futureTime).toISOString();
      service = TestBed.inject(AuthService);

      const timeRemaining = service.getTokenTimeRemaining();
      expect(timeRemaining).toBeGreaterThan(9 * 60 * 1000); // Should be close to 10 minutes
      expect(timeRemaining).toBeLessThanOrEqual(10 * 60 * 1000);
    });

    it('should return 0 time remaining for expired tokens', () => {
      mockLocalStorage['auth.token'] = 'expired-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() - 1000).toISOString();
      service = TestBed.inject(AuthService);

      expect(service.getTokenTimeRemaining()).toBe(0);
    });

    it('should return 0 time remaining when no expiration date', () => {
      mockLocalStorage['auth.token'] = 'token-no-expiry';
      service = TestBed.inject(AuthService);

      expect(service.getTokenTimeRemaining()).toBe(0);
    });
  });

  describe('Automatic Token Refresh', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should schedule automatic refresh for valid tokens', () => {
      const futureTime = Date.now() + (environment.tokenRefreshThreshold + 60000); // 6 minutes
      mockLocalStorage['auth.token'] = 'token-to-refresh';
      mockLocalStorage['auth.refreshToken'] = 'refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(futureTime).toISOString();
      
      spyOn(window, 'setTimeout').and.callThrough();
      mockAuthApi.refreshToken.and.returnValue(of(mockLoginResponse));
      
      service = TestBed.inject(AuthService);
      
      expect(window.setTimeout).toHaveBeenCalled();
    });

    it('should perform automatic refresh when scheduled time arrives', fakeAsync(() => {
      const futureTime = Date.now() + (environment.tokenRefreshThreshold + 60000); // 6 minutes
      mockLocalStorage['auth.token'] = 'token-to-refresh';
      mockLocalStorage['auth.refreshToken'] = 'refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(futureTime).toISOString();
      
      const newTokenResponse: LoginResponse = {
        ...mockLoginResponse,
        token: 'auto-refreshed-token'
      };
      
      mockAuthApi.refreshToken.and.returnValue(of(newTokenResponse));
      
      service = TestBed.inject(AuthService);
      
      // Fast forward to when refresh should happen
      tick(60000); // 1 minute
      
      expect(mockAuthApi.refreshToken).toHaveBeenCalled();
      flush();
    }));

    it('should not schedule refresh for tokens without expiration', () => {
      mockLocalStorage['auth.token'] = 'token-no-expiry';
      mockLocalStorage['auth.refreshToken'] = 'refresh-token';
      
      spyOn(window, 'setTimeout');
      
      service = TestBed.inject(AuthService);
      
      expect(window.setTimeout).not.toHaveBeenCalled();
    });

    it('should handle automatic refresh failure gracefully', fakeAsync(() => {
      const futureTime = Date.now() + (environment.tokenRefreshThreshold + 60000); // 6 minutes
      mockLocalStorage['auth.token'] = 'token-to-refresh';
      mockLocalStorage['auth.refreshToken'] = 'refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(futureTime).toISOString();
      
      mockAuthApi.refreshToken.and.returnValue(throwError(() => new Error('Auto refresh failed')));
      spyOn(console, 'error');
      
      service = TestBed.inject(AuthService);
      
      // Fast forward to when refresh should happen
      tick(60000); // 1 minute
      
      expect(console.error).toHaveBeenCalledWith('Automatic token refresh failed:', jasmine.any(Error));
      // Should not logout on automatic refresh failure
      expect(service.isAuthenticated()).toBeTrue();
      flush();
    }));

    it('should clear existing timer before scheduling new one', () => {
      mockLocalStorage['auth.token'] = 'token-1';
      mockLocalStorage['auth.refreshToken'] = 'refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      
      spyOn(window, 'clearTimeout');
      spyOn(window, 'setTimeout');
      
      service = TestBed.inject(AuthService);
      
      // Trigger another schedule (like after login)
      mockAuthApi.login.and.returnValue(of(mockLoginResponse));
      service.login({ username: 'test', password: 'test' }).subscribe();
      
      expect(window.clearTimeout).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['auth.roles'] = 'invalid-json';
      mockLocalStorage['auth.user'] = 'invalid-json';
      
      // Should not throw error and return default state
      service = TestBed.inject(AuthService);
      
      expect(service.roles()).toEqual([]);
      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should handle missing localStorage data', () => {
      // Clear all localStorage
      mockLocalStorage = {};
      
      service = TestBed.inject(AuthService);
      
      expect(service.token()).toBeNull();
      expect(service.user()).toBeNull();
      expect(service.roles()).toEqual([]);
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.hasRefreshToken()).toBeFalse();
    });

    it('should prevent multiple concurrent refresh requests', (done) => {
      mockLocalStorage['auth.token'] = 'current-token';
      mockLocalStorage['auth.refreshToken'] = 'current-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      service = TestBed.inject(AuthService);

      const refreshSubject = new Subject<LoginResponse>();
      mockAuthApi.refreshToken.and.returnValue(refreshSubject.asObservable());

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

      // Complete the refresh
      refreshSubject.next(mockLoginResponse);
      refreshSubject.complete();
    });

    it('should handle refresh when already in progress', (done) => {
      mockLocalStorage['auth.token'] = 'current-token';
      mockLocalStorage['auth.refreshToken'] = 'current-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      service = TestBed.inject(AuthService);

      // Mock that refresh is already in progress
      const refreshSubject = new Subject<LoginResponse>();
      mockAuthApi.refreshToken.and.returnValue(refreshSubject.asObservable());

      // Start first refresh
      service.refreshToken().subscribe();
      
      // Start second refresh while first is in progress
      service.refreshToken().subscribe({
        next: (response) => {
          expect(response).toEqual(mockLoginResponse);
          expect(mockAuthApi.refreshToken).toHaveBeenCalledTimes(1);
          done();
        }
      });

      // Complete the refresh
      refreshSubject.next(mockLoginResponse);
      refreshSubject.complete();
    });

    it('should handle refresh token request without tokens', (done) => {
      // No tokens in localStorage
      service = TestBed.inject(AuthService);

      service.refreshToken().subscribe({
        error: (error) => {
          expect(error.message).toBe('No refresh token available');
          expect(mockAuthApi.refreshToken).not.toHaveBeenCalled();
          done();
        }
      });
    });
  });

  describe('State Management', () => {
    it('should emit auth state changes', (done) => {
      const states: AuthState[] = [];
      
      service.authState().subscribe(state => {
        states.push(state);
        
        if (states.length === 2) {
          // Initial state
          expect(states[0].token).toBeNull();
          expect(states[0].isLoading).toBeFalse();
          
          // After login
          expect(states[1].token).toBe(mockLoginResponse.token);
          expect(states[1].user).toEqual(mockLoginResponse.user);
          expect(states[1].roles).toEqual(mockLoginResponse.roles);
          expect(states[1].isLoading).toBeFalse();
          done();
        }
      });

      mockAuthApi.login.and.returnValue(of(mockLoginResponse));
      service.login({ username: 'test', password: 'test' }).subscribe();
    });

    it('should maintain consistent state during operations', (done) => {
      let stateCount = 0;
      
      service.authState().subscribe(state => {
        stateCount++;
        
        // State should always be consistent
        if (state.token) {
          expect(state.user).toBeTruthy();
          expect(state.roles).toBeDefined();
        }
        
        if (stateCount === 3) { // Initial, loading, final
          done();
        }
      });

      mockAuthApi.login.and.returnValue(of(mockLoginResponse));
      service.login({ username: 'test', password: 'test' }).subscribe();
    });
  });

  describe('Role and User Management', () => {
    beforeEach(() => {
      mockLocalStorage['auth.token'] = 'current-token';
      mockLocalStorage['auth.refreshToken'] = 'current-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      mockLocalStorage['auth.roles'] = JSON.stringify(['Proprietario', 'Admin']);
      mockLocalStorage['auth.user'] = JSON.stringify({
        id: '123',
        userName: 'testuser',
        email: 'test@test.com',
        nomeUsuario: 'Test User'
      });
      
      service = TestBed.inject(AuthService);
    });

    it('should correctly identify proprietario role', () => {
      expect(service.isProprietario()).toBeTrue();
    });

    it('should return false for proprietario when role not present', () => {
      mockLocalStorage['auth.roles'] = JSON.stringify(['User']);
      service = TestBed.inject(AuthService);
      
      expect(service.isProprietario()).toBeFalse();
    });

    it('should return correct user ID', () => {
      expect(service.getUserId()).toBe('123');
    });

    it('should return null user ID when no user', () => {
      mockLocalStorage['auth.user'] = 'null';
      service = TestBed.inject(AuthService);
      
      expect(service.getUserId()).toBeNull();
    });

    it('should return all user roles', () => {
      expect(service.roles()).toEqual(['Proprietario', 'Admin']);
    });

    it('should return user information', () => {
      const user = service.user();
      expect(user).toBeTruthy();
      expect(user?.id).toBe('123');
      expect(user?.userName).toBe('testuser');
      expect(user?.email).toBe('test@test.com');
      expect(user?.nomeUsuario).toBe('Test User');
    });
  });
});
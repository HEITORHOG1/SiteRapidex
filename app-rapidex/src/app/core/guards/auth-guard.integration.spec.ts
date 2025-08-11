import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { AuthGuard } from './auth.guard';
import { AuthService } from '@core/services/auth.service';
import { LoginResponse } from '@data-access/models/auth.models';
import { environment } from '../../../environments/environment';

// Mock Components
@Component({
  template: '<div>Login Page</div>'
})
class MockLoginComponent { }

@Component({
  template: '<div>Dashboard Page</div>'
})
class MockDashboardComponent { }

@Component({
  template: '<div>Protected Page</div>'
})
class MockProtectedComponent { }

describe('Auth Guard Integration Tests', () => {
  let router: Router;
  let location: Location;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  let mockLocalStorage: { [key: string]: string };

  const mockLoginResponse: LoginResponse = {
    token: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    roles: ['Proprietario'],
    user: {
      id: '123',
      userName: 'testuser',
      email: 'test@example.com',
      nomeUsuario: 'Test User'
    }
  };

  beforeEach(async () => {
    // Mock localStorage
    mockLocalStorage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => mockLocalStorage[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auth/login', component: MockLoginComponent },
          { 
            path: 'dashboard', 
            component: MockDashboardComponent,
            canActivate: [AuthGuard]
          },
          { 
            path: 'protected', 
            component: MockProtectedComponent,
            canActivate: [AuthGuard]
          },
          { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AuthGuard
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Unauthenticated User Access', () => {
    it('should redirect unauthenticated user to login when accessing protected route', fakeAsync(() => {
      // Arrange - No authentication data
      expect(authService.isAuthenticated()).toBeFalse();

      // Act - Try to navigate to protected route
      router.navigateByUrl('/dashboard');
      tick();

      // Assert
      expect(location.path()).toBe('/auth/login');
    }));

    it('should redirect to login when accessing any protected route without authentication', fakeAsync(() => {
      // Arrange
      expect(authService.isAuthenticated()).toBeFalse();

      // Act - Try to navigate to another protected route
      router.navigateByUrl('/protected');
      tick();

      // Assert
      expect(location.path()).toBe('/auth/login');
    }));

    it('should allow access to login page when unauthenticated', fakeAsync(() => {
      // Arrange
      expect(authService.isAuthenticated()).toBeFalse();

      // Act
      router.navigateByUrl('/auth/login');
      tick();

      // Assert
      expect(location.path()).toBe('/auth/login');
    }));
  });

  describe('Authenticated User Access', () => {
    beforeEach(() => {
      // Set up authenticated state
      mockLocalStorage['auth.token'] = mockLoginResponse.token;
      mockLocalStorage['auth.refreshToken'] = mockLoginResponse.refreshToken;
      mockLocalStorage['auth.expiresAt'] = mockLoginResponse.expiresAt;
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);
    });

    it('should allow authenticated user to access protected routes', fakeAsync(() => {
      // Arrange
      const newAuthService = TestBed.inject(AuthService);
      expect(newAuthService.isAuthenticated()).toBeTrue();

      // Act
      router.navigateByUrl('/dashboard');
      tick();

      // Assert
      expect(location.path()).toBe('/dashboard');
    }));

    it('should allow authenticated user to access multiple protected routes', fakeAsync(() => {
      // Arrange
      const newAuthService = TestBed.inject(AuthService);
      expect(newAuthService.isAuthenticated()).toBeTrue();

      // Act - Navigate to first protected route
      router.navigateByUrl('/dashboard');
      tick();
      expect(location.path()).toBe('/dashboard');

      // Act - Navigate to second protected route
      router.navigateByUrl('/protected');
      tick();

      // Assert
      expect(location.path()).toBe('/protected');
    }));

    it('should allow authenticated user to access login page (no redirect)', fakeAsync(() => {
      // Arrange
      const newAuthService = TestBed.inject(AuthService);
      expect(newAuthService.isAuthenticated()).toBeTrue();

      // Act
      router.navigateByUrl('/auth/login');
      tick();

      // Assert - Should stay on login page (no automatic redirect)
      expect(location.path()).toBe('/auth/login');
    }));
  });

  describe('Expired Token Scenarios', () => {
    beforeEach(() => {
      // Set up expired token
      mockLocalStorage['auth.token'] = 'expired-token';
      mockLocalStorage['auth.refreshToken'] = 'expired-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() - 1000).toISOString(); // Expired 1 second ago
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);
    });

    it('should redirect to login when token is expired', fakeAsync(() => {
      // Arrange
      const newAuthService = TestBed.inject(AuthService);
      expect(newAuthService.isAuthenticated()).toBeFalse(); // Should be false due to expired token

      // Act
      router.navigateByUrl('/dashboard');
      tick();

      // Assert
      expect(location.path()).toBe('/auth/login');
    }));

    it('should not allow access to protected routes with expired token', fakeAsync(() => {
      // Arrange
      const newAuthService = TestBed.inject(AuthService);
      expect(newAuthService.isTokenExpired()).toBeTrue();
      expect(newAuthService.isAuthenticated()).toBeFalse();

      // Act
      router.navigateByUrl('/protected');
      tick();

      // Assert
      expect(location.path()).toBe('/auth/login');
    }));
  });

  describe('Token Refresh During Navigation', () => {
    beforeEach(() => {
      // Set up token that needs refresh (expires in 4 minutes - within threshold)
      mockLocalStorage['auth.token'] = 'token-needs-refresh';
      mockLocalStorage['auth.refreshToken'] = 'valid-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 4 * 60 * 1000).toISOString();
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);
    });

    it('should allow access to protected route even when token needs refresh', fakeAsync(() => {
      // Arrange
      const newAuthService = TestBed.inject(AuthService);
      expect(newAuthService.isAuthenticated()).toBeTrue();
      expect(newAuthService.shouldRefreshToken()).toBeTrue();

      // Act
      router.navigateByUrl('/dashboard');
      tick();

      // Assert - Should still allow access since token is not expired yet
      expect(location.path()).toBe('/dashboard');
    }));

    it('should handle automatic token refresh during navigation', fakeAsync(() => {
      // Arrange
      const newAuthService = TestBed.inject(AuthService);
      const refreshedResponse: LoginResponse = {
        ...mockLoginResponse,
        token: 'refreshed-token',
        refreshToken: 'new-refresh-token'
      };

      // Act - Navigate to protected route
      router.navigateByUrl('/dashboard');
      tick();

      // Simulate automatic refresh being triggered
      newAuthService.refreshToken().subscribe();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      req.flush({
        success: true,
        message: 'Token refreshed',
        data: refreshedResponse,
        errors: [],
        timestamp: new Date().toISOString()
      });

      tick();

      // Assert
      expect(location.path()).toBe('/dashboard');
      expect(newAuthService.token()).toBe('refreshed-token');
      expect(newAuthService.isAuthenticated()).toBeTrue();
    }));

    it('should redirect to login if token refresh fails during navigation', fakeAsync(() => {
      // Arrange
      const newAuthService = TestBed.inject(AuthService);

      // Act - Navigate to protected route
      router.navigateByUrl('/dashboard');
      tick();
      expect(location.path()).toBe('/dashboard');

      // Simulate refresh failure
      newAuthService.refreshToken().subscribe({
        error: () => {
          // Expected error
        }
      });
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      req.flush({
        success: false,
        message: 'Refresh token expired',
        data: null,
        errors: ['Token is no longer valid'],
        timestamp: new Date().toISOString()
      }, { status: 401, statusText: 'Unauthorized' });

      tick();

      // Assert - Should be logged out
      expect(newAuthService.isAuthenticated()).toBeFalse();
      
      // Try to navigate to protected route again - should redirect to login
      router.navigateByUrl('/protected');
      tick();
      expect(location.path()).toBe('/auth/login');
    }));
  });

  describe('Route Guard Edge Cases', () => {
    it('should handle corrupted localStorage data gracefully', fakeAsync(() => {
      // Arrange - Set corrupted data
      mockLocalStorage['auth.token'] = 'valid-token';
      mockLocalStorage['auth.user'] = 'invalid-json';
      mockLocalStorage['auth.roles'] = 'invalid-json';
      mockLocalStorage['auth.expiresAt'] = 'invalid-date';

      // Act
      const newAuthService = TestBed.inject(AuthService);
      router.navigateByUrl('/dashboard');
      tick();

      // Assert - Should redirect to login due to corrupted data
      expect(location.path()).toBe('/auth/login');
      expect(newAuthService.isAuthenticated()).toBeFalse();
    }));

    it('should handle missing localStorage data', fakeAsync(() => {
      // Arrange - Clear all localStorage
      mockLocalStorage = {};

      // Act
      const newAuthService = TestBed.inject(AuthService);
      router.navigateByUrl('/dashboard');
      tick();

      // Assert
      expect(location.path()).toBe('/auth/login');
      expect(newAuthService.isAuthenticated()).toBeFalse();
    }));

    it('should handle rapid navigation attempts', fakeAsync(() => {
      // Arrange - Unauthenticated user
      expect(authService.isAuthenticated()).toBeFalse();

      // Act - Rapid navigation attempts
      router.navigateByUrl('/dashboard');
      router.navigateByUrl('/protected');
      router.navigateByUrl('/dashboard');
      tick();

      // Assert - Should end up at login
      expect(location.path()).toBe('/auth/login');
    }));

    it('should maintain authentication state across multiple route changes', fakeAsync(() => {
      // Arrange - Set up authenticated state
      mockLocalStorage['auth.token'] = mockLoginResponse.token;
      mockLocalStorage['auth.refreshToken'] = mockLoginResponse.refreshToken;
      mockLocalStorage['auth.expiresAt'] = mockLoginResponse.expiresAt;
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);

      const newAuthService = TestBed.inject(AuthService);

      // Act - Multiple navigation
      router.navigateByUrl('/dashboard');
      tick();
      expect(location.path()).toBe('/dashboard');

      router.navigateByUrl('/protected');
      tick();
      expect(location.path()).toBe('/protected');

      router.navigateByUrl('/dashboard');
      tick();
      expect(location.path()).toBe('/dashboard');

      // Assert - Should maintain authentication throughout
      expect(newAuthService.isAuthenticated()).toBeTrue();
    }));
  });

  describe('Default Route Behavior', () => {
    it('should redirect unauthenticated user from root to login', fakeAsync(() => {
      // Arrange
      expect(authService.isAuthenticated()).toBeFalse();

      // Act - Navigate to root
      router.navigateByUrl('/');
      tick();

      // Assert - Should redirect to login via dashboard guard
      expect(location.path()).toBe('/auth/login');
    }));

    it('should allow authenticated user to access root route', fakeAsync(() => {
      // Arrange - Set up authenticated state
      mockLocalStorage['auth.token'] = mockLoginResponse.token;
      mockLocalStorage['auth.refreshToken'] = mockLoginResponse.refreshToken;
      mockLocalStorage['auth.expiresAt'] = mockLoginResponse.expiresAt;
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);

      const newAuthService = TestBed.inject(AuthService);
      expect(newAuthService.isAuthenticated()).toBeTrue();

      // Act
      router.navigateByUrl('/');
      tick();

      // Assert - Should redirect to dashboard
      expect(location.path()).toBe('/dashboard');
    }));
  });

  describe('Authentication State Changes During Navigation', () => {
    it('should handle logout during navigation to protected route', fakeAsync(() => {
      // Arrange - Start authenticated
      mockLocalStorage['auth.token'] = mockLoginResponse.token;
      mockLocalStorage['auth.refreshToken'] = mockLoginResponse.refreshToken;
      mockLocalStorage['auth.expiresAt'] = mockLoginResponse.expiresAt;
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);

      const newAuthService = TestBed.inject(AuthService);
      expect(newAuthService.isAuthenticated()).toBeTrue();

      // Act - Navigate to protected route
      router.navigateByUrl('/dashboard');
      tick();
      expect(location.path()).toBe('/dashboard');

      // Logout during session
      newAuthService.logout();

      // Try to navigate to another protected route
      router.navigateByUrl('/protected');
      tick();

      // Assert - Should redirect to login
      expect(location.path()).toBe('/auth/login');
      expect(newAuthService.isAuthenticated()).toBeFalse();
    }));

    it('should handle login during navigation', fakeAsync(() => {
      // Arrange - Start unauthenticated
      expect(authService.isAuthenticated()).toBeFalse();

      // Act - Try to access protected route (should redirect to login)
      router.navigateByUrl('/dashboard');
      tick();
      expect(location.path()).toBe('/auth/login');

      // Simulate login
      authService.login({ username: 'test', password: 'test' }).subscribe();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({
        success: true,
        message: 'Login successful',
        data: mockLoginResponse,
        errors: [],
        timestamp: new Date().toISOString()
      });

      tick();

      // Now try to access protected route again
      router.navigateByUrl('/dashboard');
      tick();

      // Assert - Should now allow access
      expect(location.path()).toBe('/dashboard');
      expect(authService.isAuthenticated()).toBeTrue();
    }));
  });

  describe('Performance and Memory', () => {
    it('should not create memory leaks during multiple navigation attempts', fakeAsync(() => {
      // Arrange
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Act - Multiple navigation attempts
      for (let i = 0; i < 10; i++) {
        router.navigateByUrl('/dashboard');
        tick();
        router.navigateByUrl('/auth/login');
        tick();
      }

      // Assert - Should not significantly increase memory usage
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Allow for some memory increase but not excessive
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(1000000); // Less than 1MB increase
      }
    }));

    it('should handle guard checks efficiently', fakeAsync(() => {
      // Arrange
      const startTime = performance.now();

      // Act - Multiple guard checks
      for (let i = 0; i < 100; i++) {
        router.navigateByUrl('/dashboard');
        tick();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert - Should complete quickly (less than 100ms for 100 checks)
      expect(duration).toBeLessThan(100);
    }));
  });
});
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError, delay } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { LoginComponent } from './login.component';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@shared/services/notification.service';
import { ErrorMessageComponent } from '@shared/ui/error-message/error-message';
import { LoadingSpinnerComponent } from '@shared/ui/loading/loading';
import { LoginResponse, LoginRequest } from '@data-access/models/auth.models';
import { environment } from '../../../../environments/environment';

// Mock Dashboard Component
@Component({
  template: '<div>Dashboard</div>'
})
class MockDashboardComponent { }

// Mock Auth Guard
@Component({
  template: '<div>Protected Route</div>'
})
class MockProtectedComponent { }

describe('Login Flow Integration Tests', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  let location: Location;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let notificationService: jasmine.SpyObj<NotificationService>;
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

    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'showValidationError',
      'showSuccessMessage',
      'showErrorMessage'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        ErrorMessageComponent,
        LoadingSpinnerComponent
      ],
      providers: [
        provideRouter([
          { path: 'auth/login', component: LoginComponent },
          { path: 'dashboard', component: MockDashboardComponent },
          { path: 'protected', component: MockProtectedComponent },
          { path: '', redirectTo: '/auth/login', pathMatch: 'full' }
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Successful Login Flow', () => {
    it('should complete full login flow with valid credentials and redirect to dashboard', fakeAsync(() => {
      // Arrange
      const loginRequest: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      // Fill form
      component.loginForm.patchValue(loginRequest);
      fixture.detectChanges();

      // Act - Submit form
      component.onSubmit();
      tick();

      // Verify HTTP request
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginRequest);

      // Mock successful API response
      req.flush({
        success: true,
        message: 'Login successful',
        data: mockLoginResponse,
        errors: [],
        timestamp: new Date().toISOString()
      });

      tick();
      fixture.detectChanges();

      // Assert
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();
      expect(notificationService.showSuccessMessage).toHaveBeenCalledWith('Login realizado com sucesso!');
      
      // Verify authentication state
      expect(authService.isAuthenticated()).toBeTrue();
      expect(authService.token()).toBe(mockLoginResponse.token);
      expect(authService.user()).toEqual(mockLoginResponse.user);
      expect(authService.roles()).toEqual(mockLoginResponse.roles);
      
      // Verify localStorage persistence
      expect(mockLocalStorage['auth.token']).toBe(mockLoginResponse.token);
      expect(mockLocalStorage['auth.refreshToken']).toBe(mockLoginResponse.refreshToken);
      expect(mockLocalStorage['auth.user']).toBe(JSON.stringify(mockLoginResponse.user));
      expect(mockLocalStorage['auth.roles']).toBe(JSON.stringify(mockLoginResponse.roles));
      
      // Verify navigation to dashboard
      expect(location.path()).toBe('/dashboard');
    }));

    it('should handle login with automatic token refresh scheduling', fakeAsync(() => {
      // Arrange - Set token to expire soon to trigger refresh scheduling
      const soonExpiringResponse: LoginResponse = {
        ...mockLoginResponse,
        expiresAt: new Date(Date.now() + 6 * 60 * 1000).toISOString() // 6 minutes
      };

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });

      spyOn(window, 'setTimeout').and.callThrough();

      // Act
      component.onSubmit();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({
        success: true,
        message: 'Login successful',
        data: soonExpiringResponse,
        errors: [],
        timestamp: new Date().toISOString()
      });

      tick();

      // Assert
      expect(authService.isAuthenticated()).toBeTrue();
      expect(window.setTimeout).toHaveBeenCalled(); // Token refresh should be scheduled
      expect(location.path()).toBe('/dashboard');
    }));

    it('should redirect already authenticated users to dashboard', fakeAsync(() => {
      // Arrange - Set up authenticated state
      mockLocalStorage['auth.token'] = 'existing-token';
      mockLocalStorage['auth.refreshToken'] = 'existing-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);

      // Create new component instance to trigger ngOnInit
      const newFixture = TestBed.createComponent(LoginComponent);
      const newComponent = newFixture.componentInstance;
      
      // Act
      newComponent.ngOnInit();
      tick();

      // Assert
      expect(location.path()).toBe('/dashboard');
    }));
  });

  describe('Failed Login Scenarios', () => {
    it('should handle invalid credentials error (401)', fakeAsync(() => {
      // Arrange
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'wrongpassword'
      });

      // Act
      component.onSubmit();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({
        success: false,
        message: 'Invalid credentials',
        data: null,
        errors: ['Invalid username or password'],
        timestamp: new Date().toISOString()
      }, { status: 401, statusText: 'Unauthorized' });

      tick();
      fixture.detectChanges();

      // Assert
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Invalid credentials');
      expect(authService.isAuthenticated()).toBeFalse();
      expect(location.path()).toBe(''); // Should stay on login page
      expect(mockLocalStorage['auth.token']).toBeUndefined();
    }));

    it('should handle network connection error (status 0)', fakeAsync(() => {
      // Arrange
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });

      // Act
      component.onSubmit();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.error(new ProgressEvent('Network error'), { status: 0 });

      tick();
      fixture.detectChanges();

      // Assert
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Erro de conexão. Verifique sua internet.');
      expect(authService.isAuthenticated()).toBeFalse();
      expect(location.path()).toBe('');
    }));

    it('should handle server error (status 500)', fakeAsync(() => {
      // Arrange
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });

      // Act
      component.onSubmit();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({
        success: false,
        message: 'Internal server error',
        data: null,
        errors: ['Database connection failed'],
        timestamp: new Date().toISOString()
      }, { status: 500, statusText: 'Internal Server Error' });

      tick();
      fixture.detectChanges();

      // Assert
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Internal server error');
      expect(authService.isAuthenticated()).toBeFalse();
      expect(location.path()).toBe('');
    }));

    it('should handle API error with custom message', fakeAsync(() => {
      // Arrange
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });

      // Act
      component.onSubmit();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({
        success: false,
        message: 'Account is locked',
        data: null,
        errors: ['Too many failed login attempts'],
        timestamp: new Date().toISOString()
      }, { status: 423, statusText: 'Locked' });

      tick();
      fixture.detectChanges();

      // Assert
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Account is locked');
      expect(authService.isAuthenticated()).toBeFalse();
    }));

    it('should allow retry after failed login', fakeAsync(() => {
      // Arrange - First failed attempt
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'wrongpassword'
      });

      component.onSubmit();
      tick();

      let req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({
        success: false,
        message: 'Invalid credentials',
        data: null,
        errors: ['Invalid username or password'],
        timestamp: new Date().toISOString()
      }, { status: 401, statusText: 'Unauthorized' });

      tick();
      fixture.detectChanges();

      expect(component.error()).toBe('Invalid credentials');

      // Act - Retry with correct password
      component.loginForm.patchValue({
        password: 'password123'
      });

      component.onRetryLogin();
      tick();

      req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({
        success: true,
        message: 'Login successful',
        data: mockLoginResponse,
        errors: [],
        timestamp: new Date().toISOString()
      });

      tick();

      // Assert
      expect(component.error()).toBeNull();
      expect(authService.isAuthenticated()).toBeTrue();
      expect(location.path()).toBe('/dashboard');
    }));
  });

  describe('Token Refresh Flow', () => {
    beforeEach(() => {
      // Set up authenticated state with token that needs refresh
      mockLocalStorage['auth.token'] = 'current-token';
      mockLocalStorage['auth.refreshToken'] = 'current-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 4 * 60 * 1000).toISOString(); // 4 minutes (within threshold)
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);
    });

    it('should automatically refresh token when needed', fakeAsync(() => {
      // Arrange
      const newTokenResponse: LoginResponse = {
        ...mockLoginResponse,
        token: 'new-refreshed-token',
        refreshToken: 'new-refresh-token'
      };

      // Act - Trigger token refresh
      authService.refreshToken().subscribe();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        token: 'current-token',
        refreshToken: 'current-refresh-token'
      });

      req.flush({
        success: true,
        message: 'Token refreshed',
        data: newTokenResponse,
        errors: [],
        timestamp: new Date().toISOString()
      });

      tick();

      // Assert
      expect(authService.token()).toBe('new-refreshed-token');
      expect(mockLocalStorage['auth.token']).toBe('new-refreshed-token');
      expect(mockLocalStorage['auth.refreshToken']).toBe('new-refresh-token');
      expect(authService.isAuthenticated()).toBeTrue();
    }));

    it('should handle refresh token failure and logout', fakeAsync(() => {
      // Act
      authService.refreshToken().subscribe({
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

      // Assert
      expect(authService.isAuthenticated()).toBeFalse();
      expect(mockLocalStorage['auth.token']).toBeUndefined();
      expect(mockLocalStorage['auth.refreshToken']).toBeUndefined();
    }));

    it('should schedule automatic refresh for tokens near expiration', fakeAsync(() => {
      // Arrange - Create new auth service instance to trigger auto-refresh scheduling
      const newAuthService = TestBed.inject(AuthService);
      spyOn(window, 'setTimeout').and.callThrough();

      // The token is set to expire in 4 minutes (within 5-minute threshold)
      // So it should schedule a refresh
      expect(newAuthService.shouldRefreshToken()).toBeTrue();
      
      // Verify that setTimeout was called for scheduling
      expect(window.setTimeout).toHaveBeenCalled();
    }));
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      // Set up authenticated state
      mockLocalStorage['auth.token'] = 'current-token';
      mockLocalStorage['auth.refreshToken'] = 'current-refresh-token';
      mockLocalStorage['auth.expiresAt'] = new Date(Date.now() + 3600000).toISOString();
      mockLocalStorage['auth.user'] = JSON.stringify(mockLoginResponse.user);
      mockLocalStorage['auth.roles'] = JSON.stringify(mockLoginResponse.roles);
      mockLocalStorage['selectedEstabelecimento'] = JSON.stringify({ id: '123', nome: 'Test' });
    });

    it('should complete logout flow and redirect to login', fakeAsync(() => {
      // Arrange
      expect(authService.isAuthenticated()).toBeTrue();

      // Act
      authService.logout();
      tick();

      // Assert - All auth data should be cleared
      expect(authService.isAuthenticated()).toBeFalse();
      expect(authService.token()).toBeNull();
      expect(authService.user()).toBeNull();
      expect(authService.roles()).toEqual([]);
      
      // Verify localStorage is cleared
      expect(mockLocalStorage['auth.token']).toBeUndefined();
      expect(mockLocalStorage['auth.refreshToken']).toBeUndefined();
      expect(mockLocalStorage['auth.expiresAt']).toBeUndefined();
      expect(mockLocalStorage['auth.user']).toBeUndefined();
      expect(mockLocalStorage['auth.roles']).toBeUndefined();
      expect(mockLocalStorage['selectedEstabelecimento']).toBeUndefined();
    }));

    it('should clear refresh timers on logout', fakeAsync(() => {
      // Arrange
      spyOn(window, 'clearTimeout');

      // Act
      authService.logout();
      tick();

      // Assert
      expect(window.clearTimeout).toHaveBeenCalled();
    }));
  });

  describe('Form Validation and UX', () => {
    it('should prevent submission with invalid form data', fakeAsync(() => {
      // Arrange - Leave form empty
      component.loginForm.patchValue({
        username: '',
        password: ''
      });

      // Act
      component.onSubmit();
      tick();

      // Assert
      expect(component.formSubmitted()).toBeTrue();
      expect(notificationService.showValidationError).toHaveBeenCalledWith(
        'Por favor, corrija os erros no formulário'
      );
      
      // No HTTP request should be made
      httpMock.expectNone(`${environment.apiUrl}/auth/login`);
      expect(component.loading()).toBeFalse();
    }));

    it('should show field-specific validation errors', () => {
      // Arrange
      const usernameControl = component.loginForm.get('username');
      const passwordControl = component.loginForm.get('password');

      // Act - Touch fields without values
      usernameControl?.markAsTouched();
      passwordControl?.markAsTouched();
      fixture.detectChanges();

      // Assert
      expect(component.getFieldError('username')).toBe('Usuário é obrigatório');
      expect(component.getFieldError('password')).toBe('Senha é obrigatória');
      expect(component.isFieldInvalid('username')).toBeTrue();
      expect(component.isFieldInvalid('password')).toBeTrue();
    });

    it('should clear errors when user starts typing', fakeAsync(() => {
      // Arrange - Set an error
      component.error.set('Some error message');

      // Act - User starts typing
      component.loginForm.get('username')?.setValue('newvalue');
      tick();

      // Assert
      expect(component.error()).toBeNull();
    }));

    it('should toggle password visibility', () => {
      // Arrange
      expect(component.showPassword()).toBeFalse();

      // Act
      component.togglePassword();

      // Assert
      expect(component.showPassword()).toBeTrue();

      // Act again
      component.togglePassword();

      // Assert
      expect(component.showPassword()).toBeFalse();
    });

    it('should provide correct accessibility attributes', () => {
      // Arrange
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();

      // Act & Assert
      expect(component.getAriaDescribedBy('username')).toBe('username-error');
      expect(component.getAriaInvalid('username')).toBeTrue();

      // Fix the field
      usernameControl?.setValue('validuser');
      expect(component.getAriaDescribedBy('username')).toBeNull();
      expect(component.getAriaInvalid('username')).toBeFalse();
    });
  });

  describe('Loading States and UX Feedback', () => {
    it('should show loading state during login request', fakeAsync(() => {
      // Arrange
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });

      // Act
      component.onSubmit();
      
      // Assert - Should be loading immediately
      expect(component.loading()).toBeTrue();
      
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      
      // Still loading while request is pending
      expect(component.loading()).toBeTrue();

      req.flush({
        success: true,
        message: 'Login successful',
        data: mockLoginResponse,
        errors: [],
        timestamp: new Date().toISOString()
      });

      tick();

      // Should not be loading after response
      expect(component.loading()).toBeFalse();
    }));

    it('should prevent multiple simultaneous login attempts', fakeAsync(() => {
      // Arrange
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });

      // Act - Submit twice quickly
      component.onSubmit();
      component.onSubmit(); // Second call should be ignored

      tick();

      // Assert - Only one HTTP request should be made
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      httpMock.expectNone(`${environment.apiUrl}/auth/login`);

      req.flush({
        success: true,
        message: 'Login successful',
        data: mockLoginResponse,
        errors: [],
        timestamp: new Date().toISOString()
      });

      tick();
    }));
  });

  describe('Console Warnings and Errors', () => {
    it('should not produce console warnings during successful login', fakeAsync(() => {
      // Arrange
      spyOn(console, 'warn');
      spyOn(console, 'error');

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });

      // Act
      component.onSubmit();
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
      fixture.detectChanges();

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    }));

    it('should not produce console warnings during form validation', () => {
      // Arrange
      spyOn(console, 'warn');
      spyOn(console, 'error');

      // Act - Trigger validation
      component.onSubmit(); // Empty form
      fixture.detectChanges();

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should not produce console warnings during error handling', fakeAsync(() => {
      // Arrange
      spyOn(console, 'warn');
      spyOn(console, 'error');

      component.loginForm.patchValue({
        username: 'testuser',
        password: 'wrongpassword'
      });

      // Act
      component.onSubmit();
      tick();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({
        success: false,
        message: 'Invalid credentials',
        data: null,
        errors: ['Invalid username or password'],
        timestamp: new Date().toISOString()
      }, { status: 401, statusText: 'Unauthorized' });

      tick();
      fixture.detectChanges();

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    }));
  });

  describe('Memory Leaks and Cleanup', () => {
    it('should properly clean up subscriptions on component destroy', () => {
      // Arrange
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      // Act
      component.ngOnDestroy();

      // Assert
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    it('should not leak subscriptions during multiple login attempts', fakeAsync(() => {
      // Arrange
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });

      // Act - Multiple login attempts
      for (let i = 0; i < 3; i++) {
        component.onSubmit();
        tick();

        const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
        req.flush({
          success: false,
          message: 'Server error',
          data: null,
          errors: ['Temporary server error'],
          timestamp: new Date().toISOString()
        }, { status: 500, statusText: 'Internal Server Error' });

        tick();
      }

      // Assert - Component should still be functional
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Server error');
    }));
  });
});
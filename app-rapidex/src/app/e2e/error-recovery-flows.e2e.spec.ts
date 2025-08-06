import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { By } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { of, throwError, timer } from 'rxjs';

import { LoginComponent } from '../features/auth/login/login.component';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { AuthService } from '../core/services/auth.service';
import { EstabelecimentoService } from '../core/services/estabelecimento.service';
import { authTokenInterceptor } from '../core/interceptors/auth-token.interceptor';
import { errorInterceptor } from '../core/interceptors/error.interceptor';
import { authGuard } from '../core/guards/auth.guard';
import { 
  LoginResponse, 
  UserInfo, 
  ApiError, 
  ErrorCodes 
} from '../data-access/models/auth.models';
import { Estabelecimento } from '../data-access/models/estabelecimento.models';

// Mock components for routing
@Component({
  template: '<div>Not Found</div>',
  standalone: true
})
class MockNotFoundComponent {}

describe('E2E: Error Scenarios and Recovery Flows', () => {
  let router: Router;
  let location: Location;
  let httpTestingController: HttpTestingController;
  let authService: AuthService;
  let estabelecimentoService: EstabelecimentoService;

  // Mock data
  const mockUser: UserInfo = {
    id: 'user123',
    userName: 'testuser',
    email: 'test@example.com',
    nomeUsuario: 'Test User'
  };

  const mockLoginResponse: LoginResponse = {
    token: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roles: ['Proprietario'],
    user: mockUser
  };

  const mockEstabelecimentos: Estabelecimento[] = [
    {
      id: 1,
      usuarioId: 'user123',
      razaoSocial: 'Empresa 1 LTDA',
      nomeFantasia: 'Restaurante 1',
      cnpj: '12345678000195',
      telefone: '11999999999',
      endereco: 'Rua A, 123',
      status: true,
      cep: '01234567',
      numero: '123',
      dataCadastro: '2024-01-01',
      latitude: -23.5505,
      longitude: -46.6333,
      raioEntregaKm: 5,
      taxaEntregaFixa: 5.00,
      descricao: 'Restaurante especializado em comida brasileira'
    }
  ];

  const routes = [
    { path: '', redirectTo: '/auth/login', pathMatch: 'full' as const },
    { path: 'auth/login', component: LoginComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: '**', component: MockNotFoundComponent }
  ];

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        DashboardComponent,
        MockNotFoundComponent
      ],
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authTokenInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        EstabelecimentoService
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    estabelecimentoService = TestBed.inject(EstabelecimentoService);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  describe('Network Error Recovery', () => {
    it('should recover from intermittent network failures during login', fakeAsync(() => {
      router.navigate(['/auth/login']);
      tick();

      const loginFixture = TestBed.createComponent(LoginComponent);
      loginFixture.detectChanges();

      // Fill and submit login form
      const usernameInput = loginFixture.debugElement.query(By.css('input[formControlName="username"]'));
      const passwordInput = loginFixture.debugElement.query(By.css('input[formControlName="password"]'));
      const submitButton = loginFixture.debugElement.query(By.css('button[type="submit"]'));

      usernameInput.nativeElement.value = 'testuser';
      usernameInput.nativeElement.dispatchEvent(new Event('input'));
      passwordInput.nativeElement.value = 'password123';
      passwordInput.nativeElement.dispatchEvent(new Event('input'));
      loginFixture.detectChanges();

      submitButton.nativeElement.click();
      tick();

      // First request fails with network error
      const loginReq1 = httpTestingController.expectOne('http://localhost:5283/api/Auth/login');
      loginReq1.error(new ProgressEvent('Network error'), { status: 0 });
      tick();
      loginFixture.detectChanges();

      // Verify error state
      expect(loginFixture.componentInstance.error()).toContain('conexão');
      expect(loginFixture.componentInstance.loading()).toBe(false);

      // User retries by clicking submit again
      submitButton.nativeElement.click();
      tick();

      // Second request succeeds
      const loginReq2 = httpTestingController.expectOne('http://localhost:5283/api/Auth/login');
      loginReq2.flush(mockLoginResponse);
      tick();

      // Verify successful recovery
      expect(authService.isAuthenticated()).toBe(true);
      expect(loginFixture.componentInstance.error()).toBeNull();

      flush();
    }));

    it('should handle network recovery during establishment loading', fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // First request fails with network error
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req1.error(new ProgressEvent('Network error'), { status: 0 });
      tick(1000); // Wait for retry delay
      dashboardFixture.detectChanges();

      // Verify error state
      expect(dashboardFixture.componentInstance.estabelecimentoError).toBeTruthy();

      // Automatic retry succeeds
      const req2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req2.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify successful recovery
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(dashboardFixture.componentInstance.estabelecimentoError).toBeNull();

      flush();
    }));

    it('should handle progressive network degradation', fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // First request times out
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req1.error(new ProgressEvent('timeout'), { status: 0 });
      tick(1000);

      // Second request has slow response but succeeds
      const req2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      
      // Simulate slow response
      tick(2000);
      req2.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify eventual success
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      flush();
    }));
  });

  describe('Authentication Error Recovery', () => {
    it('should handle token expiration with automatic refresh', fakeAsync(() => {
      // Setup authenticated state with token that will expire soon
      const soonToExpireToken = 'soon-to-expire-token';
      const nearExpiryTime = new Date(Date.now() + 30000).toISOString(); // 30 seconds

      localStorage.setItem('auth.token', soonToExpireToken);
      localStorage.setItem('auth.refreshToken', 'valid-refresh-token');
      localStorage.setItem('auth.expiresAt', nearExpiryTime);
      localStorage.setItem('auth.roles', JSON.stringify(['Proprietario']));
      localStorage.setItem('auth.user', JSON.stringify(mockUser));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // First request fails with 401
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req1.flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();

      // Should trigger token refresh
      const refreshReq = httpTestingController.expectOne('http://localhost:5283/api/Auth/refresh-token');
      refreshReq.flush({
        ...mockLoginResponse,
        token: 'new-refreshed-token'
      });
      tick();

      // Should retry original request with new token
      const req2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      expect(req2.request.headers.get('Authorization')).toBe('Bearer new-refreshed-token');
      req2.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify successful recovery
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(authService.token()).toBe('new-refreshed-token');

      flush();
    }));

    it('should handle refresh token expiration gracefully', fakeAsync(() => {
      // Setup authenticated state with expired refresh token
      localStorage.setItem('auth.token', 'expired-token');
      localStorage.setItem('auth.refreshToken', 'expired-refresh-token');
      localStorage.setItem('auth.expiresAt', new Date(Date.now() - 1000).toISOString());
      localStorage.setItem('auth.roles', JSON.stringify(['Proprietario']));
      localStorage.setItem('auth.user', JSON.stringify(mockUser));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // First request fails with 401
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req1.flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();

      // Refresh token request also fails
      const refreshReq = httpTestingController.expectOne('http://localhost:5283/api/Auth/refresh-token');
      refreshReq.flush({}, { status: 401, statusText: 'Refresh token expired' });
      tick();

      // Should redirect to login
      expect(location.path()).toBe('/auth/login');
      expect(authService.isAuthenticated()).toBe(false);

      flush();
    }));

    it('should handle concurrent requests during token refresh', fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', 'expired-token');
      localStorage.setItem('auth.refreshToken', 'valid-refresh-token');
      localStorage.setItem('auth.expiresAt', new Date(Date.now() - 1000).toISOString());
      localStorage.setItem('auth.roles', JSON.stringify(['Proprietario']));
      localStorage.setItem('auth.user', JSON.stringify(mockUser));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // Multiple concurrent requests fail with 401
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req1.flush({}, { status: 401, statusText: 'Unauthorized' });

      // Simulate another concurrent request
      estabelecimentoService.loadEstabelecimentosForProprietario('user123').subscribe();
      tick();

      const req2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req2.flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();

      // Should only trigger one refresh request
      const refreshReq = httpTestingController.expectOne('http://localhost:5283/api/Auth/refresh-token');
      refreshReq.flush({
        ...mockLoginResponse,
        token: 'new-token'
      });
      tick();

      // Both original requests should be retried with new token
      const retryReq1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      const retryReq2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );

      expect(retryReq1.request.headers.get('Authorization')).toBe('Bearer new-token');
      expect(retryReq2.request.headers.get('Authorization')).toBe('Bearer new-token');

      retryReq1.flush(mockEstabelecimentos);
      retryReq2.flush(mockEstabelecimentos);
      tick();

      flush();
    }));
  });

  describe('Server Error Recovery', () => {
    it('should handle 500 server errors with retry mechanism', fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // First request fails with 500
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req1.flush(
        { message: 'Internal server error' },
        { status: 500, statusText: 'Internal Server Error' }
      );
      tick(1000); // Wait for retry delay
      dashboardFixture.detectChanges();

      // Verify error state
      expect(dashboardFixture.componentInstance.estabelecimentoError).toBeTruthy();

      // Manual retry via error component
      const errorElement = dashboardFixture.debugElement.query(By.css('rx-error-message'));
      expect(errorElement).toBeTruthy();

      errorElement.componentInstance.retry.emit();
      tick();

      // Retry request succeeds
      const req2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req2.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify successful recovery
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(dashboardFixture.componentInstance.estabelecimentoError).toBeNull();

      flush();
    }));

    it('should handle 503 service unavailable with exponential backoff', fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // First request fails with 503
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req1.flush(
        { message: 'Service temporarily unavailable' },
        { status: 503, statusText: 'Service Unavailable' }
      );
      tick(1000); // First retry delay

      // Second request also fails
      const req2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req2.flush(
        { message: 'Service temporarily unavailable' },
        { status: 503, statusText: 'Service Unavailable' }
      );
      tick(2000); // Exponential backoff - longer delay

      // Third request succeeds
      const req3 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req3.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify eventual success
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      flush();
    }));

    it('should handle partial data corruption gracefully', fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // Return malformed data
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req1.flush([
        {
          id: 1,
          // Missing required fields
          nomeFantasia: 'Incomplete Data'
        }
      ]);
      tick();
      dashboardFixture.detectChanges();

      // Should handle gracefully and show error
      expect(dashboardFixture.componentInstance.estabelecimentoError).toBeTruthy();

      // Retry with correct data
      const errorElement = dashboardFixture.debugElement.query(By.css('rx-error-message'));
      errorElement.componentInstance.retry.emit();
      tick();

      const req2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      req2.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify recovery
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      flush();
    }));
  });

  describe('User Session Recovery', () => {
    it('should recover from corrupted localStorage data', fakeAsync(() => {
      // Setup corrupted localStorage
      localStorage.setItem('auth.token', 'valid-token');
      localStorage.setItem('auth.user', 'invalid-json-data'); // Corrupted JSON
      localStorage.setItem('auth.roles', '[invalid json'); // Corrupted JSON
      tick();

      // Should handle gracefully and not crash
      expect(() => {
        const newAuthService = TestBed.inject(AuthService);
        tick();
      }).not.toThrow();

      // Should redirect to login due to invalid state
      router.navigate(['/dashboard']);
      tick();
      expect(location.path()).toBe('/auth/login');

      flush();
    }));

    it('should handle browser storage quota exceeded', fakeAsync(() => {
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        if (key === 'auth.token') {
          throw new DOMException('QuotaExceededError');
        }
        return originalSetItem.call(localStorage, key, value);
      });

      router.navigate(['/auth/login']);
      tick();

      const loginFixture = TestBed.createComponent(LoginComponent);
      loginFixture.detectChanges();

      // Fill and submit login form
      const usernameInput = loginFixture.debugElement.query(By.css('input[formControlName="username"]'));
      const passwordInput = loginFixture.debugElement.query(By.css('input[formControlName="password"]'));
      const submitButton = loginFixture.debugElement.query(By.css('button[type="submit"]'));

      usernameInput.nativeElement.value = 'testuser';
      usernameInput.nativeElement.dispatchEvent(new Event('input'));
      passwordInput.nativeElement.value = 'password123';
      passwordInput.nativeElement.dispatchEvent(new Event('input'));
      loginFixture.detectChanges();

      submitButton.nativeElement.click();
      tick();

      // Login request succeeds
      const loginReq = httpTestingController.expectOne('http://localhost:5283/api/Auth/login');
      loginReq.flush(mockLoginResponse);
      tick();

      // Should handle storage error gracefully
      expect(loginFixture.componentInstance.error()).toBeTruthy();
      expect(loginFixture.componentInstance.error()).toContain('armazenamento');

      flush();
    }));

    it('should recover from browser tab crashes', fakeAsync(() => {
      // Simulate tab crash by clearing all in-memory state but keeping localStorage
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));

      // Create new service instances (simulating app restart after crash)
      const newAuthService = TestBed.inject(AuthService);
      tick();

      // Should restore authentication state from localStorage
      expect(newAuthService.isAuthenticated()).toBe(true);
      expect(newAuthService.getUserId()).toBe('user123');

      // Should be able to navigate to protected routes
      router.navigate(['/dashboard']);
      tick();
      expect(location.path()).toBe('/dashboard');

      // Should be able to make authenticated requests
      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      expect(estabelecimentosReq.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      estabelecimentosReq.flush(mockEstabelecimentos);
      tick();

      // Verify full functionality restored
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      flush();
    }));
  });

  describe('Graceful Degradation', () => {
    it('should function with JavaScript partially disabled', fakeAsync(() => {
      // Simulate limited JavaScript environment
      const originalAddEventListener = Element.prototype.addEventListener;
      spyOn(Element.prototype, 'addEventListener').and.callFake(function(
        this: Element,
        type: string,
        listener: any,
        options?: any
      ) {
        // Only allow essential events
        if (['click', 'submit', 'input', 'change'].includes(type)) {
          return originalAddEventListener.call(this, type, listener, options);
        }
      });

      router.navigate(['/auth/login']);
      tick();

      const loginFixture = TestBed.createComponent(LoginComponent);
      loginFixture.detectChanges();

      // Basic form functionality should still work
      const form = loginFixture.debugElement.query(By.css('form'));
      expect(form).toBeTruthy();

      const submitButton = loginFixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submitButton).toBeTruthy();

      flush();
    }));

    it('should handle CSS loading failures gracefully', fakeAsync(() => {
      // Simulate missing CSS by removing style elements
      const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
      const removedStyles: Element[] = [];
      
      styleElements.forEach(style => {
        removedStyles.push(style);
        style.remove();
      });

      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // Mock establishment loading
      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      estabelecimentosReq.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Functionality should still work even without styles
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      const cardElements = dashboardFixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      expect(cardElements.length).toBe(1);

      // Restore styles
      removedStyles.forEach(style => {
        document.head.appendChild(style);
      });

      flush();
    }));

    it('should handle slow network conditions', fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // Verify loading state is shown
      expect(dashboardFixture.componentInstance.isLoadingEstabelecimentos).toBe(true);
      const loadingElement = dashboardFixture.debugElement.query(By.css('rx-loading-spinner'));
      expect(loadingElement).toBeTruthy();

      // Simulate very slow response (10 seconds)
      tick(10000);

      // Request should still be pending
      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );

      // Eventually respond
      estabelecimentosReq.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Should handle the delayed response correctly
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(dashboardFixture.componentInstance.isLoadingEstabelecimentos).toBe(false);

      flush();
    }));
  });

  describe('Memory and Performance Recovery', () => {
    it('should handle memory pressure gracefully', fakeAsync(() => {
      // Simulate memory pressure by creating many components
      const fixtures: ComponentFixture<DashboardComponent>[] = [];

      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      // Create multiple dashboard instances
      for (let i = 0; i < 10; i++) {
        const fixture = TestBed.createComponent(DashboardComponent);
        fixture.detectChanges();
        fixtures.push(fixture);
      }
      tick();

      // Handle all the establishment requests
      for (let i = 0; i < 10; i++) {
        const req = httpTestingController.expectOne(
          'http://localhost:5283/api/Estabelecimento/proprietario/user123'
        );
        req.flush(mockEstabelecimentos);
      }
      tick();

      // All components should function correctly
      fixtures.forEach(fixture => {
        expect(fixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
      });

      // Clean up
      fixtures.forEach(fixture => fixture.destroy());

      flush();
    }));

    it('should recover from component initialization failures', fakeAsync(() => {
      // Mock component initialization error
      const originalNgOnInit = DashboardComponent.prototype.ngOnInit;
      let initCallCount = 0;

      spyOn(DashboardComponent.prototype, 'ngOnInit').and.callFake(function(this: DashboardComponent) {
        initCallCount++;
        if (initCallCount === 1) {
          throw new Error('Initialization failed');
        }
        return originalNgOnInit.call(this);
      });

      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      router.navigate(['/dashboard']);
      tick();

      // First attempt fails
      expect(() => {
        const dashboardFixture = TestBed.createComponent(DashboardComponent);
        dashboardFixture.detectChanges();
      }).toThrow();

      // Second attempt should succeed
      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // Mock establishment loading
      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      estabelecimentosReq.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Should work normally after recovery
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      flush();
    }));
  });
});
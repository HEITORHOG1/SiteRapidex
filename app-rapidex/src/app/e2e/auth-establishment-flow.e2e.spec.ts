import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of, throwError, timer, delay } from 'rxjs';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

import { LoginComponent } from '../features/auth/login/login.component';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { AuthService } from '../core/services/auth.service';
import { EstabelecimentoService } from '../core/services/estabelecimento.service';
import { authTokenInterceptor } from '../core/interceptors/auth-token.interceptor';
import { errorInterceptor } from '../core/interceptors/error.interceptor';
import { authGuard } from '../core/guards/auth.guard';
import { 
  LoginRequest, 
  LoginResponse, 
  UserInfo, 
  AuthState, 
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

describe('E2E: Complete Authentication and Establishment Selection Flow', () => {
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
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
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
    },
    {
      id: 2,
      usuarioId: 'user123',
      razaoSocial: 'Empresa 2 LTDA',
      nomeFantasia: 'Pizzaria 2',
      cnpj: '98765432000195',
      telefone: '11888888888',
      endereco: 'Rua B, 456',
      status: true,
      cep: '01234890',
      numero: '456',
      dataCadastro: '2024-01-02',
      latitude: -23.5506,
      longitude: -46.6334,
      raioEntregaKm: 3,
      taxaEntregaFixa: 3.50,
      descricao: 'Pizzaria tradicional'
    }
  ];

  const routes = [
    { path: '', redirectTo: '/auth/login', pathMatch: 'full' as const },
    { path: 'auth/login', component: LoginComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: '**', component: MockNotFoundComponent }
  ];

  beforeEach(async () => {
    // Clear localStorage before each test
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

  describe('Complete Happy Path Flow', () => {
    it('should complete full authentication and establishment selection flow', fakeAsync(() => {
      // Start at root - should redirect to login
      router.navigate(['']);
      tick();
      expect(location.path()).toBe('/auth/login');

      // Create login component
      const loginFixture = TestBed.createComponent(LoginComponent);
      const loginComponent = loginFixture.componentInstance;
      loginFixture.detectChanges();

      // Fill login form
      const usernameInput = loginFixture.debugElement.query(By.css('input[formControlName="username"]'));
      const passwordInput = loginFixture.debugElement.query(By.css('input[formControlName="password"]'));
      const submitButton = loginFixture.debugElement.query(By.css('button[type="submit"]'));

      usernameInput.nativeElement.value = 'testuser';
      usernameInput.nativeElement.dispatchEvent(new Event('input'));
      passwordInput.nativeElement.value = 'password123';
      passwordInput.nativeElement.dispatchEvent(new Event('input'));
      loginFixture.detectChanges();

      // Submit login form
      submitButton.nativeElement.click();
      tick();

      // Verify login API call
      const loginReq = httpTestingController.expectOne('http://localhost:5283/api/Auth/login');
      expect(loginReq.request.method).toBe('POST');
      expect(loginReq.request.body).toEqual({
        username: 'testuser',
        password: 'password123'
      });

      // Respond with successful login
      loginReq.flush(mockLoginResponse);
      tick();

      // Verify authentication state
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getUserId()).toBe('user123');
      expect(authService.isProprietario()).toBe(true);

      // Navigate to dashboard (simulating successful login redirect)
      router.navigate(['/dashboard']);
      tick();
      expect(location.path()).toBe('/dashboard');

      // Create dashboard component
      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      const dashboardComponent = dashboardFixture.componentInstance;
      dashboardFixture.detectChanges();
      tick();

      // Verify estabelecimentos API call
      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      expect(estabelecimentosReq.request.method).toBe('GET');
      expect(estabelecimentosReq.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');

      // Respond with estabelecimentos
      estabelecimentosReq.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify estabelecimentos are loaded
      expect(dashboardComponent.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(dashboardComponent.showEstabelecimentoSelector).toBe(true);

      // Verify selector component is rendered
      const selectorElement = dashboardFixture.debugElement.query(By.css('app-estabelecimento-selector'));
      expect(selectorElement).toBeTruthy();

      // Verify establishment cards are rendered
      const cardElements = dashboardFixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      expect(cardElements.length).toBe(2);

      // Select first establishment
      cardElements[0].componentInstance.select.emit(mockEstabelecimentos[0]);
      tick();
      dashboardFixture.detectChanges();

      // Verify establishment selection
      expect(dashboardComponent.selectedEstabelecimento).toEqual(mockEstabelecimentos[0]);
      expect(dashboardComponent.showEstabelecimentoSelector).toBe(false);

      // Wait for stats loading
      tick(1500);
      dashboardFixture.detectChanges();

      // Verify final state
      expect(dashboardComponent.isLoadingStats).toBe(false);
      expect(dashboardComponent.stats.length).toBe(4);

      flush();
    }));
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle login failure with proper error display', fakeAsync(() => {
      router.navigate(['/auth/login']);
      tick();

      const loginFixture = TestBed.createComponent(LoginComponent);
      loginFixture.detectChanges();

      // Submit login with invalid credentials
      const usernameInput = loginFixture.debugElement.query(By.css('input[formControlName="username"]'));
      const passwordInput = loginFixture.debugElement.query(By.css('input[formControlName="password"]'));
      const submitButton = loginFixture.debugElement.query(By.css('button[type="submit"]'));

      usernameInput.nativeElement.value = 'invalid';
      usernameInput.nativeElement.dispatchEvent(new Event('input'));
      passwordInput.nativeElement.value = 'invalid';
      passwordInput.nativeElement.dispatchEvent(new Event('input'));
      loginFixture.detectChanges();

      submitButton.nativeElement.click();
      tick();

      // Respond with login error
      const loginReq = httpTestingController.expectOne('http://localhost:5283/api/Auth/login');
      loginReq.flush(
        { message: 'Credenciais inválidas' },
        { status: 401, statusText: 'Unauthorized' }
      );
      tick();
      loginFixture.detectChanges();

      // Verify error state
      expect(loginFixture.componentInstance.error()).toBeTruthy();
      expect(loginFixture.componentInstance.loading()).toBe(false);

      // Verify error message is displayed
      const errorElement = loginFixture.debugElement.query(By.css('rx-error-message'));
      expect(errorElement).toBeTruthy();

      // Verify user remains on login page
      expect(location.path()).toBe('/auth/login');
      expect(authService.isAuthenticated()).toBe(false);

      flush();
    }));

    it('should handle network errors during login', fakeAsync(() => {
      router.navigate(['/auth/login']);
      tick();

      const loginFixture = TestBed.createComponent(LoginComponent);
      loginFixture.detectChanges();

      // Submit login form
      const submitButton = loginFixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();
      tick();

      // Simulate network error
      const loginReq = httpTestingController.expectOne('http://localhost:5283/api/Auth/login');
      loginReq.error(new ProgressEvent('Network error'), { status: 0 });
      tick();
      loginFixture.detectChanges();

      // Verify network error handling
      expect(loginFixture.componentInstance.error()).toContain('conexão');
      expect(authService.isAuthenticated()).toBe(false);

      flush();
    }));

    it('should handle token expiration during establishment loading', fakeAsync(() => {
      // Setup authenticated state with expired token
      const expiredToken = 'expired-token';
      const expiredAuthState: AuthState = {
        token: expiredToken,
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
        roles: ['Proprietario'],
        user: mockUser,
        isLoading: false
      };

      // Manually set expired state
      localStorage.setItem('auth.token', expiredToken);
      localStorage.setItem('auth.refreshToken', 'refresh-token');
      localStorage.setItem('auth.expiresAt', expiredAuthState.expiresAt || '');
      localStorage.setItem('auth.roles', JSON.stringify(['Proprietario']));
      localStorage.setItem('auth.user', JSON.stringify(mockUser));

      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // First request should fail with 401
      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      estabelecimentosReq.flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();

      // Should attempt token refresh
      const refreshReq = httpTestingController.expectOne('http://localhost:5283/api/Auth/refresh-token');
      refreshReq.flush(mockLoginResponse);
      tick();

      // Should retry the original request with new token
      const retryReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      expect(retryReq.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      retryReq.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify successful recovery
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(authService.isAuthenticated()).toBe(true);

      flush();
    }));
  });

  describe('Establishment Selection Error Scenarios', () => {
    beforeEach(fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();
    }));

    it('should handle establishment loading failure with retry', fakeAsync(() => {
      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // Fail establishment loading
      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      estabelecimentosReq.flush(
        { message: 'Server error' },
        { status: 500, statusText: 'Internal Server Error' }
      );
      tick();
      dashboardFixture.detectChanges();

      // Verify error state
      expect(dashboardFixture.componentInstance.estabelecimentoError).toBeTruthy();
      expect(dashboardFixture.componentInstance.isLoadingEstabelecimentos).toBe(false);

      // Verify error message is displayed
      const errorElement = dashboardFixture.debugElement.query(By.css('rx-error-message'));
      expect(errorElement).toBeTruthy();

      // Test retry functionality
      errorElement.componentInstance.retry.emit();
      tick();

      // Verify retry request
      const retryReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      retryReq.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      // Verify successful retry
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(dashboardFixture.componentInstance.estabelecimentoError).toBeNull();

      flush();
    }));

    it('should handle empty establishment list gracefully', fakeAsync(() => {
      router.navigate(['/dashboard']);
      tick();

      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // Return empty establishment list
      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      estabelecimentosReq.flush([]);
      tick();
      dashboardFixture.detectChanges();

      // Verify empty state handling
      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual([]);
      expect(dashboardFixture.componentInstance.showEstabelecimentoSelector).toBe(true);

      // Verify empty state is displayed
      const selectorElement = dashboardFixture.debugElement.query(By.css('app-estabelecimento-selector'));
      expect(selectorElement.componentInstance.showEmptyState).toBe(true);

      flush();
    }));
  });

  describe('Responsive Behavior Testing', () => {
    beforeEach(fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();
    }));

    it('should adapt layout for mobile viewport', fakeAsync(() => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });
      window.dispatchEvent(new Event('resize'));

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

      // Verify mobile-specific behavior
      const selectorElement = dashboardFixture.debugElement.query(By.css('app-estabelecimento-selector'));
      expect(selectorElement).toBeTruthy();

      // Check if mobile classes are applied (this would depend on your CSS implementation)
      const dashboardElement = dashboardFixture.debugElement.query(By.css('.dashboard'));
      expect(dashboardElement.nativeElement.classList).toContain('dashboard');

      flush();
    }));

    it('should adapt layout for tablet viewport', fakeAsync(() => {
      // Simulate tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, configurable: true });
      window.dispatchEvent(new Event('resize'));

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

      // Verify tablet-specific behavior
      const cardElements = dashboardFixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      expect(cardElements.length).toBe(2);

      flush();
    }));

    it('should adapt layout for desktop viewport', fakeAsync(() => {
      // Simulate desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
      window.dispatchEvent(new Event('resize'));

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

      // Verify desktop-specific behavior
      const selectorElement = dashboardFixture.debugElement.query(By.css('app-estabelecimento-selector'));
      expect(selectorElement).toBeTruthy();

      // Verify grid layout is used for desktop
      expect(selectorElement.componentInstance.viewMode).toBe('grid');

      flush();
    }));
  });

  describe('Navigation and Route Protection', () => {
    it('should protect dashboard route when not authenticated', fakeAsync(() => {
      // Ensure not authenticated
      expect(authService.isAuthenticated()).toBe(false);

      // Try to navigate to dashboard
      router.navigate(['/dashboard']);
      tick();

      // Should redirect to login
      expect(location.path()).toBe('/auth/login');

      flush();
    }));

    it('should allow dashboard access when authenticated', fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();

      // Navigate to dashboard
      router.navigate(['/dashboard']);
      tick();

      // Should stay on dashboard
      expect(location.path()).toBe('/dashboard');

      flush();
    }));

    it('should handle invalid routes gracefully', fakeAsync(() => {
      router.navigate(['/invalid-route']);
      tick();

      // Should redirect to login (catch-all route)
      expect(location.path()).toBe('/auth/login');

      flush();
    }));
  });

  describe('Recovery Flow Testing', () => {
    it('should recover from temporary network issues', fakeAsync(() => {
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

      // Second request succeeds
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

    it('should handle session recovery after browser refresh', fakeAsync(() => {
      // Simulate browser refresh by setting localStorage and creating new service instance
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));

      // Create new auth service instance (simulating app restart)
      const newAuthService = TestBed.inject(AuthService);
      tick();

      // Verify session is restored
      expect(newAuthService.isAuthenticated()).toBe(true);
      expect(newAuthService.getUserId()).toBe('user123');
      expect(newAuthService.isProprietario()).toBe(true);

      // Navigate to dashboard
      router.navigate(['/dashboard']);
      tick();
      expect(location.path()).toBe('/dashboard');

      flush();
    }));
  });

  describe('Concurrent Operations Testing', () => {
    beforeEach(fakeAsync(() => {
      // Setup authenticated state
      localStorage.setItem('auth.token', mockLoginResponse.token);
      localStorage.setItem('auth.refreshToken', mockLoginResponse.refreshToken);
      localStorage.setItem('auth.expiresAt', mockLoginResponse.expiresAt);
      localStorage.setItem('auth.roles', JSON.stringify(mockLoginResponse.roles));
      localStorage.setItem('auth.user', JSON.stringify(mockLoginResponse.user));
      tick();
    }));

    it('should handle multiple dashboard instances gracefully', fakeAsync(() => {
      // Create multiple dashboard components (simulating multiple tabs)
      const fixture1 = TestBed.createComponent(DashboardComponent);
      const fixture2 = TestBed.createComponent(DashboardComponent);

      fixture1.detectChanges();
      fixture2.detectChanges();
      tick();

      // Both should trigger establishment loading
      const req1 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      const req2 = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );

      req1.flush(mockEstabelecimentos);
      req2.flush(mockEstabelecimentos);
      tick();

      fixture1.detectChanges();
      fixture2.detectChanges();

      // Both should have the same data
      expect(fixture1.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(fixture2.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      flush();
    }));

    it('should handle rapid navigation between routes', fakeAsync(() => {
      // Rapid navigation
      router.navigate(['/dashboard']);
      tick();
      router.navigate(['/auth/login']);
      tick();
      router.navigate(['/dashboard']);
      tick();

      // Should end up on dashboard
      expect(location.path()).toBe('/dashboard');

      // Create dashboard component
      const dashboardFixture = TestBed.createComponent(DashboardComponent);
      dashboardFixture.detectChanges();
      tick();

      // Should still work normally
      const estabelecimentosReq = httpTestingController.expectOne(
        'http://localhost:5283/api/Estabelecimento/proprietario/user123'
      );
      estabelecimentosReq.flush(mockEstabelecimentos);
      tick();
      dashboardFixture.detectChanges();

      expect(dashboardFixture.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      flush();
    }));
  });
});
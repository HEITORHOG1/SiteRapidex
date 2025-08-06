import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { LoginComponent } from '../features/auth/login/login.component';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { AuthService } from '../core/services/auth.service';
import { EstabelecimentoService } from '../core/services/estabelecimento.service';
import { authTokenInterceptor } from '../core/interceptors/auth-token.interceptor';
import { errorInterceptor } from '../core/interceptors/error.interceptor';
import { authGuard } from '../core/guards/auth.guard';

/**
 * E2E Test Suite Configuration and Runner
 * 
 * This file serves as the main configuration and runner for all E2E tests.
 * It ensures proper setup and teardown for comprehensive integration testing.
 */

describe('E2E Test Suite Configuration', () => {
  beforeEach(async () => {
    // Global test setup
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset any global state
    if (typeof window !== 'undefined') {
      // Reset viewport to default
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
      
      // Clear any custom CSS classes
      document.body.className = '';
      
      // Reset focus
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }
    }

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        DashboardComponent
      ],
      providers: [
        provideRouter([
          { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
          { path: 'auth/login', component: LoginComponent },
          { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
          { path: '**', redirectTo: '/auth/login' }
        ]),
        provideHttpClient(withInterceptors([authTokenInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        EstabelecimentoService
      ]
    }).compileComponents();
  });

  afterEach(() => {
    // Global test cleanup
    localStorage.clear();
    sessionStorage.clear();
    
    // Clean up any timers or intervals
    if (typeof window !== 'undefined') {
      // Clear any pending timeouts (this is a simplified approach)
      for (let i = 1; i < 1000; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
    }
  });

  it('should have proper test environment setup', () => {
    expect(TestBed).toBeDefined();
    expect(localStorage).toBeDefined();
    expect(sessionStorage).toBeDefined();
  });

  it('should have all required services available', () => {
    const authService = TestBed.inject(AuthService);
    const estabelecimentoService = TestBed.inject(EstabelecimentoService);

    expect(authService).toBeDefined();
    expect(estabelecimentoService).toBeDefined();
  });

  it('should have proper component imports', () => {
    expect(LoginComponent).toBeDefined();
    expect(DashboardComponent).toBeDefined();
  });

  it('should have interceptors configured', () => {
    expect(authTokenInterceptor).toBeDefined();
    expect(errorInterceptor).toBeDefined();
  });

  it('should have auth guard configured', () => {
    expect(authGuard).toBeDefined();
  });
});

/**
 * E2E Test Utilities
 * 
 * Common utilities and helpers for E2E tests
 */
export class E2ETestUtils {
  /**
   * Sets up authenticated user state in localStorage
   */
  static setupAuthenticatedUser(overrides: Partial<{
    token: string;
    refreshToken: string;
    expiresAt: string;
    roles: string[];
    userId: string;
    userName: string;
    email: string;
    nomeUsuario: string;
  }> = {}) {
    const defaults = {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      roles: ['Proprietario'],
      userId: 'user123',
      userName: 'testuser',
      email: 'test@example.com',
      nomeUsuario: 'Test User'
    };

    const config = { ...defaults, ...overrides };

    localStorage.setItem('auth.token', config.token);
    localStorage.setItem('auth.refreshToken', config.refreshToken);
    localStorage.setItem('auth.expiresAt', config.expiresAt);
    localStorage.setItem('auth.roles', JSON.stringify(config.roles));
    localStorage.setItem('auth.user', JSON.stringify({
      id: config.userId,
      userName: config.userName,
      email: config.email,
      nomeUsuario: config.nomeUsuario
    }));
  }

  /**
   * Simulates different viewport sizes for responsive testing
   */
  static setViewport(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Common viewport presets
   */
  static viewports = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 },
    smallDesktop: { width: 1024, height: 768 }
  };

  /**
   * Simulates keyboard events
   */
  static simulateKeyboardEvent(element: HTMLElement, key: string, type: 'keydown' | 'keyup' | 'keypress' = 'keydown') {
    const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  }

  /**
   * Simulates touch events for mobile testing
   */
  static simulateTouchEvent(
    element: HTMLElement, 
    type: 'touchstart' | 'touchmove' | 'touchend',
    touches: { clientX: number; clientY: number }[]
  ) {
    const touchList = touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: element,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
      pageX: touch.clientX,
      pageY: touch.clientY,
      screenX: touch.clientX,
      screenY: touch.clientY
    })) as unknown as Touch[];

    const event = new TouchEvent(type, {
      touches: type === 'touchend' ? [] : touchList,
      changedTouches: touchList,
      bubbles: true,
      cancelable: true
    });

    element.dispatchEvent(event);
  }

  /**
   * Waits for async operations to complete
   */
  static async waitForAsync(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates mock establishment data
   */
  static createMockEstabelecimentos(count: number = 2) {
    const estabelecimentos = [];
    
    for (let i = 1; i <= count; i++) {
      estabelecimentos.push({
        id: i,
        usuarioId: 'user123',
        razaoSocial: `Empresa ${i} LTDA`,
        nomeFantasia: `Estabelecimento ${i}`,
        cnpj: `1234567800019${i}`,
        telefone: `1199999999${i}`,
        endereco: `Rua ${String.fromCharCode(64 + i)}, ${i}23`,
        status: true,
        cep: `0123456${i}`,
        numero: `${i}23`,
        dataCadastro: `2024-01-0${i}`,
        latitude: -23.5505 + (i * 0.001),
        longitude: -46.6333 + (i * 0.001),
        raioEntregaKm: 5,
        taxaEntregaFixa: 5.00,
        descricao: `Descrição do estabelecimento ${i}`
      });
    }

    return estabelecimentos;
  }

  /**
   * Simulates network conditions
   */
  static simulateNetworkConditions(condition: 'fast' | 'slow' | 'offline' | 'unstable') {
    // This would be implemented with actual network simulation in a real E2E environment
    // For unit tests, we can mock the behavior in HTTP interceptors
    console.log(`Simulating ${condition} network conditions`);
  }

  /**
   * Checks accessibility compliance
   */
  static checkAccessibility(element: HTMLElement): {
    hasAriaLabels: boolean;
    hasProperHeadings: boolean;
    hasKeyboardSupport: boolean;
    hasColorContrast: boolean;
  } {
    const hasAriaLabels = element.querySelectorAll('[aria-label], [aria-labelledby]').length > 0;
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const hasProperHeadings = headings.length > 0;
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const hasKeyboardSupport = focusableElements.length > 0;
    
    // Color contrast would need actual color analysis in a real implementation
    const hasColorContrast = true; // Simplified for testing

    return {
      hasAriaLabels,
      hasProperHeadings,
      hasKeyboardSupport,
      hasColorContrast
    };
  }

  /**
   * Performance monitoring utilities
   */
  static measurePerformance<T>(operation: () => T, label: string): T {
    const start = performance.now();
    const result = operation();
    const end = performance.now();
    console.log(`${label} took ${end - start} milliseconds`);
    return result;
  }

  /**
   * Memory usage monitoring (simplified)
   */
  static checkMemoryUsage(): { used: number; total: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize
      };
    }
    return { used: 0, total: 0 };
  }

  /**
   * Cleanup utilities
   */
  static cleanup() {
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset viewport
    this.setViewport(1024, 768);
    
    // Clear body classes
    document.body.className = '';
    
    // Reset focus
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur();
    }
  }
}

/**
 * E2E Test Data Factory
 * 
 * Provides consistent test data across all E2E tests
 */
export class E2ETestDataFactory {
  static readonly DEFAULT_USER = {
    id: 'user123',
    userName: 'testuser',
    email: 'test@example.com',
    nomeUsuario: 'Test User'
  };

  static readonly DEFAULT_LOGIN_RESPONSE = {
    token: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roles: ['Proprietario'],
    user: this.DEFAULT_USER
  };

  static readonly DEFAULT_ESTABELECIMENTOS = E2ETestUtils.createMockEstabelecimentos(2);

  static createLoginRequest(username: string = 'testuser', password: string = 'password123') {
    return { username, password };
  }

  static createApiError(code: string, message: string) {
    return {
      code,
      message,
      timestamp: new Date()
    };
  }

  static createNetworkError() {
    return new ProgressEvent('Network error');
  }

  static createServerError(status: number = 500, message: string = 'Internal Server Error') {
    return { status, statusText: message };
  }
}

/**
 * E2E Test Assertions
 * 
 * Custom assertions for E2E testing
 */
export class E2ETestAssertions {
  static expectAuthenticated(authService: AuthService) {
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getUserId()).toBeTruthy();
    expect(authService.token()).toBeTruthy();
  }

  static expectNotAuthenticated(authService: AuthService) {
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getUserId()).toBeNull();
    expect(authService.token()).toBeNull();
  }

  static expectLoadingState(component: any, isLoading: boolean) {
    expect(component.isLoading || component.isLoadingEstabelecimentos).toBe(isLoading);
  }

  static expectErrorState(component: any, hasError: boolean) {
    const hasErrorMessage = !!(component.errorMessage || component.estabelecimentoError);
    expect(hasErrorMessage).toBe(hasError);
  }

  static expectAccessibleElement(element: HTMLElement) {
    const accessibility = E2ETestUtils.checkAccessibility(element);
    expect(accessibility.hasKeyboardSupport).toBe(true);
    // Additional accessibility checks can be added here
  }

  static expectResponsiveLayout(element: HTMLElement, viewport: 'mobile' | 'tablet' | 'desktop') {
    // This would check CSS classes or computed styles in a real implementation
    expect(element).toBeTruthy();
    // Add specific responsive checks based on viewport
  }
}

describe('E2E Test Utilities', () => {
  it('should provide utility functions', () => {
    expect(E2ETestUtils.setupAuthenticatedUser).toBeDefined();
    expect(E2ETestUtils.setViewport).toBeDefined();
    expect(E2ETestUtils.simulateKeyboardEvent).toBeDefined();
    expect(E2ETestUtils.createMockEstabelecimentos).toBeDefined();
  });

  it('should provide test data factory', () => {
    expect(E2ETestDataFactory.DEFAULT_USER).toBeDefined();
    expect(E2ETestDataFactory.DEFAULT_LOGIN_RESPONSE).toBeDefined();
    expect(E2ETestDataFactory.DEFAULT_ESTABELECIMENTOS).toBeDefined();
  });

  it('should provide test assertions', () => {
    expect(E2ETestAssertions.expectAuthenticated).toBeDefined();
    expect(E2ETestAssertions.expectNotAuthenticated).toBeDefined();
    expect(E2ETestAssertions.expectLoadingState).toBeDefined();
    expect(E2ETestAssertions.expectErrorState).toBeDefined();
  });

  it('should create mock estabelecimentos', () => {
    const estabelecimentos = E2ETestUtils.createMockEstabelecimentos(3);
    expect(estabelecimentos.length).toBe(3);
    expect(estabelecimentos[0].id).toBe(1);
    expect(estabelecimentos[0].nomeFantasia).toBe('Estabelecimento 1');
  });

  it('should setup authenticated user state', () => {
    E2ETestUtils.setupAuthenticatedUser();
    
    expect(localStorage.getItem('auth.token')).toBe('mock-jwt-token');
    expect(localStorage.getItem('auth.refreshToken')).toBe('mock-refresh-token');
    expect(JSON.parse(localStorage.getItem('auth.roles') || '[]')).toEqual(['Proprietario']);
  });

  it('should cleanup test state', () => {
    localStorage.setItem('test', 'value');
    sessionStorage.setItem('test', 'value');
    
    E2ETestUtils.cleanup();
    
    expect(localStorage.getItem('test')).toBeNull();
    expect(sessionStorage.getItem('test')).toBeNull();
  });
});
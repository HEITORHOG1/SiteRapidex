import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { EstabelecimentoService } from '../../core/services/estabelecimento.service';
import { EstabelecimentoSelectorComponent } from '../../shared/ui/estabelecimento-selector/estabelecimento-selector';
import { LoadingSpinnerComponent } from '../../shared/ui/loading/loading';
import { ErrorMessageComponent } from '../../shared/ui/error-message/error-message';
import { Estabelecimento } from '../../data-access/models/estabelecimento.models';
import { AuthState, UserInfo, ApiError, ErrorCodes } from '../../data-access/models/auth.models';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockEstabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let mockRouter: jasmine.SpyObj<Router>;

  // Mock data
  const mockUser: UserInfo = {
    id: 'user123',
    userName: 'testuser',
    email: 'test@example.com',
    nomeUsuario: 'Test User'
  };

  const mockAuthState: AuthState = {
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: '2024-12-31T23:59:59Z',
    roles: ['Proprietario'],
    user: mockUser,
    isLoading: false
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
      nomeFantasia: 'Restaurante 2',
      cnpj: '98765432000195',
      telefone: '11888888888',
      endereco: 'Rua B, 456',
      status: false,
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

  // BehaviorSubjects for reactive testing
  let authStateSubject: BehaviorSubject<AuthState>;
  let estabelecimentosSubject: BehaviorSubject<Estabelecimento[]>;
  let selectedEstabelecimentoSubject: BehaviorSubject<Estabelecimento | null>;

  beforeEach(async () => {
    // Initialize subjects
    authStateSubject = new BehaviorSubject<AuthState>(mockAuthState);
    estabelecimentosSubject = new BehaviorSubject<Estabelecimento[]>([]);
    selectedEstabelecimentoSubject = new BehaviorSubject<Estabelecimento | null>(null);

    // Create spies
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'user', 'roles', 'getUserId', 'isProprietario', 'logout', 'authState'
    ]);
    const estabelecimentoServiceSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'loadEstabelecimentosForProprietario', 'selectEstabelecimento', 'clearEstabelecimentos'
    ], {
      estabelecimentos$: estabelecimentosSubject.asObservable(),
      selectedEstabelecimento$: selectedEstabelecimentoSubject.asObservable()
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        DashboardComponent,
        EstabelecimentoSelectorComponent,
        LoadingSpinnerComponent,
        ErrorMessageComponent
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockEstabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup default mock returns
    mockAuthService.user.and.returnValue(mockUser);
    mockAuthService.roles.and.returnValue(['Proprietario']);
    mockAuthService.getUserId.and.returnValue('user123');
    mockAuthService.isProprietario.and.returnValue(true);
    mockAuthService.authState.and.returnValue(authStateSubject.asObservable());
    mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
  });

  afterEach(() => {
    authStateSubject.complete();
    estabelecimentosSubject.complete();
    selectedEstabelecimentoSubject.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(component.sidebarCollapsed).toBe(false);
      expect(component.estabelecimentos).toEqual([]);
      expect(component.selectedEstabelecimento).toBeNull();
      expect(component.isLoadingEstabelecimentos).toBe(false);
      expect(component.estabelecimentoError).toBeNull();
      expect(component.showEstabelecimentoSelector).toBe(false);
    });

    it('should load user data on init', () => {
      fixture.detectChanges();

      expect(component.userName).toBe('Test User');
      expect(component.userRole).toBe('Proprietario');
      expect(mockAuthService.user).toHaveBeenCalled();
      expect(mockAuthService.roles).toHaveBeenCalled();
    });

    it('should redirect to login if no user is logged in', () => {
      mockAuthService.user.and.returnValue(null);

      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should use fallback values for user data', () => {
      mockAuthService.user.and.returnValue({ ...mockUser, nomeUsuario: '', userName: '' });
      mockAuthService.roles.and.returnValue([]);

      fixture.detectChanges();

      expect(component.userName).toBe('Usuário');
      expect(component.userRole).toBe('Usuário');
    });
  });

  describe('Authentication State Management', () => {
    it('should redirect to login when auth state becomes invalid', () => {
      fixture.detectChanges();

      // Simulate auth state change to invalid
      authStateSubject.next({ ...mockAuthState, token: null });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should handle auth state changes correctly', () => {
      fixture.detectChanges();

      // Verify initial state
      expect(mockRouter.navigate).not.toHaveBeenCalled();

      // Change to invalid state
      authStateSubject.next({ ...mockAuthState, token: '' });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('Estabelecimento Loading', () => {
    it('should load estabelecimentos on init for proprietario', () => {
      fixture.detectChanges();

      expect(mockEstabelecimentoService.loadEstabelecimentosForProprietario).toHaveBeenCalledWith('user123');
    });

    it('should not load estabelecimentos if user is not proprietario', () => {
      mockAuthService.isProprietario.and.returnValue(false);
      spyOn(console, 'warn');

      fixture.detectChanges();

      expect(mockEstabelecimentoService.loadEstabelecimentosForProprietario).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('Usuário não é proprietário, não carregando estabelecimentos');
    });

    it('should not load estabelecimentos if no user ID', () => {
      mockAuthService.getUserId.and.returnValue(null);
      spyOn(console, 'warn');

      fixture.detectChanges();

      expect(mockEstabelecimentoService.loadEstabelecimentosForProprietario).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('Usuário não logado para carregar estabelecimentos');
    });

    it('should handle loading state correctly', () => {
      fixture.detectChanges();

      expect(component.isLoadingEstabelecimentos).toBe(true);
      expect(component.estabelecimentoError).toBeNull();
    });

    it('should handle successful estabelecimento loading', () => {
      fixture.detectChanges();

      // Simulate successful loading
      estabelecimentosSubject.next(mockEstabelecimentos);

      expect(component.isLoadingEstabelecimentos).toBe(false);
      expect(component.estabelecimentos).toEqual(mockEstabelecimentos);
    });

    it('should show selector when estabelecimentos loaded and none selected', () => {
      fixture.detectChanges();

      // Simulate successful loading with no selected estabelecimento
      estabelecimentosSubject.next(mockEstabelecimentos);

      expect(component.showEstabelecimentoSelector).toBe(true);
    });

    it('should not show selector when estabelecimento already selected', () => {
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);
      fixture.detectChanges();

      // Simulate successful loading with selected estabelecimento
      estabelecimentosSubject.next(mockEstabelecimentos);

      expect(component.showEstabelecimentoSelector).toBe(false);
    });

    it('should handle loading errors correctly', () => {
      const error: ApiError = {
        code: ErrorCodes.SERVER_ERROR,
        message: 'Erro ao carregar estabelecimentos',
        timestamp: new Date()
      };

      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      fixture.detectChanges();

      expect(component.isLoadingEstabelecimentos).toBe(false);
      expect(component.estabelecimentoError).toBe('Erro ao carregar estabelecimentos');
      expect(console.error).toHaveBeenCalledWith('Erro ao carregar estabelecimentos:', error);
    });
  });

  describe('Estabelecimento Selection', () => {
    beforeEach(() => {
      fixture.detectChanges();
      estabelecimentosSubject.next(mockEstabelecimentos);
    });

    it('should handle estabelecimento selection', () => {
      component.onEstabelecimentoSelected(mockEstabelecimentos[0]);

      expect(mockEstabelecimentoService.selectEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[0]);
    });

    it('should handle estabelecimento selection confirmation', () => {
      component.onConfirmEstabelecimentoSelection(mockEstabelecimentos[0]);

      expect(mockEstabelecimentoService.selectEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[0]);
      expect(component.showEstabelecimentoSelector).toBe(false);
    });

    it('should handle view details action', () => {
      spyOn(console, 'log');

      component.onViewEstabelecimentoDetails(mockEstabelecimentos[0]);

      expect(console.log).toHaveBeenCalledWith('View details for:', mockEstabelecimentos[0].nomeFantasia);
    });

    it('should handle legacy dropdown selection', () => {
      component.onEstabelecimentoChange('1');

      expect(mockEstabelecimentoService.selectEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[0]);
    });

    it('should handle invalid dropdown selection', () => {
      component.onEstabelecimentoChange('999');

      expect(mockEstabelecimentoService.selectEstabelecimento).not.toHaveBeenCalled();
    });

    it('should update selected estabelecimento from service', () => {
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);

      expect(component.selectedEstabelecimento).toEqual(mockEstabelecimentos[0]);
      expect(component.showEstabelecimentoSelector).toBe(false);
    });

    it('should get selected estabelecimento ID as string', () => {
      component.selectedEstabelecimento = mockEstabelecimentos[0];

      expect(component.getSelectedEstabelecimentoId()).toBe('1');
    });

    it('should return empty string when no estabelecimento selected', () => {
      component.selectedEstabelecimento = null;

      expect(component.getSelectedEstabelecimentoId()).toBe('');
    });
  });

  describe('Stats Loading', () => {
    beforeEach(() => {
      fixture.detectChanges();
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should load stats when estabelecimento is selected', fakeAsync(() => {
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);
      tick();

      expect(component.isLoadingStats).toBe(true);
      expect(component.statsError).toBeNull();

      // Fast-forward time to complete stats loading
      tick(1500);

      expect(component.isLoadingStats).toBe(false);
      expect(component.stats.length).toBe(4);
      expect(component.recentActivities.length).toBe(4);
    }));

    it('should handle stats loading errors', fakeAsync(() => {
      // Mock an error during stats loading
      spyOn(component as any, 'updateStatsForEstabelecimento').and.throwError('Stats error');
      spyOn(console, 'error');

      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);
      tick();

      expect(component.isLoadingStats).toBe(true);

      tick(1500);

      expect(component.isLoadingStats).toBe(false);
      expect(component.statsError).toBe('Erro ao carregar estatísticas do estabelecimento');
      expect(console.error).toHaveBeenCalled();
    }));

    it('should retry stats loading', fakeAsync(() => {
      component.selectedEstabelecimento = mockEstabelecimentos[0];
      spyOn(component as any, 'loadStatsForEstabelecimento');

      component.onRetryLoadStats();

      expect((component as any).loadStatsForEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[0]);
    }));

    it('should not retry stats loading when no estabelecimento selected', () => {
      component.selectedEstabelecimento = null;
      spyOn(component as any, 'loadStatsForEstabelecimento');

      component.onRetryLoadStats();

      expect((component as any).loadStatsForEstabelecimento).not.toHaveBeenCalled();
    });
  });

  describe('UI State Management', () => {
    it('should show and hide estabelecimento selector', () => {
      component.showSelector();
      expect(component.showEstabelecimentoSelector).toBe(true);

      component.hideSelector();
      expect(component.showEstabelecimentoSelector).toBe(false);
    });

    it('should change estabelecimento (show selector)', () => {
      component.changeEstabelecimento();
      expect(component.showEstabelecimentoSelector).toBe(true);
    });

    it('should toggle sidebar', () => {
      const initialState = component.sidebarCollapsed;
      component.toggleSidebar();
      expect(component.sidebarCollapsed).toBe(!initialState);
    });

    it('should handle retry loading estabelecimentos', () => {
      spyOn(component as any, 'loadEstabelecimentos');

      component.onRetryLoadEstabelecimentos();

      expect((component as any).loadEstabelecimentos).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should detect mobile screen size', () => {
      // Mock window.innerWidth
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(500);

      component.onResize({});

      expect(component.isMobile).toBe(true);
      expect(component.sidebarCollapsed).toBe(true);
    });

    it('should detect desktop screen size', () => {
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1200);

      component.onResize({});

      expect(component.isMobile).toBe(false);
    });
  });

  describe('Quick Actions', () => {
    it('should handle new order action', () => {
      component.onQuickAction('newOrder');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/orders/new']);
    });

    it('should handle new client action', () => {
      component.onQuickAction('newClient');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/clients/new']);
    });

    it('should handle reports action', () => {
      component.onQuickAction('reports');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/reports']);
    });

    it('should handle settings action', () => {
      component.onQuickAction('settings');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/settings']);
    });

    it('should handle unknown action', () => {
      spyOn(console, 'log');

      component.onQuickAction('unknown');

      expect(console.log).toHaveBeenCalledWith('Ação não implementada:', 'unknown');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    it('should clear estabelecimentos and logout', () => {
      component.logout();

      expect(mockEstabelecimentoService.clearEstabelecimentos).toHaveBeenCalled();
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('Component Rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render loading spinner when loading estabelecimentos', () => {
      component.isLoadingEstabelecimentos = true;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('rx-loading-spinner'));
      expect(loadingElement).toBeTruthy();
    });

    it('should render error message when estabelecimento error exists', () => {
      component.estabelecimentoError = 'Erro ao carregar';
      component.isLoadingEstabelecimentos = false;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('rx-error-message'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.componentInstance.message).toBe('Erro ao carregar');
    });

    it('should render estabelecimento selector when showEstabelecimentoSelector is true', () => {
      component.showEstabelecimentoSelector = true;
      component.estabelecimentos = mockEstabelecimentos;
      fixture.detectChanges();

      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      expect(selectorElement).toBeTruthy();
      expect(selectorElement.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);
    });

    it('should render stats when not loading and no error', () => {
      component.isLoadingStats = false;
      component.statsError = null;
      fixture.detectChanges();

      const statsElements = fixture.debugElement.queryAll(By.css('.stat-card'));
      expect(statsElements.length).toBe(4);
    });

    it('should render stats loading spinner when loading stats', () => {
      component.isLoadingStats = true;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.stats-loading'));
      expect(loadingElement).toBeTruthy();
    });

    it('should render stats error message when stats error exists', () => {
      component.isLoadingStats = false;
      component.statsError = 'Erro nas estatísticas';
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('.stats-error'));
      expect(errorElement).toBeTruthy();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.estabelecimentos = mockEstabelecimentos;
      component.showEstabelecimentoSelector = true;
      fixture.detectChanges();
    });

    it('should handle estabelecimento selection from selector', () => {
      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      
      selectorElement.componentInstance.estabelecimentoSelected.emit(mockEstabelecimentos[0]);

      expect(mockEstabelecimentoService.selectEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[0]);
    });

    it('should handle view details from selector', () => {
      spyOn(console, 'log');
      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      
      selectorElement.componentInstance.viewDetails.emit(mockEstabelecimentos[0]);

      expect(console.log).toHaveBeenCalledWith('View details for:', mockEstabelecimentos[0].nomeFantasia);
    });

    it('should handle retry from error message', () => {
      component.estabelecimentoError = 'Erro';
      component.isLoadingEstabelecimentos = false;
      fixture.detectChanges();

      spyOn(component, 'onRetryLoadEstabelecimentos');
      const errorElement = fixture.debugElement.query(By.css('rx-error-message'));
      
      errorElement.componentInstance.retry.emit();

      expect(component.onRetryLoadEstabelecimentos).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty estabelecimentos array', () => {
      fixture.detectChanges();
      estabelecimentosSubject.next([]);

      expect(component.estabelecimentos).toEqual([]);
      expect(component.showEstabelecimentoSelector).toBe(true);
    });

    it('should handle null user gracefully', () => {
      mockAuthService.user.and.returnValue(null);

      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should handle missing user properties', () => {
      mockAuthService.user.and.returnValue({
        id: 'user123',
        userName: '',
        email: 'test@example.com',
        nomeUsuario: ''
      });

      fixture.detectChanges();

      expect(component.userName).toBe('Usuário');
    });

    it('should handle component destruction properly', () => {
      fixture.detectChanges();
      
      // Verify subscriptions are active
      expect(component['destroy$'].closed).toBe(false);

      // Destroy component
      fixture.destroy();

      // Verify cleanup
      expect(component['destroy$'].closed).toBe(true);
    });
  });
});
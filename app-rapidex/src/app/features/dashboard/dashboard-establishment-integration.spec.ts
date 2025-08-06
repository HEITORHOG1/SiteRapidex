import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of, throwError, timer } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { EstabelecimentoService } from '../../core/services/estabelecimento.service';
import { EstabelecimentoSelectorComponent } from '../../shared/ui/estabelecimento-selector/estabelecimento-selector';
import { EstabelecimentoCardComponent } from '../../shared/ui/estabelecimento-card/estabelecimento-card';
import { LoadingSpinnerComponent } from '../../shared/ui/loading/loading';
import { ErrorMessageComponent } from '../../shared/ui/error-message/error-message';
import { Estabelecimento } from '../../data-access/models/estabelecimento.models';
import { AuthState, UserInfo, ApiError, ErrorCodes } from '../../data-access/models/auth.models';

describe('Dashboard Establishment Selection Integration', () => {
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
        EstabelecimentoCardComponent,
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
  });

  afterEach(() => {
    authStateSubject.complete();
    estabelecimentosSubject.complete();
    selectedEstabelecimentoSubject.complete();
  });

  describe('Complete Establishment Selection Flow', () => {
    it('should complete full establishment selection flow successfully', fakeAsync(() => {
      // Setup successful loading
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(
        timer(100).pipe(() => of(mockEstabelecimentos))
      );

      // Initialize component
      fixture.detectChanges();
      tick(100);

      // Verify loading state
      expect(component.isLoadingEstabelecimentos).toBe(true);
      expect(mockEstabelecimentoService.loadEstabelecimentosForProprietario).toHaveBeenCalledWith('user123');

      // Simulate successful loading
      estabelecimentosSubject.next(mockEstabelecimentos);
      fixture.detectChanges();

      // Verify estabelecimentos loaded and selector shown
      expect(component.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(component.showEstabelecimentoSelector).toBe(true);
      expect(component.isLoadingEstabelecimentos).toBe(false);

      // Verify selector component is rendered
      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      expect(selectorElement).toBeTruthy();
      expect(selectorElement.componentInstance.estabelecimentos).toEqual(mockEstabelecimentos);

      // Simulate user selecting an establishment
      selectorElement.componentInstance.estabelecimentoSelected.emit(mockEstabelecimentos[0]);

      // Verify selection was processed
      expect(mockEstabelecimentoService.selectEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[0]);

      // Simulate service updating selected establishment
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);
      tick(1500); // Wait for stats loading
      fixture.detectChanges();

      // Verify final state
      expect(component.selectedEstabelecimento).toEqual(mockEstabelecimentos[0]);
      expect(component.showEstabelecimentoSelector).toBe(false);
      expect(component.isLoadingStats).toBe(false);
      expect(component.stats.length).toBe(4);
    }));

    it('should handle establishment selection with view details', () => {
      // Setup data
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();
      estabelecimentosSubject.next(mockEstabelecimentos);
      fixture.detectChanges();

      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      spyOn(console, 'log');

      // Simulate view details action
      selectorElement.componentInstance.viewDetails.emit(mockEstabelecimentos[0]);

      expect(console.log).toHaveBeenCalledWith('View details for:', mockEstabelecimentos[0].nomeFantasia);
    });

    it('should handle establishment selection confirmation flow', () => {
      // Setup data
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();
      estabelecimentosSubject.next(mockEstabelecimentos);
      fixture.detectChanges();

      // Simulate confirmation
      component.onConfirmEstabelecimentoSelection(mockEstabelecimentos[1]);

      expect(mockEstabelecimentoService.selectEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[1]);
      expect(component.showEstabelecimentoSelector).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle establishment loading errors with retry functionality', () => {
      const error: ApiError = {
        code: ErrorCodes.NETWORK_ERROR,
        message: 'Erro de conexão',
        timestamp: new Date()
      };

      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      fixture.detectChanges();

      // Verify error state
      expect(component.isLoadingEstabelecimentos).toBe(false);
      expect(component.estabelecimentoError).toBe('Erro de conexão');
      expect(console.error).toHaveBeenCalledWith('Erro ao carregar estabelecimentos:', error);

      // Verify error message is displayed
      const errorElement = fixture.debugElement.query(By.css('rx-error-message'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.componentInstance.message).toBe('Erro de conexão');

      // Test retry functionality
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      errorElement.componentInstance.retry.emit();

      expect(mockEstabelecimentoService.loadEstabelecimentosForProprietario).toHaveBeenCalledTimes(2);
    });

    it('should handle stats loading errors with retry', fakeAsync(() => {
      // Setup successful establishment loading
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();
      estabelecimentosSubject.next(mockEstabelecimentos);
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);

      // Mock stats loading error
      spyOn(component as any, 'updateStatsForEstabelecimento').and.throwError('Stats error');
      spyOn(console, 'error');

      tick(1500); // Wait for stats loading
      fixture.detectChanges();

      expect(component.isLoadingStats).toBe(false);
      expect(component.statsError).toBe('Erro ao carregar estatísticas do estabelecimento');
      expect(console.error).toHaveBeenCalled();

      // Test stats retry
      (component as any).updateStatsForEstabelecimento.and.stub();
      component.onRetryLoadStats();

      expect(component.isLoadingStats).toBe(true);
    }));

    it('should handle selector component errors', () => {
      // Setup data with error
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();
      estabelecimentosSubject.next(mockEstabelecimentos);
      fixture.detectChanges();

      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      
      // Simulate error in selector
      selectorElement.componentInstance.error = 'Erro no seletor';
      fixture.detectChanges();

      // Verify error is handled
      expect(selectorElement.componentInstance.showError).toBe(true);
    });
  });

  describe('Loading States Integration', () => {
    it('should show loading spinner during establishment loading', () => {
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(
        timer(1000).pipe(() => of(mockEstabelecimentos))
      );

      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('rx-loading-spinner'));
      expect(loadingElement).toBeTruthy();
      expect(component.isLoadingEstabelecimentos).toBe(true);
    });

    it('should show stats loading state', fakeAsync(() => {
      // Setup establishment selection
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);
      tick();

      expect(component.isLoadingStats).toBe(true);
      expect(component.statsError).toBeNull();

      // Complete stats loading
      tick(1500);
      fixture.detectChanges();

      expect(component.isLoadingStats).toBe(false);
    }));

    it('should handle concurrent loading states', fakeAsync(() => {
      // Start establishment loading
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(
        timer(500).pipe(() => of(mockEstabelecimentos))
      );
      fixture.detectChanges();

      expect(component.isLoadingEstabelecimentos).toBe(true);

      // Complete establishment loading and start stats loading
      tick(500);
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);
      tick();

      expect(component.isLoadingEstabelecimentos).toBe(false);
      expect(component.isLoadingStats).toBe(true);

      // Complete stats loading
      tick(1500);

      expect(component.isLoadingStats).toBe(false);
    }));
  });

  describe('State Synchronization', () => {
    it('should keep component state synchronized with service state', () => {
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();

      // Verify initial synchronization
      expect(component.estabelecimentos).toEqual([]);
      expect(component.selectedEstabelecimento).toBeNull();

      // Update service state
      estabelecimentosSubject.next(mockEstabelecimentos);
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);

      // Verify component state is synchronized
      expect(component.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(component.selectedEstabelecimento).toEqual(mockEstabelecimentos[0]);
    });

    it('should handle rapid state changes correctly', () => {
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();

      // Rapid state changes
      estabelecimentosSubject.next([]);
      estabelecimentosSubject.next(mockEstabelecimentos);
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[0]);
      selectedEstabelecimentoSubject.next(null);
      selectedEstabelecimentoSubject.next(mockEstabelecimentos[1]);

      // Verify final state
      expect(component.estabelecimentos).toEqual(mockEstabelecimentos);
      expect(component.selectedEstabelecimento).toEqual(mockEstabelecimentos[1]);
    });
  });

  describe('User Interaction Integration', () => {
    beforeEach(() => {
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();
      estabelecimentosSubject.next(mockEstabelecimentos);
      fixture.detectChanges();
    });

    it('should handle card selection through selector component', () => {
      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      const cardElements = fixture.debugElement.queryAll(By.css('app-estabelecimento-card'));

      // Simulate card click
      cardElements[0].componentInstance.select.emit(mockEstabelecimentos[0]);

      expect(mockEstabelecimentoService.selectEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[0]);
    });

    it('should handle view mode changes in selector', () => {
      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      const viewToggleButtons = fixture.debugElement.queryAll(By.css('.view-toggle__button'));

      // Switch to list view
      viewToggleButtons[1].nativeElement.click();
      fixture.detectChanges();

      expect(selectorElement.componentInstance.viewMode).toBe('list');
    });

    it('should handle keyboard navigation in cards', () => {
      const cardElements = fixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      
      // Simulate Enter key on first card
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      cardElements[0].nativeElement.dispatchEvent(enterEvent);

      expect(mockEstabelecimentoService.selectEstabelecimento).toHaveBeenCalledWith(mockEstabelecimentos[0]);
    });
  });

  describe('Authentication Integration', () => {
    it('should handle authentication state changes during establishment selection', () => {
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();
      estabelecimentosSubject.next(mockEstabelecimentos);
      fixture.detectChanges();

      // Simulate authentication loss
      authStateSubject.next({ ...mockAuthState, token: null });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should clear establishments on logout', () => {
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of(mockEstabelecimentos));
      fixture.detectChanges();

      component.logout();

      expect(mockEstabelecimentoService.clearEstabelecimentos).toHaveBeenCalled();
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('Edge Cases Integration', () => {
    it('should handle empty establishment list gracefully', () => {
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(of([]));
      fixture.detectChanges();
      estabelecimentosSubject.next([]);
      fixture.detectChanges();

      expect(component.estabelecimentos).toEqual([]);
      expect(component.showEstabelecimentoSelector).toBe(true);

      const selectorElement = fixture.debugElement.query(By.css('app-estabelecimento-selector'));
      expect(selectorElement.componentInstance.showEmptyState).toBe(true);
    });

    it('should handle component destruction during loading', () => {
      mockEstabelecimentoService.loadEstabelecimentosForProprietario.and.returnValue(
        timer(1000).pipe(() => of(mockEstabelecimentos))
      );
      fixture.detectChanges();

      // Destroy component while loading
      fixture.destroy();

      // Should not throw errors
      expect(() => estabelecimentosSubject.next(mockEstabelecimentos)).not.toThrow();
    });

    it('should handle rapid component initialization and destruction', () => {
      // Rapid init/destroy cycles
      for (let i = 0; i < 5; i++) {
        const tempFixture = TestBed.createComponent(DashboardComponent);
        tempFixture.detectChanges();
        tempFixture.destroy();
      }

      // Should not cause memory leaks or errors
      expect(true).toBe(true);
    });
  });
});
import { Component, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EstabelecimentoService } from '../../core/services/estabelecimento.service';
import { Estabelecimento } from '../../data-access/models/estabelecimento.models';
import { EstabelecimentoSelectorComponent } from '../../shared/ui/estabelecimento-selector/estabelecimento-selector';
import { LoadingSpinnerComponent } from '../../shared/ui/loading/loading';
import { ErrorMessageComponent } from '../../shared/ui/error-message/error-message';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    EstabelecimentoSelectorComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  sidebarCollapsed = false;
  userName = '';
  userRole = 'Administrador';
  isMobile = false;
  
  // Estabelecimentos
  estabelecimentos: Estabelecimento[] = [];
  selectedEstabelecimento: Estabelecimento | null = null;
  isLoadingEstabelecimentos = false;
  estabelecimentoError: string | null = null;
  showEstabelecimentoSelector = false;
  isLoadingStats = false;
  statsError: string | null = null;

  // Dados simulados para demonstração
  stats = [
    {
      icon: '📊',
      title: 'Total de Pedidos',
      value: '1,234',
      change: '+12%',
      changeType: 'positive'
    },
    {
      icon: '💰',
      title: 'Faturamento',
      value: 'R$ 45,678',
      change: '+8%',
      changeType: 'positive'
    },
    {
      icon: '👥',
      title: 'Clientes Ativos',
      value: '567',
      change: '+15%',
      changeType: 'positive'
    },
    {
      icon: '⭐',
      title: 'Avaliação',
      value: '4.8',
      change: '+0.3',
      changeType: 'positive'
    }
  ];

  recentActivities = [
    {
      icon: '📝',
      title: 'Novo pedido #1234',
      description: 'Cliente: João Silva - R$ 234,50',
      time: 'Há 5 minutos'
    },
    {
      icon: '✅',
      title: 'Pedido #1233 entregue',
      description: 'Cliente: Maria Santos - R$ 156,00',
      time: 'Há 1 hora'
    },
    {
      icon: '📦',
      title: 'Pedido #1232 em trânsito',
      description: 'Cliente: Pedro Oliveira - R$ 89,90',
      time: 'Há 2 horas'
    }
  ];

  quickActions = [
    { icon: '➕', text: 'Novo Pedido', action: 'newOrder' },
    { icon: '👥', text: 'Novo Cliente', action: 'newClient' },
    { icon: '📊', text: 'Relatórios', action: 'reports' },
    { icon: '⚙️', text: 'Configurações', action: 'settings' }
  ];

  constructor(
    public authService: AuthService,
    private estabelecimentoService: EstabelecimentoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.setupAuthListener();
    this.setupEstabelecimentoListeners();
    this.loadEstabelecimentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.sidebarCollapsed = true;
    }
  }

  private loadUserData(): void {
    const user = this.authService.user();
    if (user) {
      this.userName = user.nomeUsuario || user.userName || 'Usuário';
      // Os roles estão no AuthState, não no UserInfo
      this.userRole = this.authService.roles()?.[0] || 'Usuário';
    } else {
      // Se não há usuário logado, redireciona para login
      this.router.navigate(['/auth/login']);
    }
  }

  private setupAuthListener(): void {
    this.authService.authState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: any) => {
        if (!state.token) {
          this.router.navigate(['/auth/login']);
        }
        this.cdr.markForCheck();
      });
  }

  /**
   * Configura listeners para estabelecimentos
   */
  private setupEstabelecimentoListeners(): void {
    // Escuta mudanças na lista de estabelecimentos
    this.estabelecimentoService.estabelecimentos$
      .pipe(takeUntil(this.destroy$))
      .subscribe((estabelecimentos: Estabelecimento[]) => {
        this.estabelecimentos = estabelecimentos;
        this.cdr.markForCheck();
      });

    // Escuta mudanças no estabelecimento selecionado
    this.estabelecimentoService.selectedEstabelecimento$
      .pipe(takeUntil(this.destroy$))
      .subscribe((estabelecimento: Estabelecimento | null) => {
        this.selectedEstabelecimento = estabelecimento;
        if (estabelecimento) {
          this.loadStatsForEstabelecimento(estabelecimento);
          this.showEstabelecimentoSelector = false;
        }
        this.cdr.markForCheck();
      });
  }

  /**
   * Carrega estabelecimentos do proprietário logado
   */
  private loadEstabelecimentos(): void {
    const userId = this.authService.getUserId();
    
    if (!userId) {
      console.warn('Usuário não logado para carregar estabelecimentos');
      return;
    }

    if (!this.authService.isProprietario()) {
      console.warn('Usuário não é proprietário, não carregando estabelecimentos');
      return;
    }

    this.isLoadingEstabelecimentos = true;
    this.estabelecimentoError = null;

    this.estabelecimentoService.loadEstabelecimentosForProprietario(userId)
      .subscribe({
        next: (estabelecimentos: Estabelecimento[]) => {
          this.isLoadingEstabelecimentos = false;
          console.log('Estabelecimentos carregados:', estabelecimentos);
          
          // Show selector if no establishment is selected and there are establishments
          if (!this.selectedEstabelecimento && estabelecimentos.length > 0) {
            this.showEstabelecimentoSelector = true;
          }
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.isLoadingEstabelecimentos = false;
          this.estabelecimentoError = error.message || 'Erro ao carregar estabelecimentos';
          console.error('Erro ao carregar estabelecimentos:', error);
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Seleciona um estabelecimento específico (legacy method for dropdown)
   */
  onEstabelecimentoChange(estabelecimentoId: string): void {
    const id = parseInt(estabelecimentoId, 10);
    const estabelecimento = this.estabelecimentos.find(e => e.id === id);
    
    if (estabelecimento) {
      this.onEstabelecimentoSelected(estabelecimento);
    }
  }

  /**
   * Handles establishment selection from EstabelecimentoSelectorComponent
   */
  onEstabelecimentoSelected(estabelecimento: Estabelecimento): void {
    this.estabelecimentoService.selectEstabelecimento(estabelecimento);
    this.loadStatsForEstabelecimento(estabelecimento);
  }

  /**
   * Handles confirmation of establishment selection
   */
  onConfirmEstabelecimentoSelection(estabelecimento: Estabelecimento): void {
    this.estabelecimentoService.selectEstabelecimento(estabelecimento);
    this.showEstabelecimentoSelector = false;
    this.loadStatsForEstabelecimento(estabelecimento);
  }

  /**
   * Handles view details action from EstabelecimentoSelectorComponent
   */
  onViewEstabelecimentoDetails(estabelecimento: Estabelecimento): void {
    // Navigate to establishment details page or show modal
    console.log('View details for:', estabelecimento.nomeFantasia);
    // TODO: Implement navigation to establishment details
  }

  /**
   * Handles retry action for loading estabelecimentos
   */
  onRetryLoadEstabelecimentos(): void {
    this.loadEstabelecimentos();
  }

  /**
   * Shows the establishment selector
   */
  showSelector(): void {
    this.showEstabelecimentoSelector = true;
  }

  /**
   * Hides the establishment selector
   */
  hideSelector(): void {
    this.showEstabelecimentoSelector = false;
  }

  /**
   * Changes the selected establishment (shows selector)
   */
  changeEstabelecimento(): void {
    this.showEstabelecimentoSelector = true;
  }

  /**
   * Loads stats for the selected establishment with loading states
   */
  private loadStatsForEstabelecimento(estabelecimento: Estabelecimento): void {
    this.isLoadingStats = true;
    this.statsError = null;
    this.cdr.markForCheck();
    
    console.log('Carregando estatísticas para estabelecimento:', estabelecimento.nomeFantasia);
    
    // Simulate API call with timeout
    setTimeout(() => {
      try {
        this.updateStatsForEstabelecimento(estabelecimento);
        this.isLoadingStats = false;
        this.cdr.markForCheck();
      } catch (error) {
        this.isLoadingStats = false;
        this.statsError = 'Erro ao carregar estatísticas do estabelecimento';
        console.error('Erro ao carregar estatísticas:', error);
        this.cdr.markForCheck();
      }
    }, 1500); // Simulate network delay
  }

  /**
   * Atualiza as estatísticas com base no estabelecimento selecionado
   */
  private updateStatsForEstabelecimento(estabelecimento: Estabelecimento): void {
    // Generate dynamic stats based on establishment
    const baseStats = {
      pedidos: Math.floor(Math.random() * 2000) + 500,
      faturamento: Math.floor(Math.random() * 100000) + 20000,
      clientes: Math.floor(Math.random() * 1000) + 200,
      avaliacao: (Math.random() * 2 + 3).toFixed(1) // 3.0 to 5.0
    };
    
    this.stats = [
      {
        icon: '📊',
        title: 'Total de Pedidos',
        value: baseStats.pedidos.toLocaleString('pt-BR'),
        change: `+${Math.floor(Math.random() * 20) + 5}%`,
        changeType: 'positive'
      },
      {
        icon: '💰',
        title: 'Faturamento',
        value: `R$ ${baseStats.faturamento.toLocaleString('pt-BR')}`,
        change: `+${Math.floor(Math.random() * 15) + 3}%`,
        changeType: 'positive'
      },
      {
        icon: '👥',
        title: 'Clientes Ativos',
        value: baseStats.clientes.toLocaleString('pt-BR'),
        change: `+${Math.floor(Math.random() * 25) + 5}%`,
        changeType: 'positive'
      },
      {
        icon: '⭐',
        title: 'Avaliação',
        value: baseStats.avaliacao,
        change: `+${(Math.random() * 0.5).toFixed(1)}`,
        changeType: 'positive'
      }
    ];

    // Update recent activities with establishment context
    this.recentActivities = [
      {
        icon: '📝',
        title: `Novo pedido - ${estabelecimento.nomeFantasia}`,
        description: 'Cliente: João Silva - R$ 234,50',
        time: 'Há 5 minutos'
      },
      {
        icon: '✅',
        title: `Pedido entregue - ${estabelecimento.nomeFantasia}`,
        description: 'Cliente: Maria Santos - R$ 156,00',
        time: 'Há 1 hora'
      },
      {
        icon: '📦',
        title: `Pedido em trânsito - ${estabelecimento.nomeFantasia}`,
        description: 'Cliente: Pedro Oliveira - R$ 89,90',
        time: 'Há 2 horas'
      },
      {
        icon: '🎉',
        title: `Nova avaliação - ${estabelecimento.nomeFantasia}`,
        description: 'Cliente: Ana Costa - 5 estrelas',
        time: 'Há 3 horas'
      }
    ];
  }

  /**
   * Retries loading stats for the current establishment
   */
  onRetryLoadStats(): void {
    if (this.selectedEstabelecimento) {
      this.loadStatsForEstabelecimento(this.selectedEstabelecimento);
    }
  }

  /**
   * Helper method to get selected establishment ID as string
   */
  getSelectedEstabelecimentoId(): string {
    return this.selectedEstabelecimento?.id?.toString() || '';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onQuickAction(action: string): void {
    switch (action) {
      case 'newOrder':
        this.router.navigate(['/orders/new']);
        break;
      case 'newClient':
        this.router.navigate(['/clients/new']);
        break;
      case 'reports':
        this.router.navigate(['/reports']);
        break;
      case 'settings':
        this.router.navigate(['/settings']);
        break;
      default:
        console.log('Ação não implementada:', action);
    }
  }

  logout(): void {
    // Limpa estabelecimentos ao fazer logout
    this.estabelecimentoService.clearEstabelecimentos();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  // TrackBy functions for performance optimization
  trackByEstabelecimento(index: number, estabelecimento: Estabelecimento): number {
    return estabelecimento.id;
  }

  trackByStat(index: number, stat: any): string {
    return stat.title;
  }

  trackByActivity(index: number, activity: any): string {
    return activity.title + activity.time;
  }

  trackByQuickAction(index: number, action: any): string {
    return action.action;
  }
}

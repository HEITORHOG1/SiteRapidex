import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EstabelecimentoService } from '../../core/services/estabelecimento.service';
import { Estabelecimento } from '../../data-access/models/estabelecimento.models';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
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
    private router: Router
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
      });

    // Escuta mudanças no estabelecimento selecionado
    this.estabelecimentoService.selectedEstabelecimento$
      .pipe(takeUntil(this.destroy$))
      .subscribe((estabelecimento: Estabelecimento | null) => {
        this.selectedEstabelecimento = estabelecimento;
        if (estabelecimento) {
          this.updateStatsForEstabelecimento(estabelecimento);
        }
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
        },
        error: (error: any) => {
          this.isLoadingEstabelecimentos = false;
          this.estabelecimentoError = error.message || 'Erro ao carregar estabelecimentos';
          console.error('Erro ao carregar estabelecimentos:', error);
        }
      });
  }

  /**
   * Seleciona um estabelecimento específico
   */
  onEstabelecimentoChange(estabelecimentoId: string): void {
    const id = parseInt(estabelecimentoId, 10);
    const estabelecimento = this.estabelecimentos.find(e => e.id === id);
    
    if (estabelecimento) {
      this.estabelecimentoService.selectEstabelecimento(estabelecimento);
    }
  }

  /**
   * Atualiza as estatísticas com base no estabelecimento selecionado
   */
  private updateStatsForEstabelecimento(estabelecimento: Estabelecimento): void {
    // Aqui você pode fazer chamadas para APIs específicas do estabelecimento
    // Por enquanto, vou atualizar com dados mock baseados no estabelecimento
    
    console.log('Atualizando estatísticas para estabelecimento:', estabelecimento.nomeFantasia);
    
    // Exemplo de como você poderia personalizar as estatísticas
    this.stats = [
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

    // Atualizar atividades recentes também
    this.recentActivities = [
      {
        icon: '📝',
        title: `Novo pedido para ${estabelecimento.nomeFantasia}`,
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
      }
    ];
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
}

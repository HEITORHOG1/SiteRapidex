import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

export interface HelpContent {
  id: string;
  title: string;
  content: string;
  type: 'tooltip' | 'modal' | 'inline' | 'tour';
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  category?: string;
  priority?: number;
}

export interface TourStep {
  id: string;
  element: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryHelpService {
  private helpContentMap = new Map<string, HelpContent>();
  private activeTooltip = signal<string | null>(null);
  private tourActive = signal(false);
  private currentTourStep = signal(0);
  private helpModalVisible = new BehaviorSubject<boolean>(false);

  readonly helpModalVisible$ = this.helpModalVisible.asObservable();
  // tourActive é um signal; exportar diretamente getters ou usar computed
  readonly tourActiveSignal = this.tourActive;

  constructor() {
    this.initializeHelpContent();
  }

  private initializeHelpContent(): void {
    const helpItems: HelpContent[] = [
      // Category List Help
      {
        id: 'category-list-overview',
        title: 'Gerenciamento de Categorias',
        content: 'Aqui você pode visualizar, criar, editar e excluir categorias para organizar seus produtos e serviços.',
        type: 'inline',
        category: 'overview'
      },
      {
        id: 'create-category-btn',
        title: 'Criar Nova Categoria',
        content: 'Clique aqui para criar uma nova categoria. Você precisará fornecer um nome único e uma descrição opcional.',
        type: 'tooltip',
        position: 'bottom',
        trigger: 'hover'
      },
      {
        id: 'category-search',
        title: 'Buscar Categorias',
        content: 'Digite aqui para buscar categorias por nome ou descrição. A busca é realizada em tempo real.',
        type: 'tooltip',
        position: 'bottom',
        trigger: 'focus'
      },
      {
        id: 'category-filters',
        title: 'Filtros de Categoria',
        content: 'Use os filtros para mostrar apenas categorias ativas, inativas, ou ordenar por diferentes critérios.',
        type: 'tooltip',
        position: 'left',
        trigger: 'hover'
      },
      {
        id: 'category-card-actions',
        title: 'Ações da Categoria',
        content: 'Use estes botões para editar, visualizar detalhes ou excluir a categoria. A exclusão só é possível se não houver produtos associados.',
        type: 'tooltip',
        position: 'top',
        trigger: 'hover'
      },

      // Category Form Help
      {
        id: 'category-name-field',
        title: 'Nome da Categoria',
        content: 'O nome deve ser único dentro do seu estabelecimento e ter entre 2 e 100 caracteres. Evite caracteres especiais.',
        type: 'tooltip',
        position: 'right',
        trigger: 'focus'
      },
      {
        id: 'category-description-field',
        title: 'Descrição da Categoria',
        content: 'Descrição opcional com até 500 caracteres. Ajuda a identificar o propósito da categoria.',
        type: 'tooltip',
        position: 'right',
        trigger: 'focus'
      },
      {
        id: 'category-status-field',
        title: 'Status da Categoria',
        content: 'Categorias inativas não aparecem na listagem principal, mas mantêm os dados preservados.',
        type: 'tooltip',
        position: 'left',
        trigger: 'hover'
      },

      // Category Detail Help
      {
        id: 'category-products-count',
        title: 'Produtos Associados',
        content: 'Mostra quantos produtos estão associados a esta categoria. Categorias com produtos não podem ser excluídas.',
        type: 'tooltip',
        position: 'top',
        trigger: 'hover'
      },
      {
        id: 'category-dates',
        title: 'Datas de Criação e Atualização',
        content: 'Informações sobre quando a categoria foi criada e última vez que foi modificada.',
        type: 'tooltip',
        position: 'bottom',
        trigger: 'hover'
      },

      // Import/Export Help
      {
        id: 'import-categories',
        title: 'Importar Categorias',
        content: 'Importe categorias em lote usando arquivos CSV ou Excel. Use o template fornecido para garantir compatibilidade.',
        type: 'tooltip',
        position: 'bottom',
        trigger: 'hover'
      },
      {
        id: 'export-categories',
        title: 'Exportar Categorias',
        content: 'Exporte suas categorias em diferentes formatos para backup ou análise externa.',
        type: 'tooltip',
        position: 'bottom',
        trigger: 'hover'
      },

      // Error Help
      {
        id: 'name-exists-error',
        title: 'Nome Já Existe',
        content: 'Este nome já está sendo usado por outra categoria. Escolha um nome diferente ou edite a categoria existente.',
        type: 'inline',
        category: 'error'
      },
      {
        id: 'cannot-delete-error',
        title: 'Não É Possível Excluir',
        content: 'Esta categoria possui produtos associados. Remova os produtos primeiro ou desative a categoria.',
        type: 'inline',
        category: 'error'
      },
      {
        id: 'network-error',
        title: 'Erro de Conexão',
        content: 'Verifique sua conexão com a internet. Suas alterações serão sincronizadas quando a conexão for restaurada.',
        type: 'inline',
        category: 'error'
      }
    ];

    helpItems.forEach(item => {
      this.helpContentMap.set(item.id, item);
    });
  }

  getHelpContent(id: string): HelpContent | undefined {
    return this.helpContentMap.get(id);
  }

  showTooltip(elementId: string): void {
    this.activeTooltip.set(elementId);
  }

  hideTooltip(): void {
    this.activeTooltip.set(null);
  }

  getActiveTooltip(): string | null {
    return this.activeTooltip();
  }

  showHelpModal(): void {
    this.helpModalVisible.next(true);
  }

  hideHelpModal(): void {
    this.helpModalVisible.next(false);
  }

  startTour(): void {
    this.tourActive.set(true);
    this.currentTourStep.set(0);
  }

  stopTour(): void {
    this.tourActive.set(false);
    this.currentTourStep.set(0);
  }

  nextTourStep(): void {
    const currentStep = this.currentTourStep();
    const tourSteps = this.getTourSteps();
    
    if (currentStep < tourSteps.length - 1) {
      this.currentTourStep.set(currentStep + 1);
    } else {
      this.stopTour();
    }
  }

  previousTourStep(): void {
    const currentStep = this.currentTourStep();
    if (currentStep > 0) {
      this.currentTourStep.set(currentStep - 1);
    }
  }

  getCurrentTourStep(): number {
    return this.currentTourStep();
  }

  getTourSteps(): TourStep[] {
    return [
      {
        id: 'welcome',
        element: '.category-management-container',
        title: 'Bem-vindo ao Gerenciamento de Categorias',
        content: 'Este tour irá mostrar como usar o sistema de categorias para organizar seus produtos.',
        position: 'bottom'
      },
      {
        id: 'category-list',
        element: '.category-list',
        title: 'Lista de Categorias',
        content: 'Aqui você vê todas as suas categorias. Cada cartão mostra informações básicas e ações disponíveis.',
        position: 'top'
      },
      {
        id: 'create-button',
        element: '[data-testid="create-category-btn"]',
        title: 'Criar Nova Categoria',
        content: 'Clique neste botão para criar uma nova categoria. Você será direcionado para o formulário de criação.',
        position: 'bottom'
      },
      {
        id: 'search-bar',
        element: '[data-testid="category-search"]',
        title: 'Busca de Categorias',
        content: 'Use a busca para encontrar categorias rapidamente. A busca funciona em tempo real.',
        position: 'bottom'
      },
      {
        id: 'filters',
        element: '.category-filters',
        title: 'Filtros',
        content: 'Os filtros ajudam a organizar a visualização das categorias por status, data ou outros critérios.',
        position: 'left'
      },
      {
        id: 'category-actions',
        element: '.category-card-actions',
        title: 'Ações da Categoria',
        content: 'Cada categoria tem ações para editar, visualizar detalhes ou excluir. Lembre-se: categorias com produtos não podem ser excluídas.',
        position: 'top'
      },
      {
        id: 'import-export',
        element: '.import-export-section',
        title: 'Importar e Exportar',
        content: 'Use estas opções para importar categorias em lote ou exportar seus dados para backup.',
        position: 'top'
      },
      {
        id: 'help-button',
        element: '.help-button',
        title: 'Ajuda',
        content: 'Clique no botão de ajuda sempre que precisar de assistência. Você pode repetir este tour a qualquer momento.',
        position: 'left'
      }
    ];
  }

  getContextualHelp(context: string): HelpContent[] {
    const contextualHelp: { [key: string]: string[] } = {
      'category-list': [
        'category-list-overview',
        'create-category-btn',
        'category-search',
        'category-filters'
      ],
      'category-form': [
        'category-name-field',
        'category-description-field',
        'category-status-field'
      ],
      'category-detail': [
        'category-products-count',
        'category-dates'
      ],
      'import-export': [
        'import-categories',
        'export-categories'
      ],
      'errors': [
        'name-exists-error',
        'cannot-delete-error',
        'network-error'
      ]
    };

    const helpIds = contextualHelp[context] || [];
    return helpIds
      .map(id => this.helpContentMap.get(id))
      .filter(item => item !== undefined) as HelpContent[];
  }

  searchHelp(query: string): HelpContent[] {
    const searchTerm = query.toLowerCase();
    const results: HelpContent[] = [];

    this.helpContentMap.forEach(content => {
      if (
        content.title.toLowerCase().includes(searchTerm) ||
        content.content.toLowerCase().includes(searchTerm)
      ) {
        results.push(content);
      }
    });

    return results.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  addCustomHelp(helpContent: HelpContent): void {
    this.helpContentMap.set(helpContent.id, helpContent);
  }

  removeHelp(id: string): void {
    this.helpContentMap.delete(id);
  }

  updateHelp(id: string, updates: Partial<HelpContent>): void {
    const existing = this.helpContentMap.get(id);
    if (existing) {
      this.helpContentMap.set(id, { ...existing, ...updates });
    }
  }

  getHelpByCategory(category: string): HelpContent[] {
    const results: HelpContent[] = [];
    
    this.helpContentMap.forEach(content => {
      if (content.category === category) {
        results.push(content);
      }
    });

    return results;
  }

  // Keyboard shortcuts help
  getKeyboardShortcuts(): { [key: string]: string } {
    return {
      'Ctrl + N': 'Criar nova categoria',
      'Ctrl + F': 'Focar na busca',
      'Ctrl + E': 'Editar categoria selecionada',
      'Delete': 'Excluir categoria selecionada',
      'Escape': 'Fechar modal/cancelar ação',
      'Enter': 'Confirmar ação',
      'Tab': 'Navegar entre elementos',
      'Space': 'Selecionar/deselecionar item',
      'F1': 'Mostrar ajuda',
      '?': 'Mostrar atalhos de teclado'
    };
  }

  // Accessibility help
  getAccessibilityFeatures(): string[] {
    return [
      'Navegação completa por teclado',
      'Suporte a leitores de tela',
      'Alto contraste disponível',
      'Anúncios de ações para usuários com deficiência visual',
      'Foco visível em todos os elementos interativos',
      'Labels descritivos em todos os campos',
      'Estrutura semântica adequada',
      'Suporte a zoom até 200%'
    ];
  }

  // Quick tips
  getQuickTips(): string[] {
    return [
      'Use nomes descritivos para suas categorias',
      'Mantenha descrições concisas mas informativas',
      'Desative categorias em vez de excluí-las quando possível',
      'Use a busca para encontrar categorias rapidamente',
      'Exporte suas categorias regularmente como backup',
      'Coordene com sua equipe antes de fazer alterações',
      'Verifique produtos associados antes de excluir categorias',
      'Use filtros para organizar visualizações grandes'
    ];
  }
}
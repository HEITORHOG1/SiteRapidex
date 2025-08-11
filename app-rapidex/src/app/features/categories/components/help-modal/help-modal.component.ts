import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryHelpService, HelpContent } from '../../services/category-help.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="help-modal-overlay"
      *ngIf="isVisible()"
      (click)="closeModal()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title">
      
      <div 
        class="help-modal-content"
        (click)="$event.stopPropagation()"
        [attr.aria-describedby]="'help-modal-body'">
        
        <!-- Modal Header -->
        <div class="help-modal-header">
          <h2 id="help-modal-title" class="modal-title">
            <i class="fas fa-question-circle" aria-hidden="true"></i>
            Central de Ajuda - Categorias
          </h2>
          <button 
            class="btn-close"
            type="button"
            aria-label="Fechar ajuda"
            (click)="closeModal()">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <!-- Modal Body -->
        <div id="help-modal-body" class="help-modal-body">
          
          <!-- Search Bar -->
          <div class="help-search-section">
            <div class="search-input-group">
              <i class="fas fa-search search-icon" aria-hidden="true"></i>
              <input 
                type="text"
                class="form-control"
                placeholder="Buscar ajuda..."
                [(ngModel)]="searchQuery"
                (input)="onSearchChange()"
                aria-label="Buscar na ajuda">
              <button 
                *ngIf="searchQuery"
                class="btn-clear-search"
                type="button"
                aria-label="Limpar busca"
                (click)="clearSearch()">
                <i class="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="help-quick-actions">
            <button 
              class="btn btn-outline-primary btn-sm"
              type="button"
              (click)="startTour()">
              <i class="fas fa-route" aria-hidden="true"></i>
              Tour Guiado
            </button>
            <button 
              class="btn btn-outline-secondary btn-sm"
              type="button"
              (click)="showKeyboardShortcuts()">
              <i class="fas fa-keyboard" aria-hidden="true"></i>
              Atalhos
            </button>
            <button 
              class="btn btn-outline-info btn-sm"
              type="button"
              (click)="showQuickTips()">
              <i class="fas fa-lightbulb" aria-hidden="true"></i>
              Dicas Rápidas
            </button>
          </div>

          <!-- Content Tabs -->
          <div class="help-tabs">
            <nav class="nav nav-tabs" role="tablist">
              <button 
                *ngFor="let tab of tabs"
                class="nav-link"
                [class.active]="activeTab() === tab.id"
                type="button"
                role="tab"
                [attr.aria-selected]="activeTab() === tab.id"
                [attr.aria-controls]="tab.id + '-panel'"
                (click)="setActiveTab(tab.id)">
                <i [class]="tab.icon" aria-hidden="true"></i>
                {{ tab.label }}
              </button>
            </nav>

            <!-- Tab Panels -->
            <div class="tab-content">
              
              <!-- Overview Tab -->
              <div 
                *ngIf="activeTab() === 'overview'"
                class="tab-pane active"
                id="overview-panel"
                role="tabpanel"
                aria-labelledby="overview-tab">
                
                <div class="help-section">
                  <h3>Visão Geral do Sistema</h3>
                  <p>O sistema de gerenciamento de categorias permite organizar seus produtos e serviços de forma eficiente.</p>
                  
                  <div class="feature-grid">
                    <div class="feature-card">
                      <i class="fas fa-plus-circle feature-icon" aria-hidden="true"></i>
                      <h4>Criar Categorias</h4>
                      <p>Adicione novas categorias com nomes únicos e descrições detalhadas.</p>
                    </div>
                    <div class="feature-card">
                      <i class="fas fa-edit feature-icon" aria-hidden="true"></i>
                      <h4>Editar Categorias</h4>
                      <p>Modifique informações das categorias existentes a qualquer momento.</p>
                    </div>
                    <div class="feature-card">
                      <i class="fas fa-search feature-icon" aria-hidden="true"></i>
                      <h4>Buscar e Filtrar</h4>
                      <p>Encontre categorias rapidamente usando busca e filtros avançados.</p>
                    </div>
                    <div class="feature-card">
                      <i class="fas fa-download feature-icon" aria-hidden="true"></i>
                      <h4>Importar/Exportar</h4>
                      <p>Gerencie categorias em lote através de arquivos CSV ou Excel.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Search Results Tab -->
              <div 
                *ngIf="activeTab() === 'search' && searchResults().length > 0"
                class="tab-pane active"
                id="search-panel"
                role="tabpanel">
                
                <div class="help-section">
                  <h3>Resultados da Busca ({{ searchResults().length }})</h3>
                  
                  <div class="search-results">
                    <div 
                      *ngFor="let result of searchResults()"
                      class="search-result-item">
                      <h4>{{ result.title }}</h4>
                      <p [innerHTML]="highlightSearchTerm(result.content)"></p>
                      <span class="result-category">{{ getCategoryLabel(result.category) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- FAQ Tab -->
              <div 
                *ngIf="activeTab() === 'faq'"
                class="tab-pane active"
                id="faq-panel"
                role="tabpanel">
                
                <div class="help-section">
                  <h3>Perguntas Frequentes</h3>
                  
                  <div class="faq-list">
                    <div 
                      *ngFor="let faq of faqItems"
                      class="faq-item">
                      <button 
                        class="faq-question"
                        type="button"
                        [attr.aria-expanded]="faq.expanded"
                        (click)="toggleFaq(faq)">
                        <span>{{ faq.question }}</span>
                        <i 
                          class="fas"
                          [class.fa-chevron-down]="!faq.expanded"
                          [class.fa-chevron-up]="faq.expanded"
                          aria-hidden="true"></i>
                      </button>
                      <div 
                        class="faq-answer"
                        [class.expanded]="faq.expanded">
                        <p [innerHTML]="faq.answer"></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Keyboard Shortcuts Tab -->
              <div 
                *ngIf="activeTab() === 'shortcuts'"
                class="tab-pane active"
                id="shortcuts-panel"
                role="tabpanel">
                
                <div class="help-section">
                  <h3>Atalhos de Teclado</h3>
                  
                  <div class="shortcuts-grid">
                    <div 
                      *ngFor="let shortcut of keyboardShortcuts | keyvalue"
                      class="shortcut-item">
                      <kbd class="shortcut-key">{{ shortcut.key }}</kbd>
                      <span class="shortcut-description">{{ shortcut.value }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tips Tab -->
              <div 
                *ngIf="activeTab() === 'tips'"
                class="tab-pane active"
                id="tips-panel"
                role="tabpanel">
                
                <div class="help-section">
                  <h3>Dicas e Melhores Práticas</h3>
                  
                  <div class="tips-list">
                    <div 
                      *ngFor="let tip of quickTips; let i = index"
                      class="tip-item">
                      <div class="tip-number">{{ i + 1 }}</div>
                      <p>{{ tip }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Accessibility Tab -->
              <div 
                *ngIf="activeTab() === 'accessibility'"
                class="tab-pane active"
                id="accessibility-panel"
                role="tabpanel">
                
                <div class="help-section">
                  <h3>Recursos de Acessibilidade</h3>
                  
                  <div class="accessibility-features">
                    <div 
                      *ngFor="let feature of accessibilityFeatures"
                      class="accessibility-item">
                      <i class="fas fa-check-circle" aria-hidden="true"></i>
                      <span>{{ feature }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="help-modal-footer">
          <div class="footer-links">
            <a href="/docs/categories" target="_blank" class="help-link">
              <i class="fas fa-book" aria-hidden="true"></i>
              Documentação Completa
            </a>
            <a href="/support" target="_blank" class="help-link">
              <i class="fas fa-headset" aria-hidden="true"></i>
              Contatar Suporte
            </a>
          </div>
          <button 
            class="btn btn-primary"
            type="button"
            (click)="closeModal()">
            Fechar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .help-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .help-modal-content {
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175);
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-50px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .help-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #dee2e6;
    }

    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #495057;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #6c757d;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s ease;
    }

    .btn-close:hover {
      color: #495057;
      background-color: #f8f9fa;
    }

    .help-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .help-search-section {
      margin-bottom: 1.5rem;
    }

    .search-input-group {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      color: #6c757d;
      z-index: 2;
    }

    .search-input-group .form-control {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }

    .btn-clear-search {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: #6c757d;
      padding: 0.25rem;
      cursor: pointer;
      border-radius: 0.25rem;
    }

    .help-quick-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .help-tabs .nav-tabs {
      border-bottom: 1px solid #dee2e6;
      margin-bottom: 1.5rem;
    }

    .help-tabs .nav-link {
      background: none;
      border: none;
      padding: 0.75rem 1rem;
      color: #6c757d;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .help-tabs .nav-link:hover {
      color: #495057;
      border-bottom-color: #dee2e6;
    }

    .help-tabs .nav-link.active {
      color: #007bff;
      border-bottom-color: #007bff;
    }

    .help-section h3 {
      color: #495057;
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .feature-card {
      padding: 1rem;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      text-align: center;
    }

    .feature-icon {
      font-size: 2rem;
      color: #007bff;
      margin-bottom: 0.5rem;
    }

    .feature-card h4 {
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
      color: #495057;
    }

    .feature-card p {
      font-size: 0.8rem;
      color: #6c757d;
      margin: 0;
    }

    .search-results {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search-result-item {
      padding: 1rem;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      background: #f8f9fa;
    }

    .search-result-item h4 {
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
      color: #495057;
    }

    .search-result-item p {
      font-size: 0.8rem;
      color: #6c757d;
      margin-bottom: 0.5rem;
    }

    .result-category {
      font-size: 0.75rem;
      color: #007bff;
      background: rgba(0, 123, 255, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .faq-item {
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      overflow: hidden;
    }

    .faq-question {
      width: 100%;
      background: #f8f9fa;
      border: none;
      padding: 1rem;
      text-align: left;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 500;
      color: #495057;
      transition: background-color 0.2s ease;
    }

    .faq-question:hover {
      background: #e9ecef;
    }

    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      background: #fff;
    }

    .faq-answer.expanded {
      max-height: 200px;
    }

    .faq-answer p {
      padding: 1rem;
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .shortcuts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 0.75rem;
    }

    .shortcut-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 0.375rem;
    }

    .shortcut-key {
      background: #495057;
      color: #fff;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.8rem;
      min-width: 80px;
      text-align: center;
    }

    .shortcut-description {
      font-size: 0.9rem;
      color: #495057;
    }

    .tips-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .tip-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 0.375rem;
      border-left: 4px solid #007bff;
    }

    .tip-number {
      background: #007bff;
      color: #fff;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .tip-item p {
      margin: 0;
      font-size: 0.9rem;
      color: #495057;
    }

    .accessibility-features {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .accessibility-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 0.375rem;
    }

    .accessibility-item i {
      color: #28a745;
      font-size: 1.1rem;
    }

    .help-modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-top: 1px solid #dee2e6;
      background: #f8f9fa;
    }

    .footer-links {
      display: flex;
      gap: 1rem;
    }

    .help-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #007bff;
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.2s ease;
    }

    .help-link:hover {
      color: #0056b3;
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .help-modal-content {
        margin: 0.5rem;
        max-height: 95vh;
      }

      .help-modal-header,
      .help-modal-body,
      .help-modal-footer {
        padding: 1rem;
      }

      .feature-grid {
        grid-template-columns: 1fr;
      }

      .shortcuts-grid {
        grid-template-columns: 1fr;
      }

      .help-quick-actions {
        flex-direction: column;
      }

      .footer-links {
        flex-direction: column;
        gap: 0.5rem;
      }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
      .help-modal-content {
        border: 2px solid #000;
      }

      .feature-card,
      .search-result-item,
      .faq-item,
      .shortcut-item,
      .tip-item,
      .accessibility-item {
        border: 1px solid #000;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .help-modal-overlay,
      .help-modal-content {
        animation: none;
      }

      .faq-answer {
        transition: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpModalComponent implements OnInit, OnDestroy {
  protected isVisible = signal(false);
  protected activeTab = signal('overview');
  protected searchResults = signal<HelpContent[]>([]);
  private destroy$ = new Subject<void>();

  searchQuery = '';
  keyboardShortcuts: { [key: string]: string } = {};
  quickTips: string[] = [];
  accessibilityFeatures: string[] = [];

  tabs = [
    { id: 'overview', label: 'Visão Geral', icon: 'fas fa-home' },
    { id: 'search', label: 'Busca', icon: 'fas fa-search' },
    { id: 'faq', label: 'FAQ', icon: 'fas fa-question' },
    { id: 'shortcuts', label: 'Atalhos', icon: 'fas fa-keyboard' },
    { id: 'tips', label: 'Dicas', icon: 'fas fa-lightbulb' },
    { id: 'accessibility', label: 'Acessibilidade', icon: 'fas fa-universal-access' }
  ];

  faqItems = [
    {
      question: 'Como criar uma nova categoria?',
      answer: 'Clique no botão "Nova Categoria", preencha o nome (obrigatório) e descrição (opcional), depois clique em "Criar". O nome deve ser único dentro do seu estabelecimento.',
      expanded: false
    },
    {
      question: 'Por que não consigo excluir uma categoria?',
      answer: 'Categorias que possuem produtos associados não podem ser excluídas. Primeiro, remova todos os produtos da categoria ou mova-os para outras categorias. Alternativamente, você pode desativar a categoria.',
      expanded: false
    },
    {
      question: 'Como importar categorias em lote?',
      answer: 'Use a função "Importar" e faça upload de um arquivo CSV ou Excel. Baixe o template fornecido para garantir que o formato está correto. O sistema validará os dados antes da importação.',
      expanded: false
    },
    {
      question: 'O que acontece quando trabalho offline?',
      answer: 'Suas alterações são salvas localmente e sincronizadas automaticamente quando a conexão for restaurada. Um indicador mostra o status da sincronização.',
      expanded: false
    },
    {
      question: 'Como funciona o isolamento entre estabelecimentos?',
      answer: 'Cada estabelecimento tem suas próprias categorias completamente isoladas. Você só pode ver e editar categorias do estabelecimento atualmente selecionado.',
      expanded: false
    }
  ];

  constructor(private helpService: CategoryHelpService) {}

  ngOnInit(): void {
    this.helpService.helpModalVisible$
      .pipe(takeUntil(this.destroy$))
      .subscribe(visible => {
        this.isVisible.set(visible);
        if (visible) {
          this.loadHelpData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadHelpData(): void {
    this.keyboardShortcuts = this.helpService.getKeyboardShortcuts();
    this.quickTips = this.helpService.getQuickTips();
    this.accessibilityFeatures = this.helpService.getAccessibilityFeatures();
  }

  closeModal(): void {
    this.helpService.hideHelpModal();
  }

  setActiveTab(tabId: string): void {
    this.activeTab.set(tabId);
  }

  onSearchChange(): void {
    if (this.searchQuery.trim()) {
      const results = this.helpService.searchHelp(this.searchQuery);
      this.searchResults.set(results);
      this.setActiveTab('search');
    } else {
      this.searchResults.set([]);
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
    this.setActiveTab('overview');
  }

  highlightSearchTerm(content: string): string {
    if (!this.searchQuery.trim()) {
      return content;
    }

    const regex = new RegExp(`(${this.searchQuery})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  getCategoryLabel(category?: string): string {
    const labels: { [key: string]: string } = {
      'overview': 'Visão Geral',
      'error': 'Erro',
      'form': 'Formulário',
      'list': 'Lista',
      'detail': 'Detalhes'
    };
    return labels[category || ''] || 'Geral';
  }

  toggleFaq(faq: any): void {
    faq.expanded = !faq.expanded;
  }

  startTour(): void {
    this.helpService.startTour();
    this.closeModal();
  }

  showKeyboardShortcuts(): void {
    this.setActiveTab('shortcuts');
  }

  showQuickTips(): void {
    this.setActiveTab('tips');
  }

  // Expose signals for template
  getIsVisible(): boolean {
    return this.isVisible();
  }

  getActiveTab(): string {
    return this.activeTab();
  }

  getSearchResults(): HelpContent[] {
    return this.searchResults();
  }
}
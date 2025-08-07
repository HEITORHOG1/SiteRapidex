import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';

import { CategoryDetailComponent } from '../../components/category-detail';
import { Category } from '../../models/category.models';
import { CategoryHttpService } from '../../services/category-http.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';

/**
 * Page component for viewing category details
 * Provides the container and navigation logic for the category detail view
 */
@Component({
  selector: 'app-category-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    CategoryDetailComponent
  ],
  template: `
    <div class="category-detail-page" [attr.aria-label]="getPageAriaLabel()">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-content">
          <div class="breadcrumb" role="navigation" aria-label="Navegação estrutural">
            <button 
              type="button"
              class="breadcrumb__link"
              (click)="navigateToList()"
              [attr.aria-label]="'Voltar para lista de categorias de ' + (selectedEstablishment()?.nomeFantasia || 'estabelecimento')">
              <span class="breadcrumb__icon" aria-hidden="true">←</span>
              <span class="breadcrumb__text">Categorias</span>
            </button>
            <span class="breadcrumb__separator" aria-hidden="true">/</span>
            <span class="breadcrumb__current" aria-current="page">
              {{ category()?.nome || 'Detalhes' }}
            </span>
          </div>
          
          <div class="title-section">
            <h1 class="page-title">
              Detalhes da Categoria
              <span class="category-name" *ngIf="category()">: {{ category()?.nome }}</span>
            </h1>
            <p class="page-subtitle" *ngIf="selectedEstablishment()">
              {{ selectedEstablishment()?.nomeFantasia }}
            </p>
          </div>

          <div class="header-actions" *ngIf="category() && !loading()">
            <button 
              type="button"
              class="btn btn--secondary"
              (click)="onEdit(category()!)"
              [attr.aria-label]="'Editar categoria ' + category()?.nome">
              <span class="btn__icon" aria-hidden="true">✏️</span>
              <span class="btn__text">Editar</span>
            </button>
            
            <button 
              type="button"
              class="btn btn--danger"
              (click)="onDelete(category()!)"
              [disabled]="!canDelete()"
              [attr.aria-label]="'Excluir categoria ' + category()?.nome"
              [title]="canDelete() ? 'Excluir categoria' : 'Categoria não pode ser excluída pois possui produtos associados'">
              <span class="btn__icon" aria-hidden="true">🗑️</span>
              <span class="btn__text">Excluir</span>
            </button>

            <button 
              type="button"
              class="btn btn--ghost"
              (click)="onPrint()"
              [attr.aria-label]="'Imprimir detalhes da categoria ' + category()?.nome">
              <span class="btn__icon" aria-hidden="true">🖨️</span>
              <span class="btn__text">Imprimir</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="page-content">
        <!-- Loading State -->
        <div 
          *ngIf="loading() && !category()" 
          class="loading-container"
          role="status" 
          aria-live="polite"
          aria-label="Carregando detalhes da categoria...">
          <div class="loading-spinner"></div>
          <p class="loading-text">Carregando detalhes da categoria...</p>
        </div>

        <!-- Error State -->
        <div 
          *ngIf="error() && !category()" 
          class="error-container"
          role="alert"
          aria-live="assertive">
          <div class="error-icon" aria-hidden="true">⚠️</div>
          <div class="error-content">
            <h2 class="error-title">Erro ao carregar categoria</h2>
            <p class="error-message">{{ error() }}</p>
            <div class="error-actions">
              <button 
                type="button" 
                class="btn btn--primary"
                (click)="retryLoadCategory()">
                Tentar Novamente
              </button>
              <button 
                type="button" 
                class="btn btn--secondary"
                (click)="navigateToList()">
                Voltar à Lista
              </button>
            </div>
          </div>
        </div>

        <!-- Category Detail Component -->
        <app-category-detail
          *ngIf="category() && !error()"
          [categoryId]="categoryId()"
          [showActions]="false"
          [showBreadcrumb]="false"
          [printMode]="printMode()"
          (edit)="onEdit($event)"
          (delete)="onDelete($event)"
          (back)="onBack()">
        </app-category-detail>
      </main>

      <!-- Deleting State -->
      <div 
        *ngIf="deleting()" 
        class="loading-overlay"
        role="status" 
        aria-live="polite"
        aria-label="Excluindo categoria...">
        <div class="loading-spinner"></div>
        <p class="loading-text">Excluindo categoria...</p>
      </div>
    </div>
  `,
  styleUrls: ['./category-detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Reactive state
  loading = signal(false);
  deleting = signal(false);
  error = signal<string | null>(null);
  category = signal<Category | null>(null);
  selectedEstablishment = signal<any>(null);
  categoryId = signal<number>(0);
  printMode = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryHttpService,
    private estabelecimentoService: EstabelecimentoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.setupEstablishmentSubscription();
    this.setupRouteSubscription();
    this.validateEstablishmentContext();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sets up subscription to selected establishment changes
   */
  private setupEstablishmentSubscription(): void {
    this.estabelecimentoService.selectedEstabelecimento$
      .pipe(takeUntil(this.destroy$))
      .subscribe(establishment => {
        this.selectedEstablishment.set(establishment);
        
        if (!establishment) {
          this.handleNoEstablishmentSelected();
        }
      });
  }

  /**
   * Sets up subscription to route parameter changes
   */
  private setupRouteSubscription(): void {
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          const id = +params['id'];
          if (id && id > 0) {
            this.categoryId.set(id);
            this.loadCategory(id);
          } else {
            this.handleInvalidId();
          }
          return [];
        })
      )
      .subscribe();
  }

  /**
   * Validates that an establishment is selected
   */
  private validateEstablishmentContext(): void {
    const establishment = this.estabelecimentoService.getSelectedEstabelecimento();
    
    if (!establishment) {
      this.handleNoEstablishmentSelected();
      return;
    }

    this.selectedEstablishment.set(establishment);
  }

  /**
   * Sets up keyboard shortcuts for the page
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Loads category data
   */
  private loadCategory(categoryId: number): void {
    const establishment = this.selectedEstablishment();
    
    if (!establishment) {
      this.handleNoEstablishmentSelected();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.categoryService.getCategoryById(establishment.id, categoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (category) => {
          this.category.set(category);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erro ao carregar categoria');
          this.loading.set(false);
          
          // Handle specific error cases
          if (error.status === 404) {
            this.notificationService.showApiError({ message: 'Categoria não encontrada' });
            this.navigateToList();
          } else if (error.status === 403) {
            this.notificationService.showApiError({ message: 'Acesso negado à categoria' });
            this.navigateToList();
          }
        }
      });
  }

  /**
   * Handles case when no establishment is selected
   */
  private handleNoEstablishmentSelected(): void {
    this.notificationService.showApiError({ 
      message: 'Selecione um estabelecimento para visualizar categorias' 
    });
    
    // Redirect to establishment selection
    this.router.navigate(['/establishments/select'], {
      queryParams: { returnUrl: `/categories/detail/${this.categoryId()}` }
    });
  }

  /**
   * Handles invalid category ID
   */
  private handleInvalidId(): void {
    this.notificationService.showApiError({ message: 'ID da categoria inválido' });
    this.navigateToList();
  }

  /**
   * Handles edit action - navigates to edit page
   */
  onEdit(category: Category): void {
    if (!category || !category.id) {
      this.notificationService.showApiError({ message: 'Categoria inválida' });
      return;
    }

    this.router.navigate(['/categories/edit', category.id]);
  }

  /**
   * Handles delete action - shows confirmation and deletes category
   */
  onDelete(category: Category): void {
    if (!category || !category.id) {
      this.notificationService.showApiError({ message: 'Categoria inválida' });
      return;
    }

    // Check if category can be deleted
    if (!this.canDelete()) {
      this.notificationService.showApiError({ 
        message: 'Esta categoria não pode ser excluída pois possui produtos associados' 
      });
      return;
    }

    const confirmMessage = `Tem certeza que deseja excluir a categoria "${category.nome}"?`;
    
    if (confirm(confirmMessage)) {
      this.deleteCategory(category);
    }
  }

  /**
   * Handles back navigation
   */
  onBack(): void {
    this.navigateToList();
  }

  /**
   * Handles print action
   */
  onPrint(): void {
    this.printMode.set(true);
    setTimeout(() => {
      window.print();
      this.printMode.set(false);
    }, 100);
  }

  /**
   * Deletes the category
   */
  private deleteCategory(category: Category): void {
    const establishment = this.selectedEstablishment();
    
    if (!establishment) {
      this.handleNoEstablishmentSelected();
      return;
    }

    this.deleting.set(true);

    this.categoryService.deleteCategory(establishment.id, category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.notificationService.showSuccessMessage(`Categoria "${category.nome}" excluída com sucesso`);
          this.navigateToList();
        },
        error: (error) => {
          this.deleting.set(false);
          this.notificationService.showApiError(error);
        }
      });
  }

  /**
   * Retries loading the category
   */
  retryLoadCategory(): void {
    const categoryId = this.categoryId();
    if (categoryId > 0) {
      this.loadCategory(categoryId);
    }
  }

  /**
   * Navigates back to category list
   */
  navigateToList(): void {
    this.router.navigate(['/categories/list']);
  }

  /**
   * Navigates to category edit page
   */
  navigateToEdit(): void {
    const categoryId = this.categoryId();
    if (categoryId > 0) {
      this.router.navigate(['/categories/edit', categoryId]);
    }
  }

  /**
   * Gets ARIA label for the page
   */
  getPageAriaLabel(): string {
    const establishment = this.selectedEstablishment();
    const category = this.category();
    
    if (establishment && category) {
      return `Página de detalhes da categoria ${category.nome} para ${establishment.nomeFantasia}`;
    } else if (establishment) {
      return `Página de detalhes de categoria para ${establishment.nomeFantasia}`;
    }
    return 'Página de detalhes de categoria';
  }

  /**
   * Checks if category can be deleted
   */
  canDelete(): boolean {
    const category = this.category();
    return category ? (category.produtosCount || 0) === 0 : false;
  }

  /**
   * Handles keyboard shortcuts
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Only handle shortcuts when not in form inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const category = this.category();
    if (!category) return;

    switch (event.key) {
      case 'e':
      case 'E':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.onEdit(category);
        }
        break;
      
      case 'Delete':
        if (this.canDelete()) {
          event.preventDefault();
          this.onDelete(category);
        }
        break;
      
      case 'p':
      case 'P':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.onPrint();
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        this.navigateToList();
        break;
      
      case 'F1':
        event.preventDefault();
        this.showHelp();
        break;
    }
  }

  /**
   * Shows help information
   */
  private showHelp(): void {
    const helpMessage = `
Ajuda - Detalhes da Categoria:

• Use Ctrl+E para editar a categoria
• Use Delete para excluir (se não houver produtos associados)
• Use Ctrl+P para imprimir
• Use Escape para voltar à lista
• Use F1 para ver esta ajuda

Navegação:
• Use a navegação estrutural para voltar à lista
• Clique em "Editar" para modificar a categoria
• Clique em "Excluir" para remover (se permitido)
• Clique em "Imprimir" para gerar versão impressa

Informações exibidas:
• Nome e descrição da categoria
• Status (ativa/inativa)
• Data de criação e última atualização
• Produtos associados (se houver)
    `.trim();

    alert(helpMessage);
  }

  /**
   * Gets current establishment name for display
   */
  getEstablishmentName(): string {
    const establishment = this.selectedEstablishment();
    return establishment?.nomeFantasia || 'Estabelecimento';
  }

  /**
   * Checks if the page is in a valid state
   */
  isPageValid(): boolean {
    return !!this.selectedEstablishment() && !!this.category() && !this.loading() && !this.error();
  }
}
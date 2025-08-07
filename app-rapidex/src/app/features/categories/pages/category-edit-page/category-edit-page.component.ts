import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';

import { CategoryFormComponent } from '../../components/category-form/category-form.component';
import { Category } from '../../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category-dto.models';
import { CategoryHttpService } from '../../services/category-http.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';

/**
 * Page component for editing existing categories
 * Provides the container and navigation logic for the category edit form
 */
@Component({
  selector: 'app-category-edit-page',
  standalone: true,
  imports: [
    CommonModule,
    CategoryFormComponent
  ],
  template: `
    <div class="category-edit-page" [attr.aria-label]="getPageAriaLabel()">
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
            <button 
              type="button"
              class="breadcrumb__link"
              (click)="navigateToDetail()"
              *ngIf="category()"
              [attr.aria-label]="'Ver detalhes da categoria ' + category()?.nome">
              <span class="breadcrumb__text">{{ category()?.nome }}</span>
            </button>
            <span class="breadcrumb__separator" aria-hidden="true" *ngIf="category()">/</span>
            <span class="breadcrumb__current" aria-current="page">Editar</span>
          </div>
          
          <div class="title-section">
            <h1 class="page-title">
              Editar Categoria
              <span class="category-name" *ngIf="category()">: {{ category()?.nome }}</span>
            </h1>
            <p class="page-subtitle" *ngIf="selectedEstablishment()">
              {{ selectedEstablishment()?.nomeFantasia }}
            </p>
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
          aria-label="Carregando dados da categoria...">
          <div class="loading-spinner"></div>
          <p class="loading-text">Carregando dados da categoria...</p>
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

        <!-- Form Container -->
        <div class="form-container" *ngIf="category() && !error()">
          <div class="form-header">
            <h2 class="form-title">Editar Informações</h2>
            <p class="form-description">
              Modifique os dados da categoria conforme necessário. As alterações serão salvas automaticamente.
            </p>
          </div>

          <app-category-form
            mode="edit"
            [category]="category()"
            (formSubmit)="onFormSubmit($event)"
            (formCancel)="onFormCancel()"
            (formValid)="onFormValidChange($event)">
          </app-category-form>
        </div>
      </main>

      <!-- Saving State -->
      <div 
        *ngIf="saving()" 
        class="loading-overlay"
        role="status" 
        aria-live="polite"
        aria-label="Salvando alterações...">
        <div class="loading-spinner"></div>
        <p class="loading-text">Salvando alterações...</p>
      </div>
    </div>
  `,
  styleUrls: ['./category-edit-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryEditPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Reactive state
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  category = signal<Category | null>(null);
  selectedEstablishment = signal<any>(null);
  formValid = signal(false);
  categoryId = signal<number>(0);

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
      message: 'Selecione um estabelecimento para editar categorias' 
    });
    
    // Redirect to establishment selection
    this.router.navigate(['/establishments/select'], {
      queryParams: { returnUrl: `/categories/edit/${this.categoryId()}` }
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
   * Handles form submission
   */
  onFormSubmit(request: CreateCategoryRequest | UpdateCategoryRequest): void {
    const establishment = this.selectedEstablishment();
    const category = this.category();
    
    if (!establishment || !category) {
      this.notificationService.showApiError({ message: 'Dados inválidos para atualização' });
      return;
    }

    this.saving.set(true);

    // The actual update is handled by the CategoryFormComponent
    // On success, we can navigate or show success message
    setTimeout(() => {
      this.saving.set(false);
      this.notificationService.showSuccessMessage('Categoria atualizada com sucesso!');
    }, 100);
  }

  /**
   * Handles form cancellation
   */
  onFormCancel(): void {
    // Check if user wants to discard changes
    const confirmCancel = confirm('Deseja cancelar as alterações? As modificações não salvas serão perdidas.');
    
    if (confirmCancel) {
      this.navigateToDetail();
    }
  }

  /**
   * Handles form validation state changes
   */
  onFormValidChange(isValid: boolean): void {
    this.formValid.set(isValid);
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
   * Navigates to category detail page
   */
  navigateToDetail(): void {
    const categoryId = this.categoryId();
    if (categoryId > 0) {
      this.router.navigate(['/categories/detail', categoryId]);
    } else {
      this.navigateToList();
    }
  }

  /**
   * Navigates to establishment selection
   */
  navigateToEstablishmentSelection(): void {
    this.router.navigate(['/establishments/select'], {
      queryParams: { returnUrl: `/categories/edit/${this.categoryId()}` }
    });
  }

  /**
   * Gets ARIA label for the page
   */
  getPageAriaLabel(): string {
    const establishment = this.selectedEstablishment();
    const category = this.category();
    
    if (establishment && category) {
      return `Página de edição da categoria ${category.nome} para ${establishment.nomeFantasia}`;
    } else if (establishment) {
      return `Página de edição de categoria para ${establishment.nomeFantasia}`;
    }
    return 'Página de edição de categoria';
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

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.onFormCancel();
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
Ajuda - Editar Categoria:

• Modifique o nome da categoria (obrigatório, 2-100 caracteres)
• Atualize a descrição conforme necessário (máximo 500 caracteres)
• Altere o status ativo/inativo da categoria
• Use Ctrl+S para salvar
• Use Escape para cancelar
• Use Tab para navegar entre campos

Dicas:
• As alterações são salvas automaticamente após alguns segundos
• O nome deve ser único dentro do estabelecimento
• Desativar uma categoria não afeta produtos já associados
• Use a navegação estrutural para voltar à lista ou ver detalhes
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
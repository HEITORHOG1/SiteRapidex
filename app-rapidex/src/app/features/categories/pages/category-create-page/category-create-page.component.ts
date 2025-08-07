import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { CategoryFormComponent } from '../../components/category-form/category-form.component';
import { CreateCategoryRequest } from '../../models/category-dto.models';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';

/**
 * Page component for creating new categories
 * Provides the container and navigation logic for the category creation form
 */
@Component({
  selector: 'app-category-create-page',
  standalone: true,
  imports: [
    CommonModule,
    CategoryFormComponent
  ],
  template: `
    <div class="category-create-page" [attr.aria-label]="getPageAriaLabel()">
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
            <span class="breadcrumb__current" aria-current="page">Nova Categoria</span>
          </div>
          
          <div class="title-section">
            <h1 class="page-title">Nova Categoria</h1>
            <p class="page-subtitle" *ngIf="selectedEstablishment()">
              {{ selectedEstablishment()?.nomeFantasia }}
            </p>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="page-content">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">Informações da Categoria</h2>
            <p class="form-description">
              Preencha os dados abaixo para criar uma nova categoria de produtos/serviços.
            </p>
          </div>

          <app-category-form
            mode="create"
            (formSubmit)="onFormSubmit($event)"
            (formCancel)="onFormCancel()"
            (formValid)="onFormValidChange($event)">
          </app-category-form>
        </div>
      </main>

      <!-- Loading State -->
      <div 
        *ngIf="loading()" 
        class="loading-overlay"
        role="status" 
        aria-live="polite"
        aria-label="Criando categoria...">
        <div class="loading-spinner"></div>
        <p class="loading-text">Criando categoria...</p>
      </div>
    </div>
  `,
  styleUrls: ['./category-create-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryCreatePageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Reactive state
  loading = signal(false);
  selectedEstablishment = signal<any>(null);
  formValid = signal(false);

  constructor(
    private router: Router,
    private estabelecimentoService: EstabelecimentoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.setupEstablishmentSubscription();
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
   * Handles case when no establishment is selected
   */
  private handleNoEstablishmentSelected(): void {
    this.notificationService.showApiError({ 
      message: 'Selecione um estabelecimento para criar categorias' 
    });
    
    // Redirect to establishment selection
    this.router.navigate(['/establishments/select'], {
      queryParams: { returnUrl: '/categories/create' }
    });
  }

  /**
   * Handles form submission
   */
  onFormSubmit(request: CreateCategoryRequest): void {
    const establishment = this.selectedEstablishment();
    
    if (!establishment) {
      this.handleNoEstablishmentSelected();
      return;
    }

    this.loading.set(true);

    // The actual creation is handled by the CategoryFormComponent
    // On success, navigate to the list or detail page
    setTimeout(() => {
      this.loading.set(false);
      this.navigateToList();
    }, 100);
  }

  /**
   * Handles form cancellation
   */
  onFormCancel(): void {
    // Check if user wants to discard changes
    const confirmCancel = confirm('Deseja cancelar a criação da categoria? As informações não serão salvas.');
    
    if (confirmCancel) {
      this.navigateToList();
    }
  }

  /**
   * Handles form validation state changes
   */
  onFormValidChange(isValid: boolean): void {
    this.formValid.set(isValid);
  }

  /**
   * Navigates back to category list
   */
  navigateToList(): void {
    this.router.navigate(['/categories/list']);
  }

  /**
   * Navigates to establishment selection
   */
  navigateToEstablishmentSelection(): void {
    this.router.navigate(['/establishments/select'], {
      queryParams: { returnUrl: '/categories/create' }
    });
  }

  /**
   * Gets ARIA label for the page
   */
  getPageAriaLabel(): string {
    const establishment = this.selectedEstablishment();
    if (establishment) {
      return `Página de criação de nova categoria para ${establishment.nomeFantasia}`;
    }
    return 'Página de criação de nova categoria';
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
Ajuda - Criar Nova Categoria:

• Preencha o nome da categoria (obrigatório, 2-100 caracteres)
• Adicione uma descrição opcional (máximo 500 caracteres)
• Use Ctrl+S para salvar
• Use Escape para cancelar
• Use Tab para navegar entre campos

Dicas:
• O nome deve ser único dentro do estabelecimento
• Evite caracteres especiais no nome
• A descrição ajuda outros usuários a entender o propósito da categoria
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
    return !!this.selectedEstablishment() && !this.loading();
  }
}
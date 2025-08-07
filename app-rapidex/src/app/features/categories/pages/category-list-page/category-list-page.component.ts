import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { CategoryListComponent } from '../../components/category-list/category-list.component';
import { Category } from '../../models/category.models';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';

/**
 * Main page component for category list management
 * Acts as a container for the CategoryListComponent with navigation logic
 */
@Component({
  selector: 'app-category-list-page',
  standalone: true,
  imports: [
    CommonModule,
    CategoryListComponent
  ],
  template: `
    <div class="category-list-page" [attr.aria-label]="getPageAriaLabel()">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">Gerenciar Categorias</h1>
            <p class="page-subtitle" *ngIf="selectedEstablishment()">
              {{ selectedEstablishment()?.nomeFantasia }}
            </p>
          </div>
          
          <div class="header-actions">
            <button 
              type="button"
              class="btn btn--primary"
              (click)="onCreateCategory()"
              [attr.aria-label]="'Criar nova categoria para ' + (selectedEstablishment()?.nomeFantasia || 'estabelecimento')">
              <span class="btn__icon" aria-hidden="true">➕</span>
              <span class="btn__text">Nova Categoria</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="page-content">
        <app-category-list
          (createCategory)="onCreateCategory()"
          (editCategory)="onEditCategory($event)"
          (viewCategoryDetails)="onViewCategoryDetails($event)"
          (deleteCategory)="onDeleteCategory($event)">
        </app-category-list>
      </main>

      <!-- Loading State -->
      <div 
        *ngIf="loading()" 
        class="loading-overlay"
        role="status" 
        aria-live="polite"
        aria-label="Carregando categorias...">
        <div class="loading-spinner"></div>
        <p class="loading-text">Carregando categorias...</p>
      </div>
    </div>
  `,
  styleUrls: ['./category-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryListPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Reactive state
  loading = signal(false);
  selectedEstablishment = signal<any>(null);

  constructor(
    private router: Router,
    private estabelecimentoService: EstabelecimentoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.setupEstablishmentSubscription();
    this.validateEstablishmentContext();
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
   * Handles case when no establishment is selected
   */
  private handleNoEstablishmentSelected(): void {
    this.notificationService.showApiError({ 
      message: 'Selecione um estabelecimento para gerenciar categorias' 
    });
    
    // Redirect to establishment selection
    this.router.navigate(['/establishments/select'], {
      queryParams: { returnUrl: '/categories/list' }
    });
  }

  /**
   * Handles create category action
   */
  onCreateCategory(): void {
    const establishment = this.selectedEstablishment();
    
    if (!establishment) {
      this.handleNoEstablishmentSelected();
      return;
    }

    this.router.navigate(['/categories/create']);
  }

  /**
   * Handles edit category action
   */
  onEditCategory(category: Category): void {
    if (!category || !category.id) {
      this.notificationService.showApiError({ message: 'Categoria inválida' });
      return;
    }

    this.router.navigate(['/categories/edit', category.id]);
  }

  /**
   * Handles view category details action
   */
  onViewCategoryDetails(category: Category): void {
    if (!category || !category.id) {
      this.notificationService.showApiError({ message: 'Categoria inválida' });
      return;
    }

    this.router.navigate(['/categories/detail', category.id]);
  }

  /**
   * Handles delete category action
   */
  onDeleteCategory(category: Category): void {
    if (!category || !category.id) {
      this.notificationService.showApiError({ message: 'Categoria inválida' });
      return;
    }

    // The actual deletion logic is handled by the CategoryListComponent
    // This method is here for consistency and future enhancements
    console.log('Delete category requested:', category);
  }

  /**
   * Gets ARIA label for the page
   */
  getPageAriaLabel(): string {
    const establishment = this.selectedEstablishment();
    if (establishment) {
      return `Página de gerenciamento de categorias para ${establishment.nomeFantasia}`;
    }
    return 'Página de gerenciamento de categorias';
  }

  /**
   * Handles keyboard shortcuts for the page
   */
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+N or Cmd+N for new category
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      this.onCreateCategory();
    }

    // F5 for refresh (let browser handle it naturally)
    // Escape to clear any selections (handled by child component)
  }
}
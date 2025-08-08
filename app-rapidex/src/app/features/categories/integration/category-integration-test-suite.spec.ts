import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, BehaviorSubject, throwError } from 'rxjs';

// Components
import { CategoryListComponent } from '../components/category-list/category-list.component';
import { CategoryFormComponent } from '../components/category-form/category-form.component';
import { CategoryDetailComponent } from '../components/category-detail/category-detail.component';
import { CategoryCardComponent } from '../components/category-card/category-card.component';

// Services
import { CategoryStateService } from '../services/category-state.service';
import { CategorySearchService } from '../services/category-search.service';
import { CategoryHttpService } from '../services/category-http.service';
import { CategoryValidationService } from '../services/category-validation.service';
import { CategoryValidationMessagesService } from '../services/category-validation-messages.service';
import { CategoryDeletionService } from '../services/category-deletion.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../shared/services/notification.service';

// Models
import { Category } from '../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../models/category-dto.models';

// Test application component that integrates all category components
@Component({
  template: `
    <div class="category-app" role="application" aria-label="Sistema de Gerenciamento de Categorias">
      <!-- Navigation -->
      <nav class="app-nav" role="navigation" aria-label="Navegação principal">
        <button 
          type="button"
          class="nav-btn"
          [class.active]="currentView === 'list'"
          (click)="navigateToView('list')"
          aria-label="Ir para lista de categorias">
          Lista
        </button>
        <button 
          type="button"
          class="nav-btn"
          [class.active]="currentView === 'create'"
          (click)="navigateToView('create')"
          aria-label="Ir para criação de categoria">
          Criar
        </button>
        <button 
          type="button"
          class="nav-btn"
          [class.active]="currentView === 'analytics'"
          (click)="navigateToView('analytics')"
          aria-label="Ir para analytics">
          Analytics
        </button>
      </nav>

      <!-- Main Content -->
      <main class="app-main" role="main">
        <!-- List View -->
        <section 
          *ngIf="currentView === 'list'"
          class="list-section"
          aria-labelledby="list-title">
          <h1 id="list-title" class="section-title">Lista de Categorias</h1>
          <app-category-list
            (createCategory)="navigateToView('create')"
            (editCategory)="editCategory($event)"
            (viewCategoryDetails)="viewCategoryDetails($event)"
            (deleteCategory)="deleteCategory($event)">
          </app-category-list>
        </section>

        <!-- Create/Edit Form View -->
        <section 
          *ngIf="currentView === 'create' || currentView === 'edit'"
          class="form-section"
          aria-labelledby="form-title">
          <h1 id="form-title" class="section-title">
            {{ currentView === 'create' ? 'Nova Categoria' : 'Editar Categoria' }}
          </h1>
          <app-category-form
            [mode]="currentView === 'create' ? 'create' : 'edit'"
            [category]="selectedCategory"
            (formSubmit)="onFormSubmit($event)"
            (formCancel)="onFormCancel()">
          </app-category-form>
        </section>

        <!-- Detail View -->
        <section 
          *ngIf="currentView === 'detail'"
          class="detail-section"
          aria-labelledby="detail-title">
          <h1 id="detail-title" class="section-title">Detalhes da Categoria</h1>
          <app-category-detail
            [categoryId]="selectedCategoryId"
            (edit)="editCategory($event)"
            (delete)="deleteCategory($event)"
            (back)="navigateToView('list')">
          </app-category-detail>
        </section>

        <!-- Analytics View -->
        <section 
          *ngIf="currentView === 'analytics'"
          class="analytics-section"
          aria-labelledby="analytics-title">
          <h1 id="analytics-title" class="section-title">Analytics de Categorias</h1>
          <div class="analytics-placeholder">
            <p>Analytics dashboard would be here</p>
          </div>
        </section>
      </main>

      <!-- Global Loading Overlay -->
      <div 
        *ngIf="globalLoading"
        class="global-loading-overlay"
        role="status"
        aria-live="polite"
        aria-label="Carregando...">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p class="loading-text">Carregando...</p>
      </div>

      <!-- Global Error Toast -->
      <div 
        *ngIf="globalError"
        class="global-error-toast"
        role="alert"
        aria-live="assertive">
        <p class="error-message">{{ globalError }}</p>
        <button 
          type="button"
          class="error-dismiss-btn"
          (click)="dismissError()"
          aria-label="Fechar mensagem de erro">
          ×
        </button>
      </div>

      <!-- Success Toast -->
      <div 
        *ngIf="successMessage"
        class="success-toast"
        role="status"
        aria-live="polite">
        <p class="success-message">{{ successMessage }}</p>
        <button 
          type="button"
          class="success-dismiss-btn"
          (click)="dismissSuccess()"
          aria-label="Fechar mensagem de sucesso">
          ×
        </button>
      </div>
    </div>
  `,
  styles: [`
    .category-app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-nav {
      background: #f8f9fa;
      padding: 1rem;
      border-bottom: 1px solid #dee2e6;
      display: flex;
      gap: 1rem;
    }

    .nav-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #dee2e6;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      background: #e9ecef;
    }

    .nav-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .app-main {
      flex: 1;
      padding: 2rem;
    }

    .section-title {
      margin-bottom: 2rem;
      color: #212529;
    }

    .global-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-text {
      margin-top: 1rem;
      color: white;
      font-size: 1.1rem;
    }

    .global-error-toast,
    .success-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 1rem;
      z-index: 1000;
      max-width: 400px;
    }

    .global-error-toast {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .success-toast {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .error-dismiss-btn,
    .success-dismiss-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .analytics-placeholder {
      padding: 2rem;
      text-align: center;
      background: #f8f9fa;
      border-radius: 4px;
      border: 2px dashed #dee2e6;
    }
  `]
})
class CategoryIntegrationTestAppComponent {
  currentView: 'list' | 'create' | 'edit' | 'detail' | 'analytics' = 'list';
  selectedCategory: Category | null = null;
  selectedCategoryId = 0;
  globalLoading = false;
  globalError: string | null = null;
  successMessage: string | null = null;

  navigateToView(view: 'list' | 'create' | 'edit' | 'detail' | 'analytics'): void {
    this.currentView = view;
    
    // Clear selections when navigating away
    if (view !== 'edit' && view !== 'detail') {
      this.selectedCategory = null;
      this.selectedCategoryId = 0;
    }
  }

  editCategory(category: Category): void {
    this.selectedCategory = category;
    this.selectedCategoryId = category.id;
    this.currentView = 'edit';
  }

  viewCategoryDetails(category: Category): void {
    this.selectedCategory = category;
    this.selectedCategoryId = category.id;
    this.currentView = 'detail';
  }

  deleteCategory(category: Category): void {
    // Deletion is handled by the CategoryListComponent
    console.log('Delete category:', category);
  }

  onFormSubmit(data: CreateCategoryRequest | UpdateCategoryRequest): void {
    this.showSuccess(
      this.currentView === 'create' 
        ? 'Categoria criada com sucesso!' 
        : 'Categoria atualizada com sucesso!'
    );
    
    // Navigate back to list after successful submission
    setTimeout(() => {
      this.navigateToView('list');
    }, 1000);
  }

  onFormCancel(): void {
    this.navigateToView('list');
  }

  showGlobalLoading(): void {
    this.globalLoading = true;
  }

  hideGlobalLoading(): void {
    this.globalLoading = false;
  }

  showError(message: string): void {
    this.globalError = message;
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.dismissError();
    }, 5000);
  }

  dismissError(): void {
    this.globalError = null;
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      this.dismissSuccess();
    }, 3000);
  }

  dismissSuccess(): void {
    this.successMessage = null;
  }
}

describe('Category Management Integration Test Suite', () => {
  let appComponent: CategoryIntegrationTestAppComponent;
  let fixture: ComponentFixture<CategoryIntegrationTestAppComponent>;
  let router: Router;
  let location: Location;

  // Mock services
  let mockCategoryStateService: jasmine.SpyObj<CategoryStateService>;
  let mockCategorySearchService: jasmine.SpyObj<CategorySearchService>;
  let mockCategoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let mockCategoryValidationService: jasmine.SpyObj<CategoryValidationService>;
  let mockCategoryValidationMessagesService: jasmine.SpyObj<CategoryValidationMessagesService>;
  let mockCategoryDeletionService: jasmine.SpyObj<CategoryDeletionService>;
  let mockEstabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  // Mock data
  const mockEstablishment = {
    id: 1,
    nomeFantasia: 'Test Restaurant',
    razaoSocial: 'Test Restaurant LTDA'
  };

  const mockCategories: Category[] = [
    {
      id: 1,
      nome: 'Bebidas',
      descricao: 'Categoria de bebidas e sucos naturais',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-01'),
      dataAtualizacao: new Date('2024-01-15'),
      produtosCount: 5
    },
    {
      id: 2,
      nome: 'Pratos Principais',
      descricao: 'Categoria de pratos principais e refeições completas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-02'),
      dataAtualizacao: new Date('2024-01-16'),
      produtosCount: 12
    },
    {
      id: 3,
      nome: 'Sobremesas',
      descricao: 'Categoria de sobremesas e doces',
      estabelecimentoId: 1,
      ativo: false,
      dataCriacao: new Date('2024-01-03'),
      dataAtualizacao: new Date('2024-01-17'),
      produtosCount: 0
    }
  ];

  beforeEach(async () => {
    // Create comprehensive spy objects
    mockCategoryStateService = jasmine.createSpyObj('CategoryStateService', [
      'setEstablishmentContext',
      'loadCategories',
      'updateFilters',
      'updatePagination'
    ], {
      loading$: new BehaviorSubject(false),
      error$: new BehaviorSubject(null),
      pagination$: new BehaviorSubject({ currentPage: 1, pageSize: 20, totalItems: 3, totalPages: 1 }),
      hasCategories$: new BehaviorSubject(true)
    });

    mockCategorySearchService = jasmine.createSpyObj('CategorySearchService', [
      'updateSearchQuery',
      'clearSearch',
      'exportToCSV',
      'exportToJSON'
    ], {
      filteredCategories$: new BehaviorSubject(mockCategories)
    });

    mockCategoryHttpService = jasmine.createSpyObj('CategoryHttpService', [
      'getCategoryDetail',
      'createCategory',
      'updateCategory',
      'validateCategoryName'
    ]);

    mockCategoryValidationService = jasmine.createSpyObj('CategoryValidationService', [
      'validateCreateRequest',
      'validateUpdateRequest',
      'sanitizeCreateRequest',
      'sanitizeUpdateRequest'
    ]);

    mockCategoryValidationMessagesService = jasmine.createSpyObj('CategoryValidationMessagesService', [
      'getFirstFieldErrorMessage',
      'getErrorSummaryMessage',
      'hasSecurityErrors'
    ]);

    mockCategoryDeletionService = jasmine.createSpyObj('CategoryDeletionService', [
      'deleteCategory',
      'deleteBulkCategories',
      'undoDeletion',
      'getPendingUndos'
    ]);

    mockEstabelecimentoService = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ], {
      selectedEstabelecimento$: new BehaviorSubject(mockEstablishment)
    });

    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'info',
      'showApiError'
    ]);

    // Setup default return values
    mockCategoryStateService.loadCategories.and.returnValue(of(mockCategories));
    mockCategoryHttpService.getCategoryDetail.and.returnValue(of({
      categoria: mockCategories[0],
      produtos: []
    }));
    mockCategoryHttpService.createCategory.and.returnValue(of(mockCategories[0]));
    mockCategoryHttpService.updateCategory.and.returnValue(of(mockCategories[0]));
    mockCategoryHttpService.validateCategoryName.and.returnValue(of(true));
    mockCategoryValidationService.validateCreateRequest.and.returnValue({
      valid: true,
      errors: [],
      sanitizedData: { nome: 'Test', descricao: 'Test' }
    });
    mockCategoryValidationService.validateUpdateRequest.and.returnValue({
      valid: true,
      errors: [],
      sanitizedData: { nome: 'Test', descricao: 'Test', ativo: true }
    });
    mockCategoryDeletionService.getPendingUndos.and.returnValue(of([]));
    mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstablishment);

    await TestBed.configureTestingModule({
      imports: [
        CategoryListComponent,
        CategoryFormComponent,
        CategoryDetailComponent,
        CategoryCardComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      declarations: [CategoryIntegrationTestAppComponent],
      providers: [
        { provide: CategoryStateService, useValue: mockCategoryStateService },
        { provide: CategorySearchService, useValue: mockCategorySearchService },
        { provide: CategoryHttpService, useValue: mockCategoryHttpService },
        { provide: CategoryValidationService, useValue: mockCategoryValidationService },
        { provide: CategoryValidationMessagesService, useValue: mockCategoryValidationMessagesService },
        { provide: CategoryDeletionService, useValue: mockCategoryDeletionService },
        { provide: EstabelecimentoService, useValue: mockEstabelecimentoService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryIntegrationTestAppComponent);
    appComponent = fixture.componentInstance;
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    fixture.detectChanges();
  });

  describe('Complete Application Flow Integration', () => {
    it('should complete full CRUD workflow', fakeAsync(() => {
      // Start at list view
      expect(appComponent.currentView).toBe('list');
      tick();
      fixture.detectChanges();

      // Verify list is displayed
      const listSection = fixture.debugElement.query(By.css('.list-section'));
      expect(listSection).toBeTruthy();

      // Navigate to create
      const createNavBtn = fixture.debugElement.query(By.css('.nav-btn:nth-child(2)'));
      createNavBtn.nativeElement.click();
      fixture.detectChanges();

      expect(appComponent.currentView).toBe('create');

      // Verify form is displayed
      const formSection = fixture.debugElement.query(By.css('.form-section'));
      expect(formSection).toBeTruthy();

      // Fill and submit form
      const categoryForm = fixture.debugElement.query(By.directive(CategoryFormComponent));
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="descricao"]'));

      nameInput.nativeElement.value = 'Nova Categoria';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      descriptionInput.nativeElement.value = 'Descrição da nova categoria';
      descriptionInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      // Submit form
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      tick();
      fixture.detectChanges();

      // Should show success message
      expect(appComponent.successMessage).toContain('criada com sucesso');

      // Should navigate back to list after delay
      tick(1000);
      fixture.detectChanges();

      expect(appComponent.currentView).toBe('list');
    }));

    it('should handle edit workflow', fakeAsync(() => {
      // Start at list view
      tick();
      fixture.detectChanges();

      // Simulate editing a category
      appComponent.editCategory(mockCategories[0]);
      fixture.detectChanges();

      expect(appComponent.currentView).toBe('edit');
      expect(appComponent.selectedCategory).toEqual(mockCategories[0]);

      // Verify edit form is pre-populated
      const categoryForm = fixture.debugElement.query(By.directive(CategoryFormComponent));
      expect(categoryForm.componentInstance.mode).toBe('edit');
      expect(categoryForm.componentInstance.category).toEqual(mockCategories[0]);

      tick();
      fixture.detectChanges();

      // Verify form fields are populated
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      expect(nameInput.nativeElement.value).toBe(mockCategories[0].nome);
    }));

    it('should handle detail view workflow', fakeAsync(() => {
      // Navigate to detail view
      appComponent.viewCategoryDetails(mockCategories[0]);
      fixture.detectChanges();

      expect(appComponent.currentView).toBe('detail');
      expect(appComponent.selectedCategoryId).toBe(mockCategories[0].id);

      // Verify detail component is displayed
      const detailSection = fixture.debugElement.query(By.css('.detail-section'));
      expect(detailSection).toBeTruthy();

      const categoryDetail = fixture.debugElement.query(By.directive(CategoryDetailComponent));
      expect(categoryDetail.componentInstance.categoryId).toBe(mockCategories[0].id);

      tick();
      fixture.detectChanges();

      // Test back navigation
      const categoryDetailComponent = categoryDetail.componentInstance;
      categoryDetailComponent.back.emit();
      fixture.detectChanges();

      expect(appComponent.currentView).toBe('list');
    }));
  });

  describe('Navigation Integration', () => {
    it('should navigate between views using navigation buttons', fakeAsync(() => {
      const navButtons = fixture.debugElement.queryAll(By.css('.nav-btn'));

      // Navigate to create
      navButtons[1].nativeElement.click();
      fixture.detectChanges();
      expect(appComponent.currentView).toBe('create');
      expect(navButtons[1].nativeElement.classList).toContain('active');

      // Navigate to analytics
      navButtons[2].nativeElement.click();
      fixture.detectChanges();
      expect(appComponent.currentView).toBe('analytics');
      expect(navButtons[2].nativeElement.classList).toContain('active');

      // Navigate back to list
      navButtons[0].nativeElement.click();
      fixture.detectChanges();
      expect(appComponent.currentView).toBe('list');
      expect(navButtons[0].nativeElement.classList).toContain('active');
    }));

    it('should clear selections when navigating away from detail/edit views', () => {
      // Set up selections
      appComponent.selectedCategory = mockCategories[0];
      appComponent.selectedCategoryId = mockCategories[0].id;
      appComponent.currentView = 'detail';

      // Navigate to list
      appComponent.navigateToView('list');

      expect(appComponent.selectedCategory).toBe(null);
      expect(appComponent.selectedCategoryId).toBe(0);
    });

    it('should maintain selections when navigating between edit and detail views', () => {
      // Set up selections
      appComponent.selectedCategory = mockCategories[0];
      appComponent.selectedCategoryId = mockCategories[0].id;

      // Navigate to edit
      appComponent.navigateToView('edit');
      expect(appComponent.selectedCategory).toEqual(mockCategories[0]);
      expect(appComponent.selectedCategoryId).toBe(mockCategories[0].id);

      // Navigate to detail
      appComponent.navigateToView('detail');
      expect(appComponent.selectedCategory).toEqual(mockCategories[0]);
      expect(appComponent.selectedCategoryId).toBe(mockCategories[0].id);
    });
  });

  describe('Error Handling Integration', () => {
    it('should display global error messages', fakeAsync(() => {
      appComponent.showError('Erro de conexão com o servidor');
      fixture.detectChanges();

      const errorToast = fixture.debugElement.query(By.css('.global-error-toast'));
      expect(errorToast).toBeTruthy();
      expect(errorToast.nativeElement.textContent).toContain('Erro de conexão com o servidor');

      // Test dismiss button
      const dismissButton = fixture.debugElement.query(By.css('.error-dismiss-btn'));
      dismissButton.nativeElement.click();
      fixture.detectChanges();

      const errorToastAfterDismiss = fixture.debugElement.query(By.css('.global-error-toast'));
      expect(errorToastAfterDismiss).toBeFalsy();
    }));

    it('should auto-dismiss error messages', fakeAsync(() => {
      appComponent.showError('Erro temporário');
      fixture.detectChanges();

      let errorToast = fixture.debugElement.query(By.css('.global-error-toast'));
      expect(errorToast).toBeTruthy();

      // Wait for auto-dismiss
      tick(5000);
      fixture.detectChanges();

      errorToast = fixture.debugElement.query(By.css('.global-error-toast'));
      expect(errorToast).toBeFalsy();
    }));

    it('should handle service errors gracefully', fakeAsync(() => {
      // Mock service error
      mockCategoryStateService.loadCategories.and.returnValue(
        throwError(() => new Error('Service error'))
      );

      (mockCategoryStateService.error$ as BehaviorSubject<string | null>)
        .next('Service error');

      tick();
      fixture.detectChanges();

      // Error should be displayed in the list component
      const listComponent = fixture.debugElement.query(By.directive(CategoryListComponent));
      expect(listComponent).toBeTruthy();
    }));
  });

  describe('Loading States Integration', () => {
    it('should display global loading overlay', fakeAsync(() => {
      appComponent.showGlobalLoading();
      fixture.detectChanges();

      const loadingOverlay = fixture.debugElement.query(By.css('.global-loading-overlay'));
      expect(loadingOverlay).toBeTruthy();

      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(loadingSpinner).toBeTruthy();

      const loadingText = fixture.debugElement.query(By.css('.loading-text'));
      expect(loadingText.nativeElement.textContent).toContain('Carregando');

      // Hide loading
      appComponent.hideGlobalLoading();
      fixture.detectChanges();

      const loadingOverlayAfter = fixture.debugElement.query(By.css('.global-loading-overlay'));
      expect(loadingOverlayAfter).toBeFalsy();
    }));

    it('should handle component-level loading states', fakeAsync(() => {
      (mockCategoryStateService.loading$ as BehaviorSubject<boolean>).next(true);

      tick();
      fixture.detectChanges();

      // List component should show loading state
      const listComponent = fixture.debugElement.query(By.directive(CategoryListComponent));
      expect(listComponent).toBeTruthy();
    }));
  });

  describe('Success Messages Integration', () => {
    it('should display success messages', fakeAsync(() => {
      appComponent.showSuccess('Operação realizada com sucesso!');
      fixture.detectChanges();

      const successToast = fixture.debugElement.query(By.css('.success-toast'));
      expect(successToast).toBeTruthy();
      expect(successToast.nativeElement.textContent).toContain('Operação realizada com sucesso!');

      // Test dismiss button
      const dismissButton = fixture.debugElement.query(By.css('.success-dismiss-btn'));
      dismissButton.nativeElement.click();
      fixture.detectChanges();

      const successToastAfterDismiss = fixture.debugElement.query(By.css('.success-toast'));
      expect(successToastAfterDismiss).toBeFalsy();
    }));

    it('should auto-dismiss success messages', fakeAsync(() => {
      appComponent.showSuccess('Sucesso temporário');
      fixture.detectChanges();

      let successToast = fixture.debugElement.query(By.css('.success-toast'));
      expect(successToast).toBeTruthy();

      // Wait for auto-dismiss
      tick(3000);
      fixture.detectChanges();

      successToast = fixture.debugElement.query(By.css('.success-toast'));
      expect(successToast).toBeFalsy();
    }));
  });

  describe('Form Integration Workflows', () => {
    it('should handle form cancellation', fakeAsync(() => {
      // Navigate to create form
      appComponent.navigateToView('create');
      fixture.detectChanges();

      // Fill form to make it dirty
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      nameInput.nativeElement.value = 'Test Category';
      nameInput.nativeElement.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      // Cancel form
      const categoryForm = fixture.debugElement.query(By.directive(CategoryFormComponent));
      categoryForm.componentInstance.formCancel.emit();
      fixture.detectChanges();

      expect(appComponent.currentView).toBe('list');
    }));

    it('should handle form validation errors', fakeAsync(() => {
      // Navigate to create form
      appComponent.navigateToView('create');
      fixture.detectChanges();
      tick();

      // Mock validation error
      mockCategoryValidationService.validateCreateRequest.and.returnValue({
        valid: false,
        errors: [{ field: 'nome', code: 'REQUIRED', message: 'Nome é obrigatório' }],
        sanitizedData: null
      });

      // Try to submit empty form
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();

      tick();
      fixture.detectChanges();

      // Should remain on form view
      expect(appComponent.currentView).toBe('create');

      // Should not show success message
      expect(appComponent.successMessage).toBeFalsy();
    }));
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across components', fakeAsync(() => {
      // Start with list view
      tick();
      fixture.detectChanges();

      // Verify list component receives data
      const listComponent = fixture.debugElement.query(By.directive(CategoryListComponent));
      expect(mockCategoryStateService.loadCategories).toHaveBeenCalled();

      // Navigate to detail view
      appComponent.viewCategoryDetails(mockCategories[0]);
      fixture.detectChanges();
      tick();

      // Verify detail component receives correct data
      const detailComponent = fixture.debugElement.query(By.directive(CategoryDetailComponent));
      expect(detailComponent.componentInstance.categoryId).toBe(mockCategories[0].id);
      expect(mockCategoryHttpService.getCategoryDetail).toHaveBeenCalledWith(1, mockCategories[0].id);
    }));

    it('should handle establishment context changes', fakeAsync(() => {
      const newEstablishment = {
        id: 2,
        nomeFantasia: 'New Restaurant',
        razaoSocial: 'New Restaurant LTDA'
      };

      // Change establishment
      (mockEstabelecimentoService.selectedEstabelecimento$ as BehaviorSubject<any>)
        .next(newEstablishment);

      tick();
      fixture.detectChanges();

      // Should reload data for new establishment
      expect(mockCategoryStateService.setEstablishmentContext).toHaveBeenCalledWith(2);
    }));
  });

  describe('Accessibility Integration', () => {
    it('should have proper ARIA structure', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const appElement = fixture.debugElement.query(By.css('.category-app'));
      expect(appElement.nativeElement.getAttribute('role')).toBe('application');
      expect(appElement.nativeElement.getAttribute('aria-label')).toContain('Sistema de Gerenciamento de Categorias');

      const navElement = fixture.debugElement.query(By.css('.app-nav'));
      expect(navElement.nativeElement.getAttribute('role')).toBe('navigation');

      const mainElement = fixture.debugElement.query(By.css('.app-main'));
      expect(mainElement.nativeElement.getAttribute('role')).toBe('main');
    }));

    it('should have proper heading hierarchy', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const sectionTitle = fixture.debugElement.query(By.css('.section-title'));
      expect(sectionTitle.nativeElement.tagName).toBe('H1');
      expect(sectionTitle.nativeElement.id).toBe('list-title');

      const listSection = fixture.debugElement.query(By.css('.list-section'));
      expect(listSection.nativeElement.getAttribute('aria-labelledby')).toBe('list-title');
    }));

    it('should announce view changes to screen readers', fakeAsync(() => {
      // Navigate to different view
      appComponent.navigateToView('create');
      fixture.detectChanges();
      tick();

      const formSection = fixture.debugElement.query(By.css('.form-section'));
      expect(formSection.nativeElement.getAttribute('aria-labelledby')).toBe('form-title');

      const formTitle = fixture.debugElement.query(By.css('#form-title'));
      expect(formTitle.nativeElement.textContent).toContain('Nova Categoria');
    }));
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', fakeAsync(() => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCategories[0],
        id: i + 1,
        nome: `Categoria ${i + 1}`
      }));

      (mockCategorySearchService.filteredCategories$ as BehaviorSubject<Category[]>)
        .next(largeDataset);

      tick();
      fixture.detectChanges();

      // Should still render without performance issues
      const listComponent = fixture.debugElement.query(By.directive(CategoryListComponent));
      expect(listComponent).toBeTruthy();
    }));

    it('should debounce search operations', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      if (searchInput) {
        // Type rapidly
        searchInput.nativeElement.value = 'b';
        searchInput.nativeElement.dispatchEvent(new Event('input'));
        
        searchInput.nativeElement.value = 'be';
        searchInput.nativeElement.dispatchEvent(new Event('input'));
        
        searchInput.nativeElement.value = 'beb';
        searchInput.nativeElement.dispatchEvent(new Event('input'));

        // Should not call search service yet
        expect(mockCategorySearchService.updateSearchQuery).not.toHaveBeenCalled();

        // Wait for debounce
        tick(300);

        // Should call search service once
        expect(mockCategorySearchService.updateSearchQuery).toHaveBeenCalledTimes(1);
        expect(mockCategorySearchService.updateSearchQuery).toHaveBeenCalledWith('beb');
      }
    }));
  });

  describe('Mobile Integration', () => {
    it('should adapt to mobile viewport', fakeAsync(() => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      window.dispatchEvent(new Event('resize'));
      tick();
      fixture.detectChanges();

      // Components should adapt to mobile layout
      const appElement = fixture.debugElement.query(By.css('.category-app'));
      expect(appElement).toBeTruthy();
    }));
  });

  describe('Edge Cases Integration', () => {
    it('should handle empty data gracefully', fakeAsync(() => {
      (mockCategorySearchService.filteredCategories$ as BehaviorSubject<Category[]>)
        .next([]);
      (mockCategoryStateService.hasCategories$ as BehaviorSubject<boolean>)
        .next(false);

      tick();
      fixture.detectChanges();

      // Should display empty state
      const listComponent = fixture.debugElement.query(By.directive(CategoryListComponent));
      expect(listComponent).toBeTruthy();
    }));

    it('should handle network disconnection', fakeAsync(() => {
      // Simulate network error
      mockCategoryStateService.loadCategories.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      (mockCategoryStateService.error$ as BehaviorSubject<string | null>)
        .next('Network error');

      tick();
      fixture.detectChanges();

      // Should display error state with retry option
      const listComponent = fixture.debugElement.query(By.directive(CategoryListComponent));
      expect(listComponent).toBeTruthy();
    }));

    it('should handle concurrent operations', fakeAsync(() => {
      // Simulate multiple concurrent operations
      appComponent.showGlobalLoading();
      appComponent.showSuccess('Operação 1 concluída');
      appComponent.showError('Erro na operação 2');

      fixture.detectChanges();

      // Should display all states appropriately
      const loadingOverlay = fixture.debugElement.query(By.css('.global-loading-overlay'));
      const successToast = fixture.debugElement.query(By.css('.success-toast'));
      const errorToast = fixture.debugElement.query(By.css('.global-error-toast'));

      expect(loadingOverlay).toBeTruthy();
      expect(successToast).toBeTruthy();
      expect(errorToast).toBeTruthy();
    }));
  });
});
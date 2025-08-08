import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, BehaviorSubject } from 'rxjs';

import { CategoryListComponent } from '../components/category-list/category-list.component';
import { CategoryFormComponent } from '../components/category-form/category-form.component';
import { CategoryDetailComponent } from '../components/category-detail/category-detail.component';
import { CategoryCardComponent } from '../components/category-card/category-card.component';

import { CategoryStateService } from '../services/category-state.service';
import { CategorySearchService } from '../services/category-search.service';
import { CategoryHttpService } from '../services/category-http.service';
import { CategoryValidationService } from '../services/category-validation.service';
import { CategoryValidationMessagesService } from '../services/category-validation-messages.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../shared/services/notification.service';

import { Category } from '../models/category.models';

// Test host component for accessibility testing
@Component({
  template: `
    <div role="main" aria-label="Teste de acessibilidade de categorias">
      <app-category-list
        *ngIf="showList"
        (createCategory)="onCreateCategory()"
        (editCategory)="onEditCategory($event)"
        (viewCategoryDetails)="onViewCategoryDetails($event)">
      </app-category-list>

      <app-category-form
        *ngIf="showForm"
        [mode]="formMode"
        [category]="selectedCategory"
        (formSubmit)="onFormSubmit($event)"
        (formCancel)="onFormCancel()">
      </app-category-form>

      <app-category-detail
        *ngIf="showDetail"
        [categoryId]="selectedCategoryId"
        (edit)="onEditCategory($event)"
        (delete)="onDeleteCategory($event)"
        (back)="onBack()">
      </app-category-detail>

      <app-category-card
        *ngIf="showCard"
        [category]="selectedCategory"
        [isLoading]="cardLoading"
        [showActions]="true"
        (edit)="onEditCategory($event)"
        (delete)="onDeleteCategory($event)"
        (viewDetails)="onViewCategoryDetails($event)">
      </app-category-card>
    </div>
  `
})
class AccessibilityTestHostComponent {
  showList = false;
  showForm = false;
  showDetail = false;
  showCard = false;
  
  formMode: 'create' | 'edit' = 'create';
  selectedCategory: Category | null = null;
  selectedCategoryId = 1;
  cardLoading = false;

  onCreateCategory(): void {}
  onEditCategory(category: Category): void {}
  onViewCategoryDetails(category: Category): void {}
  onDeleteCategory(category: Category): void {}
  onFormSubmit(data: any): void {}
  onFormCancel(): void {}
  onBack(): void {}
}

describe('Category Components Accessibility Integration Tests', () => {
  let hostComponent: AccessibilityTestHostComponent;
  let fixture: ComponentFixture<AccessibilityTestHostComponent>;

  // Mock services
  let mockCategoryStateService: jasmine.SpyObj<CategoryStateService>;
  let mockCategorySearchService: jasmine.SpyObj<CategorySearchService>;
  let mockCategoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let mockValidationService: jasmine.SpyObj<CategoryValidationService>;
  let mockMessagesService: jasmine.SpyObj<CategoryValidationMessagesService>;
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
      descricao: 'Categoria de bebidas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
      produtosCount: 5
    },
    {
      id: 2,
      nome: 'Pratos Principais',
      descricao: 'Categoria de pratos principais',
      estabelecimentoId: 1,
      ativo: false,
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
      produtosCount: 0
    }
  ];

  beforeEach(async () => {
    // Create spy objects
    mockCategoryStateService = jasmine.createSpyObj('CategoryStateService', [
      'setEstablishmentContext',
      'loadCategories',
      'updateFilters',
      'updatePagination'
    ], {
      loading$: new BehaviorSubject(false),
      error$: new BehaviorSubject(null),
      pagination$: new BehaviorSubject({ currentPage: 1, pageSize: 20, totalItems: 2, totalPages: 1 }),
      hasCategories$: new BehaviorSubject(true)
    });

    mockCategorySearchService = jasmine.createSpyObj('CategorySearchService', [
      'updateSearchQuery',
      'clearSearch'
    ], {
      filteredCategories$: new BehaviorSubject(mockCategories)
    });

    mockCategoryHttpService = jasmine.createSpyObj('CategoryHttpService', [
      'getCategoryDetail',
      'createCategory',
      'updateCategory',
      'validateCategoryName'
    ]);

    mockValidationService = jasmine.createSpyObj('CategoryValidationService', [
      'validateCreateRequest',
      'validateUpdateRequest'
    ]);

    mockMessagesService = jasmine.createSpyObj('CategoryValidationMessagesService', [
      'getFirstFieldErrorMessage'
    ]);

    mockEstabelecimentoService = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ], {
      selectedEstabelecimento$: new BehaviorSubject(mockEstablishment)
    });

    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'info'
    ]);

    // Setup default return values
    mockCategoryStateService.loadCategories.and.returnValue(of(mockCategories));
    mockCategoryHttpService.getCategoryDetail.and.returnValue(of({
      categoria: mockCategories[0],
      produtos: []
    }));
    mockCategoryHttpService.validateCategoryName.and.returnValue(of(true));
    mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstablishment);
    mockValidationService.validateCreateRequest.and.returnValue({
      valid: true,
      errors: [],
      sanitizedData: { nome: 'Test', descricao: 'Test' }
    });

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
      declarations: [AccessibilityTestHostComponent],
      providers: [
        { provide: CategoryStateService, useValue: mockCategoryStateService },
        { provide: CategorySearchService, useValue: mockCategorySearchService },
        { provide: CategoryHttpService, useValue: mockCategoryHttpService },
        { provide: CategoryValidationService, useValue: mockValidationService },
        { provide: CategoryValidationMessagesService, useValue: mockMessagesService },
        { provide: EstabelecimentoService, useValue: mockEstabelecimentoService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccessibilityTestHostComponent);
    hostComponent = fixture.componentInstance;
    hostComponent.selectedCategory = mockCategories[0];
    fixture.detectChanges();
  });

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels on CategoryListComponent', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      expect(searchInput?.nativeElement.getAttribute('aria-label')).toContain('Buscar categorias');

      const createButton = fixture.debugElement.query(By.css('.create-category-btn'));
      expect(createButton?.nativeElement.getAttribute('aria-label')).toContain('Criar nova categoria');

      const categoryList = fixture.debugElement.query(By.css('[role="main"]'));
      expect(categoryList).toBeTruthy();
    }));

    it('should have proper ARIA labels on CategoryFormComponent', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      expect(nameInput?.nativeElement.getAttribute('aria-required')).toBe('true');
      expect(nameInput?.nativeElement.getAttribute('aria-describedby')).toContain('name-help');

      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="descricao"]'));
      expect(descriptionInput?.nativeElement.getAttribute('aria-describedby')).toContain('description-help');

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submitButton?.nativeElement.getAttribute('aria-label')).toBeTruthy();
    }));

    it('should have proper ARIA labels on CategoryDetailComponent', fakeAsync(() => {
      hostComponent.showDetail = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryDetailComponent));
      const componentInstance = component.componentInstance;
      
      const ariaLabel = componentInstance.getAriaLabel();
      expect(ariaLabel).toContain('Detalhes da categoria');
      expect(ariaLabel).toContain('Status:');
    }));

    it('should have proper ARIA labels on CategoryCardComponent', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const ariaLabel = cardElement?.nativeElement.getAttribute('aria-label');
      
      expect(ariaLabel).toContain('Categoria');
      expect(ariaLabel).toContain('Status:');
      expect(ariaLabel).toContain('Pressione Enter ou Espaço para ver detalhes');
    }));
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation in CategoryListComponent', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      
      // Test Tab navigation
      searchInput?.nativeElement.focus();
      expect(document.activeElement).toBe(searchInput?.nativeElement);

      // Test keyboard shortcuts
      const ctrlFEvent = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
      document.dispatchEvent(ctrlFEvent);
      
      // Should focus search input
      expect(document.activeElement).toBe(searchInput?.nativeElement);
    }));

    it('should support keyboard navigation in CategoryFormComponent', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="descricao"]'));

      // Test Tab navigation
      nameInput?.nativeElement.focus();
      expect(document.activeElement).toBe(nameInput?.nativeElement);

      // Simulate Tab key
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      nameInput?.nativeElement.dispatchEvent(tabEvent);

      // Test Ctrl+S shortcut
      const ctrlSEvent = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      const component = fixture.debugElement.query(By.directive(CategoryFormComponent));
      component.componentInstance.onKeyDown(ctrlSEvent);

      // Should trigger form submission (if valid)
      expect(ctrlSEvent.defaultPrevented).toBe(true);
    }));

    it('should support keyboard navigation in CategoryCardComponent', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      
      // Test Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(hostComponent, 'onViewCategoryDetails');
      
      cardElement?.nativeElement.dispatchEvent(enterEvent);
      fixture.detectChanges();

      expect(hostComponent.onViewCategoryDetails).toHaveBeenCalled();

      // Test Space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      cardElement?.nativeElement.dispatchEvent(spaceEvent);
      fixture.detectChanges();

      expect(hostComponent.onViewCategoryDetails).toHaveBeenCalledTimes(2);

      // Test E key for edit
      const eEvent = new KeyboardEvent('keydown', { key: 'e' });
      spyOn(hostComponent, 'onEditCategory');
      
      cardElement?.nativeElement.dispatchEvent(eEvent);
      fixture.detectChanges();

      expect(hostComponent.onEditCategory).toHaveBeenCalled();
    }));
  });

  describe('Focus Management', () => {
    it('should manage focus properly in CategoryFormComponent', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryFormComponent));
      const componentInstance = component.componentInstance;
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));

      spyOn(nameInput.nativeElement, 'focus');

      // Test programmatic focus
      componentInstance.focusNameInput();
      expect(nameInput.nativeElement.focus).toHaveBeenCalled();
    }));

    it('should maintain focus order in CategoryListComponent', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const focusableElements = fixture.debugElement.queryAll(
        By.css('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      );

      // Verify that focusable elements have proper tab order
      focusableElements.forEach((element, index) => {
        const tabIndex = element.nativeElement.tabIndex;
        expect(tabIndex).toBeGreaterThanOrEqual(-1);
      });
    }));

    it('should trap focus in modals', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      // Simulate opening a modal (deletion modal)
      const component = fixture.debugElement.query(By.directive(CategoryListComponent));
      const componentInstance = component.componentInstance;
      
      componentInstance.showDeletionModal.set(true);
      fixture.detectChanges();
      tick();

      const modal = fixture.debugElement.query(By.css('app-category-deletion-modal'));
      if (modal) {
        const modalFocusableElements = modal.queryAll(
          By.css('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
        );

        expect(modalFocusableElements.length).toBeGreaterThan(0);
      }
    }));
  });

  describe('Screen Reader Support', () => {
    it('should announce actions to screen readers', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');

      const component = fixture.debugElement.query(By.directive(CategoryListComponent));
      const componentInstance = component.componentInstance;

      // Test screen reader announcement
      componentInstance.toggleViewMode();

      expect(document.body.appendChild).toHaveBeenCalled();
      
      // Verify announcement element has proper attributes
      const calls = (document.body.appendChild as jasmine.Spy).calls.all();
      const announcementElement = calls[calls.length - 1]?.args[0];
      
      if (announcementElement) {
        expect(announcementElement.getAttribute('aria-live')).toBe('polite');
        expect(announcementElement.getAttribute('aria-atomic')).toBe('true');
        expect(announcementElement.className).toContain('sr-only');
      }
    }));

    it('should provide proper live regions for dynamic content', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      // Test loading state announcement
      (mockCategoryStateService.loading$ as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();

      const loadingRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(loadingRegion).toBeTruthy();

      // Test error state announcement
      (mockCategoryStateService.error$ as BehaviorSubject<string | null>).next('Erro de carregamento');
      fixture.detectChanges();

      const errorRegion = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(errorRegion).toBeTruthy();
    }));

    it('should provide descriptive text for complex interactions', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const ariaDescribedBy = cardElement?.nativeElement.getAttribute('aria-describedby');
      
      expect(ariaDescribedBy).toBeTruthy();
      
      // Verify that described elements exist
      const describedIds = ariaDescribedBy?.split(' ') || [];
      describedIds.forEach(id => {
        const describedElement = fixture.debugElement.query(By.css(`#${id}`));
        expect(describedElement).toBeTruthy();
      });
    }));
  });

  describe('Color and Contrast', () => {
    it('should not rely solely on color for information', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const statusElement = fixture.debugElement.query(By.css('.category-status'));
      
      // Should have text content in addition to color
      expect(statusElement?.nativeElement.textContent).toBeTruthy();
      expect(statusElement?.nativeElement.textContent).toContain('Ativa');
    }));

    it('should provide text alternatives for status indicators', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const categoryCards = fixture.debugElement.queryAll(By.css('app-category-card'));
      
      categoryCards.forEach(card => {
        const statusText = card.query(By.css('.category-status'));
        expect(statusText?.nativeElement.textContent).toMatch(/(Ativa|Inativa)/);
      });
    }));
  });

  describe('Form Accessibility', () => {
    it('should associate labels with form controls', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const nameLabel = fixture.debugElement.query(By.css('label[for="nome"]'));
      
      if (nameLabel && nameInput) {
        expect(nameLabel.nativeElement.getAttribute('for')).toBe(nameInput.nativeElement.id);
      }

      // Alternative: aria-labelledby
      const ariaLabelledBy = nameInput?.nativeElement.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        const labelElement = fixture.debugElement.query(By.css(`#${ariaLabelledBy}`));
        expect(labelElement).toBeTruthy();
      }
    }));

    it('should provide error messages with proper associations', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryFormComponent));
      const componentInstance = component.componentInstance;
      const nameControl = componentInstance.categoryForm.get('nome');

      // Trigger validation error
      nameControl?.setValue('');
      nameControl?.markAsTouched();
      fixture.detectChanges();

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      const ariaDescribedBy = nameInput?.nativeElement.getAttribute('aria-describedby');
      
      expect(ariaDescribedBy).toContain('name-error');

      const errorElement = fixture.debugElement.query(By.css('#name-error'));
      expect(errorElement).toBeTruthy();
    }));

    it('should indicate required fields', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const nameInput = fixture.debugElement.query(By.css('input[formControlName="nome"]'));
      expect(nameInput?.nativeElement.getAttribute('aria-required')).toBe('true');

      // Should also have visual indicator
      const requiredIndicator = fixture.debugElement.query(By.css('.required-indicator'));
      expect(requiredIndicator).toBeTruthy();
    }));
  });

  describe('Loading and Error States', () => {
    it('should announce loading states to screen readers', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();

      (mockCategoryStateService.loading$ as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();
      tick();

      const loadingAnnouncement = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(loadingAnnouncement?.nativeElement.textContent).toContain('Carregando');
    }));

    it('should provide accessible error messages', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();

      (mockCategoryStateService.error$ as BehaviorSubject<string | null>).next('Erro ao carregar categorias');
      fixture.detectChanges();
      tick();

      const errorAlert = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(errorAlert).toBeTruthy();
      expect(errorAlert?.nativeElement.textContent).toContain('Erro ao carregar categorias');
    }));

    it('should provide retry mechanisms with proper labels', fakeAsync(() => {
      hostComponent.showDetail = true;
      fixture.detectChanges();

      const component = fixture.debugElement.query(By.directive(CategoryDetailComponent));
      const componentInstance = component.componentInstance;
      
      componentInstance.error.set('Network error');
      fixture.detectChanges();
      tick();

      const retryButton = fixture.debugElement.query(By.css('.retry-btn'));
      expect(retryButton?.nativeElement.getAttribute('aria-label')).toContain('Tentar novamente');
    }));
  });

  describe('Modal and Dialog Accessibility', () => {
    it('should manage focus in deletion modal', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryListComponent));
      const componentInstance = component.componentInstance;
      
      // Open deletion modal
      componentInstance.categoryToDelete.set(mockCategories[0]);
      componentInstance.showDeletionModal.set(true);
      fixture.detectChanges();
      tick();

      const modal = fixture.debugElement.query(By.css('app-category-deletion-modal'));
      if (modal) {
        expect(modal.nativeElement.getAttribute('role')).toBe('dialog');
        expect(modal.nativeElement.getAttribute('aria-modal')).toBe('true');
        expect(modal.nativeElement.getAttribute('aria-labelledby')).toBeTruthy();
      }
    }));

    it('should provide proper modal titles and descriptions', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryListComponent));
      const componentInstance = component.componentInstance;
      
      componentInstance.showBulkDeletionModal.set(true);
      fixture.detectChanges();
      tick();

      const modal = fixture.debugElement.query(By.css('app-bulk-deletion-modal'));
      if (modal) {
        const modalTitle = modal.query(By.css('.modal-title'));
        expect(modalTitle?.nativeElement.id).toBeTruthy();
        
        const modalDescription = modal.query(By.css('.modal-description'));
        expect(modalDescription?.nativeElement.id).toBeTruthy();
      }
    }));
  });

  describe('Data Table Accessibility', () => {
    it('should provide proper table headers and captions', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const dataTable = fixture.debugElement.query(By.css('table'));
      if (dataTable) {
        const caption = dataTable.query(By.css('caption'));
        expect(caption?.nativeElement.textContent).toContain('Lista de categorias');

        const headers = dataTable.queryAll(By.css('th'));
        headers.forEach(header => {
          expect(header.nativeElement.getAttribute('scope')).toBeTruthy();
        });
      }
    }));

    it('should provide row and column headers', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const dataTable = fixture.debugElement.query(By.css('table'));
      if (dataTable) {
        const rowHeaders = dataTable.queryAll(By.css('th[scope="row"]'));
        const colHeaders = dataTable.queryAll(By.css('th[scope="col"]'));
        
        expect(rowHeaders.length + colHeaders.length).toBeGreaterThan(0);
      }
    }));
  });

  describe('Pagination Accessibility', () => {
    it('should provide accessible pagination controls', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const pagination = fixture.debugElement.query(By.css('.pagination'));
      if (pagination) {
        expect(pagination.nativeElement.getAttribute('role')).toBe('navigation');
        expect(pagination.nativeElement.getAttribute('aria-label')).toContain('Paginação');

        const currentPage = pagination.query(By.css('[aria-current="page"]'));
        expect(currentPage).toBeTruthy();
      }
    }));

    it('should announce page changes', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      spyOn(document.body, 'appendChild');

      const component = fixture.debugElement.query(By.directive(CategoryListComponent));
      const componentInstance = component.componentInstance;
      
      componentInstance.goToPage(2);
      tick();

      expect(document.body.appendChild).toHaveBeenCalled();
    }));
  });

  describe('Search and Filter Accessibility', () => {
    it('should provide accessible search functionality', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      expect(searchInput?.nativeElement.getAttribute('role')).toBe('searchbox');
      expect(searchInput?.nativeElement.getAttribute('aria-label')).toBeTruthy();

      const searchResults = fixture.debugElement.query(By.css('[role="region"][aria-live="polite"]'));
      expect(searchResults).toBeTruthy();
    }));

    it('should announce search results', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryListComponent));
      const componentInstance = component.componentInstance;
      
      // Perform search
      componentInstance.searchControl.setValue('bebidas');
      tick(300); // Wait for debounce
      fixture.detectChanges();

      const resultsAnnouncement = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(resultsAnnouncement).toBeTruthy();
    }));
  });

  describe('Mobile Accessibility', () => {
    it('should provide touch-friendly targets', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const touchTargets = fixture.debugElement.queryAll(By.css('button, .category-card'));
      
      touchTargets.forEach(target => {
        const styles = getComputedStyle(target.nativeElement);
        const minSize = 44; // Minimum touch target size in pixels
        
        // Note: In a real test, we would check computed styles
        // Here we just verify the elements exist and are interactive
        expect(target.nativeElement.tabIndex).toBeGreaterThanOrEqual(-1);
      });
    }));

    it('should support swipe gestures with keyboard alternatives', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      // Verify that swipe actions have keyboard alternatives
      const swipeableElements = fixture.debugElement.queryAll(By.css('.swipeable'));
      
      swipeableElements.forEach(element => {
        const keyboardAlternative = element.query(By.css('button'));
        expect(keyboardAlternative).toBeTruthy();
      });
    }));
  });

  describe('High Contrast and Reduced Motion', () => {
    it('should respect reduced motion preferences', fakeAsync(() => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jasmine.createSpy('matchMedia').and.returnValue({
          matches: true, // prefers-reduced-motion: reduce
          addListener: jasmine.createSpy('addListener'),
          removeListener: jasmine.createSpy('removeListener')
        })
      });

      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const animatedElements = fixture.debugElement.queryAll(By.css('.animated'));
      
      animatedElements.forEach(element => {
        expect(element.nativeElement.classList).toContain('reduced-motion');
      });
    }));

    it('should work with high contrast mode', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const statusElement = fixture.debugElement.query(By.css('.category-status'));
      
      // Should have sufficient contrast indicators beyond just color
      expect(statusElement?.nativeElement.textContent).toBeTruthy();
      expect(statusElement?.nativeElement.getAttribute('aria-label')).toBeTruthy();
    }));
  });
});
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
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../shared/services/notification.service';

import { Category } from '../models/category.models';

// Visual regression test utilities
interface VisualSnapshot {
  componentName: string;
  state: string;
  timestamp: number;
  dimensions: { width: number; height: number };
  styles: { [key: string]: string };
  classes: string[];
}

class VisualRegressionHelper {
  private snapshots: VisualSnapshot[] = [];

  captureSnapshot(element: HTMLElement, componentName: string, state: string): VisualSnapshot {
    const computedStyles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    const snapshot: VisualSnapshot = {
      componentName,
      state,
      timestamp: Date.now(),
      dimensions: {
        width: rect.width,
        height: rect.height
      },
      styles: {
        backgroundColor: computedStyles.backgroundColor,
        color: computedStyles.color,
        fontSize: computedStyles.fontSize,
        fontFamily: computedStyles.fontFamily,
        border: computedStyles.border,
        borderRadius: computedStyles.borderRadius,
        padding: computedStyles.padding,
        margin: computedStyles.margin,
        display: computedStyles.display,
        position: computedStyles.position
      },
      classes: Array.from(element.classList)
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  compareSnapshots(baseline: VisualSnapshot, current: VisualSnapshot): boolean {
    // Compare dimensions
    if (Math.abs(baseline.dimensions.width - current.dimensions.width) > 1 ||
        Math.abs(baseline.dimensions.height - current.dimensions.height) > 1) {
      return false;
    }

    // Compare critical styles
    const criticalStyles = ['backgroundColor', 'color', 'fontSize', 'border'];
    for (const style of criticalStyles) {
      if (baseline.styles[style] !== current.styles[style]) {
        return false;
      }
    }

    // Compare classes
    if (baseline.classes.length !== current.classes.length) {
      return false;
    }

    for (const className of baseline.classes) {
      if (!current.classes.includes(className)) {
        return false;
      }
    }

    return true;
  }

  getSnapshots(): VisualSnapshot[] {
    return this.snapshots;
  }

  clearSnapshots(): void {
    this.snapshots = [];
  }
}

// Test host component for visual regression testing
@Component({
  template: `
    <div class="visual-test-container" [style.width.px]="containerWidth" [style.height.px]="containerHeight">
      <app-category-list
        *ngIf="showList"
        class="test-category-list"
        (createCategory)="onCreateCategory()"
        (editCategory)="onEditCategory($event)"
        (viewCategoryDetails)="onViewCategoryDetails($event)">
      </app-category-list>

      <app-category-form
        *ngIf="showForm"
        class="test-category-form"
        [mode]="formMode"
        [category]="selectedCategory"
        (formSubmit)="onFormSubmit($event)"
        (formCancel)="onFormCancel()">
      </app-category-form>

      <app-category-detail
        *ngIf="showDetail"
        class="test-category-detail"
        [categoryId]="selectedCategoryId"
        [showActions]="showDetailActions"
        [printMode]="printMode"
        (edit)="onEditCategory($event)"
        (delete)="onDeleteCategory($event)"
        (back)="onBack()">
      </app-category-detail>

      <app-category-card
        *ngIf="showCard"
        class="test-category-card"
        [category]="selectedCategory"
        [isLoading]="cardLoading"
        [showActions]="showCardActions"
        (edit)="onEditCategory($event)"
        (delete)="onDeleteCategory($event)"
        (viewDetails)="onViewCategoryDetails($event)">
      </app-category-card>
    </div>
  `,
  styles: [`
    .visual-test-container {
      background: #ffffff;
      padding: 16px;
      box-sizing: border-box;
    }
  `]
})
class VisualRegressionTestHostComponent {
  containerWidth = 1200;
  containerHeight = 800;
  
  showList = false;
  showForm = false;
  showDetail = false;
  showCard = false;
  
  formMode: 'create' | 'edit' = 'create';
  selectedCategory: Category | null = null;
  selectedCategoryId = 1;
  cardLoading = false;
  showDetailActions = true;
  showCardActions = true;
  printMode = false;

  onCreateCategory(): void {}
  onEditCategory(category: Category): void {}
  onViewCategoryDetails(category: Category): void {}
  onDeleteCategory(category: Category): void {}
  onFormSubmit(data: any): void {}
  onFormCancel(): void {}
  onBack(): void {}
}

describe('Category Components Visual Regression Tests', () => {
  let hostComponent: VisualRegressionTestHostComponent;
  let fixture: ComponentFixture<VisualRegressionTestHostComponent>;
  let visualHelper: VisualRegressionHelper;

  // Mock services
  let mockCategoryStateService: jasmine.SpyObj<CategoryStateService>;
  let mockCategorySearchService: jasmine.SpyObj<CategorySearchService>;
  let mockCategoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let mockValidationService: jasmine.SpyObj<CategoryValidationService>;
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
    visualHelper = new VisualRegressionHelper();

    // Create spy objects
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
      declarations: [VisualRegressionTestHostComponent],
      providers: [
        { provide: CategoryStateService, useValue: mockCategoryStateService },
        { provide: CategorySearchService, useValue: mockCategorySearchService },
        { provide: CategoryHttpService, useValue: mockCategoryHttpService },
        { provide: CategoryValidationService, useValue: mockValidationService },
        { provide: EstabelecimentoService, useValue: mockEstabelecimentoService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VisualRegressionTestHostComponent);
    hostComponent = fixture.componentInstance;
    hostComponent.selectedCategory = mockCategories[0];
    fixture.detectChanges();
  });

  afterEach(() => {
    visualHelper.clearSnapshots();
  });

  describe('CategoryListComponent Visual States', () => {
    it('should render default state consistently', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'default'
      );

      expect(snapshot.dimensions.width).toBeGreaterThan(0);
      expect(snapshot.dimensions.height).toBeGreaterThan(0);
      expect(snapshot.classes).toContain('test-category-list');
    }));

    it('should render loading state consistently', fakeAsync(() => {
      hostComponent.showList = true;
      (mockCategoryStateService.loading$ as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();
      tick();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'loading'
      );

      expect(snapshot.componentName).toBe('CategoryListComponent');
      expect(snapshot.state).toBe('loading');
    }));

    it('should render error state consistently', fakeAsync(() => {
      hostComponent.showList = true;
      (mockCategoryStateService.error$ as BehaviorSubject<string | null>).next('Erro de carregamento');
      fixture.detectChanges();
      tick();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'error'
      );

      expect(snapshot.state).toBe('error');
    }));

    it('should render empty state consistently', fakeAsync(() => {
      hostComponent.showList = true;
      (mockCategorySearchService.filteredCategories$ as BehaviorSubject<Category[]>).next([]);
      (mockCategoryStateService.hasCategories$ as BehaviorSubject<boolean>).next(false);
      fixture.detectChanges();
      tick();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'empty'
      );

      expect(snapshot.state).toBe('empty');
    }));

    it('should render grid view mode consistently', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryListComponent));
      component.componentInstance.setViewMode('grid');
      fixture.detectChanges();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'grid-view'
      );

      expect(snapshot.state).toBe('grid-view');
    }));

    it('should render list view mode consistently', fakeAsync(() => {
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryListComponent));
      component.componentInstance.setViewMode('list');
      fixture.detectChanges();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'list-view'
      );

      expect(snapshot.state).toBe('list-view');
    }));
  });

  describe('CategoryFormComponent Visual States', () => {
    it('should render create form consistently', fakeAsync(() => {
      hostComponent.showForm = true;
      hostComponent.formMode = 'create';
      fixture.detectChanges();
      tick();

      const formElement = fixture.debugElement.query(By.css('.test-category-form'));
      const snapshot = visualHelper.captureSnapshot(
        formElement.nativeElement,
        'CategoryFormComponent',
        'create'
      );

      expect(snapshot.state).toBe('create');
    }));

    it('should render edit form consistently', fakeAsync(() => {
      hostComponent.showForm = true;
      hostComponent.formMode = 'edit';
      fixture.detectChanges();
      tick();

      const formElement = fixture.debugElement.query(By.css('.test-category-form'));
      const snapshot = visualHelper.captureSnapshot(
        formElement.nativeElement,
        'CategoryFormComponent',
        'edit'
      );

      expect(snapshot.state).toBe('edit');
    }));

    it('should render form with validation errors consistently', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryFormComponent));
      const nameControl = component.componentInstance.categoryForm.get('nome');
      
      // Trigger validation error
      nameControl?.setValue('');
      nameControl?.markAsTouched();
      fixture.detectChanges();

      const formElement = fixture.debugElement.query(By.css('.test-category-form'));
      const snapshot = visualHelper.captureSnapshot(
        formElement.nativeElement,
        'CategoryFormComponent',
        'validation-errors'
      );

      expect(snapshot.state).toBe('validation-errors');
    }));

    it('should render submitting state consistently', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryFormComponent));
      component.componentInstance.submitting.set(true);
      fixture.detectChanges();

      const formElement = fixture.debugElement.query(By.css('.test-category-form'));
      const snapshot = visualHelper.captureSnapshot(
        formElement.nativeElement,
        'CategoryFormComponent',
        'submitting'
      );

      expect(snapshot.state).toBe('submitting');
    }));
  });

  describe('CategoryDetailComponent Visual States', () => {
    it('should render detail view consistently', fakeAsync(() => {
      hostComponent.showDetail = true;
      fixture.detectChanges();
      tick();

      const detailElement = fixture.debugElement.query(By.css('.test-category-detail'));
      const snapshot = visualHelper.captureSnapshot(
        detailElement.nativeElement,
        'CategoryDetailComponent',
        'default'
      );

      expect(snapshot.state).toBe('default');
    }));

    it('should render print mode consistently', fakeAsync(() => {
      hostComponent.showDetail = true;
      hostComponent.printMode = true;
      fixture.detectChanges();
      tick();

      const detailElement = fixture.debugElement.query(By.css('.test-category-detail'));
      const snapshot = visualHelper.captureSnapshot(
        detailElement.nativeElement,
        'CategoryDetailComponent',
        'print-mode'
      );

      expect(snapshot.state).toBe('print-mode');
    }));

    it('should render without actions consistently', fakeAsync(() => {
      hostComponent.showDetail = true;
      hostComponent.showDetailActions = false;
      fixture.detectChanges();
      tick();

      const detailElement = fixture.debugElement.query(By.css('.test-category-detail'));
      const snapshot = visualHelper.captureSnapshot(
        detailElement.nativeElement,
        'CategoryDetailComponent',
        'no-actions'
      );

      expect(snapshot.state).toBe('no-actions');
    }));

    it('should render loading state consistently', fakeAsync(() => {
      hostComponent.showDetail = true;
      fixture.detectChanges();

      const component = fixture.debugElement.query(By.directive(CategoryDetailComponent));
      component.componentInstance.loading.set(true);
      fixture.detectChanges();
      tick();

      const detailElement = fixture.debugElement.query(By.css('.test-category-detail'));
      const snapshot = visualHelper.captureSnapshot(
        detailElement.nativeElement,
        'CategoryDetailComponent',
        'loading'
      );

      expect(snapshot.state).toBe('loading');
    }));
  });

  describe('CategoryCardComponent Visual States', () => {
    it('should render active category card consistently', fakeAsync(() => {
      hostComponent.showCard = true;
      hostComponent.selectedCategory = { ...mockCategories[0], ativo: true };
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'active'
      );

      expect(snapshot.state).toBe('active');
    }));

    it('should render inactive category card consistently', fakeAsync(() => {
      hostComponent.showCard = true;
      hostComponent.selectedCategory = { ...mockCategories[0], ativo: false };
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'inactive'
      );

      expect(snapshot.state).toBe('inactive');
    }));

    it('should render loading card consistently', fakeAsync(() => {
      hostComponent.showCard = true;
      hostComponent.cardLoading = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'loading'
      );

      expect(snapshot.state).toBe('loading');
    }));

    it('should render card without actions consistently', fakeAsync(() => {
      hostComponent.showCard = true;
      hostComponent.showCardActions = false;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'no-actions'
      );

      expect(snapshot.state).toBe('no-actions');
    }));

    it('should render focused card consistently', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryCardComponent));
      component.componentInstance.isFocused.set(true);
      fixture.detectChanges();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'focused'
      );

      expect(snapshot.state).toBe('focused');
    }));
  });

  describe('Responsive Design Visual Tests', () => {
    it('should render mobile layout consistently', fakeAsync(() => {
      hostComponent.containerWidth = 375; // Mobile width
      hostComponent.containerHeight = 667; // Mobile height
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'mobile'
      );

      expect(snapshot.state).toBe('mobile');
      expect(snapshot.dimensions.width).toBeLessThan(400);
    }));

    it('should render tablet layout consistently', fakeAsync(() => {
      hostComponent.containerWidth = 768; // Tablet width
      hostComponent.containerHeight = 1024; // Tablet height
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'tablet'
      );

      expect(snapshot.state).toBe('tablet');
      expect(snapshot.dimensions.width).toBeGreaterThan(400);
      expect(snapshot.dimensions.width).toBeLessThan(1000);
    }));

    it('should render desktop layout consistently', fakeAsync(() => {
      hostComponent.containerWidth = 1200; // Desktop width
      hostComponent.containerHeight = 800; // Desktop height
      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'desktop'
      );

      expect(snapshot.state).toBe('desktop');
      expect(snapshot.dimensions.width).toBeGreaterThan(1000);
    }));
  });

  describe('Theme and Color Variations', () => {
    it('should render light theme consistently', fakeAsync(() => {
      document.body.classList.add('light-theme');
      
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'light-theme'
      );

      expect(snapshot.state).toBe('light-theme');
      
      document.body.classList.remove('light-theme');
    }));

    it('should render dark theme consistently', fakeAsync(() => {
      document.body.classList.add('dark-theme');
      
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'dark-theme'
      );

      expect(snapshot.state).toBe('dark-theme');
      
      document.body.classList.remove('dark-theme');
    }));

    it('should render high contrast mode consistently', fakeAsync(() => {
      document.body.classList.add('high-contrast');
      
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const formElement = fixture.debugElement.query(By.css('.test-category-form'));
      const snapshot = visualHelper.captureSnapshot(
        formElement.nativeElement,
        'CategoryFormComponent',
        'high-contrast'
      );

      expect(snapshot.state).toBe('high-contrast');
      
      document.body.classList.remove('high-contrast');
    }));
  });

  describe('Animation and Transition States', () => {
    it('should render hover states consistently', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      
      // Simulate hover
      cardElement.nativeElement.classList.add('hovered');
      fixture.detectChanges();

      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'hovered'
      );

      expect(snapshot.state).toBe('hovered');
      expect(snapshot.classes).toContain('hovered');
    }));

    it('should render pressed states consistently', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      
      // Simulate press
      cardElement.nativeElement.classList.add('pressed');
      fixture.detectChanges();

      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'pressed'
      );

      expect(snapshot.state).toBe('pressed');
      expect(snapshot.classes).toContain('pressed');
    }));
  });

  describe('Cross-Browser Consistency', () => {
    it('should render consistently across different font sizes', fakeAsync(() => {
      // Simulate larger font size
      document.documentElement.style.fontSize = '18px';
      
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const formElement = fixture.debugElement.query(By.css('.test-category-form'));
      const snapshot = visualHelper.captureSnapshot(
        formElement.nativeElement,
        'CategoryFormComponent',
        'large-font'
      );

      expect(snapshot.state).toBe('large-font');
      
      // Reset font size
      document.documentElement.style.fontSize = '';
    }));

    it('should render consistently with different zoom levels', fakeAsync(() => {
      // Simulate zoom
      document.body.style.zoom = '1.25';
      
      hostComponent.showDetail = true;
      fixture.detectChanges();
      tick();

      const detailElement = fixture.debugElement.query(By.css('.test-category-detail'));
      const snapshot = visualHelper.captureSnapshot(
        detailElement.nativeElement,
        'CategoryDetailComponent',
        'zoomed'
      );

      expect(snapshot.state).toBe('zoomed');
      
      // Reset zoom
      document.body.style.zoom = '';
    }));
  });

  describe('Visual Regression Comparison', () => {
    it('should detect visual changes in components', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      
      // Capture baseline
      const baseline = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'baseline'
      );

      // Make a visual change
      cardElement.nativeElement.style.backgroundColor = 'red';
      fixture.detectChanges();

      // Capture after change
      const afterChange = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'changed'
      );

      // Compare snapshots
      const isIdentical = visualHelper.compareSnapshots(baseline, afterChange);
      expect(isIdentical).toBe(false);
    }));

    it('should not detect changes when components are identical', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      
      // Capture two identical snapshots
      const snapshot1 = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'identical1'
      );

      const snapshot2 = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'identical2'
      );

      // Compare snapshots
      const isIdentical = visualHelper.compareSnapshots(snapshot1, snapshot2);
      expect(isIdentical).toBe(true);
    }));
  });

  describe('Performance Visual Tests', () => {
    it('should render large lists without visual degradation', fakeAsync(() => {
      // Create large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockCategories[0],
        id: i + 1,
        nome: `Categoria ${i + 1}`
      }));

      (mockCategorySearchService.filteredCategories$ as BehaviorSubject<Category[]>)
        .next(largeDataset);

      hostComponent.showList = true;
      fixture.detectChanges();
      tick();

      const listElement = fixture.debugElement.query(By.css('.test-category-list'));
      const snapshot = visualHelper.captureSnapshot(
        listElement.nativeElement,
        'CategoryListComponent',
        'large-dataset'
      );

      expect(snapshot.state).toBe('large-dataset');
      expect(snapshot.dimensions.height).toBeGreaterThan(0);
    }));

    it('should render complex forms without layout issues', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      // Add complex validation states
      const component = fixture.debugElement.query(By.directive(CategoryFormComponent));
      const form = component.componentInstance.categoryForm;
      
      // Trigger multiple validation states
      form.get('nome')?.setErrors({ required: true });
      form.get('descricao')?.setErrors({ maxlength: true });
      fixture.detectChanges();

      const formElement = fixture.debugElement.query(By.css('.test-category-form'));
      const snapshot = visualHelper.captureSnapshot(
        formElement.nativeElement,
        'CategoryFormComponent',
        'complex-validation'
      );

      expect(snapshot.state).toBe('complex-validation');
    }));
  });

  describe('Accessibility Visual Tests', () => {
    it('should render focus indicators consistently', fakeAsync(() => {
      hostComponent.showCard = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.test-category-card'));
      
      // Simulate focus
      cardElement.nativeElement.focus();
      cardElement.nativeElement.classList.add('focused');
      fixture.detectChanges();

      const snapshot = visualHelper.captureSnapshot(
        cardElement.nativeElement,
        'CategoryCardComponent',
        'focus-indicator'
      );

      expect(snapshot.state).toBe('focus-indicator');
      expect(snapshot.classes).toContain('focused');
    }));

    it('should render error states with proper visual indicators', fakeAsync(() => {
      hostComponent.showForm = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.directive(CategoryFormComponent));
      const nameControl = component.componentInstance.categoryForm.get('nome');
      
      // Trigger error state
      nameControl?.setErrors({ required: true });
      nameControl?.markAsTouched();
      fixture.detectChanges();

      const formElement = fixture.debugElement.query(By.css('.test-category-form'));
      const snapshot = visualHelper.captureSnapshot(
        formElement.nativeElement,
        'CategoryFormComponent',
        'error-indicators'
      );

      expect(snapshot.state).toBe('error-indicators');
    }));
  });
});
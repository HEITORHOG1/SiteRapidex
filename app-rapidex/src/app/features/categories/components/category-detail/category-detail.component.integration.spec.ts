import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { CategoryDetailComponent } from './category-detail.component';
import { CategoryHttpService } from '../../services/category-http.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { Category, ProductSummary } from '../../models/category.models';
import { CategoryDetailResponse } from '../../models/category-dto.models';

// Test host component
@Component({
  template: `
    <app-category-detail
      [categoryId]="categoryId"
      [showActions]="showActions"
      [showBreadcrumb]="showBreadcrumb"
      [printMode]="printMode"
      (edit)="onEdit($event)"
      (delete)="onDelete($event)"
      (back)="onBack()">
    </app-category-detail>
  `
})
class TestHostComponent {
  categoryId = 1;
  showActions = true;
  showBreadcrumb = true;
  printMode = false;

  editData: Category | null = null;
  deleteData: Category | null = null;
  backCalled = false;

  onEdit(category: Category): void {
    this.editData = category;
  }

  onDelete(category: Category): void {
    this.deleteData = category;
  }

  onBack(): void {
    this.backCalled = true;
  }
}

describe('CategoryDetailComponent Integration Tests', () => {
  let hostComponent: TestHostComponent;
  let categoryDetailComponent: CategoryDetailComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let router: Router;
  let location: Location;

  // Mock services
  let mockCategoryService: jasmine.SpyObj<CategoryHttpService>;
  let mockEstabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;

  // Mock data
  const mockEstablishment = {
    id: 1,
    nomeFantasia: 'Test Restaurant',
    razaoSocial: 'Test Restaurant LTDA'
  };

  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas e sucos naturais',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-01T10:00:00Z'),
    dataAtualizacao: new Date('2024-01-15T14:30:00Z'),
    produtosCount: 5
  };

  const mockProducts: ProductSummary[] = [
    {
      id: 1,
      nome: 'Suco de Laranja',
      preco: 8.50,
      ativo: true
    },
    {
      id: 2,
      nome: 'Refrigerante Cola',
      preco: 5.00,
      ativo: true
    },
    {
      id: 3,
      nome: 'Água Mineral',
      preco: 3.00,
      ativo: false
    }
  ];

  const mockDetailResponse: CategoryDetailResponse = {
    categoria: mockCategory,
    produtos: mockProducts
  };

  beforeEach(async () => {
    // Create spy objects
    mockCategoryService = jasmine.createSpyObj('CategoryHttpService', [
      'getCategoryDetail'
    ]);

    mockEstabelecimentoService = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ]);

    // Setup default return values
    mockCategoryService.getCategoryDetail.and.returnValue(of(mockDetailResponse));
    mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstablishment);

    await TestBed.configureTestingModule({
      imports: [
        CategoryDetailComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      declarations: [TestHostComponent],
      providers: [
        { provide: CategoryHttpService, useValue: mockCategoryService },
        { provide: EstabelecimentoService, useValue: mockEstabelecimentoService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: Location, useValue: jasmine.createSpyObj('Location', ['back']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    
    // Get the CategoryDetailComponent instance
    const categoryDetailDebugElement = fixture.debugElement.query(By.directive(CategoryDetailComponent));
    categoryDetailComponent = categoryDetailDebugElement.componentInstance;

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create and initialize properly', () => {
      expect(hostComponent).toBeTruthy();
      expect(categoryDetailComponent).toBeTruthy();
    });

    it('should load category detail on init', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      expect(mockCategoryService.getCategoryDetail).toHaveBeenCalledWith(1, 1);
      expect(categoryDetailComponent.category()).toEqual(mockCategory);
      expect(categoryDetailComponent.products()).toEqual(mockProducts);
    }));

    it('should handle missing establishment', fakeAsync(() => {
      mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue(null);
      
      // Recreate component to trigger ngOnInit
      const newFixture = TestBed.createComponent(TestHostComponent);
      const newCategoryDetailComponent = newFixture.debugElement.query(By.directive(CategoryDetailComponent)).componentInstance;
      
      newFixture.detectChanges();
      tick();

      expect(newCategoryDetailComponent.error()).toBe('Nenhum estabelecimento selecionado');
    }));

    it('should display loading state initially', fakeAsync(() => {
      // Create a new component instance to catch initial loading state
      const newFixture = TestBed.createComponent(TestHostComponent);
      const newCategoryDetailComponent = newFixture.debugElement.query(By.directive(CategoryDetailComponent)).componentInstance;
      
      expect(newCategoryDetailComponent.loading()).toBe(false); // Initial state
      
      newFixture.detectChanges();
      // Loading state would be true during the service call
      
      tick();
      newFixture.detectChanges();
      
      expect(newCategoryDetailComponent.loading()).toBe(false); // After loading
    }));
  });

  describe('Data Display Integration', () => {
    beforeEach(fakeAsync(() => {
      tick();
      fixture.detectChanges();
    }));

    it('should display category information', () => {
      const categoryName = fixture.debugElement.query(By.css('.category-name'));
      const categoryDescription = fixture.debugElement.query(By.css('.category-description'));
      const categoryStatus = fixture.debugElement.query(By.css('.category-status'));

      expect(categoryName?.nativeElement.textContent).toContain('Bebidas');
      expect(categoryDescription?.nativeElement.textContent).toContain('Categoria de bebidas e sucos naturais');
      expect(categoryStatus?.nativeElement.textContent).toContain('Ativa');
    });

    it('should display formatted dates', () => {
      const createdDate = fixture.debugElement.query(By.css('.created-date'));
      const updatedDate = fixture.debugElement.query(By.css('.updated-date'));

      expect(createdDate?.nativeElement.textContent).toContain('01/01/2024');
      expect(updatedDate?.nativeElement.textContent).toContain('15/01/2024');
    });

    it('should display product count and list', () => {
      const productCount = fixture.debugElement.query(By.css('.product-count'));
      const productList = fixture.debugElement.queryAll(By.css('.product-item'));

      expect(productCount?.nativeElement.textContent).toContain('3 produtos cadastrados');
      expect(productList.length).toBe(3);
    });

    it('should display correct status class and text', () => {
      expect(categoryDetailComponent.getStatusText()).toBe('Ativa');
      expect(categoryDetailComponent.getStatusClass()).toBe('status--active');

      // Test inactive status
      const inactiveCategory = { ...mockCategory, ativo: false };
      categoryDetailComponent.category.set(inactiveCategory);
      fixture.detectChanges();

      expect(categoryDetailComponent.getStatusText()).toBe('Inativa');
      expect(categoryDetailComponent.getStatusClass()).toBe('status--inactive');
    });

    it('should display product count text correctly', () => {
      expect(categoryDetailComponent.getProductCountText()).toBe('3 produtos cadastrados');

      // Test with no products
      categoryDetailComponent.products.set([]);
      expect(categoryDetailComponent.getProductCountText()).toBe('Nenhum produto cadastrado');

      // Test with one product
      categoryDetailComponent.products.set([mockProducts[0]]);
      expect(categoryDetailComponent.getProductCountText()).toBe('1 produto cadastrado');
    });
  });

  describe('Action Buttons Integration', () => {
    beforeEach(fakeAsync(() => {
      tick();
      fixture.detectChanges();
    }));

    it('should show action buttons when showActions is true', () => {
      const editButton = fixture.debugElement.query(By.css('.edit-btn'));
      const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));

      expect(editButton).toBeTruthy();
      expect(deleteButton).toBeTruthy();
    });

    it('should hide action buttons when showActions is false', fakeAsync(() => {
      hostComponent.showActions = false;
      fixture.detectChanges();
      tick();

      const editButton = fixture.debugElement.query(By.css('.edit-btn'));
      const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));

      expect(editButton).toBeFalsy();
      expect(deleteButton).toBeFalsy();
    }));

    it('should emit edit event when edit button is clicked', () => {
      const editButton = fixture.debugElement.query(By.css('.edit-btn'));
      if (editButton) {
        editButton.nativeElement.click();
        fixture.detectChanges();

        expect(hostComponent.editData).toEqual(mockCategory);
      }
    });

    it('should emit delete event when delete button is clicked', () => {
      const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));
      if (deleteButton) {
        deleteButton.nativeElement.click();
        fixture.detectChanges();

        expect(hostComponent.deleteData).toEqual(mockCategory);
      }
    });

    it('should disable delete button when category has products', () => {
      const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));
      
      expect(categoryDetailComponent.canDelete()).toBe(false);
      expect(deleteButton?.nativeElement.disabled).toBe(true);
    });

    it('should enable delete button when category has no products', fakeAsync(() => {
      // Update mock to return no products
      const noProductsResponse = { ...mockDetailResponse, produtos: [] };
      mockCategoryService.getCategoryDetail.and.returnValue(of(noProductsResponse));
      
      categoryDetailComponent.loadCategoryDetail();
      tick();
      fixture.detectChanges();

      const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));
      
      expect(categoryDetailComponent.canDelete()).toBe(true);
      expect(deleteButton?.nativeElement.disabled).toBe(false);
    }));
  });

  describe('Navigation Integration', () => {
    beforeEach(fakeAsync(() => {
      tick();
      fixture.detectChanges();
    }));

    it('should show breadcrumb when showBreadcrumb is true', () => {
      const breadcrumb = fixture.debugElement.query(By.css('.breadcrumb'));
      expect(breadcrumb).toBeTruthy();
    });

    it('should hide breadcrumb when showBreadcrumb is false', fakeAsync(() => {
      hostComponent.showBreadcrumb = false;
      fixture.detectChanges();
      tick();

      const breadcrumb = fixture.debugElement.query(By.css('.breadcrumb'));
      expect(breadcrumb).toBeFalsy();
    }));

    it('should emit back event when back button is clicked', () => {
      const backButton = fixture.debugElement.query(By.css('.back-btn'));
      if (backButton) {
        backButton.nativeElement.click();
        fixture.detectChanges();

        expect(hostComponent.backCalled).toBe(true);
      }
    });

    it('should navigate to list when navigateToList is called', () => {
      categoryDetailComponent.navigateToList();
      expect(router.navigate).toHaveBeenCalledWith(['/categories/list']);
    });

    it('should navigate to edit when navigateToEdit is called', () => {
      categoryDetailComponent.navigateToEdit();
      expect(router.navigate).toHaveBeenCalledWith(['/categories/edit', mockCategory.id]);
    });
  });

  describe('Print Mode Integration', () => {
    it('should apply print mode styles when printMode is true', fakeAsync(() => {
      hostComponent.printMode = true;
      fixture.detectChanges();
      tick();

      const component = fixture.debugElement.query(By.css('app-category-detail'));
      expect(component.nativeElement.classList).toContain('print-mode');
    }));

    it('should handle print action', () => {
      spyOn(window, 'print');
      
      categoryDetailComponent.onPrint();
      
      expect(window.print).toHaveBeenCalled();
    });

    it('should display current date in print mode', () => {
      const currentDate = categoryDetailComponent.getCurrentDate();
      const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      expect(currentDate).toBe(today);
    });
  });

  describe('Error Handling Integration', () => {
    it('should display error state when loading fails', fakeAsync(() => {
      mockCategoryService.getCategoryDetail.and.returnValue(
        throwError(() => ({ message: 'Category not found' }))
      );

      categoryDetailComponent.loadCategoryDetail();
      tick();
      fixture.detectChanges();

      expect(categoryDetailComponent.error()).toBe('Category not found');
      expect(categoryDetailComponent.loading()).toBe(false);

      const errorState = fixture.debugElement.query(By.css('.error-state'));
      expect(errorState).toBeTruthy();
    }));

    it('should show retry button in error state', fakeAsync(() => {
      mockCategoryService.getCategoryDetail.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );

      categoryDetailComponent.loadCategoryDetail();
      tick();
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-btn'));
      expect(retryButton).toBeTruthy();

      // Reset mock to success
      mockCategoryService.getCategoryDetail.and.returnValue(of(mockDetailResponse));

      retryButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      expect(mockCategoryService.getCategoryDetail).toHaveBeenCalledTimes(2);
      expect(categoryDetailComponent.error()).toBe(null);
    }));

    it('should handle generic error message', fakeAsync(() => {
      mockCategoryService.getCategoryDetail.and.returnValue(
        throwError(() => ({})) // Error without message
      );

      categoryDetailComponent.loadCategoryDetail();
      tick();
      fixture.detectChanges();

      expect(categoryDetailComponent.error()).toBe('Erro ao carregar detalhes da categoria');
    }));
  });

  describe('Loading State Integration', () => {
    it('should show loading spinner during data fetch', fakeAsync(() => {
      // Create a delayed observable to test loading state
      let resolvePromise: (value: any) => void;
      const delayedObservable = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockCategoryService.getCategoryDetail.and.returnValue(
        new Promise(resolve => setTimeout(() => resolve(of(mockDetailResponse)), 100)) as any
      );

      categoryDetailComponent.loadCategoryDetail();
      
      expect(categoryDetailComponent.loading()).toBe(true);

      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(loadingSpinner).toBeTruthy();

      tick(100);
      fixture.detectChanges();

      expect(categoryDetailComponent.loading()).toBe(false);
    }));

    it('should hide content while loading', fakeAsync(() => {
      categoryDetailComponent.loading.set(true);
      fixture.detectChanges();

      const categoryContent = fixture.debugElement.query(By.css('.category-content'));
      expect(categoryContent).toBeFalsy();

      categoryDetailComponent.loading.set(false);
      fixture.detectChanges();

      const categoryContentAfter = fixture.debugElement.query(By.css('.category-content'));
      expect(categoryContentAfter).toBeTruthy();
    }));
  });

  describe('Accessibility Integration', () => {
    beforeEach(fakeAsync(() => {
      tick();
      fixture.detectChanges();
    }));

    it('should have proper ARIA labels', () => {
      const ariaLabel = categoryDetailComponent.getAriaLabel();
      expect(ariaLabel).toContain('Detalhes da categoria Bebidas');
      expect(ariaLabel).toContain('Status: Ativa');
      expect(ariaLabel).toContain('3 produtos cadastrados');
    });

    it('should have proper heading structure', () => {
      const mainHeading = fixture.debugElement.query(By.css('h1'));
      const sectionHeadings = fixture.debugElement.queryAll(By.css('h2'));

      expect(mainHeading).toBeTruthy();
      expect(sectionHeadings.length).toBeGreaterThan(0);
    });

    it('should have proper button labels', () => {
      const editButton = fixture.debugElement.query(By.css('.edit-btn'));
      const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));

      expect(editButton?.nativeElement.getAttribute('aria-label')).toContain('Editar categoria');
      expect(deleteButton?.nativeElement.getAttribute('aria-label')).toContain('Excluir categoria');
    });

    it('should announce loading state to screen readers', fakeAsync(() => {
      categoryDetailComponent.loading.set(true);
      fixture.detectChanges();

      const loadingAnnouncement = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(loadingAnnouncement).toBeTruthy();
    }));
  });

  describe('Data Refresh Integration', () => {
    beforeEach(fakeAsync(() => {
      tick();
      fixture.detectChanges();
    }));

    it('should reload data when categoryId changes', fakeAsync(() => {
      expect(mockCategoryService.getCategoryDetail).toHaveBeenCalledTimes(1);

      hostComponent.categoryId = 2;
      fixture.detectChanges();

      categoryDetailComponent.categoryId = 2;
      categoryDetailComponent.ngOnInit();
      tick();

      expect(mockCategoryService.getCategoryDetail).toHaveBeenCalledWith(1, 2);
    }));

    it('should handle retry functionality', fakeAsync(() => {
      // First call fails
      mockCategoryService.getCategoryDetail.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );

      categoryDetailComponent.loadCategoryDetail();
      tick();
      fixture.detectChanges();

      expect(categoryDetailComponent.error()).toBe('Network error');

      // Second call succeeds
      mockCategoryService.getCategoryDetail.and.returnValue(of(mockDetailResponse));

      categoryDetailComponent.onRetry();
      tick();
      fixture.detectChanges();

      expect(categoryDetailComponent.error()).toBe(null);
      expect(categoryDetailComponent.category()).toEqual(mockCategory);
    }));
  });

  describe('Component Lifecycle Integration', () => {
    it('should cleanup subscriptions on destroy', () => {
      spyOn(categoryDetailComponent['destroy$'], 'next');
      spyOn(categoryDetailComponent['destroy$'], 'complete');

      fixture.destroy();

      expect(categoryDetailComponent['destroy$'].next).toHaveBeenCalled();
      expect(categoryDetailComponent['destroy$'].complete).toHaveBeenCalled();
    });

    it('should initialize signals with default values', () => {
      expect(categoryDetailComponent.category()).toBe(null);
      expect(categoryDetailComponent.products()).toEqual([]);
      expect(categoryDetailComponent.loading()).toBe(false);
      expect(categoryDetailComponent.error()).toBe(null);
    });
  });

  describe('TrackBy Functions Integration', () => {
    beforeEach(fakeAsync(() => {
      tick();
      fixture.detectChanges();
    }));

    it('should use trackBy function for product list performance', () => {
      const trackByResult = categoryDetailComponent.trackByProduct(0, mockProducts[0]);
      expect(trackByResult).toBe(mockProducts[0].id);
    });

    it('should optimize rendering with trackBy', fakeAsync(() => {
      const productElements = fixture.debugElement.queryAll(By.css('.product-item'));
      const initialCount = productElements.length;

      // Update products with same IDs but different data
      const updatedProducts = mockProducts.map(p => ({ ...p, nome: p.nome + ' Updated' }));
      categoryDetailComponent.products.set(updatedProducts);
      fixture.detectChanges();
      tick();

      const updatedElements = fixture.debugElement.queryAll(By.css('.product-item'));
      expect(updatedElements.length).toBe(initialCount);
    }));
  });
});
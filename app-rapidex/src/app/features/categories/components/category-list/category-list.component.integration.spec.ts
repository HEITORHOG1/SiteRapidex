import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, BehaviorSubject, throwError } from 'rxjs';

import { CategoryListComponent } from './category-list.component';
import { CategoryStateService } from '../../services/category-state.service';
import { CategorySearchService } from '../../services/category-search.service';
import { CategoryDeletionService } from '../../services/category-deletion.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Category, CategoryFilters, PaginationState } from '../../models/category.models';

// Test host component to test component integration
@Component({
  template: `
    <app-category-list
      (createCategory)="onCreateCategory()"
      (editCategory)="onEditCategory($event)"
      (viewCategoryDetails)="onViewCategoryDetails($event)"
      (deleteCategory)="onDeleteCategory($event)">
    </app-category-list>
  `
})
class TestHostComponent {
  createCategoryCalled = false;
  editCategoryData: Category | null = null;
  viewCategoryDetailsData: Category | null = null;
  deleteCategoryData: Category | null = null;

  onCreateCategory(): void {
    this.createCategoryCalled = true;
  }

  onEditCategory(category: Category): void {
    this.editCategoryData = category;
  }

  onViewCategoryDetails(category: Category): void {
    this.viewCategoryDetailsData = category;
  }

  onDeleteCategory(category: Category): void {
    this.deleteCategoryData = category;
  }
}

describe('CategoryListComponent Integration Tests', () => {
  let hostComponent: TestHostComponent;
  let categoryListComponent: CategoryListComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let router: Router;
  let location: Location;

  // Mock services
  let mockCategoryStateService: jasmine.SpyObj<CategoryStateService>;
  let mockCategorySearchService: jasmine.SpyObj<CategorySearchService>;
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
      descricao: 'Categoria de bebidas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-01'),
      dataAtualizacao: new Date('2024-01-01'),
      produtosCount: 5
    },
    {
      id: 2,
      nome: 'Pratos Principais',
      descricao: 'Categoria de pratos principais',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-02'),
      dataAtualizacao: new Date('2024-01-02'),
      produtosCount: 12
    },
    {
      id: 3,
      nome: 'Sobremesas',
      descricao: 'Categoria de sobremesas',
      estabelecimentoId: 1,
      ativo: false,
      dataCriacao: new Date('2024-01-03'),
      dataAtualizacao: new Date('2024-01-03'),
      produtosCount: 3
    }
  ];

  const mockPagination: PaginationState = {
    currentPage: 1,
    pageSize: 20,
    totalItems: 3,
    totalPages: 1
  };

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
      pagination$: new BehaviorSubject(mockPagination),
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
    mockCategoryDeletionService.getPendingUndos.and.returnValue(of([]));
    mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstablishment);

    await TestBed.configureTestingModule({
      imports: [
        CategoryListComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      declarations: [TestHostComponent],
      providers: [
        { provide: CategoryStateService, useValue: mockCategoryStateService },
        { provide: CategorySearchService, useValue: mockCategorySearchService },
        { provide: CategoryDeletionService, useValue: mockCategoryDeletionService },
        { provide: EstabelecimentoService, useValue: mockEstabelecimentoService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    
    // Get the CategoryListComponent instance
    const categoryListDebugElement = fixture.debugElement.query(By.directive(CategoryListComponent));
    categoryListComponent = categoryListDebugElement.componentInstance;

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create and initialize properly', () => {
      expect(hostComponent).toBeTruthy();
      expect(categoryListComponent).toBeTruthy();
    });

    it('should load categories when establishment is selected', fakeAsync(() => {
      // Trigger establishment selection
      (mockEstabelecimentoService.selectedEstabelecimento$ as BehaviorSubject<any>)
        .next(mockEstablishment);
      
      tick();
      fixture.detectChanges();

      expect(mockCategoryStateService.setEstablishmentContext).toHaveBeenCalledWith(1);
      expect(mockCategoryStateService.loadCategories).toHaveBeenCalledWith(1);
    }));

    it('should display categories when loaded', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const categoryCards = fixture.debugElement.queryAll(By.css('app-category-card'));
      expect(categoryCards.length).toBe(3);
    }));

    it('should display empty state when no categories', fakeAsync(() => {
      // Mock empty categories
      (mockCategorySearchService.filteredCategories$ as BehaviorSubject<Category[]>)
        .next([]);
      (mockCategoryStateService.hasCategories$ as BehaviorSubject<boolean>)
        .next(false);

      tick();
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
    }));
  });

  describe('Search and Filter Integration', () => {
    it('should update search when typing in search input', fakeAsync(() => {
      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      expect(searchInput).toBeTruthy();

      // Type in search input
      searchInput.nativeElement.value = 'Bebidas';
      searchInput.nativeElement.dispatchEvent(new Event('input'));

      tick(300); // Wait for debounce
      fixture.detectChanges();

      expect(mockCategorySearchService.updateSearchQuery).toHaveBeenCalledWith('Bebidas');
    }));

    it('should clear search when clear button is clicked', fakeAsync(() => {
      // First set a search term
      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      searchInput.nativeElement.value = 'test';
      searchInput.nativeElement.dispatchEvent(new Event('input'));

      tick(300);
      fixture.detectChanges();

      // Click clear button
      const clearButton = fixture.debugElement.query(By.css('.search-clear-btn'));
      if (clearButton) {
        clearButton.nativeElement.click();
        tick();
        fixture.detectChanges();

        expect(mockCategorySearchService.clearSearch).toHaveBeenCalled();
        expect(searchInput.nativeElement.value).toBe('');
      }
    }));

    it('should update filters when status filter changes', fakeAsync(() => {
      const statusFilter = fixture.debugElement.query(By.css('select[formControlName="statusFilter"]'));
      if (statusFilter) {
        statusFilter.nativeElement.value = 'true';
        statusFilter.nativeElement.dispatchEvent(new Event('change'));

        tick();
        fixture.detectChanges();

        expect(mockCategoryStateService.updateFilters).toHaveBeenCalledWith({ ativo: true });
      }
    }));

    it('should handle advanced search filters', fakeAsync(() => {
      const advancedSearchComponent = fixture.debugElement.query(By.css('app-advanced-search'));
      if (advancedSearchComponent) {
        const mockFilters = {
          search: 'test',
          ativo: true,
          sortBy: 'nome' as const,
          sortOrder: 'asc' as const
        };

        advancedSearchComponent.componentInstance.filtersChange.emit(mockFilters);
        tick();
        fixture.detectChanges();

        expect(categoryListComponent.searchControl.value).toBe('test');
        expect(categoryListComponent.statusFilterControl.value).toBe(true);
      }
    }));
  });

  describe('Category Actions Integration', () => {
    it('should emit createCategory event when create button is clicked', () => {
      const createButton = fixture.debugElement.query(By.css('.create-category-btn'));
      if (createButton) {
        createButton.nativeElement.click();
        fixture.detectChanges();

        expect(hostComponent.createCategoryCalled).toBe(true);
      }
    });

    it('should emit editCategory event when category card edit is clicked', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const categoryCard = fixture.debugElement.query(By.css('app-category-card'));
      if (categoryCard) {
        categoryCard.componentInstance.edit.emit(mockCategories[0]);
        fixture.detectChanges();

        expect(hostComponent.editCategoryData).toEqual(mockCategories[0]);
      }
    }));

    it('should emit viewCategoryDetails event when category card is clicked', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const categoryCard = fixture.debugElement.query(By.css('app-category-card'));
      if (categoryCard) {
        categoryCard.componentInstance.viewDetails.emit(mockCategories[0]);
        fixture.detectChanges();

        expect(hostComponent.viewCategoryDetailsData).toEqual(mockCategories[0]);
      }
    }));

    it('should show deletion modal when delete is requested', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const categoryCard = fixture.debugElement.query(By.css('app-category-card'));
      if (categoryCard) {
        categoryCard.componentInstance.delete.emit(mockCategories[0]);
        fixture.detectChanges();

        expect(categoryListComponent.showDeletionModal()).toBe(true);
        expect(categoryListComponent.categoryToDelete()).toEqual(mockCategories[0]);

        const deletionModal = fixture.debugElement.query(By.css('app-category-deletion-modal'));
        expect(deletionModal).toBeTruthy();
      }
    }));
  });

  describe('Pagination Integration', () => {
    it('should display pagination controls', fakeAsync(() => {
      // Mock pagination with multiple pages
      const multiPagePagination: PaginationState = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3
      };

      (mockCategoryStateService.pagination$ as BehaviorSubject<PaginationState>)
        .next(multiPagePagination);

      tick();
      fixture.detectChanges();

      const paginationControls = fixture.debugElement.query(By.css('.pagination'));
      expect(paginationControls).toBeTruthy();

      const pageButtons = fixture.debugElement.queryAll(By.css('.pagination__page'));
      expect(pageButtons.length).toBeGreaterThan(0);
    }));

    it('should navigate to different pages', fakeAsync(() => {
      const multiPagePagination: PaginationState = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3
      };

      (mockCategoryStateService.pagination$ as BehaviorSubject<PaginationState>)
        .next(multiPagePagination);

      tick();
      fixture.detectChanges();

      // Click on page 2
      categoryListComponent.goToPage(2);
      tick();

      expect(mockCategoryStateService.updatePagination).toHaveBeenCalledWith({ currentPage: 2 });
    }));

    it('should change page size', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      categoryListComponent.changePageSize(50);
      tick();

      expect(mockCategoryStateService.updatePagination).toHaveBeenCalledWith({
        pageSize: 50,
        currentPage: 1
      });
    }));
  });

  describe('Bulk Operations Integration', () => {
    it('should handle category selection', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Select a category
      categoryListComponent.toggleCategorySelection(1);
      fixture.detectChanges();

      expect(categoryListComponent.isCategorySelected(1)).toBe(true);
      expect(categoryListComponent.showBulkActions()).toBe(true);
    }));

    it('should handle select all functionality', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      categoryListComponent.toggleSelectAll(mockCategories);
      fixture.detectChanges();

      expect(categoryListComponent.selectedCategories().size).toBe(3);
      expect(categoryListComponent.areAllCategoriesSelected(mockCategories)).toBe(true);
    }));

    it('should show bulk deletion modal', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Select categories
      categoryListComponent.toggleCategorySelection(1);
      categoryListComponent.toggleCategorySelection(2);
      fixture.detectChanges();

      // Trigger bulk delete
      categoryListComponent.bulkDeleteSelected();
      tick();
      fixture.detectChanges();

      expect(categoryListComponent.showBulkDeletionModal()).toBe(true);
      const bulkDeletionModal = fixture.debugElement.query(By.css('app-bulk-deletion-modal'));
      expect(bulkDeletionModal).toBeTruthy();
    }));
  });

  describe('View Mode Integration', () => {
    it('should toggle between grid and list view modes', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      expect(categoryListComponent.viewMode()).toBe('grid');

      categoryListComponent.toggleViewMode();
      fixture.detectChanges();

      expect(categoryListComponent.viewMode()).toBe('list');

      categoryListComponent.toggleViewMode();
      fixture.detectChanges();

      expect(categoryListComponent.viewMode()).toBe('grid');
    }));

    it('should persist view mode in localStorage', fakeAsync(() => {
      spyOn(localStorage, 'setItem');
      spyOn(localStorage, 'getItem').and.returnValue('list');

      tick();
      fixture.detectChanges();

      categoryListComponent.setViewMode('list');

      expect(localStorage.setItem).toHaveBeenCalledWith('category-list-view-mode', 'list');
    }));
  });

  describe('Error Handling Integration', () => {
    it('should display error state when loading fails', fakeAsync(() => {
      (mockCategoryStateService.error$ as BehaviorSubject<string | null>)
        .next('Failed to load categories');

      tick();
      fixture.detectChanges();

      const errorState = fixture.debugElement.query(By.css('.error-state'));
      expect(errorState).toBeTruthy();

      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage.nativeElement.textContent).toContain('Failed to load categories');
    }));

    it('should show retry button in error state', fakeAsync(() => {
      (mockCategoryStateService.error$ as BehaviorSubject<string | null>)
        .next('Network error');

      tick();
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-btn'));
      expect(retryButton).toBeTruthy();

      retryButton.nativeElement.click();
      fixture.detectChanges();

      expect(mockCategoryStateService.loadCategories).toHaveBeenCalled();
    }));
  });

  describe('Loading State Integration', () => {
    it('should display loading state', fakeAsync(() => {
      (mockCategoryStateService.loading$ as BehaviorSubject<boolean>)
        .next(true);

      tick();
      fixture.detectChanges();

      const loadingState = fixture.debugElement.query(By.css('.loading-state'));
      expect(loadingState).toBeTruthy();

      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(loadingSpinner).toBeTruthy();
    }));

    it('should hide loading state when data is loaded', fakeAsync(() => {
      // Start with loading
      (mockCategoryStateService.loading$ as BehaviorSubject<boolean>)
        .next(true);

      tick();
      fixture.detectChanges();

      let loadingState = fixture.debugElement.query(By.css('.loading-state'));
      expect(loadingState).toBeTruthy();

      // Stop loading
      (mockCategoryStateService.loading$ as BehaviorSubject<boolean>)
        .next(false);

      tick();
      fixture.detectChanges();

      loadingState = fixture.debugElement.query(By.css('.loading-state'));
      expect(loadingState).toBeFalsy();
    }));
  });

  describe('Keyboard Navigation Integration', () => {
    it('should handle global keyboard shortcuts', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Test Ctrl+F for search focus
      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      spyOn(searchInput.nativeElement, 'focus');

      const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
      document.dispatchEvent(event);

      tick();
      fixture.detectChanges();

      expect(searchInput.nativeElement.focus).toHaveBeenCalled();
    }));

    it('should handle refresh shortcut', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const event = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true });
      document.dispatchEvent(event);

      tick();
      fixture.detectChanges();

      expect(mockCategoryStateService.loadCategories).toHaveBeenCalled();
    }));
  });

  describe('Accessibility Integration', () => {
    it('should have proper ARIA labels', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const categoryList = fixture.debugElement.query(By.css('[role="main"]'));
      expect(categoryList).toBeTruthy();

      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      expect(searchInput.nativeElement.getAttribute('aria-label')).toBeTruthy();
    }));

    it('should announce actions to screen readers', fakeAsync(() => {
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');

      tick();
      fixture.detectChanges();

      categoryListComponent.toggleViewMode();

      expect(document.body.appendChild).toHaveBeenCalled();
    }));

    it('should have proper focus management', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
      spyOn(searchInput.nativeElement, 'focus');

      categoryListComponent.focusSearchInput();

      expect(searchInput.nativeElement.focus).toHaveBeenCalled();
    }));
  });

  describe('Data Flow Integration', () => {
    it('should properly handle establishment changes', fakeAsync(() => {
      const newEstablishment = {
        id: 2,
        nomeFantasia: 'New Restaurant',
        razaoSocial: 'New Restaurant LTDA'
      };

      (mockEstabelecimentoService.selectedEstabelecimento$ as BehaviorSubject<any>)
        .next(newEstablishment);

      tick();
      fixture.detectChanges();

      expect(mockCategoryStateService.setEstablishmentContext).toHaveBeenCalledWith(2);
      expect(mockCategoryStateService.loadCategories).toHaveBeenCalledWith(2);
    }));

    it('should handle service errors gracefully', fakeAsync(() => {
      mockCategoryStateService.loadCategories.and.returnValue(
        throwError(() => new Error('Service error'))
      );

      (mockCategoryStateService.error$ as BehaviorSubject<string | null>)
        .next('Service error');

      tick();
      fixture.detectChanges();

      const errorState = fixture.debugElement.query(By.css('.error-state'));
      expect(errorState).toBeTruthy();
    }));
  });

  describe('Component Lifecycle Integration', () => {
    it('should cleanup subscriptions on destroy', () => {
      spyOn(categoryListComponent['destroy$'], 'next');
      spyOn(categoryListComponent['destroy$'], 'complete');

      fixture.destroy();

      expect(categoryListComponent['destroy$'].next).toHaveBeenCalled();
      expect(categoryListComponent['destroy$'].complete).toHaveBeenCalled();
    });

    it('should initialize properly on component creation', fakeAsync(() => {
      // Component should be initialized by now
      tick();
      fixture.detectChanges();

      expect(categoryListComponent.viewMode()).toBeDefined();
      expect(categoryListComponent.selectedCategories()).toBeDefined();
      expect(categoryListComponent.currentPage()).toBeDefined();
    }));
  });
});
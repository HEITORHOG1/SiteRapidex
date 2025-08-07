import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { CategoryListComponent } from './category-list.component';
import { CategoryStateService } from '../../services/category-state.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { CategoryCardComponent } from '../category-card/category-card.component';
import { Category, CategoryFilters, PaginationState } from '../../models/category.models';
import { Estabelecimento } from '../../../../data-access/models/estabelecimento.models';

describe('CategoryListComponent', () => {
  let component: CategoryListComponent;
  let fixture: ComponentFixture<CategoryListComponent>;
  let categoryStateService: jasmine.SpyObj<CategoryStateService>;
  let estabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;

  // Mock data
  const mockEstablishment: Estabelecimento = {
    id: 1,
    usuarioId: 'user123',
    razaoSocial: 'Restaurante Teste Ltda',
    nomeFantasia: 'Restaurante Teste',
    cnpj: '12.345.678/0001-90',
    telefone: '(11) 99999-9999',
    endereco: 'Rua Teste, 123',
    status: true,
    cep: '01234-567',
    numero: '123',
    dataCadastro: '2024-01-01',
    latitude: -23.5505,
    longitude: -46.6333,
    raioEntregaKm: 5,
    taxaEntregaFixa: 5.00,
    descricao: 'Restaurante de teste'
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
      nome: 'Comidas',
      descricao: 'Categoria de comidas',
      estabelecimentoId: 1,
      ativo: false,
      dataCriacao: new Date('2024-01-02'),
      dataAtualizacao: new Date('2024-01-02'),
      produtosCount: 0
    }
  ];

  const mockPagination: PaginationState = {
    currentPage: 1,
    pageSize: 20,
    totalItems: 2,
    totalPages: 1
  };

  beforeEach(async () => {
    const categoryStateSpy = jasmine.createSpyObj('CategoryStateService', [
      'setEstablishmentContext',
      'loadCategories',
      'updateFilters',
      'updatePagination',
      'deleteCategory',
      'clearState'
    ], {
      filteredCategories$: of(mockCategories),
      loading$: of(false),
      error$: of(null),
      pagination$: of(mockPagination),
      hasCategories$: of(true)
    });

    const estabelecimentoSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ], {
      selectedEstabelecimento$: of(mockEstablishment)
    });

    await TestBed.configureTestingModule({
      imports: [
        CategoryListComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        CategoryCardComponent
      ],
      providers: [
        { provide: CategoryStateService, useValue: categoryStateSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoSpy }
      ]
    }).compileComponents();

    categoryStateService = TestBed.inject(CategoryStateService) as jasmine.SpyObj<CategoryStateService>;
    estabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    
    // Setup default return values
    categoryStateService.loadCategories.and.returnValue(of({
      categorias: mockCategories,
      total: 2,
      pagina: 1,
      totalPaginas: 1
    }));
    estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstablishment);

    fixture = TestBed.createComponent(CategoryListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.viewMode()).toBe('grid');
    expect(component.selectedCategories().size).toBe(0);
    expect(component.showBulkActions()).toBe(false);
    expect(component.searchControl.value).toBe('');
    expect(component.statusFilterControl.value).toBeNull();
    expect(component.sortByControl.value).toBe('nome');
    expect(component.sortOrderControl.value).toBe('asc');
  });

  it('should load categories on establishment selection', () => {
    fixture.detectChanges();

    expect(categoryStateService.setEstablishmentContext).toHaveBeenCalledWith(mockEstablishment.id);
    expect(categoryStateService.loadCategories).toHaveBeenCalledWith(mockEstablishment.id);
  });

  it('should display categories in grid mode', () => {
    component.viewMode.set('grid');
    fixture.detectChanges();

    const gridElement = fixture.debugElement.query(By.css('.category-list__grid--grid'));
    expect(gridElement).toBeTruthy();

    const categoryCards = fixture.debugElement.queryAll(By.css('app-category-card'));
    expect(categoryCards.length).toBe(mockCategories.length);
  });

  it('should display categories in list mode', () => {
    component.viewMode.set('list');
    fixture.detectChanges();

    const listElement = fixture.debugElement.query(By.css('.category-list__grid--list'));
    expect(listElement).toBeTruthy();

    const selectAllCheckbox = fixture.debugElement.query(By.css('.category-list__select-all input[type="checkbox"]'));
    expect(selectAllCheckbox).toBeTruthy();
  });

  it('should toggle view mode', () => {
    expect(component.viewMode()).toBe('grid');

    component.toggleViewMode();
    expect(component.viewMode()).toBe('list');

    component.toggleViewMode();
    expect(component.viewMode()).toBe('grid');
  });

  it('should handle search input changes', (done) => {
    fixture.detectChanges();

    component.searchControl.setValue('bebidas');

    setTimeout(() => {
      expect(categoryStateService.updateFilters).toHaveBeenCalledWith({ search: 'bebidas' });
      done();
    }, 350); // Wait for debounce
  });

  it('should handle status filter changes', () => {
    fixture.detectChanges();

    component.statusFilterControl.setValue(true);

    expect(categoryStateService.updateFilters).toHaveBeenCalledWith({ ativo: true });
  });

  it('should handle sort changes', () => {
    fixture.detectChanges();

    component.sortByControl.setValue('dataCriacao');
    component.sortOrderControl.setValue('desc');

    expect(categoryStateService.updateFilters).toHaveBeenCalledWith({ 
      sortBy: 'dataCriacao', 
      sortOrder: 'desc' 
    });
  });

  it('should clear all filters', () => {
    component.searchControl.setValue('test');
    component.statusFilterControl.setValue(true);
    component.sortByControl.setValue('dataCriacao');
    component.sortOrderControl.setValue('desc');

    component.clearAllFilters();

    expect(component.searchControl.value).toBe('');
    expect(component.statusFilterControl.value).toBeNull();
    expect(component.sortByControl.value).toBe('nome');
    expect(component.sortOrderControl.value).toBe('asc');
  });

  it('should handle category selection', () => {
    expect(component.selectedCategories().size).toBe(0);

    component.toggleCategorySelection(1);
    expect(component.selectedCategories().has(1)).toBe(true);
    expect(component.showBulkActions()).toBe(true);

    component.toggleCategorySelection(1);
    expect(component.selectedCategories().has(1)).toBe(false);
    expect(component.showBulkActions()).toBe(false);
  });

  it('should select all categories', () => {
    component.toggleSelectAll(mockCategories);

    expect(component.selectedCategories().has(1)).toBe(true);
    expect(component.selectedCategories().has(2)).toBe(true);
    expect(component.showBulkActions()).toBe(true);
  });

  it('should clear selection', () => {
    component.selectedCategories.set(new Set([1, 2]));
    expect(component.showBulkActions()).toBe(true);

    component.clearSelection();
    expect(component.selectedCategories().size).toBe(0);
    expect(component.showBulkActions()).toBe(false);
  });

  it('should handle pagination', () => {
    component.goToPage(2);
    expect(categoryStateService.updatePagination).toHaveBeenCalledWith({ currentPage: 2 });

    component.goToNextPage();
    expect(categoryStateService.updatePagination).toHaveBeenCalledWith({ currentPage: 2 });

    component.goToPreviousPage();
    expect(categoryStateService.updatePagination).toHaveBeenCalledWith({ currentPage: 0 });

    component.changePageSize(50);
    expect(categoryStateService.updatePagination).toHaveBeenCalledWith({ 
      pageSize: 50, 
      currentPage: 1 
    });
  });

  it('should handle category deletion', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    categoryStateService.deleteCategory.and.returnValue(of(undefined));

    component.onDeleteCategory(mockCategories[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(categoryStateService.deleteCategory).toHaveBeenCalledWith(1);
  });

  it('should not delete category when user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.onDeleteCategory(mockCategories[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(categoryStateService.deleteCategory).not.toHaveBeenCalled();
  });

  it('should show warning for categories with products', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    categoryStateService.deleteCategory.and.returnValue(of(undefined));

    const categoryWithProducts = { ...mockCategories[0], produtosCount: 5 };
    component.onDeleteCategory(categoryWithProducts);

    expect(window.confirm).toHaveBeenCalledWith(
      jasmine.stringContaining('Esta categoria possui 5 produto(s) associado(s)')
    );
  });

  it('should refresh categories', () => {
    component.refreshCategories();

    expect(categoryStateService.loadCategories).toHaveBeenCalledWith(mockEstablishment.id);
  });

  it('should display loading state', () => {
    // Mock loading state
    Object.defineProperty(categoryStateService, 'loading$', {
      value: of(true)
    });

    fixture.detectChanges();

    const loadingElement = fixture.debugElement.query(By.css('.category-list__loading'));
    expect(loadingElement).toBeTruthy();

    const loadingText = fixture.debugElement.query(By.css('.loading-spinner__text'));
    expect(loadingText.nativeElement.textContent.trim()).toBe('Carregando categorias...');
  });

  it('should display error state', () => {
    const errorMessage = 'Erro ao carregar categorias';
    
    // Mock error state
    Object.defineProperty(categoryStateService, 'error$', {
      value: of(errorMessage)
    });

    fixture.detectChanges();

    const errorElement = fixture.debugElement.query(By.css('.category-list__error'));
    expect(errorElement).toBeTruthy();

    const errorText = fixture.debugElement.query(By.css('.error-message__text'));
    expect(errorText.nativeElement.textContent.trim()).toBe(errorMessage);
  });

  it('should display empty state when no categories', () => {
    // Mock empty categories
    Object.defineProperty(categoryStateService, 'filteredCategories$', {
      value: of([])
    });

    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.category-list__empty'));
    expect(emptyState).toBeTruthy();

    const emptyTitle = fixture.debugElement.query(By.css('.empty-state__title'));
    expect(emptyTitle.nativeElement.textContent.trim()).toBe('Nenhuma categoria encontrada');
  });

  it('should handle keyboard shortcuts', () => {
    spyOn(component, 'refreshCategories');
    spyOn(component, 'onCreateCategory');
    spyOn(component, 'toggleViewMode');
    spyOn(component, 'clearSelection');

    fixture.detectChanges();

    // Simulate keyboard events
    const container = fixture.debugElement.query(By.css('.category-list'));
    
    // Ctrl+R for refresh
    container.nativeElement.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'r',
      ctrlKey: true
    }));
    expect(component.refreshCategories).toHaveBeenCalled();

    // Ctrl+N for new category
    container.nativeElement.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true
    }));
    expect(component.onCreateCategory).toHaveBeenCalled();

    // Ctrl+V for view mode toggle
    container.nativeElement.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'v',
      ctrlKey: true
    }));
    expect(component.toggleViewMode).toHaveBeenCalled();

    // Escape for clear selection
    container.nativeElement.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape'
    }));
    expect(component.clearSelection).toHaveBeenCalled();
  });

  it('should track categories by id', () => {
    const category = mockCategories[0];
    const trackResult = component.trackByCategory(0, category);
    expect(trackResult).toBe(category.id);
  });

  it('should generate correct pagination info', () => {
    component.currentPage.set(1);
    component.pageSize.set(20);
    component.totalItems.set(45);

    const info = component.getPaginationInfo();
    expect(info).toBe('Mostrando 1-20 de 45 categorias');
  });

  it('should generate page numbers correctly', () => {
    component.currentPage.set(5);
    component.totalPages.set(10);

    const pageNumbers = component.getPageNumbers();
    expect(pageNumbers).toContain(1); // First page
    expect(pageNumbers).toContain(5); // Current page
    expect(pageNumbers).toContain(10); // Last page
    expect(pageNumbers).toContain(-1); // Dots
  });

  it('should save view mode to localStorage', () => {
    spyOn(localStorage, 'setItem');

    component.setViewMode('list');

    expect(localStorage.setItem).toHaveBeenCalledWith('category-list-view-mode', 'list');
  });

  it('should handle bulk operations', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.selectedCategories.set(new Set([1, 2]));

    component.bulkDeleteSelected();
    expect(window.confirm).toHaveBeenCalledWith(
      'Tem certeza que deseja excluir 2 categoria(s) selecionada(s)?'
    );

    component.bulkToggleStatus(true);
    expect(window.confirm).toHaveBeenCalledWith(
      'Tem certeza que deseja ativar 2 categoria(s) selecionada(s)?'
    );
  });

  it('should handle component destruction', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
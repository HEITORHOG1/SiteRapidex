import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CategoryDetailComponent } from './category-detail.component';
import { CategoryHttpService } from '../../services/category-http.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { Category, ProductSummary } from '../../models/category.models';
import { CategoryDetailResponse } from '../../models/category-dto.models';

describe('CategoryDetailComponent', () => {
  let component: CategoryDetailComponent;
  let fixture: ComponentFixture<CategoryDetailComponent>;
  let mockCategoryService: jasmine.SpyObj<CategoryHttpService>;
  let mockEstabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas diversas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-01T10:00:00Z'),
    dataAtualizacao: new Date('2024-01-15T14:30:00Z'),
    produtosCount: 2
  };

  const mockProducts: ProductSummary[] = [
    { id: 1, nome: 'Coca-Cola', ativo: true },
    { id: 2, nome: 'Pepsi', ativo: false }
  ];

  const mockDetailResponse: CategoryDetailResponse = {
    categoria: mockCategory,
    produtos: mockProducts
  };

  beforeEach(async () => {
    const categoryServiceSpy = jasmine.createSpyObj('CategoryHttpService', [
      'getCategoryDetail'
    ]);
    const estabelecimentoServiceSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CategoryDetailComponent],
      providers: [
        { provide: CategoryHttpService, useValue: categoryServiceSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryDetailComponent);
    component = fixture.componentInstance;
    mockCategoryService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    mockEstabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Default setup
    mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue({ id: 1 } as any);
    mockCategoryService.getCategoryDetail.and.returnValue(of(mockDetailResponse));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should load category detail on init when categoryId is provided', () => {
      component.categoryId = 1;
      
      component.ngOnInit();
      
      expect(mockCategoryService.getCategoryDetail).toHaveBeenCalledWith(1, 1);
      expect(component.category()).toEqual(mockCategory);
      expect(component.products()).toEqual(mockProducts);
      expect(component.loading()).toBeFalse();
    });

    it('should not load category detail when categoryId is not provided', () => {
      component.ngOnInit();
      
      expect(mockCategoryService.getCategoryDetail).not.toHaveBeenCalled();
    });

    it('should handle error when no establishment is selected', () => {
      mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue(null);
      component.categoryId = 1;
      
      component.ngOnInit();
      
      expect(component.error()).toBe('Nenhum estabelecimento selecionado');
      expect(mockCategoryService.getCategoryDetail).not.toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    beforeEach(() => {
      component.categoryId = 1;
    });

    it('should set loading state during data fetch', () => {
      let resolvePromise: (value: CategoryDetailResponse) => void;
      const promise = new Promise<CategoryDetailResponse>(resolve => {
        resolvePromise = resolve;
      });
      mockCategoryService.getCategoryDetail.and.returnValue(promise as any);

      component.loadCategoryDetail();
      
      expect(component.loading()).toBeTrue();
      expect(component.error()).toBeNull();

      resolvePromise!(mockDetailResponse);
    });

    it('should handle successful data loading', () => {
      component.loadCategoryDetail();
      
      expect(component.category()).toEqual(mockCategory);
      expect(component.products()).toEqual(mockProducts);
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();
    });

    it('should handle loading error', () => {
      const errorMessage = 'Erro ao carregar categoria';
      mockCategoryService.getCategoryDetail.and.returnValue(
        throwError(() => ({ message: errorMessage }))
      );

      component.loadCategoryDetail();
      
      expect(component.error()).toBe(errorMessage);
      expect(component.loading()).toBeFalse();
      expect(component.category()).toBeNull();
    });

    it('should handle loading error with default message', () => {
      mockCategoryService.getCategoryDetail.and.returnValue(
        throwError(() => ({}))
      );

      component.loadCategoryDetail();
      
      expect(component.error()).toBe('Erro ao carregar detalhes da categoria');
      expect(component.loading()).toBeFalse();
    });
  });

  describe('Computed Properties', () => {
    beforeEach(() => {
      component.category.set(mockCategory);
      component.products.set(mockProducts);
    });

    it('should compute isActive correctly', () => {
      expect(component.isActive()).toBeTrue();
      
      component.category.set({ ...mockCategory, ativo: false });
      expect(component.isActive()).toBeFalse();
    });

    it('should compute hasProducts correctly', () => {
      expect(component.hasProducts()).toBeTrue();
      
      component.products.set([]);
      expect(component.hasProducts()).toBeFalse();
    });

    it('should compute productCount correctly', () => {
      expect(component.productCount()).toBe(2);
      
      component.products.set([mockProducts[0]]);
      expect(component.productCount()).toBe(1);
    });

    it('should compute canDelete correctly', () => {
      component.products.set([]);
      expect(component.canDelete()).toBeTrue();
      
      component.products.set(mockProducts);
      expect(component.canDelete()).toBeFalse();
    });

    it('should compute formatted dates correctly', () => {
      expect(component.createdDate()).toContain('01/01/2024');
      expect(component.updatedDate()).toContain('15/01/2024');
    });
  });

  describe('User Actions', () => {
    beforeEach(() => {
      component.category.set(mockCategory);
      component.showActions = true;
    });

    it('should emit edit event when onEdit is called', () => {
      spyOn(component.edit, 'emit');
      
      component.onEdit();
      
      expect(component.edit.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should not emit edit event when showActions is false', () => {
      component.showActions = false;
      spyOn(component.edit, 'emit');
      
      component.onEdit();
      
      expect(component.edit.emit).not.toHaveBeenCalled();
    });

    it('should emit delete event when onDelete is called and can delete', () => {
      component.products.set([]); // No products, can delete
      spyOn(component.delete, 'emit');
      
      component.onDelete();
      
      expect(component.delete.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should not emit delete event when cannot delete', () => {
      component.products.set(mockProducts); // Has products, cannot delete
      spyOn(component.delete, 'emit');
      
      component.onDelete();
      
      expect(component.delete.emit).not.toHaveBeenCalled();
    });

    it('should emit back event when onBack is called', () => {
      spyOn(component.back, 'emit');
      
      component.onBack();
      
      expect(component.back.emit).toHaveBeenCalled();
    });

    it('should call window.print when onPrint is called', () => {
      spyOn(window, 'print');
      
      component.onPrint();
      
      expect(window.print).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      component.category.set(mockCategory);
    });

    it('should navigate to category list', () => {
      component.navigateToList();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/categories/list']);
    });

    it('should navigate to edit page', () => {
      component.navigateToEdit();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/categories/edit', 1]);
    });

    it('should not navigate to edit when no category is set', () => {
      component.category.set(null);
      
      component.navigateToEdit();
      
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      component.category.set(mockCategory);
      component.products.set(mockProducts);
    });

    it('should return correct status text', () => {
      expect(component.getStatusText()).toBe('Ativa');
      
      component.category.set({ ...mockCategory, ativo: false });
      expect(component.getStatusText()).toBe('Inativa');
    });

    it('should return correct status class', () => {
      expect(component.getStatusClass()).toBe('status--active');
      
      component.category.set({ ...mockCategory, ativo: false });
      expect(component.getStatusClass()).toBe('status--inactive');
    });

    it('should return correct product count text', () => {
      expect(component.getProductCountText()).toBe('2 produtos cadastrados');
      
      component.products.set([mockProducts[0]]);
      expect(component.getProductCountText()).toBe('1 produto cadastrado');
      
      component.products.set([]);
      expect(component.getProductCountText()).toBe('Nenhum produto cadastrado');
    });

    it('should return correct ARIA label', () => {
      const ariaLabel = component.getAriaLabel();
      
      expect(ariaLabel).toContain('Detalhes da categoria Bebidas');
      expect(ariaLabel).toContain('Status: Ativa');
      expect(ariaLabel).toContain('2 produtos cadastrados');
      expect(ariaLabel).toContain('Descrição: Categoria de bebidas diversas');
    });

    it('should return loading ARIA label when no category', () => {
      component.category.set(null);
      
      expect(component.getAriaLabel()).toBe('Carregando detalhes da categoria...');
    });

    it('should track products by ID', () => {
      const product = mockProducts[0];
      
      expect(component.trackByProduct(0, product)).toBe(product.id);
    });
  });

  describe('Error Handling', () => {
    it('should retry loading on onRetry', () => {
      spyOn(component, 'loadCategoryDetail');
      
      component.onRetry();
      
      expect(component.loadCategoryDetail).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      component.category.set(mockCategory);
      component.products.set(mockProducts);
      fixture.detectChanges();
    });

    it('should have proper ARIA labels', () => {
      const compiled = fixture.nativeElement;
      const mainElement = compiled.querySelector('.category-detail');
      
      expect(mainElement.getAttribute('aria-label')).toContain('Detalhes da categoria');
    });

    it('should have proper heading structure', () => {
      const compiled = fixture.nativeElement;
      const h1 = compiled.querySelector('h1');
      const h2Elements = compiled.querySelectorAll('h2');
      
      expect(h1).toBeTruthy();
      expect(h1.textContent).toContain('Bebidas');
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('should have proper button labels', () => {
      const compiled = fixture.nativeElement;
      const editButton = compiled.querySelector('[aria-label*="Editar categoria"]');
      const deleteButton = compiled.querySelector('[aria-label*="Excluir categoria"]');
      
      expect(editButton).toBeTruthy();
      expect(deleteButton).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('should handle print mode correctly', () => {
      component.printMode = true;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const categoryDetail = compiled.querySelector('.category-detail');
      
      expect(categoryDetail.classList.contains('category-detail--print')).toBeTrue();
    });

    it('should show/hide breadcrumb based on showBreadcrumb input', () => {
      component.showBreadcrumb = false;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const breadcrumb = compiled.querySelector('.breadcrumb');
      
      expect(breadcrumb).toBeFalsy();
    });

    it('should show/hide actions based on showActions input', () => {
      component.showActions = false;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const actions = compiled.querySelector('.category-header__actions');
      
      expect(actions).toBeFalsy();
    });
  });
});
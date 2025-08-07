import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CategoryCardComponent } from './category-card.component';
import { Category } from '../../models/category.models';

describe('CategoryCardComponent', () => {
  let component: CategoryCardComponent;
  let fixture: ComponentFixture<CategoryCardComponent>;
  let debugElement: DebugElement;

  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria para bebidas diversas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-15'),
    dataAtualizacao: new Date('2024-01-20'),
    produtosCount: 5
  };

  const mockInactiveCategory: Category = {
    id: 2,
    nome: 'Categoria Inativa',
    descricao: 'Uma categoria desativada',
    estabelecimentoId: 1,
    ativo: false,
    dataCriacao: new Date('2024-01-10'),
    dataAtualizacao: new Date('2024-01-10'),
    produtosCount: 0
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryCardComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      component.category = mockCategory;
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.isLoading).toBe(false);
      expect(component.tabIndex).toBe(0);
      expect(component.showActions).toBe(true);
      expect(component.isFocused()).toBe(false);
    });
  });

  describe('Template Rendering', () => {
    beforeEach(() => {
      component.category = mockCategory;
      fixture.detectChanges();
    });

    it('should display category name', () => {
      const titleElement = debugElement.query(By.css('.category-card__title'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('Bebidas');
    });

    it('should display category description', () => {
      const descElement = debugElement.query(By.css('.category-card__description p'));
      expect(descElement.nativeElement.textContent.trim()).toBe('Categoria para bebidas diversas');
    });

    it('should display active status', () => {
      const statusElement = debugElement.query(By.css('.category-card__status'));
      expect(statusElement.nativeElement.textContent.trim()).toBe('Ativa');
      expect(statusElement.nativeElement).toHaveClass('status--active');
    });

    it('should display product count', () => {
      const productCountElement = debugElement.query(By.css('.category-card__product-count'));
      expect(productCountElement.nativeElement.textContent).toContain('5 produtos');
    });

    it('should display category ID', () => {
      const idElement = debugElement.query(By.css('.category-card__id'));
      expect(idElement.nativeElement.textContent.trim()).toBe('#1');
    });

    it('should show action buttons when showActions is true', () => {
      const actionButtons = debugElement.queryAll(By.css('.category-card__action-btn'));
      expect(actionButtons.length).toBe(3);
    });

    it('should hide action buttons when showActions is false', () => {
      component.showActions = false;
      fixture.detectChanges();
      
      const actionsContainer = debugElement.query(By.css('.category-card__actions'));
      expect(actionsContainer).toBeFalsy();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      component.isLoading = true;
      fixture.detectChanges();
    });

    it('should show skeleton when loading', () => {
      const skeleton = debugElement.query(By.css('.category-card__skeleton'));
      expect(skeleton).toBeTruthy();
    });

    it('should hide content when loading', () => {
      const content = debugElement.query(By.css('.category-card__content'));
      expect(content).toBeFalsy();
    });

    it('should have loading class', () => {
      const cardElement = debugElement.query(By.css('.category-card'));
      expect(cardElement.nativeElement).toHaveClass('category-card--loading');
    });
  });

  describe('Inactive Category', () => {
    beforeEach(() => {
      component.category = mockInactiveCategory;
      fixture.detectChanges();
    });

    it('should display inactive status', () => {
      const statusElement = debugElement.query(By.css('.category-card__status'));
      expect(statusElement.nativeElement.textContent.trim()).toBe('Inativa');
      expect(statusElement.nativeElement).toHaveClass('status--inactive');
    });

    it('should have inactive class', () => {
      const cardElement = debugElement.query(By.css('.category-card'));
      expect(cardElement.nativeElement).toHaveClass('category-card--inactive');
    });

    it('should show inactive overlay', () => {
      const overlay = debugElement.query(By.css('.category-card__inactive-overlay'));
      expect(overlay).toBeTruthy();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      component.category = mockCategory;
      fixture.detectChanges();
    });

    it('should emit viewDetails on card click', () => {
      spyOn(component.viewDetails, 'emit');
      
      const cardElement = debugElement.query(By.css('.category-card'));
      cardElement.nativeElement.click();
      
      expect(component.viewDetails.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should emit edit on edit button click', () => {
      spyOn(component.edit, 'emit');
      
      const editButton = debugElement.query(By.css('.category-card__action-btn--edit'));
      editButton.nativeElement.click();
      
      expect(component.edit.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should emit delete on delete button click', () => {
      spyOn(component.delete, 'emit');
      
      const deleteButton = debugElement.query(By.css('.category-card__action-btn--delete'));
      deleteButton.nativeElement.click();
      
      expect(component.delete.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should emit viewDetails on view button click', () => {
      spyOn(component.viewDetails, 'emit');
      
      const viewButton = debugElement.query(By.css('.category-card__action-btn--view'));
      viewButton.nativeElement.click();
      
      expect(component.viewDetails.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should not emit events when loading', () => {
      component.isLoading = true;
      fixture.detectChanges();
      
      spyOn(component.viewDetails, 'emit');
      spyOn(component.edit, 'emit');
      spyOn(component.delete, 'emit');
      
      // Try to trigger events - they should not be emitted
      component.onCardClick();
      component.onEdit(new Event('click'));
      component.onDelete(new Event('click'));
      
      expect(component.viewDetails.emit).not.toHaveBeenCalled();
      expect(component.edit.emit).not.toHaveBeenCalled();
      expect(component.delete.emit).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      component.category = mockCategory;
      fixture.detectChanges();
    });

    it('should handle Enter key to view details', () => {
      spyOn(component.viewDetails, 'emit');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onKeydown(event);
      
      expect(component.viewDetails.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should handle Space key to view details', () => {
      spyOn(component.viewDetails, 'emit');
      
      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');
      component.onKeydown(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.viewDetails.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should handle E key to edit', () => {
      spyOn(component.edit, 'emit');
      
      const event = new KeyboardEvent('keydown', { key: 'e' });
      spyOn(event, 'preventDefault');
      component.onKeydown(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.edit.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should handle Ctrl+Delete to delete', () => {
      spyOn(component.delete, 'emit');
      
      const event = new KeyboardEvent('keydown', { key: 'Delete', ctrlKey: true });
      spyOn(event, 'preventDefault');
      component.onKeydown(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.delete.emit).toHaveBeenCalledWith(mockCategory);
    });

    it('should not handle keyboard events when loading', () => {
      component.isLoading = true;
      spyOn(component.viewDetails, 'emit');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onKeydown(event);
      
      expect(component.viewDetails.emit).not.toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      component.category = mockCategory;
      fixture.detectChanges();
    });

    it('should set focused state on focus', () => {
      spyOn(component.focus, 'emit');
      
      component.onCardFocus();
      
      expect(component.isFocused()).toBe(true);
      expect(component.focus.emit).toHaveBeenCalled();
    });

    it('should clear focused state on blur', () => {
      component.isFocused.set(true);
      
      component.onCardBlur();
      
      expect(component.isFocused()).toBe(false);
    });

    it('should show focus indicator when focused', () => {
      component.isFocused.set(true);
      fixture.detectChanges();
      
      const focusIndicator = debugElement.query(By.css('.category-card__focus-indicator'));
      expect(focusIndicator).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      component.category = mockCategory;
      fixture.detectChanges();
    });

    it('should have proper ARIA label', () => {
      const cardElement = debugElement.query(By.css('.category-card'));
      const ariaLabel = cardElement.nativeElement.getAttribute('aria-label');
      
      expect(ariaLabel).toContain('Categoria Bebidas');
      expect(ariaLabel).toContain('Status: Ativa');
      expect(ariaLabel).toContain('5 produtos');
    });

    it('should have proper ARIA describedby', () => {
      const cardElement = debugElement.query(By.css('.category-card'));
      const describedBy = cardElement.nativeElement.getAttribute('aria-describedby');
      
      expect(describedBy).toContain('info-1');
      expect(describedBy).toContain('meta-1');
      expect(describedBy).toContain('desc-1');
    });

    it('should have proper role', () => {
      const cardElement = debugElement.query(By.css('.category-card'));
      expect(cardElement.nativeElement.getAttribute('role')).toBe('button');
    });

    it('should have proper tabindex', () => {
      const cardElement = debugElement.query(By.css('.category-card'));
      expect(cardElement.nativeElement.getAttribute('tabindex')).toBe('0');
    });

    it('should have screen reader only text for important information', () => {
      const srOnlyElements = debugElement.queryAll(By.css('.sr-only'));
      expect(srOnlyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      component.category = mockCategory;
    });

    it('should return correct status text for active category', () => {
      expect(component.getStatusText()).toBe('Ativa');
    });

    it('should return correct status text for inactive category', () => {
      component.category = mockInactiveCategory;
      expect(component.getStatusText()).toBe('Inativa');
    });

    it('should return correct status class for active category', () => {
      expect(component.getStatusClass()).toBe('status--active');
    });

    it('should return correct status class for inactive category', () => {
      component.category = mockInactiveCategory;
      expect(component.getStatusClass()).toBe('status--inactive');
    });

    it('should format product count correctly', () => {
      expect(component.getProdutoCountText()).toBe('5 produtos');
      
      component.category.produtosCount = 1;
      expect(component.getProdutoCountText()).toBe('1 produto');
      
      component.category.produtosCount = 0;
      expect(component.getProdutoCountText()).toBe('Nenhum produto');
    });

    it('should format dates correctly', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      expect(component.formatDate(today)).toBe('Hoje');
      expect(component.formatDate(yesterday)).toBe('Ontem');
      expect(component.formatDate(weekAgo)).toBe('2 dias atrás');
    });
  });

  describe('TrackBy Function', () => {
    it('should return category id for trackBy', () => {
      const result = CategoryCardComponent.trackByCategory(0, mockCategory);
      expect(result).toBe(mockCategory.id);
    });
  });

  describe('Error States', () => {
    it('should handle missing category gracefully', () => {
      component.category = null as any;
      fixture.detectChanges();
      
      expect(() => component.getStatusText()).not.toThrow();
      expect(() => component.getStatusClass()).not.toThrow();
    });

    it('should handle missing product count', () => {
      component.category = { ...mockCategory, produtosCount: undefined };
      fixture.detectChanges();
      
      expect(component.getProdutoCountText()).toBe('');
    });

    it('should handle missing description', () => {
      component.category = { ...mockCategory, descricao: '' };
      fixture.detectChanges();
      
      const descElement = debugElement.query(By.css('.category-card__description'));
      expect(descElement).toBeFalsy();
    });
  });
});
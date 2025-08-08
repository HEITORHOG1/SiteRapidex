import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CategoryCardComponent } from './category-card.component';
import { Category } from '../../models/category.models';

// Test host component
@Component({
  template: `
    <app-category-card
      [category]="category"
      [isLoading]="isLoading"
      [tabIndex]="tabIndex"
      [showActions]="showActions"
      (edit)="onEdit($event)"
      (delete)="onDelete($event)"
      (viewDetails)="onViewDetails($event)"
      (focus)="onFocus()">
    </app-category-card>
  `
})
class TestHostComponent {
  category: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas e sucos naturais',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-01T10:00:00Z'),
    dataAtualizacao: new Date('2024-01-15T14:30:00Z'),
    produtosCount: 5
  };
  
  isLoading = false;
  tabIndex = 0;
  showActions = true;

  editData: Category | null = null;
  deleteData: Category | null = null;
  viewDetailsData: Category | null = null;
  focusCalled = false;

  onEdit(category: Category): void {
    this.editData = category;
  }

  onDelete(category: Category): void {
    this.deleteData = category;
  }

  onViewDetails(category: Category): void {
    this.viewDetailsData = category;
  }

  onFocus(): void {
    this.focusCalled = true;
  }
}

describe('CategoryCardComponent Integration Tests', () => {
  let hostComponent: TestHostComponent;
  let categoryCardComponent: CategoryCardComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CategoryCardComponent,
        NoopAnimationsModule
      ],
      declarations: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    
    // Get the CategoryCardComponent instance
    const categoryCardDebugElement = fixture.debugElement.query(By.directive(CategoryCardComponent));
    categoryCardComponent = categoryCardDebugElement.componentInstance;

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create and initialize properly', () => {
      expect(hostComponent).toBeTruthy();
      expect(categoryCardComponent).toBeTruthy();
      expect(categoryCardComponent.category).toEqual(hostComponent.category);
    });

    it('should display category information', () => {
      const categoryName = fixture.debugElement.query(By.css('.category-name'));
      const categoryDescription = fixture.debugElement.query(By.css('.category-description'));
      const categoryStatus = fixture.debugElement.query(By.css('.category-status'));

      expect(categoryName?.nativeElement.textContent).toContain('Bebidas');
      expect(categoryDescription?.nativeElement.textContent).toContain('Categoria de bebidas e sucos naturais');
      expect(categoryStatus?.nativeElement.textContent).toContain('Ativa');
    });

    it('should display product count', () => {
      const productCount = fixture.debugElement.query(By.css('.product-count'));
      expect(productCount?.nativeElement.textContent).toContain('5 produtos');
    });

    it('should apply correct CSS classes based on category status', () => {
      const statusElement = fixture.debugElement.query(By.css('.category-status'));
      expect(statusElement?.nativeElement.classList).toContain('status--active');

      // Test inactive status
      hostComponent.category = { ...hostComponent.category, ativo: false };
      fixture.detectChanges();

      expect(statusElement?.nativeElement.classList).toContain('status--inactive');
    });
  });

  describe('Loading State Integration', () => {
    it('should display loading state', fakeAsync(() => {
      hostComponent.isLoading = true;
      fixture.detectChanges();
      tick();

      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner'));
      const categoryContent = fixture.debugElement.query(By.css('.category-content'));

      expect(loadingSpinner).toBeTruthy();
      expect(categoryContent).toBeFalsy();
    }));

    it('should disable interactions when loading', fakeAsync(() => {
      hostComponent.isLoading = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      expect(cardElement.nativeElement.classList).toContain('loading');

      // Try to click the card
      cardElement.nativeElement.click();
      fixture.detectChanges();

      expect(hostComponent.viewDetailsData).toBe(null);
    }));

    it('should show content when not loading', fakeAsync(() => {
      hostComponent.isLoading = false;
      fixture.detectChanges();
      tick();

      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner'));
      const categoryContent = fixture.debugElement.query(By.css('.category-content'));

      expect(loadingSpinner).toBeFalsy();
      expect(categoryContent).toBeTruthy();
    }));
  });

  describe('Action Buttons Integration', () => {
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

        expect(hostComponent.editData).toEqual(hostComponent.category);
      }
    });

    it('should emit delete event when delete button is clicked', () => {
      const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));
      if (deleteButton) {
        deleteButton.nativeElement.click();
        fixture.detectChanges();

        expect(hostComponent.deleteData).toEqual(hostComponent.category);
      }
    });

    it('should prevent event propagation on action buttons', () => {
      const editButton = fixture.debugElement.query(By.css('.edit-btn'));
      if (editButton) {
        const clickEvent = new Event('click');
        spyOn(clickEvent, 'stopPropagation');

        editButton.nativeElement.dispatchEvent(clickEvent);

        expect(clickEvent.stopPropagation).toHaveBeenCalled();
      }
    });
  });

  describe('Card Click Integration', () => {
    it('should emit viewDetails event when card is clicked', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      cardElement.nativeElement.click();
      fixture.detectChanges();

      expect(hostComponent.viewDetailsData).toEqual(hostComponent.category);
    });

    it('should not emit viewDetails when loading', fakeAsync(() => {
      hostComponent.isLoading = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      cardElement.nativeElement.click();
      fixture.detectChanges();

      expect(hostComponent.viewDetailsData).toBe(null);
    }));

    it('should handle view details button click', () => {
      const viewDetailsButton = fixture.debugElement.query(By.css('.view-details-btn'));
      if (viewDetailsButton) {
        viewDetailsButton.nativeElement.click();
        fixture.detectChanges();

        expect(hostComponent.viewDetailsData).toEqual(hostComponent.category);
      }
    });
  });

  describe('Focus Management Integration', () => {
    it('should emit focus event when card receives focus', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      cardElement.nativeElement.focus();
      cardElement.nativeElement.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      expect(hostComponent.focusCalled).toBe(true);
      expect(categoryCardComponent.isFocused()).toBe(true);
    });

    it('should update focus state on blur', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      
      // First focus
      cardElement.nativeElement.focus();
      cardElement.nativeElement.dispatchEvent(new Event('focus'));
      fixture.detectChanges();
      
      expect(categoryCardComponent.isFocused()).toBe(true);

      // Then blur
      cardElement.nativeElement.blur();
      cardElement.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(categoryCardComponent.isFocused()).toBe(false);
    });

    it('should apply focus styles when focused', fakeAsync(() => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      
      cardElement.nativeElement.focus();
      cardElement.nativeElement.dispatchEvent(new Event('focus'));
      fixture.detectChanges();
      tick();

      expect(cardElement.nativeElement.classList).toContain('focused');
    }));

    it('should set correct tabIndex', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      expect(cardElement.nativeElement.tabIndex).toBe(0);

      hostComponent.tabIndex = 5;
      fixture.detectChanges();

      expect(cardElement.nativeElement.tabIndex).toBe(5);
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('should handle Enter key to view details', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      
      cardElement.nativeElement.dispatchEvent(enterEvent);
      fixture.detectChanges();

      expect(hostComponent.viewDetailsData).toEqual(hostComponent.category);
    });

    it('should handle Space key to view details', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      
      cardElement.nativeElement.dispatchEvent(spaceEvent);
      fixture.detectChanges();

      expect(hostComponent.viewDetailsData).toEqual(hostComponent.category);
    });

    it('should handle E key for edit', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const eEvent = new KeyboardEvent('keydown', { key: 'e' });
      
      cardElement.nativeElement.dispatchEvent(eEvent);
      fixture.detectChanges();

      expect(hostComponent.editData).toEqual(hostComponent.category);
    });

    it('should handle Ctrl+Delete for delete', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', ctrlKey: true });
      
      cardElement.nativeElement.dispatchEvent(deleteEvent);
      fixture.detectChanges();

      expect(hostComponent.deleteData).toEqual(hostComponent.category);
    });

    it('should not handle keyboard events when loading', fakeAsync(() => {
      hostComponent.isLoading = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      
      cardElement.nativeElement.dispatchEvent(enterEvent);
      fixture.detectChanges();

      expect(hostComponent.viewDetailsData).toBe(null);
    }));

    it('should not interfere with browser shortcuts', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const ctrlEEvent = new KeyboardEvent('keydown', { key: 'e', ctrlKey: true });
      
      cardElement.nativeElement.dispatchEvent(ctrlEEvent);
      fixture.detectChanges();

      // Should not trigger edit action for Ctrl+E (browser shortcut)
      expect(hostComponent.editData).toBe(null);
    });
  });

  describe('Accessibility Integration', () => {
    it('should have proper ARIA label', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const ariaLabel = cardElement.nativeElement.getAttribute('aria-label');

      expect(ariaLabel).toContain('Categoria Bebidas');
      expect(ariaLabel).toContain('Status: Ativa');
      expect(ariaLabel).toContain('5 produtos');
      expect(ariaLabel).toContain('Pressione Enter ou Espaço para ver detalhes');
    });

    it('should have proper aria-describedby', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const ariaDescribedBy = cardElement.nativeElement.getAttribute('aria-describedby');

      expect(ariaDescribedBy).toContain(`info-${hostComponent.category.id}`);
      expect(ariaDescribedBy).toContain(`meta-${hostComponent.category.id}`);
      expect(ariaDescribedBy).toContain(`desc-${hostComponent.category.id}`);
    });

    it('should update ARIA label for loading state', fakeAsync(() => {
      hostComponent.isLoading = true;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const ariaLabel = cardElement.nativeElement.getAttribute('aria-label');

      expect(ariaLabel).toBe('Carregando categoria...');
    }));

    it('should have proper role attributes', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      expect(cardElement.nativeElement.getAttribute('role')).toBe('button');
    });

    it('should include keyboard instructions in ARIA label when actions are shown', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const ariaLabel = cardElement.nativeElement.getAttribute('aria-label');

      expect(ariaLabel).toContain('E para editar, Ctrl+Delete para excluir');
    });

    it('should not include action instructions when actions are hidden', fakeAsync(() => {
      hostComponent.showActions = false;
      fixture.detectChanges();
      tick();

      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const ariaLabel = cardElement.nativeElement.getAttribute('aria-label');

      expect(ariaLabel).not.toContain('E para editar');
      expect(ariaLabel).not.toContain('Ctrl+Delete para excluir');
    }));
  });

  describe('Data Display Integration', () => {
    it('should format dates correctly', () => {
      const formattedDate = categoryCardComponent.formatDate(new Date('2024-01-01'));
      expect(formattedDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should display relative dates for recent items', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      expect(categoryCardComponent.formatDate(today)).toBe('Hoje');
      expect(categoryCardComponent.formatDate(yesterday)).toBe('Ontem');
    });

    it('should display product count text correctly', () => {
      expect(categoryCardComponent.getProdutoCountText()).toBe('5 produtos');

      // Test with no products
      hostComponent.category = { ...hostComponent.category, produtosCount: 0 };
      fixture.detectChanges();
      expect(categoryCardComponent.getProdutoCountText()).toBe('Nenhum produto');

      // Test with one product
      hostComponent.category = { ...hostComponent.category, produtosCount: 1 };
      fixture.detectChanges();
      expect(categoryCardComponent.getProdutoCountText()).toBe('1 produto');

      // Test with undefined count
      hostComponent.category = { ...hostComponent.category, produtosCount: undefined };
      fixture.detectChanges();
      expect(categoryCardComponent.getProdutoCountText()).toBe('');
    });

    it('should display status text correctly', () => {
      expect(categoryCardComponent.getStatusText()).toBe('Ativa');

      hostComponent.category = { ...hostComponent.category, ativo: false };
      fixture.detectChanges();
      expect(categoryCardComponent.getStatusText()).toBe('Inativa');
    });

    it('should apply correct status CSS class', () => {
      expect(categoryCardComponent.getStatusClass()).toBe('status--active');

      hostComponent.category = { ...hostComponent.category, ativo: false };
      fixture.detectChanges();
      expect(categoryCardComponent.getStatusClass()).toBe('status--inactive');
    });
  });

  describe('Visual States Integration', () => {
    it('should apply hover effects', fakeAsync(() => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      
      cardElement.nativeElement.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();
      tick();

      expect(cardElement.nativeElement.classList).toContain('hovered');

      cardElement.nativeElement.dispatchEvent(new Event('mouseleave'));
      fixture.detectChanges();
      tick();

      expect(cardElement.nativeElement.classList).not.toContain('hovered');
    }));

    it('should show different styles for active/inactive categories', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      expect(cardElement.nativeElement.classList).toContain('active');

      hostComponent.category = { ...hostComponent.category, ativo: false };
      fixture.detectChanges();

      expect(cardElement.nativeElement.classList).toContain('inactive');
      expect(cardElement.nativeElement.classList).not.toContain('active');
    });

    it('should apply loading overlay correctly', fakeAsync(() => {
      hostComponent.isLoading = true;
      fixture.detectChanges();
      tick();

      const loadingOverlay = fixture.debugElement.query(By.css('.loading-overlay'));
      expect(loadingOverlay).toBeTruthy();
      expect(loadingOverlay.nativeElement.style.display).not.toBe('none');
    }));
  });

  describe('Performance Integration', () => {
    it('should use trackBy function for performance optimization', () => {
      const trackByResult = CategoryCardComponent.trackByCategory(0, hostComponent.category);
      expect(trackByResult).toBe(hostComponent.category.id);
    });

    it('should not re-render unnecessarily when same data is provided', fakeAsync(() => {
      const initialRenderCount = fixture.debugElement.queryAll(By.css('.category-card')).length;
      
      // Update with same data
      hostComponent.category = { ...hostComponent.category };
      fixture.detectChanges();
      tick();

      const afterUpdateCount = fixture.debugElement.queryAll(By.css('.category-card')).length;
      expect(afterUpdateCount).toBe(initialRenderCount);
    }));

    it('should handle rapid state changes efficiently', fakeAsync(() => {
      // Simulate rapid loading state changes
      for (let i = 0; i < 10; i++) {
        hostComponent.isLoading = i % 2 === 0;
        fixture.detectChanges();
      }
      
      tick();
      fixture.detectChanges();

      // Should end up in the final state
      expect(categoryCardComponent.isLoading).toBe(false);
    }));
  });

  describe('Edge Cases Integration', () => {
    it('should handle missing category data gracefully', fakeAsync(() => {
      hostComponent.category = null as any;
      fixture.detectChanges();
      tick();

      // Component should not crash
      expect(fixture.debugElement.query(By.css('.category-card'))).toBeTruthy();
    }));

    it('should handle very long category names', fakeAsync(() => {
      hostComponent.category = {
        ...hostComponent.category,
        nome: 'A'.repeat(200)
      };
      fixture.detectChanges();
      tick();

      const categoryName = fixture.debugElement.query(By.css('.category-name'));
      expect(categoryName?.nativeElement.textContent.length).toBeGreaterThan(0);
    }));

    it('should handle missing description', fakeAsync(() => {
      hostComponent.category = {
        ...hostComponent.category,
        descricao: ''
      };
      fixture.detectChanges();
      tick();

      const categoryDescription = fixture.debugElement.query(By.css('.category-description'));
      expect(categoryDescription?.nativeElement.textContent).toBe('');
    }));

    it('should handle invalid dates', () => {
      const invalidDate = new Date('invalid');
      const formattedDate = categoryCardComponent.formatDate(invalidDate);
      expect(formattedDate).toBe('');
    });
  });

  describe('Event Handling Integration', () => {
    it('should handle multiple rapid clicks gracefully', fakeAsync(() => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      
      // Simulate rapid clicks
      for (let i = 0; i < 5; i++) {
        cardElement.nativeElement.click();
      }
      
      fixture.detectChanges();
      tick();

      // Should only emit once per click
      expect(hostComponent.viewDetailsData).toEqual(hostComponent.category);
    }));

    it('should handle simultaneous keyboard and mouse events', fakeAsync(() => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      
      // Simulate simultaneous events
      cardElement.nativeElement.click();
      cardElement.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      
      fixture.detectChanges();
      tick();

      expect(hostComponent.viewDetailsData).toEqual(hostComponent.category);
    }));

    it('should prevent default behavior for keyboard events', () => {
      const cardElement = fixture.debugElement.query(By.css('.category-card'));
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(enterEvent, 'preventDefault');
      
      cardElement.nativeElement.dispatchEvent(enterEvent);
      
      expect(enterEvent.preventDefault).toHaveBeenCalled();
    });
  });
});
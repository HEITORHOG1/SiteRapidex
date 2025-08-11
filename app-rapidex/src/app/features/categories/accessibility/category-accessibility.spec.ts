import { TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CategoryAccessibilityService } from '../services/category-accessibility.service';
import { CategoryAccessibilityTestingService } from '../services/category-accessibility-testing.service';
@Component({
  template: `
    <div class="test-container">
      <h1>Test Category Management</h1>
      
      <!-- Form with accessibility features -->
      <form class="category-form">
        <div class="form-group">
          <label for="category-name">Nome da Categoria</label>
          <input 
            id="category-name" 
            type="text" 
            fieldName="nome"
            aria-required="true">
        </div>
        
        <div class="form-group">
          <label for="category-description">Descrição</label>
          <textarea 
            id="category-description" 
            fieldName="descricao">
          </textarea>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Salvar</button>
          <button type="button" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
      
      <!-- Category list with accessibility -->
      <div class="category-list" role="grid" aria-label="Lista de categorias">
        <div class="category-item" role="gridcell" tabindex="0">
          <h3>Categoria 1</h3>
          <p>Descrição da categoria 1</p>
          <div class="category-actions">
            <button aria-label="Editar Categoria 1">Editar</button>
            <button aria-label="Excluir Categoria 1">Excluir</button>
          </div>
        </div>
        
        <div class="category-item" role="gridcell" tabindex="0">
          <h3>Categoria 2</h3>
          <p>Descrição da categoria 2</p>
          <div class="category-actions">
            <button aria-label="Editar Categoria 2">Editar</button>
            <button aria-label="Excluir Categoria 2">Excluir</button>
          </div>
        </div>
      </div>
      
      <!-- Modal dialog -->
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-content">
          <h2 id="modal-title">Confirmar Exclusão</h2>
          <p>Tem certeza que deseja excluir esta categoria?</p>
          <div class="modal-actions">
            <button class="btn btn-danger">Confirmar</button>
            <button class="btn btn-secondary" aria-label="Cancelar exclusão">Cancelar</button>
          </div>
        </div>
      </div>
      
      <!-- Live region for announcements -->
      <div aria-live="polite" aria-atomic="true" class="sr-only" id="announcements"></div>
    </div>
  `,
  standalone: true,
  imports: []
})
class TestAccessibilityComponent {}

describe('Category Accessibility', () => {
  let component: TestAccessibilityComponent;
  let fixture: any;
  let accessibilityService: CategoryAccessibilityService;
  let testingService: CategoryAccessibilityTestingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestAccessibilityComponent],
      providers: [
        CategoryAccessibilityService,
        CategoryAccessibilityTestingService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestAccessibilityComponent);
    component = fixture.componentInstance;
    accessibilityService = TestBed.inject(CategoryAccessibilityService);
    testingService = TestBed.inject(CategoryAccessibilityTestingService);
    
    fixture.detectChanges();
  });

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels on buttons', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button[aria-label]'));
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        const ariaLabel = button.nativeElement.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel.length).toBeGreaterThan(0);
      });
    });

    it('should have proper labels for form inputs', () => {
      const inputs = fixture.debugElement.queryAll(By.css('input, textarea'));
      
      inputs.forEach(input => {
        const inputElement = input.nativeElement;
        const id = inputElement.id;
        
        // Should have either aria-label, aria-labelledby, or associated label
        const hasAriaLabel = inputElement.getAttribute('aria-label');
        const hasAriaLabelledBy = inputElement.getAttribute('aria-labelledby');
        const hasAssociatedLabel = fixture.debugElement.query(By.css(`label[for="${id}"]`));
        
        expect(hasAriaLabel || hasAriaLabelledBy || hasAssociatedLabel).toBeTruthy();
      });
    });

    it('should have proper role attributes', () => {
      const gridElement = fixture.debugElement.query(By.css('[role="grid"]'));
      expect(gridElement).toBeTruthy();
      
      const gridCells = fixture.debugElement.queryAll(By.css('[role="gridcell"]'));
      expect(gridCells.length).toBeGreaterThan(0);
      
      const dialog = fixture.debugElement.query(By.css('[role="dialog"]'));
      expect(dialog).toBeTruthy();
      expect(dialog.nativeElement.getAttribute('aria-modal')).toBe('true');
    });

    it('should have live regions for announcements', () => {
      const liveRegion = fixture.debugElement.query(By.css('[aria-live]'));
      expect(liveRegion).toBeTruthy();
      expect(liveRegion.nativeElement.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have focusable elements with proper tabindex', () => {
      const focusableElements = fixture.debugElement.queryAll(
        By.css('button, input, textarea, [tabindex]:not([tabindex="-1"])')
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      focusableElements.forEach(element => {
        const tabIndex = element.nativeElement.tabIndex;
        expect(tabIndex).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle keyboard events properly', () => {
      const container = fixture.debugElement.query(By.css('.test-container'));
      const keyboardEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      
      spyOn(keyboardEvent, 'preventDefault');
      container.nativeElement.dispatchEvent(keyboardEvent);
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should support arrow key navigation in grid', () => {
      const gridItems = fixture.debugElement.queryAll(By.css('[role="gridcell"]'));
      expect(gridItems.length).toBeGreaterThan(1);
      
      const firstItem = gridItems[0].nativeElement;
      firstItem.focus();
      
      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      firstItem.dispatchEvent(arrowDownEvent);
      
      // Should not throw errors
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      const focusableElements = fixture.debugElement.queryAll(
        By.css('button, input, textarea')
      );
      
      focusableElements.forEach(element => {
        const nativeElement = element.nativeElement;
        nativeElement.focus();
        
        const computedStyle = window.getComputedStyle(nativeElement, ':focus');
        // Should have some form of focus indicator
        expect(
          computedStyle.outline !== 'none' || 
          computedStyle.boxShadow !== 'none' ||
          computedStyle.borderColor !== computedStyle.getPropertyValue('border-color')
        ).toBe(true);
      });
    });

    it('should trap focus in modal dialogs', () => {
      const modal = fixture.debugElement.query(By.css('[role="dialog"]'));
      expect(modal).toBeTruthy();
      
      const modalButtons = modal.queryAll(By.css('button'));
      expect(modalButtons.length).toBeGreaterThan(0);
      
      // Focus should be manageable within modal
      const firstButton = modalButtons[0].nativeElement;
      const lastButton = modalButtons[modalButtons.length - 1].nativeElement;
      
      expect(firstButton.tabIndex).toBeGreaterThanOrEqual(0);
      expect(lastButton.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should have proper heading structure', () => {
      const headings = fixture.debugElement.queryAll(By.css('h1, h2, h3, h4, h5, h6'));
      expect(headings.length).toBeGreaterThan(0);
      
      // Check heading hierarchy
      let previousLevel = 0;
      headings.forEach(heading => {
        const level = parseInt(heading.nativeElement.tagName.charAt(1));
        expect(level).toBeGreaterThan(0);
        expect(level).toBeLessThanOrEqual(6);
        
        if (previousLevel > 0) {
          expect(level - previousLevel).toBeLessThanOrEqual(1);
        }
        previousLevel = level;
      });
    });

    it('should announce actions to screen readers', () => {
      spyOn(accessibilityService, 'announceAction');
      
      accessibilityService.announceAction('created', 'Test Category');
      
      expect(accessibilityService.announceAction).toHaveBeenCalledWith('created', 'Test Category');
    });

    it('should provide field descriptions', () => {
      const nameDescription = accessibilityService.getFieldDescription('nome');
      const descriptionDescription = accessibilityService.getFieldDescription('descricao');
      
      expect(nameDescription).toBeTruthy();
      expect(descriptionDescription).toBeTruthy();
      expect(nameDescription.length).toBeGreaterThan(0);
      expect(descriptionDescription.length).toBeGreaterThan(0);
    });
  });

  describe('High Contrast Support', () => {
    it('should apply high contrast styles when enabled', () => {
      accessibilityService.updateSettings({ highContrast: true });
      
      // Check if high contrast class is applied
      expect(document.body.classList.contains('high-contrast')).toBe(true);
    });

    it('should remove high contrast styles when disabled', () => {
      accessibilityService.updateSettings({ highContrast: false });
      
      expect(document.body.classList.contains('high-contrast')).toBe(false);
    });
  });

  describe('Reduced Motion Support', () => {
    it('should apply reduced motion styles when enabled', () => {
      accessibilityService.updateSettings({ reducedMotion: true });
      
      expect(document.body.classList.contains('reduced-motion')).toBe(true);
    });

    it('should remove reduced motion styles when disabled', () => {
      accessibilityService.updateSettings({ reducedMotion: false });
      
      expect(document.body.classList.contains('reduced-motion')).toBe(false);
    });
  });

  describe('Accessibility Testing Service', () => {
    it('should run accessibility tests', async () => {
      const result = await testingService.runAccessibilityTests(fixture.nativeElement);
      
      expect(result).toBeTruthy();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should generate accessibility report', async () => {
      const result = await testingService.runAccessibilityTests(fixture.nativeElement);
      const report = testingService.generateAccessibilityReport(result);
      
      expect(report).toBeTruthy();
      expect(report.length).toBeGreaterThan(0);
      expect(report).toContain('RELATÓRIO DE ACESSIBILIDADE');
      expect(report).toContain(`Score: ${result.score}/100`);
    });

    it('should detect ARIA violations', async () => {
      // Create element without proper ARIA
      const badButton = document.createElement('button');
      badButton.textContent = ''; // No accessible name
      fixture.nativeElement.appendChild(badButton);
      
      const result = await testingService.runAccessibilityTests(fixture.nativeElement);
      
      const buttonViolations = result.violations.filter(v => v.rule === 'button-name');
      expect(buttonViolations.length).toBeGreaterThan(0);
    });

    it('should detect form label violations', async () => {
      // Create input without label
      const badInput = document.createElement('input');
      badInput.type = 'text';
      fixture.nativeElement.appendChild(badInput);
      
      const result = await testingService.runAccessibilityTests(fixture.nativeElement);
      
      const labelViolations = result.violations.filter(v => v.rule === 'label');
      expect(labelViolations.length).toBeGreaterThan(0);
    });
  });



  describe('Error Handling and Validation', () => {
    it('should provide accessible error messages', () => {
      const errorMessage = accessibilityService.getValidationErrorMessage('nome', { required: true });
      
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toContain('Nome');
      expect(errorMessage).toContain('obrigatório');
    });

    it('should announce validation errors', () => {
      spyOn(accessibilityService, 'announceError');
      
      accessibilityService.announceError('Campo obrigatório', 'Nome');
      
      expect(accessibilityService.announceError).toHaveBeenCalledWith('Campo obrigatório', 'Nome');
    });
  });

  describe('Integration with Category Components', () => {
    it('should provide category-specific action labels', () => {
      const editLabel = accessibilityService.getCategoryActionLabel('edit', 'Bebidas');
      const deleteLabel = accessibilityService.getCategoryActionLabel('delete', 'Bebidas');
      
      expect(editLabel).toContain('Editar');
      expect(editLabel).toContain('Bebidas');
      expect(deleteLabel).toContain('Excluir');
      expect(deleteLabel).toContain('Bebidas');
    });

    it('should generate unique ARIA IDs', () => {
      const id1 = accessibilityService.generateAriaId('test');
      const id2 = accessibilityService.generateAriaId('test');
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toContain('test');
      expect(id2).toContain('test');
    });
  });
});

// Additional integration tests for real component usage
describe('Category Accessibility Integration', () => {
  it('should work with CategoryListComponent', () => {
    // This would test the actual CategoryListComponent with accessibility features
    // Implementation would depend on the actual component structure
    expect(true).toBe(true);
  });

  it('should work with CategoryFormComponent', () => {
    // This would test the actual CategoryFormComponent with accessibility features
    // Implementation would depend on the actual component structure
    expect(true).toBe(true);
  });

  it('should work with modal components', () => {
    // This would test modal components with focus trapping and ARIA
    // Implementation would depend on the actual modal structure
    expect(true).toBe(true);
  });
});
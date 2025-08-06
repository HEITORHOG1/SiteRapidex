import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EstabelecimentoSelectorComponent } from './estabelecimento-selector';
import { Estabelecimento } from '../../../data-access/models/estabelecimento.models';

describe('EstabelecimentoSelectorComponent - Accessibility', () => {
  let component: EstabelecimentoSelectorComponent;
  let fixture: ComponentFixture<EstabelecimentoSelectorComponent>;

  const mockEstabelecimentos: Estabelecimento[] = [
    {
      id: 1,
      nomeFantasia: 'Restaurante Teste 1',
      razaoSocial: 'Teste Ltda 1',
      cnpj: '12345678000195',
      endereco: 'Rua Teste, 123',
      numero: '123',
      cep: '12345-678',
      telefone: '11999999999',
      status: true,
      descricao: 'Restaurante de teste',
      raioEntregaKm: 5,
      taxaEntregaFixa: 5.00
    },
    {
      id: 2,
      nomeFantasia: 'Restaurante Teste 2',
      razaoSocial: 'Teste Ltda 2',
      cnpj: '12345678000196',
      endereco: 'Rua Teste, 456',
      numero: '456',
      cep: '12345-679',
      telefone: '11888888888',
      status: false,
      descricao: 'Segundo restaurante de teste',
      raioEntregaKm: 3,
      taxaEntregaFixa: 3.50
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstabelecimentoSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EstabelecimentoSelectorComponent);
    component = fixture.componentInstance;
    component.estabelecimentos = mockEstabelecimentos;
    fixture.detectChanges();
  });

  describe('ARIA Support', () => {
    it('should have proper ARIA labels on main container', () => {
      const container = fixture.debugElement.query(By.css('.estabelecimento-selector'));
      expect(container.nativeElement.getAttribute('role')).toBe('region');
      expect(container.nativeElement.getAttribute('aria-label')).toBe('Seleção de estabelecimento');
    });

    it('should have proper ARIA attributes on grid', () => {
      const grid = fixture.debugElement.query(By.css('.estabelecimento-selector__grid'));
      expect(grid.nativeElement.getAttribute('role')).toBe('grid');
      expect(grid.nativeElement.getAttribute('aria-labelledby')).toBe('selector-title');
      expect(grid.nativeElement.getAttribute('aria-describedby')).toBe('selector-description');
    });

    it('should have proper ARIA attributes on view toggle buttons', () => {
      const toggleButtons = fixture.debugElement.queryAll(By.css('.view-toggle__button'));
      
      toggleButtons.forEach(button => {
        expect(button.nativeElement.getAttribute('aria-pressed')).toBeDefined();
        expect(button.nativeElement.getAttribute('aria-label')).toBeDefined();
      });
    });

    it('should have proper ARIA live regions for loading and error states', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.estabelecimento-selector__loading'));
      expect(loadingElement.nativeElement.getAttribute('role')).toBe('status');
      expect(loadingElement.nativeElement.getAttribute('aria-live')).toBe('polite');
    });

    it('should have proper ARIA attributes on selection summary', () => {
      component.selectedEstabelecimento = mockEstabelecimentos[0];
      fixture.detectChanges();

      const summary = fixture.debugElement.query(By.css('.estabelecimento-selector__summary'));
      expect(summary.nativeElement.getAttribute('role')).toBe('status');
      expect(summary.nativeElement.getAttribute('aria-live')).toBe('polite');
      expect(summary.nativeElement.getAttribute('aria-label')).toBe('Resumo da seleção');
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      component.estabelecimentos = mockEstabelecimentos;
      fixture.detectChanges();
    });

    it('should handle arrow key navigation', () => {
      const grid = fixture.debugElement.query(By.css('.estabelecimento-selector__grid'));
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      
      spyOn(event, 'preventDefault');
      grid.nativeElement.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Enter key for selection', () => {
      spyOn(component, 'onEstabelecimentoSelect');
      const grid = fixture.debugElement.query(By.css('.estabelecimento-selector__grid'));
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      
      spyOn(event, 'preventDefault');
      grid.nativeElement.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Space key for selection', () => {
      spyOn(component, 'onEstabelecimentoSelect');
      const grid = fixture.debugElement.query(By.css('.estabelecimento-selector__grid'));
      const event = new KeyboardEvent('keydown', { key: ' ' });
      
      spyOn(event, 'preventDefault');
      grid.nativeElement.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Home and End keys', () => {
      const grid = fixture.debugElement.query(By.css('.estabelecimento-selector__grid'));
      
      // Test Home key
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      spyOn(homeEvent, 'preventDefault');
      grid.nativeElement.dispatchEvent(homeEvent);
      expect(homeEvent.preventDefault).toHaveBeenCalled();
      
      // Test End key
      const endEvent = new KeyboardEvent('keydown', { key: 'End' });
      spyOn(endEvent, 'preventDefault');
      grid.nativeElement.dispatchEvent(endEvent);
      expect(endEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should set proper tabindex for cards', () => {
      const firstCardTabIndex = component.getCardTabIndex(0);
      const secondCardTabIndex = component.getCardTabIndex(1);
      
      expect(firstCardTabIndex).toBe(0); // First card should be focusable
      expect(secondCardTabIndex).toBe(-1); // Other cards should not be in tab order
    });

    it('should update focused index on card focus', () => {
      component.onCardFocus(1);
      expect(component['focusedIndex']).toBe(1);
    });

    it('should calculate grid dimensions correctly', () => {
      component.viewMode = 'grid';
      expect(component.getColCount()).toBe(3);
      expect(component.getRowCount()).toBe(1); // 2 items in 3-column grid = 1 row
      
      component.viewMode = 'list';
      expect(component.getColCount()).toBe(1);
      expect(component.getRowCount()).toBe(2); // 2 items in list = 2 rows
    });

    it('should calculate row and column indices correctly', () => {
      component.viewMode = 'grid';
      
      expect(component.getRowIndex(0)).toBe(1); // First item, first row
      expect(component.getColIndex(0)).toBe(1); // First item, first column
      
      expect(component.getRowIndex(1)).toBe(1); // Second item, first row
      expect(component.getColIndex(1)).toBe(2); // Second item, second column
    });
  });

  describe('Screen Reader Support', () => {
    it('should have descriptive titles and labels', () => {
      const title = fixture.debugElement.query(By.css('.estabelecimento-selector__title'));
      expect(title.nativeElement.id).toBe('selector-title');
      
      const description = fixture.debugElement.query(By.css('.estabelecimento-selector__subtitle'));
      expect(description.nativeElement.id).toBe('selector-description');
    });

    it('should have proper aria-hidden attributes on decorative elements', () => {
      const icons = fixture.debugElement.queryAll(By.css('svg'));
      icons.forEach(icon => {
        expect(icon.nativeElement.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should provide meaningful button labels', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      buttons.forEach(button => {
        const ariaLabel = button.nativeElement.getAttribute('aria-label');
        const textContent = button.nativeElement.textContent?.trim();
        
        // Button should have either aria-label or meaningful text content
        expect(ariaLabel || textContent).toBeTruthy();
      });
    });
  });

  describe('Error State Accessibility', () => {
    it('should announce errors with proper ARIA live region', () => {
      component.error = 'Erro ao carregar estabelecimentos';
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('.estabelecimento-selector__error'));
      expect(errorElement.nativeElement.getAttribute('role')).toBe('alert');
      expect(errorElement.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('Empty State Accessibility', () => {
    it('should have proper accessibility attributes for empty state', () => {
      component.estabelecimentos = [];
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.estabelecimento-selector__empty'));
      expect(emptyState.nativeElement.getAttribute('role')).toBe('status');
      expect(emptyState.nativeElement.getAttribute('aria-live')).toBe('polite');
    });
  });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EstabelecimentoCardComponent } from './estabelecimento-card';
import { Estabelecimento } from '../../../data-access/models/estabelecimento.models';

describe('EstabelecimentoCardComponent - Accessibility', () => {
  let component: EstabelecimentoCardComponent;
  let fixture: ComponentFixture<EstabelecimentoCardComponent>;

  const mockEstabelecimento: Estabelecimento = {
    id: 1,
    nomeFantasia: 'Restaurante Teste',
    razaoSocial: 'Teste Ltda',
    cnpj: '12345678000195',
    endereco: 'Rua Teste, 123',
    numero: '123',
    cep: '12345-678',
    telefone: '11999999999',
    status: true,
    descricao: 'Restaurante de teste para verificar acessibilidade',
    raioEntregaKm: 5,
    taxaEntregaFixa: 5.00
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstabelecimentoCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EstabelecimentoCardComponent);
    component = fixture.componentInstance;
    component.estabelecimento = mockEstabelecimento;
    fixture.detectChanges();
  });

  describe('ARIA Support', () => {
    it('should have proper role and ARIA attributes', () => {
      const card = fixture.debugElement.query(By.css('.estabelecimento-card'));
      
      expect(card.nativeElement.getAttribute('role')).toBe('button');
      expect(card.nativeElement.getAttribute('aria-selected')).toBe('false');
      expect(card.nativeElement.getAttribute('aria-label')).toContain('Estabelecimento Restaurante Teste');
      expect(card.nativeElement.getAttribute('aria-describedby')).toBeDefined();
    });

    it('should update aria-selected when selected', () => {
      component.isSelected = true;
      fixture.detectChanges();

      const card = fixture.debugElement.query(By.css('.estabelecimento-card'));
      expect(card.nativeElement.getAttribute('aria-selected')).toBe('true');
    });

    it('should have proper aria-label with establishment details', () => {
      const ariaLabel = component.getAriaLabel();
      
      expect(ariaLabel).toContain('Estabelecimento Restaurante Teste');
      expect(ariaLabel).toContain('Status: Ativo');
      expect(ariaLabel).toContain('Endereço:');
      expect(ariaLabel).toContain('Telefone:');
      expect(ariaLabel).toContain('Pressione Enter ou Espaço para selecionar');
    });

    it('should have proper aria-describedby with element IDs', () => {
      const ariaDescribedBy = component.getAriaDescribedBy();
      
      expect(ariaDescribedBy).toContain(`info-${mockEstabelecimento.id}`);
      expect(ariaDescribedBy).toContain(`details-${mockEstabelecimento.id}`);
      expect(ariaDescribedBy).toContain(`meta-${mockEstabelecimento.id}`);
      expect(ariaDescribedBy).toContain(`desc-${mockEstabelecimento.id}`);
    });

    it('should have proper IDs on content elements', () => {
      const title = fixture.debugElement.query(By.css('.estabelecimento-card__title'));
      expect(title.nativeElement.id).toBe(`title-${mockEstabelecimento.id}`);

      const status = fixture.debugElement.query(By.css('.estabelecimento-card__status'));
      expect(status.nativeElement.id).toBe(`status-${mockEstabelecimento.id}`);

      const info = fixture.debugElement.query(By.css('.estabelecimento-card__info'));
      expect(info.nativeElement.id).toBe(`info-${mockEstabelecimento.id}`);

      const details = fixture.debugElement.query(By.css('.estabelecimento-card__details'));
      expect(details.nativeElement.id).toBe(`details-${mockEstabelecimento.id}`);
    });

    it('should have screen reader only text for context', () => {
      const srOnlyElements = fixture.debugElement.queryAll(By.css('.sr-only'));
      
      expect(srOnlyElements.length).toBeGreaterThan(0);
      
      const srTexts = srOnlyElements.map(el => el.nativeElement.textContent.trim());
      expect(srTexts).toContain('CNPJ:');
      expect(srTexts).toContain('Telefone:');
      expect(srTexts).toContain('Endereço:');
      expect(srTexts).toContain('Informações de entrega:');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key', () => {
      spyOn(component, 'onCardClick');
      const card = fixture.debugElement.query(By.css('.estabelecimento-card'));
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');
      
      card.nativeElement.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onCardClick).toHaveBeenCalled();
    });

    it('should handle Space key', () => {
      spyOn(component, 'onCardClick');
      const card = fixture.debugElement.query(By.css('.estabelecimento-card'));
      
      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');
      
      card.nativeElement.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onCardClick).toHaveBeenCalled();
    });

    it('should handle D key for details', () => {
      spyOn(component, 'onViewDetails');
      const card = fixture.debugElement.query(By.css('.estabelecimento-card'));
      
      const event = new KeyboardEvent('keydown', { key: 'd' });
      spyOn(event, 'preventDefault');
      
      card.nativeElement.dispatchEvent(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onViewDetails).toHaveBeenCalled();
    });

    it('should not interfere with browser shortcuts', () => {
      spyOn(component, 'onViewDetails');
      const card = fixture.debugElement.query(By.css('.estabelecimento-card'));
      
      const event = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true });
      spyOn(event, 'preventDefault');
      
      card.nativeElement.dispatchEvent(event);
      
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.onViewDetails).not.toHaveBeenCalled();
    });

    it('should have proper tabindex', () => {
      component.tabIndex = 0;
      fixture.detectChanges();
      
      const card = fixture.debugElement.query(By.css('.estabelecimento-card'));
      expect(card.nativeElement.tabIndex).toBe(0);
    });

    it('should remove details button from tab order', () => {
      const detailsBtn = fixture.debugElement.query(By.css('.estabelecimento-card__details-btn'));
      expect(detailsBtn.nativeElement.tabIndex).toBe(-1);
    });
  });

  describe('Focus Management', () => {
    it('should emit focus event when card receives focus', () => {
      spyOn(component.focus, 'emit');
      
      component.onCardFocus();
      
      expect(component.focus.emit).toHaveBeenCalled();
      expect(component.isFocused).toBe(true);
    });

    it('should update focus state on blur', () => {
      component.isFocused = true;
      
      component.onCardBlur();
      
      expect(component.isFocused).toBe(false);
    });

    it('should show focus indicator when focused', () => {
      component.isFocused = true;
      fixture.detectChanges();
      
      const focusIndicator = fixture.debugElement.query(By.css('.estabelecimento-card__focus-indicator'));
      expect(focusIndicator).toBeTruthy();
    });

    it('should have focused CSS class when focused', () => {
      component.isFocused = true;
      fixture.detectChanges();
      
      const card = fixture.debugElement.query(By.css('.estabelecimento-card'));
      expect(card.nativeElement.classList.contains('estabelecimento-card--focused')).toBe(true);
    });
  });

  describe('Loading State Accessibility', () => {
    it('should have proper aria-label when loading', () => {
      component.isLoading = true;
      
      const ariaLabel = component.getAriaLabel();
      expect(ariaLabel).toBe('Carregando estabelecimento...');
    });

    it('should not respond to interactions when loading', () => {
      component.isLoading = true;
      spyOn(component, 'onCardClick');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onKeydown(event);
      
      expect(component.onCardClick).not.toHaveBeenCalled();
    });
  });

  describe('Selection Indicator Accessibility', () => {
    it('should have proper accessibility attributes on selection indicator', () => {
      component.isSelected = true;
      fixture.detectChanges();
      
      const indicator = fixture.debugElement.query(By.css('.estabelecimento-card__selection-indicator'));
      expect(indicator.nativeElement.getAttribute('aria-hidden')).toBe('true');
      expect(indicator.nativeElement.getAttribute('role')).toBe('img');
      expect(indicator.nativeElement.getAttribute('aria-label')).toBe('Selecionado');
    });

    it('should use SVG icon instead of text for better accessibility', () => {
      component.isSelected = true;
      fixture.detectChanges();
      
      const indicator = fixture.debugElement.query(By.css('.estabelecimento-card__selection-indicator'));
      const svg = indicator.query(By.css('svg'));
      
      expect(svg).toBeTruthy();
    });
  });

  describe('Status Accessibility', () => {
    it('should have proper aria-label for status', () => {
      const status = fixture.debugElement.query(By.css('.estabelecimento-card__status'));
      expect(status.nativeElement.getAttribute('aria-label')).toBe('Status: Ativo');
    });

    it('should show inactive status correctly', () => {
      component.estabelecimento.status = false;
      fixture.detectChanges();
      
      const status = fixture.debugElement.query(By.css('.estabelecimento-card__status'));
      expect(status.nativeElement.getAttribute('aria-label')).toBe('Status: Inativo');
      expect(status.nativeElement.textContent.trim()).toBe('Inativo');
    });
  });

  describe('Details Button Accessibility', () => {
    it('should have descriptive aria-label', () => {
      const detailsBtn = fixture.debugElement.query(By.css('.estabelecimento-card__details-btn'));
      expect(detailsBtn.nativeElement.getAttribute('aria-label')).toBe('Ver detalhes de Restaurante Teste');
    });

    it('should stop event propagation when clicked', () => {
      spyOn(component, 'onViewDetails');
      const detailsBtn = fixture.debugElement.query(By.css('.estabelecimento-card__details-btn'));
      
      const event = new Event('click');
      spyOn(event, 'stopPropagation');
      
      detailsBtn.nativeElement.dispatchEvent(event);
      
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Decorative Elements', () => {
    it('should mark emoji icons as aria-hidden', () => {
      // Check that emoji icons in phone and address are marked as decorative
      const phoneSpan = fixture.debugElement.query(By.css('.estabelecimento-card__phone span[aria-hidden="true"]'));
      const addressSpan = fixture.debugElement.query(By.css('.estabelecimento-card__address span[aria-hidden="true"]'));
      
      expect(phoneSpan).toBeTruthy();
      expect(addressSpan).toBeTruthy();
    });
  });
});
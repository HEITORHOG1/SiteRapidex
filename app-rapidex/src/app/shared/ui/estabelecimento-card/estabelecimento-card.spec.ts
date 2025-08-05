import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { EstabelecimentoCardComponent } from './estabelecimento-card';
import { Estabelecimento } from '../../../data-access/models/estabelecimento.models';

describe('EstabelecimentoCardComponent', () => {
  let component: EstabelecimentoCardComponent;
  let fixture: ComponentFixture<EstabelecimentoCardComponent>;

  const mockEstabelecimento: Estabelecimento = {
    id: 1,
    usuarioId: 'user-123',
    razaoSocial: 'Empresa Teste LTDA',
    nomeFantasia: 'Restaurante Teste',
    cnpj: '12345678000195',
    telefone: '11987654321',
    endereco: 'Rua das Flores, 123',
    status: true,
    cep: '01234567',
    numero: '123',
    dataCadastro: '2024-01-01T00:00:00Z',
    latitude: -23.5505,
    longitude: -46.6333,
    raioEntregaKm: 5,
    taxaEntregaFixa: 8.50,
    descricao: 'Restaurante especializado em comida brasileira'
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Rendering', () => {
    it('should display establishment information correctly', () => {
      const titleElement = fixture.debugElement.query(By.css('.estabelecimento-card__title'));
      const razaoSocialElement = fixture.debugElement.query(By.css('.estabelecimento-card__razao-social'));
      const cnpjElement = fixture.debugElement.query(By.css('.estabelecimento-card__cnpj'));

      expect(titleElement.nativeElement.textContent.trim()).toBe('Restaurante Teste');
      expect(razaoSocialElement.nativeElement.textContent.trim()).toBe('Empresa Teste LTDA');
      expect(cnpjElement.nativeElement.textContent.trim()).toContain('12.345.678/0001-95');
    });

    it('should display status correctly for active establishment', () => {
      const statusElement = fixture.debugElement.query(By.css('.estabelecimento-card__status'));
      
      expect(statusElement.nativeElement.textContent.trim()).toBe('Ativo');
      expect(statusElement.nativeElement).toHaveClass('status--active');
    });

    it('should display status correctly for inactive establishment', () => {
      component.estabelecimento = { ...mockEstabelecimento, status: false };
      fixture.detectChanges();

      const statusElement = fixture.debugElement.query(By.css('.estabelecimento-card__status'));
      
      expect(statusElement.nativeElement.textContent.trim()).toBe('Inativo');
      expect(statusElement.nativeElement).toHaveClass('status--inactive');
    });

    it('should display formatted phone number', () => {
      const phoneElement = fixture.debugElement.query(By.css('.estabelecimento-card__phone'));
      
      expect(phoneElement.nativeElement.textContent).toContain('(11) 98765-4321');
    });

    it('should display formatted address', () => {
      const addressElement = fixture.debugElement.query(By.css('.estabelecimento-card__address'));
      
      expect(addressElement.nativeElement.textContent).toContain('Rua das Flores, 123, 123 - CEP: 01234567');
    });

    it('should display delivery information', () => {
      const deliveryInfoElement = fixture.debugElement.query(By.css('.estabelecimento-card__delivery-info'));
      
      expect(deliveryInfoElement.nativeElement.textContent).toContain('Entrega: 5km - R$ 8.50');
    });

    it('should display description when provided', () => {
      const descriptionElement = fixture.debugElement.query(By.css('.estabelecimento-card__description p'));
      
      expect(descriptionElement.nativeElement.textContent.trim()).toBe('Restaurante especializado em comida brasileira');
    });

    it('should hide description when not provided', () => {
      component.estabelecimento = { ...mockEstabelecimento, descricao: '' };
      fixture.detectChanges();

      const descriptionElement = fixture.debugElement.query(By.css('.estabelecimento-card__description'));
      
      expect(descriptionElement).toBeNull();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      component.isLoading = true;
      fixture.detectChanges();
    });

    it('should show skeleton when loading', () => {
      const skeletonElement = fixture.debugElement.query(By.css('.estabelecimento-card__skeleton'));
      const contentElement = fixture.debugElement.query(By.css('.estabelecimento-card__content'));

      expect(skeletonElement).toBeTruthy();
      expect(contentElement).toBeNull();
    });

    it('should add loading class to card', () => {
      const cardElement = fixture.debugElement.query(By.css('.estabelecimento-card'));
      
      expect(cardElement.nativeElement).toHaveClass('estabelecimento-card--loading');
    });

    it('should not emit events when loading', () => {
      spyOn(component.select, 'emit');
      spyOn(component.viewDetails, 'emit');

      const cardElement = fixture.debugElement.query(By.css('.estabelecimento-card'));
      cardElement.nativeElement.click();

      expect(component.select.emit).not.toHaveBeenCalled();
    });
  });

  describe('Selection State', () => {
    it('should show selection indicator when selected', () => {
      component.isSelected = true;
      fixture.detectChanges();

      const selectionIndicator = fixture.debugElement.query(By.css('.estabelecimento-card__selection-indicator'));
      const cardElement = fixture.debugElement.query(By.css('.estabelecimento-card'));

      expect(selectionIndicator).toBeTruthy();
      expect(cardElement.nativeElement).toHaveClass('estabelecimento-card--selected');
    });

    it('should not show selection indicator when not selected', () => {
      component.isSelected = false;
      fixture.detectChanges();

      const selectionIndicator = fixture.debugElement.query(By.css('.estabelecimento-card__selection-indicator'));
      
      expect(selectionIndicator).toBeNull();
    });

    it('should set aria-selected attribute correctly', () => {
      component.isSelected = true;
      fixture.detectChanges();

      const cardElement = fixture.debugElement.query(By.css('.estabelecimento-card'));
      
      expect(cardElement.nativeElement.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('User Interactions', () => {
    it('should emit select event when card is clicked', () => {
      spyOn(component.select, 'emit');

      const cardElement = fixture.debugElement.query(By.css('.estabelecimento-card'));
      cardElement.nativeElement.click();

      expect(component.select.emit).toHaveBeenCalledWith(mockEstabelecimento);
    });

    it('should emit select event when Enter key is pressed', () => {
      spyOn(component.select, 'emit');

      const cardElement = fixture.debugElement.query(By.css('.estabelecimento-card'));
      cardElement.triggerEventHandler('keydown.enter', {});

      expect(component.select.emit).toHaveBeenCalledWith(mockEstabelecimento);
    });

    it('should emit select event when Space key is pressed', () => {
      spyOn(component.select, 'emit');

      const cardElement = fixture.debugElement.query(By.css('.estabelecimento-card'));
      cardElement.triggerEventHandler('keydown.space', {});

      expect(component.select.emit).toHaveBeenCalledWith(mockEstabelecimento);
    });

    it('should emit viewDetails event when details button is clicked', () => {
      spyOn(component.viewDetails, 'emit');
      const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') };

      const detailsButton = fixture.debugElement.query(By.css('.estabelecimento-card__details-btn'));
      detailsButton.nativeElement.click();

      // Simulate the actual click event
      component.onViewDetails(mockEvent as any);

      expect(component.viewDetails.emit).toHaveBeenCalledWith(mockEstabelecimento);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should not emit events when loading', () => {
      component.isLoading = true;
      spyOn(component.select, 'emit');
      spyOn(component.viewDetails, 'emit');

      component.onCardClick();
      component.onViewDetails({ stopPropagation: () => {} } as any);

      expect(component.select.emit).not.toHaveBeenCalled();
      expect(component.viewDetails.emit).not.toHaveBeenCalled();
    });
  });

  describe('Formatting Methods', () => {
    it('should format CNPJ correctly', () => {
      const formattedCnpj = component.formatCnpj();
      expect(formattedCnpj).toBe('12.345.678/0001-95');
    });

    it('should return original CNPJ if not 14 digits', () => {
      component.estabelecimento = { ...mockEstabelecimento, cnpj: '123456' };
      const formattedCnpj = component.formatCnpj();
      expect(formattedCnpj).toBe('123456');
    });

    it('should format 11-digit phone number correctly', () => {
      const formattedPhone = component.formatPhone();
      expect(formattedPhone).toBe('(11) 98765-4321');
    });

    it('should format 10-digit phone number correctly', () => {
      component.estabelecimento = { ...mockEstabelecimento, telefone: '1134567890' };
      const formattedPhone = component.formatPhone();
      expect(formattedPhone).toBe('(11) 3456-7890');
    });

    it('should return original phone if not standard format', () => {
      component.estabelecimento = { ...mockEstabelecimento, telefone: '123' };
      const formattedPhone = component.formatPhone();
      expect(formattedPhone).toBe('123');
    });

    it('should format address correctly', () => {
      const formattedAddress = component.formatAddress();
      expect(formattedAddress).toBe('Rua das Flores, 123, 123 - CEP: 01234567');
    });

    it('should return empty string if no establishment', () => {
      component.estabelecimento = null as any;
      const formattedAddress = component.formatAddress();
      expect(formattedAddress).toBe('');
    });

    it('should get correct status text and class for active establishment', () => {
      expect(component.getStatusText()).toBe('Ativo');
      expect(component.getStatusClass()).toBe('status--active');
    });

    it('should get correct status text and class for inactive establishment', () => {
      component.estabelecimento = { ...mockEstabelecimento, status: false };
      expect(component.getStatusText()).toBe('Inativo');
      expect(component.getStatusClass()).toBe('status--inactive');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const cardElement = fixture.debugElement.query(By.css('.estabelecimento-card'));
      
      expect(cardElement.nativeElement.getAttribute('role')).toBe('button');
      expect(cardElement.nativeElement.getAttribute('tabindex')).toBe('0');
      expect(cardElement.nativeElement.getAttribute('aria-label')).toContain('Estabelecimento Restaurante Teste');
    });

    it('should have proper ARIA label for details button', () => {
      const detailsButton = fixture.debugElement.query(By.css('.estabelecimento-card__details-btn'));
      
      expect(detailsButton.nativeElement.getAttribute('aria-label')).toBe('Ver detalhes de Restaurante Teste');
    });

    it('should have proper ARIA label for status', () => {
      const statusElement = fixture.debugElement.query(By.css('.estabelecimento-card__status'));
      
      expect(statusElement.nativeElement.getAttribute('aria-label')).toBe('Status: Ativo');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing phone number', () => {
      component.estabelecimento = { ...mockEstabelecimento, telefone: '' };
      fixture.detectChanges();

      const phoneElement = fixture.debugElement.query(By.css('.estabelecimento-card__phone'));
      expect(phoneElement).toBeNull();
    });

    it('should handle empty establishment data gracefully', () => {
      component.estabelecimento = {
        id: 0,
        usuarioId: '',
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        telefone: '',
        endereco: '',
        status: false,
        cep: '',
        numero: '',
        dataCadastro: '',
        latitude: 0,
        longitude: 0,
        raioEntregaKm: 0,
        taxaEntregaFixa: 0,
        descricao: ''
      };
      fixture.detectChanges();

      expect(component.formatPhone()).toBe('');
      expect(component.formatCnpj()).toBe('');
      expect(component.formatAddress()).toBe(', - CEP: ');
    });
  });
});
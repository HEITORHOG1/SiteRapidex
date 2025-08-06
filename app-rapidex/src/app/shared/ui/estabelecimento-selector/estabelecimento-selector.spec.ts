import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { EstabelecimentoSelectorComponent } from './estabelecimento-selector';
import { EstabelecimentoCardComponent } from '../estabelecimento-card/estabelecimento-card';
import { LoadingSpinnerComponent } from '../loading/loading';
import { ErrorMessageComponent } from '../error-message/error-message';
import { Estabelecimento } from '../../../data-access/models/estabelecimento.models';

describe('EstabelecimentoSelectorComponent', () => {
  let component: EstabelecimentoSelectorComponent;
  let fixture: ComponentFixture<EstabelecimentoSelectorComponent>;

  const mockEstabelecimentos: Estabelecimento[] = [
    {
      id: 1,
      usuarioId: 'user1',
      razaoSocial: 'Empresa 1 LTDA',
      nomeFantasia: 'Loja 1',
      cnpj: '12345678000195',
      telefone: '11999999999',
      endereco: 'Rua A, 123',
      status: true,
      cep: '01234-567',
      numero: '123',
      dataCadastro: '2024-01-01',
      latitude: -23.5505,
      longitude: -46.6333,
      raioEntregaKm: 5,
      taxaEntregaFixa: 5.00,
      descricao: 'Descrição da loja 1'
    },
    {
      id: 2,
      usuarioId: 'user1',
      razaoSocial: 'Empresa 2 LTDA',
      nomeFantasia: 'Loja 2',
      cnpj: '98765432000195',
      telefone: '11888888888',
      endereco: 'Rua B, 456',
      status: false,
      cep: '01234-890',
      numero: '456',
      dataCadastro: '2024-01-02',
      latitude: -23.5506,
      longitude: -46.6334,
      raioEntregaKm: 3,
      taxaEntregaFixa: 3.50,
      descricao: 'Descrição da loja 2'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EstabelecimentoSelectorComponent,
        EstabelecimentoCardComponent,
        LoadingSpinnerComponent,
        ErrorMessageComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EstabelecimentoSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Loading State', () => {
    it('should show loading component when isLoading is true', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('rx-loading-spinner'));
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.componentInstance.size).toBe('large');
      expect(loadingElement.componentInstance.message).toBe('Carregando estabelecimentos...');
    });

    it('should hide content when loading', () => {
      component.isLoading = true;
      component.estabelecimentos = mockEstabelecimentos;
      fixture.detectChanges();

      const contentElement = fixture.debugElement.query(By.css('.estabelecimento-selector__content'));
      expect(contentElement).toBeFalsy();
    });
  });

  describe('Error State', () => {
    it('should show error message when error is present', () => {
      component.error = 'Erro ao carregar estabelecimentos';
      component.isLoading = false;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('rx-error-message'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.componentInstance.message).toBe('Erro ao carregar estabelecimentos');
      expect(errorElement.componentInstance.type).toBe('error');
      expect(errorElement.componentInstance.showRetry).toBe(true);
    });

    it('should emit retry event when retry is clicked', () => {
      spyOn(component.retry, 'emit');
      component.error = 'Erro ao carregar';
      component.isLoading = false;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('rx-error-message'));
      errorElement.componentInstance.retry.emit();

      expect(component.retry.emit).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no estabelecimentos and not loading', () => {
      component.estabelecimentos = [];
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();

      const emptyStateElement = fixture.debugElement.query(By.css('.estabelecimento-selector__empty'));
      expect(emptyStateElement).toBeTruthy();

      const titleElement = fixture.debugElement.query(By.css('.empty-state__title'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('Nenhum estabelecimento encontrado');
    });

    it('should not show empty state when loading', () => {
      component.estabelecimentos = [];
      component.isLoading = true;
      fixture.detectChanges();

      const emptyStateElement = fixture.debugElement.query(By.css('.estabelecimento-selector__empty'));
      expect(emptyStateElement).toBeFalsy();
    });

    it('should not show empty state when there is an error', () => {
      component.estabelecimentos = [];
      component.error = 'Some error';
      component.isLoading = false;
      fixture.detectChanges();

      const emptyStateElement = fixture.debugElement.query(By.css('.estabelecimento-selector__empty'));
      expect(emptyStateElement).toBeFalsy();
    });
  });

  describe('Content State', () => {
    beforeEach(() => {
      component.estabelecimentos = mockEstabelecimentos;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();
    });

    it('should show content when estabelecimentos are available', () => {
      const contentElement = fixture.debugElement.query(By.css('.estabelecimento-selector__content'));
      expect(contentElement).toBeTruthy();
    });

    it('should display correct number of estabelecimento cards', () => {
      const cardElements = fixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      expect(cardElements.length).toBe(mockEstabelecimentos.length);
    });

    it('should pass correct props to estabelecimento cards', () => {
      const cardElements = fixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      
      cardElements.forEach((cardElement, index) => {
        const cardComponent = cardElement.componentInstance;
        expect(cardComponent.estabelecimento).toEqual(mockEstabelecimentos[index]);
        expect(cardComponent.isSelected).toBe(false);
        expect(cardComponent.isLoading).toBe(false);
      });
    });

    it('should show header with title and subtitle', () => {
      const titleElement = fixture.debugElement.query(By.css('.estabelecimento-selector__title'));
      const subtitleElement = fixture.debugElement.query(By.css('.estabelecimento-selector__subtitle'));

      expect(titleElement.nativeElement.textContent.trim()).toBe('Selecione um Estabelecimento');
      expect(subtitleElement.nativeElement.textContent.trim()).toBe('Escolha o estabelecimento que deseja gerenciar');
    });
  });

  describe('View Mode Toggle', () => {
    beforeEach(() => {
      component.estabelecimentos = mockEstabelecimentos;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();
    });

    it('should default to grid view', () => {
      expect(component.viewMode).toBe('grid');
      
      const gridElement = fixture.debugElement.query(By.css('.estabelecimento-selector__grid--grid'));
      expect(gridElement).toBeTruthy();
    });

    it('should toggle to list view when list button is clicked', () => {
      const listButton = fixture.debugElement.queryAll(By.css('.view-toggle__button'))[1];
      listButton.nativeElement.click();
      fixture.detectChanges();

      expect(component.viewMode).toBe('list');
      
      const listElement = fixture.debugElement.query(By.css('.estabelecimento-selector__grid--list'));
      expect(listElement).toBeTruthy();
    });

    it('should show active state on correct view toggle button', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.view-toggle__button'));
      
      // Grid button should be active by default
      expect(buttons[0].nativeElement.classList.contains('view-toggle__button--active')).toBe(true);
      expect(buttons[1].nativeElement.classList.contains('view-toggle__button--active')).toBe(false);

      // Click list button
      buttons[1].nativeElement.click();
      fixture.detectChanges();

      expect(buttons[0].nativeElement.classList.contains('view-toggle__button--active')).toBe(false);
      expect(buttons[1].nativeElement.classList.contains('view-toggle__button--active')).toBe(true);
    });
  });

  describe('Selection Logic', () => {
    beforeEach(() => {
      component.estabelecimentos = mockEstabelecimentos;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();
    });

    it('should emit estabelecimentoSelected when card is selected', () => {
      spyOn(component.estabelecimentoSelected, 'emit');
      
      const cardElement = fixture.debugElement.query(By.css('app-estabelecimento-card'));
      cardElement.componentInstance.select.emit(mockEstabelecimentos[0]);

      expect(component.estabelecimentoSelected.emit).toHaveBeenCalledWith(mockEstabelecimentos[0]);
    });

    it('should emit viewDetails when view details is triggered', () => {
      spyOn(component.viewDetails, 'emit');
      
      const cardElement = fixture.debugElement.query(By.css('app-estabelecimento-card'));
      cardElement.componentInstance.viewDetails.emit(mockEstabelecimentos[0]);

      expect(component.viewDetails.emit).toHaveBeenCalledWith(mockEstabelecimentos[0]);
    });

    it('should mark correct estabelecimento as selected', () => {
      component.selectedEstabelecimento = mockEstabelecimentos[0];
      fixture.detectChanges();

      const cardElements = fixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      
      expect(cardElements[0].componentInstance.isSelected).toBe(true);
      expect(cardElements[1].componentInstance.isSelected).toBe(false);
    });

    it('should show selection summary when estabelecimento is selected', () => {
      component.selectedEstabelecimento = mockEstabelecimentos[0];
      fixture.detectChanges();

      const summaryElement = fixture.debugElement.query(By.css('.estabelecimento-selector__summary'));
      expect(summaryElement).toBeTruthy();

      const nameElement = fixture.debugElement.query(By.css('.selection-summary__name'));
      expect(nameElement.nativeElement.textContent.trim()).toBe(mockEstabelecimentos[0].nomeFantasia);
    });

    it('should not show selection summary when no estabelecimento is selected', () => {
      component.selectedEstabelecimento = null;
      fixture.detectChanges();

      const summaryElement = fixture.debugElement.query(By.css('.estabelecimento-selector__summary'));
      expect(summaryElement).toBeFalsy();
    });
  });

  describe('TrackBy Function', () => {
    it('should return estabelecimento id for trackBy', () => {
      const result = component.trackByEstabelecimento(0, mockEstabelecimentos[0]);
      expect(result).toBe(mockEstabelecimentos[0].id);
    });
  });

  describe('Helper Methods', () => {
    it('should correctly identify if has estabelecimentos', () => {
      component.estabelecimentos = [];
      expect(component.hasEstabelecimentos).toBe(false);

      component.estabelecimentos = mockEstabelecimentos;
      expect(component.hasEstabelecimentos).toBe(true);

      component.estabelecimentos = null as any;
      expect(component.hasEstabelecimentos).toBe(false);
    });

    it('should correctly determine showEmptyState', () => {
      // Should show empty state
      component.isLoading = false;
      component.error = null;
      component.estabelecimentos = [];
      expect(component.showEmptyState).toBe(true);

      // Should not show when loading
      component.isLoading = true;
      expect(component.showEmptyState).toBe(false);

      // Should not show when error
      component.isLoading = false;
      component.error = 'Error';
      expect(component.showEmptyState).toBe(false);

      // Should not show when has estabelecimentos
      component.error = null;
      component.estabelecimentos = mockEstabelecimentos;
      expect(component.showEmptyState).toBe(false);
    });

    it('should correctly determine showError', () => {
      // Should show error
      component.isLoading = false;
      component.error = 'Some error';
      expect(component.showError).toBe(true);

      // Should not show when loading
      component.isLoading = true;
      expect(component.showError).toBe(false);

      // Should not show when no error
      component.isLoading = false;
      component.error = null;
      expect(component.showError).toBe(false);
    });

    it('should correctly determine showContent', () => {
      // Should show content
      component.isLoading = false;
      component.error = null;
      component.estabelecimentos = mockEstabelecimentos;
      expect(component.showContent).toBe(true);

      // Should not show when loading
      component.isLoading = true;
      expect(component.showContent).toBe(false);

      // Should not show when error
      component.isLoading = false;
      component.error = 'Error';
      expect(component.showContent).toBe(false);

      // Should not show when no estabelecimentos
      component.error = null;
      component.estabelecimentos = [];
      expect(component.showContent).toBe(false);
    });

    it('should correctly identify selected estabelecimento', () => {
      component.selectedEstabelecimento = mockEstabelecimentos[0];
      
      expect(component.isSelected(mockEstabelecimentos[0])).toBe(true);
      expect(component.isSelected(mockEstabelecimentos[1])).toBe(false);

      component.selectedEstabelecimento = null;
      expect(component.isSelected(mockEstabelecimentos[0])).toBe(false);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      component.estabelecimentos = mockEstabelecimentos;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();
    });

    it('should have proper aria-labels on view toggle buttons', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.view-toggle__button'));
      
      expect(buttons[0].nativeElement.getAttribute('aria-label')).toBe('Visualização em grade');
      expect(buttons[1].nativeElement.getAttribute('aria-label')).toBe('Visualização em lista');
    });

    it('should have proper button types', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      
      buttons.forEach(button => {
        expect(button.nativeElement.getAttribute('type')).toBe('button');
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle different error types correctly', () => {
      const errorTypes = [
        'Erro de rede',
        'Erro de autenticação',
        'Erro interno do servidor',
        'Dados inválidos'
      ];

      errorTypes.forEach(errorMessage => {
        component.error = errorMessage;
        component.isLoading = false;
        fixture.detectChanges();

        const errorElement = fixture.debugElement.query(By.css('rx-error-message'));
        expect(errorElement.componentInstance.message).toBe(errorMessage);
      });
    });

    it('should handle error state transitions correctly', () => {
      // Start with error
      component.error = 'Initial error';
      component.isLoading = false;
      fixture.detectChanges();

      expect(component.showError).toBe(true);

      // Clear error and start loading
      component.error = null;
      component.isLoading = true;
      fixture.detectChanges();

      expect(component.showError).toBe(false);
      expect(component.isLoading).toBe(true);

      // Complete loading with data
      component.isLoading = false;
      component.estabelecimentos = mockEstabelecimentos;
      fixture.detectChanges();

      expect(component.showContent).toBe(true);
    });

    it('should emit retry event multiple times', () => {
      spyOn(component.retry, 'emit');
      component.error = 'Network error';
      component.isLoading = false;
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('rx-error-message'));
      
      // Emit retry multiple times
      errorElement.componentInstance.retry.emit();
      errorElement.componentInstance.retry.emit();
      errorElement.componentInstance.retry.emit();

      expect(component.retry.emit).toHaveBeenCalledTimes(3);
    });
  });

  describe('Loading State Variations', () => {
    it('should show loading with different messages', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('rx-loading-spinner'));
      expect(loadingElement.componentInstance.message).toBe('Carregando estabelecimentos...');
    });

    it('should handle loading state with existing data', () => {
      // Start with data
      component.estabelecimentos = mockEstabelecimentos;
      component.isLoading = false;
      fixture.detectChanges();

      expect(component.showContent).toBe(true);

      // Start loading again (refresh)
      component.isLoading = true;
      fixture.detectChanges();

      expect(component.showContent).toBe(false);
      expect(component.isLoading).toBe(true);
    });

    it('should handle rapid loading state changes', () => {
      // Rapid state changes
      component.isLoading = true;
      fixture.detectChanges();
      
      component.isLoading = false;
      component.estabelecimentos = mockEstabelecimentos;
      fixture.detectChanges();
      
      component.isLoading = true;
      fixture.detectChanges();

      expect(component.showContent).toBe(false);
      expect(component.isLoading).toBe(true);
    });
  });

  describe('Selection State Management', () => {
    beforeEach(() => {
      component.estabelecimentos = mockEstabelecimentos;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();
    });

    it('should handle selection changes correctly', () => {
      // No selection initially
      expect(component.isSelected(mockEstabelecimentos[0])).toBe(false);
      expect(component.isSelected(mockEstabelecimentos[1])).toBe(false);

      // Select first
      component.selectedEstabelecimento = mockEstabelecimentos[0];
      fixture.detectChanges();

      expect(component.isSelected(mockEstabelecimentos[0])).toBe(true);
      expect(component.isSelected(mockEstabelecimentos[1])).toBe(false);

      // Change selection
      component.selectedEstabelecimento = mockEstabelecimentos[1];
      fixture.detectChanges();

      expect(component.isSelected(mockEstabelecimentos[0])).toBe(false);
      expect(component.isSelected(mockEstabelecimentos[1])).toBe(true);
    });

    it('should handle selection with null/undefined estabelecimento', () => {
      component.selectedEstabelecimento = mockEstabelecimentos[0];
      
      expect(component.isSelected(null as any)).toBe(false);
      expect(component.isSelected(undefined as any)).toBe(false);
    });

    it('should show selection summary with correct data', () => {
      component.selectedEstabelecimento = mockEstabelecimentos[0];
      fixture.detectChanges();

      const summaryElement = fixture.debugElement.query(By.css('.estabelecimento-selector__summary'));
      const nameElement = fixture.debugElement.query(By.css('.selection-summary__name'));
      const statusElement = fixture.debugElement.query(By.css('.selection-summary__status'));

      expect(summaryElement).toBeTruthy();
      expect(nameElement.nativeElement.textContent.trim()).toBe(mockEstabelecimentos[0].nomeFantasia);
      expect(statusElement.nativeElement.textContent.trim()).toContain('Ativo');
    });
  });

  describe('View Mode Functionality', () => {
    beforeEach(() => {
      component.estabelecimentos = mockEstabelecimentos;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();
    });

    it('should apply correct CSS classes for view modes', () => {
      // Grid mode
      component.viewMode = 'grid';
      fixture.detectChanges();

      let gridElement = fixture.debugElement.query(By.css('.estabelecimento-selector__grid'));
      expect(gridElement.nativeElement).toHaveClass('estabelecimento-selector__grid--grid');

      // List mode
      component.viewMode = 'list';
      fixture.detectChanges();

      gridElement = fixture.debugElement.query(By.css('.estabelecimento-selector__grid'));
      expect(gridElement.nativeElement).toHaveClass('estabelecimento-selector__grid--list');
    });

    it('should maintain view mode state across data changes', () => {
      // Set to list mode
      const listButton = fixture.debugElement.queryAll(By.css('.view-toggle__button'))[1];
      listButton.nativeElement.click();
      fixture.detectChanges();

      expect(component.viewMode).toBe('list');

      // Change data
      component.estabelecimentos = [...mockEstabelecimentos, mockEstabelecimentos[0]];
      fixture.detectChanges();

      // View mode should be preserved
      expect(component.viewMode).toBe('list');
    });

    it('should handle view toggle button accessibility', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.view-toggle__button'));
      
      buttons.forEach(button => {
        expect(button.nativeElement.getAttribute('type')).toBe('button');
        expect(button.nativeElement.getAttribute('aria-label')).toBeTruthy();
      });
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      component.estabelecimentos = mockEstabelecimentos;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();
    });

    it('should handle multiple rapid selections', () => {
      spyOn(component.estabelecimentoSelected, 'emit');
      
      const cardElements = fixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      
      // Rapid selections
      cardElements[0].componentInstance.select.emit(mockEstabelecimentos[0]);
      cardElements[1].componentInstance.select.emit(mockEstabelecimentos[1]);
      cardElements[0].componentInstance.select.emit(mockEstabelecimentos[0]);

      expect(component.estabelecimentoSelected.emit).toHaveBeenCalledTimes(3);
    });

    it('should handle view details for different estabelecimentos', () => {
      spyOn(component.viewDetails, 'emit');
      
      const cardElements = fixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      
      cardElements[0].componentInstance.viewDetails.emit(mockEstabelecimentos[0]);
      cardElements[1].componentInstance.viewDetails.emit(mockEstabelecimentos[1]);

      expect(component.viewDetails.emit).toHaveBeenCalledWith(mockEstabelecimentos[0]);
      expect(component.viewDetails.emit).toHaveBeenCalledWith(mockEstabelecimentos[1]);
    });
  });

  describe('Performance Optimizations', () => {
    it('should use trackBy function correctly', () => {
      const trackByResult1 = component.trackByEstabelecimento(0, mockEstabelecimentos[0]);
      const trackByResult2 = component.trackByEstabelecimento(1, mockEstabelecimentos[1]);

      expect(trackByResult1).toBe(mockEstabelecimentos[0].id);
      expect(trackByResult2).toBe(mockEstabelecimentos[1].id);
      expect(trackByResult1).not.toBe(trackByResult2);
    });

    it('should handle trackBy with duplicate IDs', () => {
      const duplicateEstabelecimento = { ...mockEstabelecimentos[0] };
      
      const trackByResult1 = component.trackByEstabelecimento(0, mockEstabelecimentos[0]);
      const trackByResult2 = component.trackByEstabelecimento(1, duplicateEstabelecimento);

      expect(trackByResult1).toBe(trackByResult2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null estabelecimentos array', () => {
      component.estabelecimentos = null as any;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();

      expect(component.hasEstabelecimentos).toBe(false);
      expect(component.showEmptyState).toBe(true);
    });

    it('should handle undefined selectedEstabelecimento in isSelected', () => {
      component.selectedEstabelecimento = undefined as any;
      
      expect(component.isSelected(mockEstabelecimentos[0])).toBe(false);
    });

    it('should handle empty string error', () => {
      component.error = '';
      component.isLoading = false;
      fixture.detectChanges();

      expect(component.showError).toBe(false);
    });

    it('should handle estabelecimentos with missing properties', () => {
      const incompleteEstabelecimento = {
        id: 3,
        nomeFantasia: 'Incomplete Store'
      } as Estabelecimento;

      component.estabelecimentos = [incompleteEstabelecimento];
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();

      const cardElement = fixture.debugElement.query(By.css('app-estabelecimento-card'));
      expect(cardElement).toBeTruthy();
      expect(cardElement.componentInstance.estabelecimento).toEqual(incompleteEstabelecimento);
    });

    it('should handle very large estabelecimentos arrays', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => ({
        ...mockEstabelecimentos[0],
        id: i + 1,
        nomeFantasia: `Store ${i + 1}`
      }));

      component.estabelecimentos = largeArray;
      component.isLoading = false;
      component.error = null;
      fixture.detectChanges();

      const cardElements = fixture.debugElement.queryAll(By.css('app-estabelecimento-card'));
      expect(cardElements.length).toBe(100);
    });
  });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { CategoryDeletionModalComponent, DeletionModalResult } from './category-deletion-modal.component';
import { CategoryDeletionService, DeletionImpactAnalysis } from '../../services/category-deletion.service';
import { Category } from '../../models/category.models';

describe('CategoryDeletionModalComponent', () => {
  let component: CategoryDeletionModalComponent;
  let fixture: ComponentFixture<CategoryDeletionModalComponent>;
  let categoryDeletionService: jasmine.SpyObj<CategoryDeletionService>;

  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-01'),
    dataAtualizacao: new Date('2024-01-01'),
    produtosCount: 5
  };

  const mockImpactAnalysis: DeletionImpactAnalysis = {
    category: mockCategory,
    canDelete: false,
    hasProducts: true,
    activeProductsCount: 3,
    inactiveProductsCount: 2,
    totalProductsCount: 5,
    suggestSoftDelete: true,
    alternativeCategories: [
      {
        id: 2,
        nome: 'Categoria Alternativa',
        descricao: 'Uma categoria alternativa',
        estabelecimentoId: 1,
        ativo: true,
        dataCriacao: new Date(),
        dataAtualizacao: new Date()
      }
    ],
    risks: ['5 produto(s) serão afetados', '3 produto(s) ativo(s) ficarão sem categoria'],
    recommendations: ['Considere mover os produtos para outra categoria antes da exclusão']
  };

  beforeEach(async () => {
    const deletionServiceSpy = jasmine.createSpyObj('CategoryDeletionService', [
      'validateDeletion'
    ]);

    await TestBed.configureTestingModule({
      imports: [CategoryDeletionModalComponent, ReactiveFormsModule],
      providers: [
        { provide: CategoryDeletionService, useValue: deletionServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryDeletionModalComponent);
    component = fixture.componentInstance;
    categoryDeletionService = TestBed.inject(CategoryDeletionService) as jasmine.SpyObj<CategoryDeletionService>;

    // Set required inputs
    component.category = mockCategory;
    component.estabelecimentoId = 1;
    component.isVisible = true;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    component.ngOnInit();
    
    expect(component.deletionForm).toBeDefined();
    expect(component.deletionForm.get('deletionType')?.value).toBe('soft');
    expect(component.deletionForm.get('moveProductsToCategory')?.value).toBeNull();
    expect(component.deletionForm.get('reason')?.value).toBe('');
    expect(component.deletionForm.get('confirmationText')?.value).toBe('');
  });

  it('should load impact analysis on init when visible', () => {
    categoryDeletionService.validateDeletion.and.returnValue(of(mockImpactAnalysis));
    
    component.ngOnInit();
    
    expect(categoryDeletionService.validateDeletion).toHaveBeenCalledWith(1, 1);
    expect(component.impactAnalysis()).toEqual(mockImpactAnalysis);
    expect(component.loading()).toBe(false);
    expect(component.currentStep()).toBe('options');
  });

  it('should handle impact analysis error', () => {
    const error = new Error('Analysis failed');
    categoryDeletionService.validateDeletion.and.returnValue(throwError(() => error));
    
    component.ngOnInit();
    
    expect(component.error()).toBe('Analysis failed');
    expect(component.loading()).toBe(false);
  });

  it('should set soft delete as default when hard delete is not allowed', () => {
    categoryDeletionService.validateDeletion.and.returnValue(of(mockImpactAnalysis));
    
    component.ngOnInit();
    
    expect(component.deletionForm.get('deletionType')?.value).toBe('soft');
  });

  it('should require product migration for hard delete with products', () => {
    categoryDeletionService.validateDeletion.and.returnValue(of({
      ...mockImpactAnalysis,
      canDelete: true
    }));
    
    component.ngOnInit();
    component.onDeletionTypeChange('hard');
    
    const moveProductsControl = component.deletionForm.get('moveProductsToCategory');
    expect(moveProductsControl?.hasError('required')).toBe(true);
  });

  it('should not require product migration for soft delete', () => {
    categoryDeletionService.validateDeletion.and.returnValue(of(mockImpactAnalysis));
    
    component.ngOnInit();
    component.onDeletionTypeChange('soft');
    
    const moveProductsControl = component.deletionForm.get('moveProductsToCategory');
    expect(moveProductsControl?.hasError('required')).toBeFalsy();
  });

  it('should navigate between steps correctly', () => {
    categoryDeletionService.validateDeletion.and.returnValue(of(mockImpactAnalysis));
    
    component.ngOnInit();
    
    // Should start at options step for categories with products
    expect(component.currentStep()).toBe('options');
    
    // Move to confirmation
    component.onNextStep();
    expect(component.currentStep()).toBe('confirmation');
    
    // Move back to options
    component.onPreviousStep();
    expect(component.currentStep()).toBe('options');
  });

  it('should generate correct confirmation text', () => {
    component.ngOnInit();
    
    // Test soft delete confirmation
    component.deletionForm.patchValue({ deletionType: 'soft' });
    expect(component.getConfirmationText()).toBe('DESATIVAR BEBIDAS');
    
    // Test hard delete confirmation
    component.deletionForm.patchValue({ deletionType: 'hard' });
    expect(component.getConfirmationText()).toBe('EXCLUIR BEBIDAS');
  });

  it('should validate confirmation text correctly', () => {
    component.ngOnInit();
    component.deletionForm.patchValue({ deletionType: 'soft' });
    
    // Invalid confirmation
    component.deletionForm.patchValue({ confirmationText: 'wrong text' });
    expect(component.isConfirmationValid()).toBe(false);
    
    // Valid confirmation
    component.deletionForm.patchValue({ confirmationText: 'DESATIVAR BEBIDAS' });
    expect(component.isConfirmationValid()).toBe(true);
  });

  it('should emit result on confirm', () => {
    spyOn(component.result, 'emit');
    
    categoryDeletionService.validateDeletion.and.returnValue(of(mockImpactAnalysis));
    component.ngOnInit();
    
    // Set up valid form
    component.deletionForm.patchValue({
      deletionType: 'soft',
      reason: 'Test reason',
      confirmationText: 'DESATIVAR BEBIDAS'
    });
    
    component.onConfirm();
    
    expect(component.result.emit).toHaveBeenCalledWith({
      confirmed: true,
      request: {
        categoryId: 1,
        deletionType: 'soft',
        reason: 'Test reason'
      }
    });
  });

  it('should emit cancel result on cancel', () => {
    spyOn(component.result, 'emit');
    spyOn(component.close, 'emit');
    
    component.onCancel();
    
    expect(component.result.emit).toHaveBeenCalledWith({ confirmed: false });
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should handle keyboard navigation', () => {
    spyOn(component, 'onCancel');
    spyOn(component, 'onConfirm');
    
    // Test Escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    spyOn(escapeEvent, 'preventDefault');
    component.onKeyDown(escapeEvent);
    
    expect(escapeEvent.preventDefault).toHaveBeenCalled();
    expect(component.onCancel).toHaveBeenCalled();
    
    // Test Ctrl+Enter when ready to confirm
    categoryDeletionService.validateDeletion.and.returnValue(of(mockImpactAnalysis));
    component.ngOnInit();
    component.currentStep.set('confirmation');
    component.deletionForm.patchValue({
      deletionType: 'soft',
      confirmationText: 'DESATIVAR BEBIDAS'
    });
    
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
    spyOn(enterEvent, 'preventDefault');
    component.onKeyDown(enterEvent);
    
    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(component.onConfirm).toHaveBeenCalled();
  });

  it('should calculate risk level correctly', () => {
    component.impactAnalysis.set(mockImpactAnalysis);
    
    // Medium risk (has products but not too many active)
    expect(component.getRiskLevelClass()).toBe('risk-level--medium');
    expect(component.getRiskLevelText()).toBe('Médio');
    
    // High risk (many active products)
    component.impactAnalysis.set({
      ...mockImpactAnalysis,
      activeProductsCount: 15
    });
    expect(component.getRiskLevelClass()).toBe('risk-level--high');
    expect(component.getRiskLevelText()).toBe('Alto');
    
    // Low risk (no products)
    component.impactAnalysis.set({
      ...mockImpactAnalysis,
      hasProducts: false,
      activeProductsCount: 0,
      totalProductsCount: 0
    });
    expect(component.getRiskLevelClass()).toBe('risk-level--low');
    expect(component.getRiskLevelText()).toBe('Baixo');
  });

  it('should show product migration options when appropriate', () => {
    categoryDeletionService.validateDeletion.and.returnValue(of({
      ...mockImpactAnalysis,
      canDelete: true
    }));
    
    component.ngOnInit();
    component.deletionForm.patchValue({ deletionType: 'hard' });
    
    expect(component.showProductMigration()).toBe(true);
    
    // Should not show for soft delete
    component.deletionForm.patchValue({ deletionType: 'soft' });
    expect(component.showProductMigration()).toBe(false);
  });

  it('should provide accessibility labels', () => {
    expect(component.getModalAriaLabel()).toBe('Confirmar exclusão da categoria Bebidas');
    
    component.currentStep.set('analysis');
    expect(component.getStepAriaLabel()).toContain('Passo 1 de 2');
    
    component.impactAnalysis.set(mockImpactAnalysis);
    component.currentStep.set('options');
    expect(component.getStepAriaLabel()).toContain('Passo 2 de 3');
  });
});
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { CategoryDeletionService, DeletionImpactAnalysis } from '../../services/category-deletion.service';
import { Category } from '../../models/category.models';
import { CategoryDeletionRequest } from '../../models/category-dto.models';

export interface DeletionModalResult {
  confirmed: boolean;
  request?: CategoryDeletionRequest;
}

@Component({
  selector: 'app-category-deletion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './category-deletion-modal.component.html',
  styleUrls: ['./category-deletion-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryDeletionModalComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private categoryDeletionService = inject(CategoryDeletionService);
  private destroy$ = new Subject<void>();

  @Input() category!: Category;
  @Input() estabelecimentoId!: number;
  @Input() isVisible: boolean = false;
  @Input() alternativeCategories: Category[] = [];

  @Output() result = new EventEmitter<DeletionModalResult>();
  @Output() close = new EventEmitter<void>();

  // Component state
  impactAnalysis = signal<DeletionImpactAnalysis | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  currentStep = signal<'analysis' | 'confirmation' | 'options'>('analysis');

  // Form
  deletionForm!: FormGroup;

  // Computed properties
  canProceed = computed(() => {
    const analysis = this.impactAnalysis();
    return analysis && (analysis.canDelete || this.deletionForm?.get('deletionType')?.value === 'soft');
  });

  showProductMigration = computed(() => {
    const analysis = this.impactAnalysis();
    const deletionType = this.deletionForm?.get('deletionType')?.value;
    return analysis && analysis.hasProducts && deletionType === 'hard' && analysis.alternativeCategories.length > 0;
  });

  ngOnInit(): void {
    this.initializeForm();
    if (this.isVisible && this.category) {
      this.loadImpactAnalysis();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.deletionForm = this.fb.group({
      deletionType: ['soft', Validators.required],
      moveProductsToCategory: [null],
      reason: [''],
      confirmationText: ['', Validators.required]
    });

    // Watch for deletion type changes
    this.deletionForm.get('deletionType')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(deletionType => {
      const moveProductsControl = this.deletionForm.get('moveProductsToCategory');
      
      if (deletionType === 'hard' && this.impactAnalysis()?.hasProducts) {
        moveProductsControl?.setValidators([Validators.required]);
      } else {
        moveProductsControl?.clearValidators();
      }
      
      moveProductsControl?.updateValueAndValidity();
    });
  }

  private loadImpactAnalysis(): void {
    if (!this.category || !this.estabelecimentoId) return;

    this.loading.set(true);
    this.error.set(null);

    this.categoryDeletionService.validateDeletion(this.estabelecimentoId, this.category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (analysis) => {
          this.impactAnalysis.set(analysis);
          this.loading.set(false);
          
          // Set default deletion type based on analysis
          if (analysis.suggestSoftDelete || !analysis.canDelete) {
            this.deletionForm.patchValue({ deletionType: 'soft' });
          }

          // Move to next step
          this.currentStep.set(analysis.hasProducts ? 'options' : 'confirmation');
        },
        error: (error) => {
          this.error.set(error.message || 'Erro ao analisar impacto da exclusão');
          this.loading.set(false);
        }
      });
  }

  onDeletionTypeChange(type: 'hard' | 'soft'): void {
    this.deletionForm.patchValue({ deletionType: type });
    
    // Clear confirmation text when changing type
    this.deletionForm.patchValue({ confirmationText: '' });
  }

  onNextStep(): void {
    const current = this.currentStep();
    
    if (current === 'analysis') {
      this.currentStep.set('options');
    } else if (current === 'options') {
      this.currentStep.set('confirmation');
    }
  }

  onPreviousStep(): void {
    const current = this.currentStep();
    
    if (current === 'confirmation') {
      const analysis = this.impactAnalysis();
      this.currentStep.set(analysis?.hasProducts ? 'options' : 'analysis');
    } else if (current === 'options') {
      this.currentStep.set('analysis');
    }
  }

  onConfirm(): void {
    if (!this.deletionForm.valid || !this.canProceed()) {
      return;
    }

    const formValue = this.deletionForm.value;
    const request: CategoryDeletionRequest = {
      categoryId: this.category.id,
      deletionType: formValue.deletionType,
      moveProductsToCategory: formValue.moveProductsToCategory || undefined,
      reason: formValue.reason || undefined
    };

    this.result.emit({
      confirmed: true,
      request
    });
  }

  onCancel(): void {
    this.result.emit({ confirmed: false });
    this.close.emit();
  }

  onClose(): void {
    this.close.emit();
  }

  // Template helper methods
  getConfirmationText(): string {
    const deletionType = this.deletionForm?.get('deletionType')?.value;
    const categoryName = this.category?.nome || '';
    
    if (deletionType === 'hard') {
      return `EXCLUIR ${categoryName.toUpperCase()}`;
    } else {
      return `DESATIVAR ${categoryName.toUpperCase()}`;
    }
  }

  getConfirmationPlaceholder(): string {
    return `Digite "${this.getConfirmationText()}" para confirmar`;
  }

  isConfirmationValid(): boolean {
    const confirmationText = this.deletionForm?.get('confirmationText')?.value || '';
    return confirmationText === this.getConfirmationText();
  }

  getDeletionTypeLabel(type: 'hard' | 'soft'): string {
    return type === 'hard' ? 'Exclusão Permanente' : 'Desativação';
  }

  getDeletionTypeDescription(type: 'hard' | 'soft'): string {
    if (type === 'hard') {
      return 'A categoria será removida permanentemente do sistema. Esta ação não pode ser desfeita após 5 minutos.';
    } else {
      return 'A categoria será desativada mas permanecerá no sistema. Pode ser reativada a qualquer momento.';
    }
  }

  getRiskLevelClass(): string {
    const analysis = this.impactAnalysis();
    if (!analysis) return 'risk-level--low';

    if (analysis.activeProductsCount > 10) {
      return 'risk-level--high';
    } else if (analysis.activeProductsCount > 0 || analysis.totalProductsCount > 5) {
      return 'risk-level--medium';
    } else {
      return 'risk-level--low';
    }
  }

  getRiskLevelText(): string {
    const analysis = this.impactAnalysis();
    if (!analysis) return 'Baixo';

    if (analysis.activeProductsCount > 10) {
      return 'Alto';
    } else if (analysis.activeProductsCount > 0 || analysis.totalProductsCount > 5) {
      return 'Médio';
    } else {
      return 'Baixo';
    }
  }

  getStepTitle(): string {
    const step = this.currentStep();
    
    switch (step) {
      case 'analysis':
        return 'Análise de Impacto';
      case 'options':
        return 'Opções de Exclusão';
      case 'confirmation':
        return 'Confirmação';
      default:
        return '';
    }
  }

  getStepDescription(): string {
    const step = this.currentStep();
    
    switch (step) {
      case 'analysis':
        return 'Analisando o impacto da exclusão desta categoria';
      case 'options':
        return 'Escolha como deseja proceder com a exclusão';
      case 'confirmation':
        return 'Confirme a exclusão digitando o texto solicitado';
      default:
        return '';
    }
  }

  // Accessibility helpers
  getModalAriaLabel(): string {
    return `Confirmar exclusão da categoria ${this.category?.nome || ''}`;
  }

  getStepAriaLabel(): string {
    const current = this.currentStep();
    const total = this.impactAnalysis()?.hasProducts ? 3 : 2;
    let stepNumber = 1;
    
    if (current === 'options') stepNumber = 2;
    else if (current === 'confirmation') stepNumber = this.impactAnalysis()?.hasProducts ? 3 : 2;
    
    return `Passo ${stepNumber} de ${total}: ${this.getStepTitle()}`;
  }

  // Keyboard navigation
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      if (this.canProceed() && this.currentStep() === 'confirmation') {
        this.onConfirm();
      }
    }
  }
}
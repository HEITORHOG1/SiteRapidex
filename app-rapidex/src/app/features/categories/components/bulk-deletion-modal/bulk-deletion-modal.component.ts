import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { CategoryDeletionService, DeletionImpactAnalysis } from '../../services/category-deletion.service';
import { Category } from '../../models/category.models';
import { BulkCategoryDeletionRequest } from '../../models/category-dto.models';

export interface BulkDeletionModalResult {
  confirmed: boolean;
  request?: BulkCategoryDeletionRequest;
}

@Component({
  selector: 'app-bulk-deletion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './bulk-deletion-modal.component.html',
  styleUrls: ['./bulk-deletion-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkDeletionModalComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private categoryDeletionService = inject(CategoryDeletionService);
  private destroy$ = new Subject<void>();

  @Input() categories: Category[] = [];
  @Input() estabelecimentoId!: number;
  @Input() isVisible: boolean = false;

  @Output() result = new EventEmitter<BulkDeletionModalResult>();
  @Output() close = new EventEmitter<void>();

  // Component state
  impactAnalyses = signal<DeletionImpactAnalysis[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  currentStep = signal<'analysis' | 'options' | 'confirmation'>('analysis');

  // Form
  bulkDeletionForm!: FormGroup;

  // Computed properties
  totalCategories = computed(() => this.categories.length);
  
  categoriesWithProducts = computed(() => 
    this.impactAnalyses().filter(analysis => analysis.hasProducts)
  );
  
  categoriesWithoutProducts = computed(() => 
    this.impactAnalyses().filter(analysis => !analysis.hasProducts)
  );
  
  totalAffectedProducts = computed(() => 
    this.impactAnalyses().reduce((sum, analysis) => sum + analysis.totalProductsCount, 0)
  );
  
  canHardDelete = computed(() => 
    this.impactAnalyses().every(analysis => analysis.canDelete)
  );
  
  highRiskCategories = computed(() => 
    this.impactAnalyses().filter(analysis => analysis.activeProductsCount > 5)
  );

  allAlternativeCategories = computed(() => {
    const alternatives = new Map<number, Category>();
    
    this.impactAnalyses().forEach(analysis => {
      analysis.alternativeCategories.forEach(cat => {
        if (!this.categories.some(selected => selected.id === cat.id)) {
          alternatives.set(cat.id, cat);
        }
      });
    });
    
    return Array.from(alternatives.values());
  });

  canProceed = computed(() => {
    const analyses = this.impactAnalyses();
    const deletionType = this.bulkDeletionForm?.get('deletionType')?.value;
    
    if (analyses.length === 0) return false;
    
    if (deletionType === 'hard') {
      return this.canHardDelete();
    }
    
    return true;
  });

  ngOnInit(): void {
    this.initializeForm();
    if (this.isVisible && this.categories.length > 0) {
      this.loadImpactAnalyses();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.bulkDeletionForm = this.fb.group({
      deletionType: ['soft', Validators.required],
      moveProductsToCategory: [null],
      reason: [''],
      confirmationText: ['', Validators.required]
    });

    // Watch for deletion type changes
    this.bulkDeletionForm.get('deletionType')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(deletionType => {
      const moveProductsControl = this.bulkDeletionForm.get('moveProductsToCategory');
      
      if (deletionType === 'hard' && this.totalAffectedProducts() > 0) {
        moveProductsControl?.setValidators([Validators.required]);
      } else {
        moveProductsControl?.clearValidators();
      }
      
      moveProductsControl?.updateValueAndValidity();
      
      // Clear confirmation text when changing type
      this.bulkDeletionForm.patchValue({ confirmationText: '' });
    });
  }

  private loadImpactAnalyses(): void {
    if (!this.categories.length || !this.estabelecimentoId) return;

    this.loading.set(true);
    this.error.set(null);

    this.categoryDeletionService.validateBulkDeletion(
      this.estabelecimentoId, 
      this.categories.map(c => c.id)
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (analyses) => {
        this.impactAnalyses.set(analyses);
        this.loading.set(false);
        
        // Set default deletion type based on analysis
        const hasProductsWithoutAlternatives = analyses.some(a => 
          a.hasProducts && (!a.canDelete || a.alternativeCategories.length === 0)
        );
        
        if (hasProductsWithoutAlternatives) {
          this.bulkDeletionForm.patchValue({ deletionType: 'soft' });
        }

        // Move to next step
        this.currentStep.set('options');
      },
      error: (error) => {
        this.error.set(error.message || 'Erro ao analisar impacto da exclusão em lote');
        this.loading.set(false);
      }
    });
  }

  onDeletionTypeChange(type: 'hard' | 'soft'): void {
    this.bulkDeletionForm.patchValue({ deletionType: type });
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
      this.currentStep.set('options');
    } else if (current === 'options') {
      this.currentStep.set('analysis');
    }
  }

  onConfirm(): void {
    if (!this.bulkDeletionForm.valid || !this.canProceed()) {
      return;
    }

    const formValue = this.bulkDeletionForm.value;
    const request: BulkCategoryDeletionRequest = {
      categoryIds: this.categories.map(c => c.id),
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
    const deletionType = this.bulkDeletionForm?.get('deletionType')?.value;
    const count = this.totalCategories();
    
    if (deletionType === 'hard') {
      return `EXCLUIR ${count} CATEGORIAS`;
    } else {
      return `DESATIVAR ${count} CATEGORIAS`;
    }
  }

  getConfirmationPlaceholder(): string {
    return `Digite "${this.getConfirmationText()}" para confirmar`;
  }

  isConfirmationValid(): boolean {
    const confirmationText = this.bulkDeletionForm?.get('confirmationText')?.value || '';
    return confirmationText === this.getConfirmationText();
  }

  getDeletionTypeLabel(type: 'hard' | 'soft'): string {
    return type === 'hard' ? 'Exclusão Permanente' : 'Desativação em Lote';
  }

  getDeletionTypeDescription(type: 'hard' | 'soft'): string {
    const count = this.totalCategories();
    
    if (type === 'hard') {
      return `${count} categoria(s) serão removidas permanentemente do sistema. Esta ação não pode ser desfeita após 5 minutos.`;
    } else {
      return `${count} categoria(s) serão desativadas mas permanecerão no sistema. Podem ser reativadas a qualquer momento.`;
    }
  }

  getRiskLevelClass(): string {
    const highRisk = this.highRiskCategories().length;
    const totalWithProducts = this.categoriesWithProducts().length;
    
    if (highRisk > 0 || totalWithProducts > this.totalCategories() * 0.7) {
      return 'risk-level--high';
    } else if (totalWithProducts > 0) {
      return 'risk-level--medium';
    } else {
      return 'risk-level--low';
    }
  }

  getRiskLevelText(): string {
    const riskClass = this.getRiskLevelClass();
    
    switch (riskClass) {
      case 'risk-level--high':
        return 'Alto';
      case 'risk-level--medium':
        return 'Médio';
      default:
        return 'Baixo';
    }
  }

  getStepTitle(): string {
    const step = this.currentStep();
    
    switch (step) {
      case 'analysis':
        return 'Análise de Impacto em Lote';
      case 'options':
        return 'Opções de Exclusão em Lote';
      case 'confirmation':
        return 'Confirmação da Exclusão em Lote';
      default:
        return '';
    }
  }

  getStepDescription(): string {
    const step = this.currentStep();
    const count = this.totalCategories();
    
    switch (step) {
      case 'analysis':
        return `Analisando o impacto da exclusão de ${count} categoria(s)`;
      case 'options':
        return `Escolha como deseja proceder com a exclusão de ${count} categoria(s)`;
      case 'confirmation':
        return `Confirme a exclusão de ${count} categoria(s) digitando o texto solicitado`;
      default:
        return '';
    }
  }

  // Accessibility helpers
  getModalAriaLabel(): string {
    const count = this.totalCategories();
    return `Confirmar exclusão em lote de ${count} categoria(s)`;
  }

  getStepAriaLabel(): string {
    const current = this.currentStep();
    let stepNumber = 1;
    
    if (current === 'options') stepNumber = 2;
    else if (current === 'confirmation') stepNumber = 3;
    
    return `Passo ${stepNumber} de 3: ${this.getStepTitle()}`;
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

  // Category grouping helpers
  getCategoriesByRisk(): { low: DeletionImpactAnalysis[], medium: DeletionImpactAnalysis[], high: DeletionImpactAnalysis[] } {
    const analyses = this.impactAnalyses();
    
    return {
      low: analyses.filter(a => !a.hasProducts),
      medium: analyses.filter(a => a.hasProducts && a.activeProductsCount <= 5),
      high: analyses.filter(a => a.activeProductsCount > 5)
    };
  }

  getBlockedCategories(): DeletionImpactAnalysis[] {
    return this.impactAnalyses().filter(analysis => !analysis.canDelete);
  }
}
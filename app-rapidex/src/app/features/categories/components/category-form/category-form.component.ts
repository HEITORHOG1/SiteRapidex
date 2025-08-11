import { 
  Component, 
  OnInit, 
  OnDestroy, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  DestroyRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { 
  FormBuilder, 
  FormGroup, 
  Validators, 
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { 
  Observable, 
  of, 
  timer, 
  Subject, 
  debounceTime, 
  distinctUntilChanged, 
  switchMap, 
  catchError,
  map,
  tap,
  finalize,
  take
} from 'rxjs';

import { Category } from '../../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category-dto.models';
import { CategoryHttpService } from '../../services/category-http.service';
import { CategoryValidationService, ValidationResult } from '../../services/category-validation.service';
import { CategoryValidationMessagesService } from '../../services/category-validation-messages.service';
import { CategoryAccessibilityService } from '../../services/category-accessibility.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';

import { LoadingSpinnerComponent } from '../../../../shared/ui/loading/loading';
import { ValidationFeedbackComponent } from '../validation-feedback/validation-feedback.component';

import { 
  createCategoryNameValidators, 
  createCategoryDescriptionValidators 
} from '../../validators/category-form.validators';

/**
 * Form component for creating and editing categories
 * Supports reactive forms with validation, async validation, sanitization, and accessibility
 */
@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    ValidationFeedbackComponent
  ],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.scss', '../../styles/accessibility.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFormComponent implements OnInit, OnDestroy, AfterViewInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryHttpService);
  private validationService = inject(CategoryValidationService);
  private messagesService = inject(CategoryValidationMessagesService);
  private categoryAccessibility = inject(CategoryAccessibilityService);
  private estabelecimentoService = inject(EstabelecimentoService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('nameInput', { static: false }) nameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('descriptionInput', { static: false }) descriptionInput!: ElementRef<HTMLTextAreaElement>;

  // Input properties
  @Input() category: Category | null = null;
  @Input() mode: 'create' | 'edit' = 'create';

  // Output events
  @Output() formSubmit = new EventEmitter<CreateCategoryRequest | UpdateCategoryRequest>();
  @Output() formCancel = new EventEmitter<void>();
  @Output() formValid = new EventEmitter<boolean>();

  // Form and state management
  categoryForm!: FormGroup;
  
  // Reactive signals for state
  loading = signal(false);
  submitting = signal(false);
  validatingName = signal(false);
  autoSaving = signal(false);
  
  // Computed properties
  isEditMode = computed(() => this.mode === 'edit');
  canSubmit = computed(() => 
    this.categoryForm?.valid && 
    !this.loading() && 
    !this.submitting() && 
    !this.validatingName()
  );
  
  // Auto-save functionality
  private autoSaveSubject = new Subject<void>();
  private readonly AUTO_SAVE_DELAY = 2000; // 2 seconds
  
  // Current establishment
  private currentEstablishment$ = this.estabelecimentoService.selectedEstabelecimento$;
  
  // Accessibility
  private formId = this.categoryAccessibility.generateAriaId('category-form');
  private nameFieldId = this.categoryAccessibility.generateAriaId('name-field');
  private descriptionFieldId = this.categoryAccessibility.generateAriaId('description-field');
  private statusFieldId = this.categoryAccessibility.generateAriaId('status-field');
  
  // Accessibility settings
  accessibilitySettings$ = this.categoryAccessibility.accessibilitySettings$;

  ngOnInit(): void {
    this.buildForm();
    this.setupFormValidation();
    this.setupAutoSave();
    this.setupAccessibility();
    
    // Pre-populate form if editing
    if (this.isEditMode() && this.category) {
      this.populateForm(this.category);
    }
  }

  ngAfterViewInit(): void {
    // Focus on name input when component loads
    if (this.nameInput) {
      setTimeout(() => {
        this.nameInput.nativeElement.focus();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    // Cleanup handled by takeUntilDestroyed
  }

  /**
   * Builds the reactive form with validation
   */
  private buildForm(): void {
    const excludeId = this.isEditMode() && this.category ? this.category.id : undefined;
    
    // Get validators from our validation service
    const nomeValidators = createCategoryNameValidators(excludeId);
    const descricaoValidators = createCategoryDescriptionValidators();

    this.categoryForm = this.fb.group({
      nome: [
        '', 
        nomeValidators.sync,
        nomeValidators.async
      ],
      descricao: [
        '', 
        descricaoValidators.sync,
        descricaoValidators.async
      ],
      ativo: [true]
    });

    // Only show ativo field in edit mode
    if (!this.isEditMode()) {
      this.categoryForm.removeControl('ativo');
    }
  }

  /**
   * Sets up form validation and change detection
   */
  private setupFormValidation(): void {
    // Emit form validity changes
    this.categoryForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(status => {
        this.formValid.emit(status === 'VALID');
      });

    // Track name validation state
    const nameControl = this.categoryForm.get('nome');
    if (nameControl) {
      nameControl.statusChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(status => {
          this.validatingName.set(status === 'PENDING');
        });
    }
  }

  /**
   * Sets up auto-save functionality
   */
  private setupAutoSave(): void {
    if (!this.isEditMode()) return;

    // Listen to form changes for auto-save
    this.categoryForm.valueChanges
      .pipe(
        debounceTime(this.AUTO_SAVE_DELAY),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (this.categoryForm.valid && this.category) {
          this.performAutoSave();
        }
      });
  }

  /**
   * Sets up accessibility features
   */
  private setupAccessibility(): void {
    // Announce form mode
    const modeText = this.isEditMode() ? 'edição' : 'criação';
    this.categoryAccessibility.announceAction(
      'form_loaded',
      undefined,
      `Formulário de ${modeText} de categoria carregado`
    );

    // Add ARIA labels and descriptions
    setTimeout(() => {
      if (this.nameInput) {
        const nameElement = this.nameInput.nativeElement;
        nameElement.setAttribute('id', this.nameFieldId);
        nameElement.setAttribute('aria-describedby', `${this.nameFieldId}-help ${this.nameFieldId}-error`);
        nameElement.setAttribute('aria-required', 'true');
        nameElement.setAttribute('aria-invalid', 'false');
        
        // Add field description
        const description = this.categoryAccessibility.getFieldDescription('nome');
        if (description) {
          const helpElement = document.createElement('div');
          helpElement.id = `${this.nameFieldId}-help`;
          helpElement.className = 'field-help';
          helpElement.textContent = description;
          nameElement.parentNode?.insertBefore(helpElement, nameElement.nextSibling);
        }
      }
      
      if (this.descriptionInput) {
        const descElement = this.descriptionInput.nativeElement;
        descElement.setAttribute('id', this.descriptionFieldId);
        descElement.setAttribute('aria-describedby', `${this.descriptionFieldId}-help ${this.descriptionFieldId}-error`);
        descElement.setAttribute('aria-invalid', 'false');
        
        // Add field description
        const description = this.categoryAccessibility.getFieldDescription('descricao');
        if (description) {
          const helpElement = document.createElement('div');
          helpElement.id = `${this.descriptionFieldId}-help`;
          helpElement.className = 'field-help';
          helpElement.textContent = description;
          descElement.parentNode?.insertBefore(helpElement, descElement.nextSibling);
        }
      }
    });

    // Monitor form validation state for accessibility
    this.categoryForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(status => {
        this.updateAriaInvalid();
      });
  }

  /**
   * Updates aria-invalid attributes based on form validation state
   */
  private updateAriaInvalid(): void {
    setTimeout(() => {
      if (this.nameInput) {
        const nameControl = this.categoryForm.get('nome');
        const isInvalid = nameControl?.invalid && nameControl?.touched;
        this.nameInput.nativeElement.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
      }
      
      if (this.descriptionInput) {
        const descControl = this.categoryForm.get('descricao');
        const isInvalid = descControl?.invalid && descControl?.touched;
        this.descriptionInput.nativeElement.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
      }
    });
  }

  /**
   * Populates form with existing category data
   */
  private populateForm(category: Category): void {
    this.categoryForm.patchValue({
      nome: category.nome,
      descricao: category.descricao,
      ativo: category.ativo
    });
  }

  /**
   * Validates form data before submission
   */
  private validateFormData(): ValidationResult {
    const formValue = this.categoryForm.value;
    
    if (this.isEditMode()) {
      const updateRequest: UpdateCategoryRequest = {
        nome: formValue.nome,
        descricao: formValue.descricao || '',
        ativo: formValue.ativo
      };
      
      const excludeId = this.category ? this.category.id : undefined;
      return this.validationService.validateUpdateRequest(updateRequest, excludeId);
    } else {
      const createRequest: CreateCategoryRequest = {
        nome: formValue.nome,
        descricao: formValue.descricao || ''
      };
      
      return this.validationService.validateCreateRequest(createRequest);
    }
  }

  /**
   * Sanitizes form data using validation service
   */
  private sanitizeFormData(data: any): any {
    if (this.isEditMode()) {
      return this.validationService.sanitizeUpdateRequest(data as UpdateCategoryRequest);
    } else {
      return this.validationService.sanitizeCreateRequest(data as CreateCategoryRequest);
    }
  }

  /**
   * Performs auto-save for edit mode
   */
  private performAutoSave(): void {
    if (!this.category || !this.isEditMode()) return;

    this.autoSaving.set(true);
    
    const formData = this.sanitizeFormData(this.categoryForm.value);
    const updateRequest: UpdateCategoryRequest = {
      nome: formData.nome,
      descricao: formData.descricao,
      ativo: formData.ativo
    };

    this.currentEstablishment$
      .pipe(
        take(1),
        switchMap(establishment => {
          if (!establishment) {
            throw new Error('Estabelecimento não selecionado');
          }
          
          return this.categoryService.updateCategory(
            establishment.id,
            this.category!.id,
            updateRequest
          );
        }),
        finalize(() => this.autoSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updatedCategory) => {
          // Update local category reference
          this.category = updatedCategory;
          // Show subtle auto-save feedback
          this.notificationService.info('Alterações salvas automaticamente', { duration: 2000 });
        },
        error: (error) => {
          console.error('Auto-save failed:', error);
          // Don't show error notification for auto-save failures
        }
      });
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    // Perform comprehensive validation
    const validationResult = this.validateFormData();
    
    if (!validationResult.valid) {
      this.handleValidationErrors(validationResult.errors);
      this.markFormGroupTouched();
      return;
    }

    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    
    // Use sanitized data from validation result
    const sanitizedData = validationResult.sanitizedData!;
    
    this.currentEstablishment$
      .pipe(
        take(1),
        switchMap(establishment => {
          if (!establishment) {
            throw new Error('Estabelecimento não selecionado');
          }

          if (this.isEditMode() && this.category) {
            const updateRequest = sanitizedData as UpdateCategoryRequest;
            
            return this.categoryService.updateCategory(
              establishment.id,
              this.category.id,
              updateRequest
            ).pipe(
              tap(() => {
                this.notificationService.success('Categoria atualizada com sucesso!');
                this.announceToScreenReader(`Categoria ${updateRequest.nome} atualizada com sucesso`);
              })
            );
          } else {
            const createRequest = sanitizedData as CreateCategoryRequest;
            
            return this.categoryService.createCategory(establishment.id, createRequest).pipe(
              tap(() => {
                this.notificationService.success('Categoria criada com sucesso!');
                this.announceToScreenReader(`Categoria ${createRequest.nome} criada com sucesso`);
              })
            );
          }
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.formSubmit.emit(sanitizedData);
          
          // Reset form if creating
          if (!this.isEditMode()) {
            this.categoryForm.reset({ ativo: true });
            this.focusNameInput();
          }
        },
        error: (error) => {
          console.error('Form submission error:', error);
          this.handleSubmissionError(error);
        }
      });
  }

  /**
   * Handles form cancellation
   */
  onCancel(): void {
    if (this.categoryForm.dirty) {
      const confirmCancel = confirm('Você tem alterações não salvas. Deseja realmente cancelar?');
      if (!confirmCancel) return;
    }
    
    this.formCancel.emit();
  }

  /**
   * Handles keyboard navigation
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+S or Cmd+S for save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.canSubmit()) {
        this.onSubmit();
        this.categoryAccessibility.announceAction('save_shortcut', undefined, 'Salvando via atalho de teclado');
      } else {
        this.categoryAccessibility.announceError('Não é possível salvar no momento', 'Formulário inválido ou em processamento');
      }
    }
    
    // Escape for cancel
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
      this.categoryAccessibility.announceAction('cancel_shortcut', undefined, 'Cancelando via atalho de teclado');
    }

    // F1 for help
    if (event.key === 'F1') {
      event.preventDefault();
      this.showFormHelp();
    }

    // Tab navigation enhancement
    if (event.key === 'Tab') {
      this.handleTabNavigation(event);
    }
  }

  /**
   * Enhanced tab navigation for better accessibility
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    
    if (event.shiftKey) {
      // Shift+Tab - go backwards
      if (currentIndex === 0) {
        event.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      }
    } else {
      // Tab - go forwards
      if (currentIndex === focusableElements.length - 1) {
        event.preventDefault();
        focusableElements[0].focus();
      }
    }
  }

  /**
   * Gets all focusable elements in the form
   */
  private getFocusableElements(): HTMLElement[] {
    const selectors = [
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    const elements = document.querySelectorAll(selectors.join(', '));
    return Array.from(elements) as HTMLElement[];
  }

  /**
   * Shows form help information
   */
  private showFormHelp(): void {
    const helpText = [
      'Ajuda do formulário de categoria:',
      '• Nome: Obrigatório, entre 2 e 100 caracteres',
      '• Descrição: Opcional, máximo 500 caracteres',
      '• Status: Apenas no modo de edição',
      '',
      'Atalhos de teclado:',
      '• Ctrl+S: Salvar',
      '• Escape: Cancelar',
      '• F1: Esta ajuda',
      '• Tab/Shift+Tab: Navegar entre campos'
    ].join('\n');

    this.categoryAccessibility.announceAction('help', undefined, helpText);
  }

  /**
   * Focuses the name input field
   */
  focusNameInput(): void {
    if (this.nameInput) {
      this.nameInput.nativeElement.focus();
    }
  }

  /**
   * Focuses the description input field
   */
  focusDescriptionInput(): void {
    if (this.descriptionInput) {
      this.descriptionInput.nativeElement.focus();
    }
  }

  /**
   * Handles validation errors from comprehensive validation
   */
  private handleValidationErrors(errors: any[]): void {
    // Group errors by field and set them on form controls
    const errorsByField = new Map<string, any[]>();
    
    for (const error of errors) {
      const fieldName = error.field || 'general';
      if (!errorsByField.has(fieldName)) {
        errorsByField.set(fieldName, []);
      }
      errorsByField.get(fieldName)!.push(error);
    }

    // Set errors on form controls
    for (const [fieldName, fieldErrors] of errorsByField) {
      const control = this.categoryForm.get(fieldName);
      if (control) {
        const errorObj: any = {};
        for (const error of fieldErrors) {
          errorObj[error.code.toLowerCase()] = error;
        }
        control.setErrors(errorObj);
        control.markAsTouched();
      }
    }

    // Show summary message for accessibility
    const summary = this.messagesService.getErrorSummaryMessage(errors);
    this.announceToScreenReader(summary);
    
    // Show notification for security errors
    if (this.messagesService.hasSecurityErrors(errors)) {
      this.notificationService.error('Dados rejeitados por motivos de segurança. Verifique os campos destacados.');
    }
  }

  /**
   * Handles submission errors
   */
  private handleSubmissionError(error: any): void {
    let errorMessage = 'Erro ao salvar categoria. Tente novamente.';
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    this.notificationService.error(errorMessage);
    this.announceToScreenReader('Erro ao salvar categoria');
    
    // Handle specific validation errors from server
    if (error.code === 'VALIDATION_ERROR' && error.details?.field) {
      this.setFieldError(error.details.field, error.message);
    }
  }

  /**
   * Gets error message for a form field using validation service
   */
  getFieldError(fieldName: string): string | null {
    const field = this.categoryForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return null;

    // Convert form errors to our validation error format
    const errors: any[] = [];
    for (const [errorKey, errorValue] of Object.entries(field.errors)) {
      if (errorValue && typeof errorValue === 'object' && 'field' in errorValue) {
        errors.push(errorValue);
      }
    }

    if (errors.length > 0) {
      return this.messagesService.getFirstFieldErrorMessage(errors, fieldName);
    }

    return null;
  }

  /**
   * Sets a custom error on a form field
   */
  private setFieldError(fieldName: string, message: string): void {
    const field = this.categoryForm.get(fieldName);
    if (field) {
      field.setErrors({ server: { message } });
      field.markAsTouched();
    }
  }

  /**
   * Marks all form fields as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.categoryForm.controls).forEach(key => {
      const control = this.categoryForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Announces messages to screen readers
   */
  private announceToScreenReader(message: string): void {
    this.categoryAccessibility.announceAction('custom', undefined, message);
  }

  // Accessibility helper methods for template
  getCategoryActionLabel(action: string, categoryName?: string): string {
    return this.categoryAccessibility.getCategoryActionLabel(action, categoryName || '');
  }

  getFieldDescription(fieldName: string): string {
    return this.categoryAccessibility.getFieldDescription(fieldName);
  }

  getValidationErrorMessage(fieldName: string, error: any): string {
    return this.categoryAccessibility.getValidationErrorMessage(fieldName, error);
  }

  generateAriaId(prefix: string): string {
    return this.categoryAccessibility.generateAriaId(prefix);
  }

  isHighContrastEnabled(): boolean {
    return this.categoryAccessibility.isHighContrastEnabled();
  }

  isReducedMotionPreferred(): boolean {
    return this.categoryAccessibility.isReducedMotionPreferred();
  }

  // Enhanced error handling with accessibility
  announceValidationError(fieldName: string, error: any): void {
    const message = this.getValidationErrorMessage(fieldName, error);
    this.categoryAccessibility.announceError(message, `Erro no campo ${fieldName}`);
  }

  announceFormSuccess(): void {
    const action = this.isEditMode() ? 'updated' : 'created';
    const categoryName = this.categoryForm.get('nome')?.value || '';
    this.categoryAccessibility.announceAction(action, categoryName);
  }

  // Focus management
  manageFocusOnError(): void {
    // Find first field with error and focus it
    const formControls = Object.keys(this.categoryForm.controls);
    for (const controlName of formControls) {
      const control = this.categoryForm.get(controlName);
      if (control?.invalid && control?.touched) {
        this.focusField(controlName);
        break;
      }
    }
  }

  focusField(fieldName: string): void {
    switch (fieldName) {
      case 'nome':
        this.focusNameInput();
        break;
      case 'descricao':
        this.focusDescriptionInput();
        break;
    }
  }

  // Getter methods for template access
  get nameControl() { return this.categoryForm.get('nome'); }
  get descricaoControl() { return this.categoryForm.get('descricao'); }
  get ativoControl() { return this.categoryForm.get('ativo'); }
}
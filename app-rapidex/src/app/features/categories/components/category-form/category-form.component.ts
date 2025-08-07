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
  AfterViewInit
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
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';

import { LoadingSpinnerComponent } from '../../../../shared/ui/loading/loading';

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

    LoadingSpinnerComponent
  ],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFormComponent implements OnInit, OnDestroy, AfterViewInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryHttpService);
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
    this.categoryForm = this.fb.group({
      nome: [
        '', 
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          this.noScriptValidator,
          this.noHtmlValidator
        ],
        [this.uniqueNameValidator()]
      ],
      descricao: [
        '', 
        [
          Validators.maxLength(500),
          this.noScriptValidator,
          this.noHtmlValidator
        ]
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
    // Add ARIA labels and descriptions
    setTimeout(() => {
      if (this.nameInput) {
        this.nameInput.nativeElement.setAttribute('aria-describedby', 'name-help name-error');
        this.nameInput.nativeElement.setAttribute('aria-required', 'true');
      }
      
      if (this.descriptionInput) {
        this.descriptionInput.nativeElement.setAttribute('aria-describedby', 'description-help description-error');
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
   * Custom validator to prevent script injection
   */
  private noScriptValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const jsPattern = /javascript:/gi;
    
    if (scriptPattern.test(control.value) || jsPattern.test(control.value)) {
      return { script: { message: 'Scripts não são permitidos' } };
    }
    
    return null;
  }

  /**
   * Custom validator to prevent HTML injection
   */
  private noHtmlValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const htmlPattern = /<[^>]*>/g;
    if (htmlPattern.test(control.value)) {
      return { html: { message: 'Tags HTML não são permitidas' } };
    }
    
    return null;
  }

  /**
   * Async validator for unique category name
   */
  private uniqueNameValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value.length < 2) {
        return of(null);
      }

      return this.currentEstablishment$.pipe(
        take(1),
        switchMap(establishment => {
          if (!establishment) {
            return of({ establishment: { message: 'Estabelecimento não selecionado' } });
          }

          const excludeId = this.isEditMode() && this.category ? this.category.id : undefined;
          
          return this.categoryService.validateCategoryName(
            establishment.id, 
            control.value.trim(), 
            excludeId
          ).pipe(
            map(isValid => isValid ? null : { unique: { message: 'Nome já existe neste estabelecimento' } }),
            catchError(() => of(null)) // Ignore validation errors, let form submit handle them
          );
        })
      );
    };
  }

  /**
   * Sanitizes form input to prevent XSS
   */
  private sanitizeFormData(data: any): any {
    return {
      ...data,
      nome: this.sanitizeString(data.nome),
      descricao: this.sanitizeString(data.descricao || '')
    };
  }

  /**
   * Sanitizes string input
   */
  private sanitizeString(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
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
    if (!this.categoryForm.valid || this.submitting()) {
      this.markFormGroupTouched();
      return;
    }

    this.submitting.set(true);
    
    const formData = this.sanitizeFormData(this.categoryForm.value);
    
    this.currentEstablishment$
      .pipe(
        take(1),
        switchMap(establishment => {
          if (!establishment) {
            throw new Error('Estabelecimento não selecionado');
          }

          if (this.isEditMode() && this.category) {
            const updateRequest: UpdateCategoryRequest = {
              nome: formData.nome,
              descricao: formData.descricao,
              ativo: formData.ativo
            };
            
            return this.categoryService.updateCategory(
              establishment.id,
              this.category.id,
              updateRequest
            ).pipe(
              tap(() => {
                this.notificationService.success('Categoria atualizada com sucesso!');
                this.announceToScreenReader(`Categoria ${formData.nome} atualizada com sucesso`);
              })
            );
          } else {
            const createRequest: CreateCategoryRequest = {
              nome: formData.nome,
              descricao: formData.descricao
            };
            
            return this.categoryService.createCategory(establishment.id, createRequest).pipe(
              tap(() => {
                this.notificationService.success('Categoria criada com sucesso!');
                this.announceToScreenReader(`Categoria ${formData.nome} criada com sucesso`);
              })
            );
          }
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.formSubmit.emit(this.isEditMode() ? formData as UpdateCategoryRequest : formData as CreateCategoryRequest);
          
          // Reset form if creating
          if (!this.isEditMode()) {
            this.categoryForm.reset({ ativo: true });
            this.focusNameInput();
          }
        },
        error: (error) => {
          console.error('Form submission error:', error);
          this.notificationService.error(
            error.message || 'Erro ao salvar categoria. Tente novamente.'
          );
          this.announceToScreenReader('Erro ao salvar categoria');
          
          // Handle specific validation errors
          if (error.code === 'VALIDATION_ERROR' && error.details?.field) {
            this.setFieldError(error.details.field, error.message);
          }
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
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+S or Cmd+S for save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.canSubmit()) {
        this.onSubmit();
      }
    }
    
    // Escape for cancel
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
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
   * Gets error message for a form field
   */
  getFieldError(fieldName: string): string | null {
    const field = this.categoryForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return null;

    const errors = field.errors;
    
    if (errors['required']) return `${this.getFieldLabel(fieldName)} é obrigatório`;
    if (errors['minlength']) return `${this.getFieldLabel(fieldName)} deve ter pelo menos ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} deve ter no máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['unique']) return errors['unique'].message;
    if (errors['script']) return errors['script'].message;
    if (errors['html']) return errors['html'].message;
    if (errors['establishment']) return errors['establishment'].message;
    
    return 'Campo inválido';
  }

  /**
   * Gets the display label for a field
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      nome: 'Nome',
      descricao: 'Descrição',
      ativo: 'Status'
    };
    return labels[fieldName] || fieldName;
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
    // Create a temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Getter methods for template access
  get nameControl() { return this.categoryForm.get('nome'); }
  get descricaoControl() { return this.categoryForm.get('descricao'); }
  get ativoControl() { return this.categoryForm.get('ativo'); }
}
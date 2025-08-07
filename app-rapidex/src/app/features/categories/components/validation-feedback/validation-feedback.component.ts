import { 
  Component, 
  Input, 
  OnInit, 
  OnChanges, 
  SimpleChanges,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

import { 
  ValidationErrorDetail, 
  CategoryValidationService 
} from '../../services/category-validation.service';
import { CategoryValidationMessagesService } from '../../services/category-validation-messages.service';

/**
 * Real-time validation feedback component
 * Displays validation errors, warnings, and help messages with proper accessibility
 */
@Component({
  selector: 'app-validation-feedback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="validation-feedback"
      [class.has-errors]="hasErrors()"
      [class.has-warnings]="hasWarnings()"
      [class.has-success]="hasSuccess()"
      [attr.aria-live]="ariaLive()"
      [attr.aria-atomic]="true"
    >
      <!-- Error Messages -->
      @if (errorMessages().length > 0) {
        <div class="validation-errors" role="alert">
          @for (message of errorMessages(); track message) {
            <div class="validation-message error">
              <span class="validation-icon" aria-hidden="true">⚠️</span>
              <span class="validation-text">{{ message }}</span>
            </div>
          }
        </div>
      }

      <!-- Warning Messages -->
      @if (warningMessages().length > 0) {
        <div class="validation-warnings">
          @for (message of warningMessages(); track message) {
            <div class="validation-message warning">
              <span class="validation-icon" aria-hidden="true">⚡</span>
              <span class="validation-text">{{ message }}</span>
            </div>
          }
        </div>
      }

      <!-- Success Message -->
      @if (hasSuccess() && showSuccess) {
        <div class="validation-success">
          <div class="validation-message success">
            <span class="validation-icon" aria-hidden="true">✅</span>
            <span class="validation-text">{{ successMessage() }}</span>
          </div>
        </div>
      }

      <!-- Help Message -->
      @if (helpMessage() && showHelp) {
        <div class="validation-help">
          <div class="validation-message help">
            <span class="validation-icon" aria-hidden="true">💡</span>
            <span class="validation-text">{{ helpMessage() }}</span>
          </div>
        </div>
      }

      <!-- Real-time Character Count (for length-limited fields) -->
      @if (showCharacterCount && maxLength) {
        <div class="character-count" [class.near-limit]="isNearLimit()" [class.over-limit]="isOverLimit()">
          <span class="count-text">
            {{ currentLength() }}/{{ maxLength }}
            @if (isOverLimit()) {
              <span class="over-limit-text">({{ currentLength() - maxLength }} caracteres a mais)</span>
            }
          </span>
        </div>
      }
    </div>
  `,
  styleUrl: './validation-feedback.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ValidationFeedbackComponent implements OnInit, OnChanges {
  private validationService = inject(CategoryValidationService);
  private messagesService = inject(CategoryValidationMessagesService);

  // Input properties
  @Input() control: AbstractControl | null = null;
  @Input() fieldName: string = '';
  @Input() showSuccess: boolean = true;
  @Input() showHelp: boolean = false;
  @Input() showCharacterCount: boolean = false;
  @Input() maxLength?: number;
  @Input() realTimeValidation: boolean = true;
  @Input() customErrors: ValidationErrorDetail[] = [];

  // Reactive signals
  private controlValue = signal<string>('');
  private controlErrors = signal<ValidationErrorDetail[]>([]);
  private controlTouched = signal<boolean>(false);
  private controlDirty = signal<boolean>(false);

  // Computed properties
  private allErrors = computed(() => [
    ...this.controlErrors(),
    ...this.customErrors
  ]);

  errorMessages = computed(() => {
    const errors = this.allErrors().filter(error => 
      this.messagesService.getErrorSeverity(error) === 'error'
    );
    return errors.map(error => this.messagesService.getErrorMessage(error));
  });

  warningMessages = computed(() => {
    const warnings = this.allErrors().filter(error => 
      this.messagesService.getErrorSeverity(error) === 'warning'
    );
    return warnings.map(error => this.messagesService.getErrorMessage(error));
  });

  hasErrors = computed(() => this.errorMessages().length > 0);
  hasWarnings = computed(() => this.warningMessages().length > 0);
  
  hasSuccess = computed(() => {
    const value = this.controlValue();
    return !this.hasErrors() && 
           !this.hasWarnings() && 
           value.trim().length > 0 && 
           (this.controlTouched() || this.controlDirty());
  });

  successMessage = computed(() => {
    if (!this.hasSuccess()) return '';
    return `${this.getFieldDisplayName()} válido`;
  });

  helpMessage = computed(() => {
    const errors = this.allErrors();
    if (errors.length > 0) {
      const firstError = errors[0];
      return this.messagesService.getHelpMessage(firstError.code);
    }
    return null;
  });

  currentLength = computed(() => this.controlValue().length);
  
  isNearLimit = computed(() => {
    if (!this.maxLength) return false;
    const length = this.currentLength();
    return length > (this.maxLength * 0.8) && length <= this.maxLength;
  });

  isOverLimit = computed(() => {
    if (!this.maxLength) return false;
    return this.currentLength() > this.maxLength;
  });

  ariaLive = computed(() => {
    if (this.hasErrors()) return 'assertive';
    if (this.hasWarnings() || this.hasSuccess()) return 'polite';
    return 'off';
  });

  ngOnInit(): void {
    this.setupControlMonitoring();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['control'] && this.control) {
      this.setupControlMonitoring();
    }
  }

  /**
   * Sets up monitoring of form control changes
   */
  private setupControlMonitoring(): void {
    if (!this.control) return;

    // Update control value
    this.controlValue.set(this.control.value || '');

    // Update control state
    this.controlTouched.set(this.control.touched);
    this.controlDirty.set(this.control.dirty);

    // Update errors
    this.updateControlErrors();

    // Subscribe to control changes
    this.control.valueChanges?.subscribe(value => {
      this.controlValue.set(value || '');
      if (this.realTimeValidation) {
        this.updateControlErrors();
      }
    });

    this.control.statusChanges?.subscribe(() => {
      this.controlTouched.set(this.control!.touched);
      this.controlDirty.set(this.control!.dirty);
      this.updateControlErrors();
    });
  }

  /**
   * Updates control errors from Angular form validation
   */
  private updateControlErrors(): void {
    if (!this.control || !this.control.errors) {
      this.controlErrors.set([]);
      return;
    }

    const errors: ValidationErrorDetail[] = [];
    
    for (const [errorKey, errorValue] of Object.entries(this.control.errors)) {
      if (errorValue && typeof errorValue === 'object' && 'field' in errorValue) {
        // Custom validation error with our format
        errors.push(errorValue as ValidationErrorDetail);
      } else {
        // Standard Angular validation error - convert to our format
        errors.push(this.convertStandardError(errorKey, errorValue));
      }
    }

    this.controlErrors.set(errors);
  }

  /**
   * Converts standard Angular validation errors to our format
   */
  private convertStandardError(errorKey: string, errorValue: any): ValidationErrorDetail {
    const fieldName = this.fieldName || 'campo';
    
    switch (errorKey) {
      case 'required':
        return {
          field: fieldName,
          code: 'REQUIRED',
          message: `${this.getFieldDisplayName()} é obrigatório`,
          value: errorValue?.value
        };
      
      case 'minlength':
        return {
          field: fieldName,
          code: 'MIN_LENGTH',
          message: `${this.getFieldDisplayName()} deve ter pelo menos ${errorValue.requiredLength} caracteres`,
          value: errorValue?.value,
          params: errorValue
        };
      
      case 'maxlength':
        return {
          field: fieldName,
          code: 'MAX_LENGTH',
          message: `${this.getFieldDisplayName()} deve ter no máximo ${errorValue.requiredLength} caracteres`,
          value: errorValue?.value,
          params: errorValue
        };
      
      case 'pattern':
        return {
          field: fieldName,
          code: 'PATTERN',
          message: `${this.getFieldDisplayName()} tem formato inválido`,
          value: errorValue?.value,
          params: errorValue
        };
      
      default:
        return {
          field: fieldName,
          code: errorKey.toUpperCase(),
          message: `${this.getFieldDisplayName()} é inválido`,
          value: errorValue?.value,
          params: errorValue
        };
    }
  }

  /**
   * Gets display name for the field
   */
  private getFieldDisplayName(): string {
    const displayNames: Record<string, string> = {
      nome: 'Nome da categoria',
      descricao: 'Descrição da categoria',
      ativo: 'Status da categoria'
    };
    return displayNames[this.fieldName] || this.fieldName || 'Campo';
  }

  /**
   * Gets CSS classes for the validation state
   */
  getValidationClasses(): string[] {
    const classes: string[] = ['validation-feedback'];
    
    if (this.hasErrors()) classes.push('has-errors');
    if (this.hasWarnings()) classes.push('has-warnings');
    if (this.hasSuccess()) classes.push('has-success');
    if (this.isNearLimit()) classes.push('near-limit');
    if (this.isOverLimit()) classes.push('over-limit');
    
    return classes;
  }

  /**
   * Gets accessibility attributes
   */
  getAccessibilityAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {
      'aria-live': this.ariaLive(),
      'aria-atomic': 'true'
    };

    if (this.hasErrors()) {
      attrs['role'] = 'alert';
    }

    return attrs;
  }

  /**
   * Announces validation changes to screen readers
   */
  announceValidationChange(): void {
    const errors = this.allErrors();
    if (errors.length > 0) {
      const announcement = this.messagesService.getAccessibilityErrorAnnouncement(errors);
      this.announceToScreenReader(announcement);
    }
  }

  /**
   * Announces message to screen readers
   */
  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
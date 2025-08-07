import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError, debounceTime, distinctUntilChanged, take } from 'rxjs/operators';
import { inject } from '@angular/core';

import { CategoryValidationService } from '../services/category-validation.service';
import { CategoryHttpService } from '../services/category-http.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';

/**
 * Custom Angular validators for category forms
 * These validators integrate with the CategoryValidationService and provide
 * real-time validation feedback with proper error handling
 */

/**
 * Creates a comprehensive validator for category name field
 */
export function categoryNameValidator(excludeId?: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const validationService = inject(CategoryValidationService);
    const validators = validationService.getNomeValidators(excludeId);
    
    // Apply all synchronous validators
    for (const validator of validators.sync) {
      const error = validator(control);
      if (error) {
        return error;
      }
    }
    
    return null;
  };
}

/**
 * Creates a comprehensive validator for category description field
 */
export function categoryDescriptionValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const validationService = inject(CategoryValidationService);
    const validators = validationService.getDescricaoValidators();
    
    // Apply all synchronous validators
    for (const validator of validators.sync) {
      const error = validator(control);
      if (error) {
        return error;
      }
    }
    
    return null;
  };
}

/**
 * Async validator for unique category name
 */
export function uniqueCategoryNameValidator(excludeId?: number): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value || control.value.trim().length < 2) {
      return of(null);
    }

    const categoryService = inject(CategoryHttpService);
    const estabelecimentoService = inject(EstabelecimentoService);

    return timer(300).pipe( // Debounce user input
      switchMap(() => estabelecimentoService.selectedEstabelecimento$),
      take(1),
      switchMap(establishment => {
        if (!establishment) {
          return of({
            establishment: {
              field: 'nome',
              code: 'NO_ESTABLISHMENT',
              message: 'Estabelecimento não selecionado',
              value: control.value
            }
          });
        }

        return categoryService.validateCategoryName(
          establishment.id,
          control.value.trim(),
          excludeId
        ).pipe(
          map(isValid => {
            if (!isValid) {
              return {
                unique: {
                  field: 'nome',
                  code: 'NOT_UNIQUE',
                  message: 'Nome já existe neste estabelecimento',
                  value: control.value,
                  params: { estabelecimentoId: establishment.id }
                }
              };
            }
            return null;
          }),
          catchError(error => {
            console.warn('Unique name validation failed:', error);
            // Don't block form submission on validation service errors
            return of(null);
          })
        );
      })
    );
  };
}

/**
 * Real-time validation decorator that provides immediate feedback
 */
export function realTimeValidator(baseValidator: ValidatorFn, debounceMs: number = 300): ValidatorFn {
  let lastValidation: any = null;
  let validationTimer: any = null;

  return (control: AbstractControl): ValidationErrors | null => {
    // Clear previous timer
    if (validationTimer) {
      clearTimeout(validationTimer);
    }

    // For immediate validation of empty values or critical errors
    if (!control.value || control.value.trim().length === 0) {
      lastValidation = baseValidator(control);
      return lastValidation;
    }

    // Debounced validation for non-empty values
    validationTimer = setTimeout(() => {
      lastValidation = baseValidator(control);
      // Trigger change detection
      control.updateValueAndValidity({ emitEvent: false });
    }, debounceMs);

    return lastValidation;
  };
}

/**
 * Security-focused validator that prioritizes XSS prevention
 */
export function securityValidator(fieldName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const value = control.value.toString();
    
    // High priority security checks
    const securityChecks = [
      {
        pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        error: {
          xssSecurity: {
            field: fieldName,
            code: 'XSS_SCRIPT',
            message: `${fieldName} não pode conter scripts por motivos de segurança`,
            value,
            severity: 'critical'
          }
        }
      },
      {
        pattern: /javascript:/gi,
        error: {
          xssSecurity: {
            field: fieldName,
            code: 'XSS_JAVASCRIPT',
            message: `${fieldName} não pode conter código JavaScript por motivos de segurança`,
            value,
            severity: 'critical'
          }
        }
      },
      {
        pattern: /on\w+\s*=/gi,
        error: {
          xssSecurity: {
            field: fieldName,
            code: 'XSS_EVENT_HANDLER',
            message: `${fieldName} não pode conter manipuladores de eventos por motivos de segurança`,
            value,
            severity: 'critical'
          }
        }
      },
      {
        pattern: /<[^>]*>/g,
        error: {
          htmlSecurity: {
            field: fieldName,
            code: 'HTML_NOT_ALLOWED',
            message: `${fieldName} não pode conter tags HTML`,
            value,
            severity: 'high'
          }
        }
      }
    ];

    // Return first security violation found
    for (const check of securityChecks) {
      if (check.pattern.test(value)) {
        return check.error;
      }
    }

    return null;
  };
}

/**
 * Business rules validator for category-specific logic
 */
export function categoryBusinessRulesValidator(fieldName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const value = control.value.toString().toLowerCase();
    
    // Business rule checks
    const forbiddenWords = ['admin', 'root', 'system', 'null', 'undefined', 'delete', 'drop'];
    const foundForbiddenWord = forbiddenWords.find(word => value.includes(word));
    
    if (foundForbiddenWord) {
      return {
        businessRule: {
          field: fieldName,
          code: 'FORBIDDEN_WORD',
          message: `${fieldName} não pode conter a palavra "${foundForbiddenWord}"`,
          value: control.value,
          params: { forbiddenWord: foundForbiddenWord }
        }
      };
    }

    // Check for excessive special characters (potential abuse)
    const specialCharCount = (value.match(/[^a-zA-ZÀ-ÿ0-9\s]/g) || []).length;
    const totalLength = value.length;
    
    if (totalLength > 0 && (specialCharCount / totalLength) > 0.3) {
      return {
        businessRule: {
          field: fieldName,
          code: 'EXCESSIVE_SPECIAL_CHARS',
          message: `${fieldName} contém muitos caracteres especiais`,
          value: control.value,
          params: { ratio: specialCharCount / totalLength }
        }
      };
    }

    return null;
  };
}

/**
 * Composite validator that combines multiple validation strategies
 */
export function compositeValidator(...validators: ValidatorFn[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const errors: ValidationErrors = {};
    let hasErrors = false;

    for (const validator of validators) {
      const error = validator(control);
      if (error) {
        Object.assign(errors, error);
        hasErrors = true;
      }
    }

    return hasErrors ? errors : null;
  };
}

/**
 * Conditional validator that applies validation based on a condition
 */
export function conditionalValidator(
  condition: (control: AbstractControl) => boolean,
  validator: ValidatorFn
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (condition(control)) {
      return validator(control);
    }
    return null;
  };
}

/**
 * Length validator with custom messages
 */
export function lengthValidator(
  fieldName: string,
  minLength?: number,
  maxLength?: number
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const value = control.value.toString();
    const trimmedLength = value.trim().length;

    if (minLength && trimmedLength < minLength) {
      return {
        minLength: {
          field: fieldName,
          code: 'MIN_LENGTH',
          message: `${fieldName} deve ter pelo menos ${minLength} caracteres`,
          value,
          params: { requiredLength: minLength, actualLength: trimmedLength }
        }
      };
    }

    if (maxLength && value.length > maxLength) {
      return {
        maxLength: {
          field: fieldName,
          code: 'MAX_LENGTH',
          message: `${fieldName} deve ter no máximo ${maxLength} caracteres`,
          value,
          params: { requiredLength: maxLength, actualLength: value.length }
        }
      };
    }

    return null;
  };
}

/**
 * Pattern validator with custom error messages
 */
export function patternValidator(
  fieldName: string,
  pattern: RegExp,
  errorMessage?: string
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const value = control.value.toString();

    if (!pattern.test(value)) {
      return {
        pattern: {
          field: fieldName,
          code: 'PATTERN',
          message: errorMessage || `${fieldName} contém caracteres inválidos`,
          value,
          params: { pattern: pattern.toString() }
        }
      };
    }

    return null;
  };
}

/**
 * Whitespace validator
 */
export function whitespaceValidator(fieldName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const value = control.value.toString();

    // Check for leading/trailing whitespace
    if (value !== value.trim()) {
      return {
        whitespace: {
          field: fieldName,
          code: 'LEADING_TRAILING_WHITESPACE',
          message: `${fieldName} não pode começar ou terminar com espaços`,
          value
        }
      };
    }

    // Check for excessive consecutive spaces
    if (/\s{3,}/.test(value)) {
      return {
        whitespace: {
          field: fieldName,
          code: 'EXCESSIVE_WHITESPACE',
          message: `${fieldName} não pode ter mais de 2 espaços consecutivos`,
          value,
          params: { maxConsecutiveSpaces: 2 }
        }
      };
    }

    return null;
  };
}

/**
 * Factory function to create all validators for category name field
 */
export function createCategoryNameValidators(excludeId?: number): {
  sync: ValidatorFn[];
  async: AsyncValidatorFn[];
} {
  return {
    sync: [
      compositeValidator(
        lengthValidator('Nome', 2, 100),
        securityValidator('Nome'),
        categoryBusinessRulesValidator('Nome'),
        patternValidator('Nome', /^[a-zA-ZÀ-ÿ0-9\s\-_&().,!?]+$/, 'Nome contém caracteres não permitidos'),
        whitespaceValidator('Nome')
      )
    ],
    async: [
      uniqueCategoryNameValidator(excludeId)
    ]
  };
}

/**
 * Factory function to create all validators for category description field
 */
export function createCategoryDescriptionValidators(): {
  sync: ValidatorFn[];
  async: AsyncValidatorFn[];
} {
  return {
    sync: [
      compositeValidator(
        lengthValidator('Descrição', undefined, 500),
        securityValidator('Descrição'),
        categoryBusinessRulesValidator('Descrição'),
        patternValidator('Descrição', /^[a-zA-ZÀ-ÿ0-9\s\-_&().,!?\n\r]+$/, 'Descrição contém caracteres não permitidos'),
        whitespaceValidator('Descrição')
      )
    ],
    async: []
  };
}
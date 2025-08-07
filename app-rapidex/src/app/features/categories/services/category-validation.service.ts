import { Injectable, inject } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { CategoryHttpService } from './category-http.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../models/category-dto.models';

/**
 * Validation rules configuration
 */
export interface CategoryValidationRules {
  nome: {
    minLength: number;
    maxLength: number;
    required: boolean;
    pattern?: RegExp;
    forbiddenWords?: string[];
  };
  descricao: {
    maxLength: number;
    required: boolean;
    pattern?: RegExp;
    forbiddenWords?: string[];
  };
  sanitization: {
    allowHtml: boolean;
    allowScripts: boolean;
    allowEventHandlers: boolean;
    maxConsecutiveSpaces: number;
  };
}

/**
 * Default validation rules
 */
export const DEFAULT_VALIDATION_RULES: CategoryValidationRules = {
  nome: {
    minLength: 2,
    maxLength: 100,
    required: true,
    pattern: /^[a-zA-ZÀ-ÿ0-9\s\-_&().,!?]+$/,
    forbiddenWords: ['admin', 'root', 'system', 'null', 'undefined']
  },
  descricao: {
    maxLength: 500,
    required: false,
    pattern: /^[a-zA-ZÀ-ÿ0-9\s\-_&().,!?\n\r]+$/,
    forbiddenWords: ['admin', 'root', 'system']
  },
  sanitization: {
    allowHtml: false,
    allowScripts: false,
    allowEventHandlers: false,
    maxConsecutiveSpaces: 2
  }
};

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  code: string;
  message: string;
  value?: any;
  params?: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
  sanitizedData?: any;
}

/**
 * Service for comprehensive category validation and sanitization
 * Implements business rules, security validation, and data sanitization
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryValidationService {
  private categoryService = inject(CategoryHttpService);
  private estabelecimentoService = inject(EstabelecimentoService);

  private validationRules: CategoryValidationRules = DEFAULT_VALIDATION_RULES;

  /**
   * Updates validation rules (useful for different establishment types)
   */
  updateValidationRules(rules: Partial<CategoryValidationRules>): void {
    this.validationRules = {
      ...this.validationRules,
      ...rules,
      nome: { ...this.validationRules.nome, ...rules.nome },
      descricao: { ...this.validationRules.descricao, ...rules.descricao },
      sanitization: { ...this.validationRules.sanitization, ...rules.sanitization }
    };
  }

  /**
   * Gets current validation rules
   */
  getValidationRules(): CategoryValidationRules {
    return { ...this.validationRules };
  }

  // ========== SYNCHRONOUS VALIDATORS ==========

  /**
   * Required field validator
   */
  requiredValidator(fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        return {
          required: {
            field: fieldName,
            code: 'REQUIRED',
            message: `${this.getFieldDisplayName(fieldName)} é obrigatório`,
            value
          }
        };
      }
      
      return null;
    };
  }

  /**
   * Minimum length validator
   */
  minLengthValidator(fieldName: string, minLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) return null;
      
      const trimmedValue = typeof value === 'string' ? value.trim() : value.toString();
      
      if (trimmedValue.length < minLength) {
        return {
          minlength: {
            field: fieldName,
            code: 'MIN_LENGTH',
            message: `${this.getFieldDisplayName(fieldName)} deve ter pelo menos ${minLength} caracteres`,
            value,
            params: { requiredLength: minLength, actualLength: trimmedValue.length }
          }
        };
      }
      
      return null;
    };
  }

  /**
   * Maximum length validator
   */
  maxLengthValidator(fieldName: string, maxLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) return null;
      
      const stringValue = typeof value === 'string' ? value : value.toString();
      
      if (stringValue.length > maxLength) {
        return {
          maxlength: {
            field: fieldName,
            code: 'MAX_LENGTH',
            message: `${this.getFieldDisplayName(fieldName)} deve ter no máximo ${maxLength} caracteres`,
            value,
            params: { requiredLength: maxLength, actualLength: stringValue.length }
          }
        };
      }
      
      return null;
    };
  }

  /**
   * Pattern validator
   */
  patternValidator(fieldName: string, pattern: RegExp, customMessage?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) return null;
      
      const stringValue = typeof value === 'string' ? value : value.toString();
      
      if (!pattern.test(stringValue)) {
        return {
          pattern: {
            field: fieldName,
            code: 'PATTERN',
            message: customMessage || `${this.getFieldDisplayName(fieldName)} contém caracteres inválidos`,
            value,
            params: { pattern: pattern.toString() }
          }
        };
      }
      
      return null;
    };
  }

  /**
   * Forbidden words validator
   */
  forbiddenWordsValidator(fieldName: string, forbiddenWords: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) return null;
      
      const stringValue = typeof value === 'string' ? value.toLowerCase() : value.toString().toLowerCase();
      const foundWord = forbiddenWords.find(word => stringValue.includes(word.toLowerCase()));
      
      if (foundWord) {
        return {
          forbiddenWord: {
            field: fieldName,
            code: 'FORBIDDEN_WORD',
            message: `${this.getFieldDisplayName(fieldName)} não pode conter a palavra "${foundWord}"`,
            value,
            params: { forbiddenWord: foundWord }
          }
        };
      }
      
      return null;
    };
  }

  /**
   * XSS prevention validator
   */
  xssPreventionValidator(fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) return null;
      
      const stringValue = typeof value === 'string' ? value : value.toString();
      
      // Check for script tags
      const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
      if (scriptPattern.test(stringValue)) {
        return {
          xss: {
            field: fieldName,
            code: 'XSS_SCRIPT',
            message: `${this.getFieldDisplayName(fieldName)} não pode conter scripts`,
            value
          }
        };
      }
      
      // Check for javascript: protocol
      const jsProtocolPattern = /javascript:/gi;
      if (jsProtocolPattern.test(stringValue)) {
        return {
          xss: {
            field: fieldName,
            code: 'XSS_JAVASCRIPT',
            message: `${this.getFieldDisplayName(fieldName)} não pode conter código JavaScript`,
            value
          }
        };
      }
      
      // Check for event handlers
      const eventHandlerPattern = /on\w+\s*=/gi;
      if (eventHandlerPattern.test(stringValue)) {
        return {
          xss: {
            field: fieldName,
            code: 'XSS_EVENT_HANDLER',
            message: `${this.getFieldDisplayName(fieldName)} não pode conter manipuladores de eventos`,
            value
          }
        };
      }
      
      // Check for HTML tags (if not allowed)
      if (!this.validationRules.sanitization.allowHtml) {
        const htmlPattern = /<[^>]*>/g;
        if (htmlPattern.test(stringValue)) {
          return {
            html: {
              field: fieldName,
              code: 'HTML_NOT_ALLOWED',
              message: `${this.getFieldDisplayName(fieldName)} não pode conter tags HTML`,
              value
            }
          };
        }
      }
      
      return null;
    };
  }

  /**
   * Whitespace validator
   */
  whitespaceValidator(fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) return null;
      
      const stringValue = typeof value === 'string' ? value : value.toString();
      
      // Check for excessive consecutive spaces
      const maxSpaces = this.validationRules.sanitization.maxConsecutiveSpaces;
      const spacePattern = new RegExp(`\\s{${maxSpaces + 1},}`, 'g');
      
      if (spacePattern.test(stringValue)) {
        return {
          whitespace: {
            field: fieldName,
            code: 'EXCESSIVE_WHITESPACE',
            message: `${this.getFieldDisplayName(fieldName)} não pode ter mais de ${maxSpaces} espaços consecutivos`,
            value,
            params: { maxConsecutiveSpaces: maxSpaces }
          }
        };
      }
      
      // Check for leading/trailing whitespace
      if (stringValue !== stringValue.trim()) {
        return {
          whitespace: {
            field: fieldName,
            code: 'LEADING_TRAILING_WHITESPACE',
            message: `${this.getFieldDisplayName(fieldName)} não pode começar ou terminar com espaços`,
            value
          }
        };
      }
      
      return null;
    };
  }

  // ========== ASYNCHRONOUS VALIDATORS ==========

  /**
   * Unique name validator (async)
   */
  uniqueNameValidator(excludeId?: number): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value;
      
      if (!value || value.trim().length < this.validationRules.nome.minLength) {
        return of(null);
      }

      return timer(300).pipe( // Debounce
        switchMap(() => this.estabelecimentoService.selectedEstabelecimento$),
        switchMap(establishment => {
          if (!establishment) {
            return of({
              establishment: {
                field: 'nome',
                code: 'NO_ESTABLISHMENT',
                message: 'Estabelecimento não selecionado',
                value
              }
            });
          }

          return this.categoryService.validateCategoryName(
            establishment.id,
            value.trim(),
            excludeId
          ).pipe(
            map(isValid => {
              if (!isValid) {
                return {
                  unique: {
                    field: 'nome',
                    code: 'NOT_UNIQUE',
                    message: 'Nome já existe neste estabelecimento',
                    value,
                    params: { estabelecimentoId: establishment.id }
                  }
                };
              }
              return null;
            }),
            catchError(() => of(null)) // Ignore validation errors
          );
        })
      );
    };
  }

  /**
   * Server-side validation (async)
   */
  serverSideValidator(fieldName: string, validationEndpoint: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value;
      
      if (!value) return of(null);

      return timer(500).pipe( // Debounce for server calls
        switchMap(() => {
          // This would call a specific server validation endpoint
          // For now, we'll simulate with the existing validation
          return this.estabelecimentoService.selectedEstabelecimento$.pipe(
            switchMap(establishment => {
              if (!establishment) {
                return of({
                  server: {
                    field: fieldName,
                    code: 'SERVER_VALIDATION_FAILED',
                    message: 'Falha na validação do servidor',
                    value
                  }
                });
              }
              
              // Simulate server validation success
              return of(null);
            })
          );
        }),
        catchError(error => {
          return of({
            server: {
              field: fieldName,
              code: 'SERVER_VALIDATION_ERROR',
              message: 'Erro na validação do servidor',
              value,
              params: { error: error.message }
            }
          });
        })
      );
    };
  }

  // ========== COMPOSITE VALIDATORS ==========

  /**
   * Gets all validators for the nome field
   */
  getNomeValidators(excludeId?: number): { sync: ValidatorFn[], async: AsyncValidatorFn[] } {
    const rules = this.validationRules.nome;
    
    const syncValidators: ValidatorFn[] = [];
    const asyncValidators: AsyncValidatorFn[] = [];

    if (rules.required) {
      syncValidators.push(this.requiredValidator('nome'));
    }
    
    syncValidators.push(
      this.minLengthValidator('nome', rules.minLength),
      this.maxLengthValidator('nome', rules.maxLength),
      this.xssPreventionValidator('nome'),
      this.whitespaceValidator('nome')
    );

    if (rules.pattern) {
      syncValidators.push(this.patternValidator('nome', rules.pattern));
    }

    if (rules.forbiddenWords && rules.forbiddenWords.length > 0) {
      syncValidators.push(this.forbiddenWordsValidator('nome', rules.forbiddenWords));
    }

    asyncValidators.push(this.uniqueNameValidator(excludeId));

    return { sync: syncValidators, async: asyncValidators };
  }

  /**
   * Gets all validators for the descricao field
   */
  getDescricaoValidators(): { sync: ValidatorFn[], async: AsyncValidatorFn[] } {
    const rules = this.validationRules.descricao;
    
    const syncValidators: ValidatorFn[] = [];
    const asyncValidators: AsyncValidatorFn[] = [];

    if (rules.required) {
      syncValidators.push(this.requiredValidator('descricao'));
    }
    
    syncValidators.push(
      this.maxLengthValidator('descricao', rules.maxLength),
      this.xssPreventionValidator('descricao'),
      this.whitespaceValidator('descricao')
    );

    if (rules.pattern) {
      syncValidators.push(this.patternValidator('descricao', rules.pattern));
    }

    if (rules.forbiddenWords && rules.forbiddenWords.length > 0) {
      syncValidators.push(this.forbiddenWordsValidator('descricao', rules.forbiddenWords));
    }

    return { sync: syncValidators, async: asyncValidators };
  }

  // ========== DATA SANITIZATION ==========

  /**
   * Sanitizes create category request
   */
  sanitizeCreateRequest(request: CreateCategoryRequest): CreateCategoryRequest {
    return {
      nome: this.sanitizeString(request.nome, 'nome'),
      descricao: this.sanitizeString(request.descricao || '', 'descricao')
    };
  }

  /**
   * Sanitizes update category request
   */
  sanitizeUpdateRequest(request: UpdateCategoryRequest): UpdateCategoryRequest {
    return {
      nome: this.sanitizeString(request.nome, 'nome'),
      descricao: this.sanitizeString(request.descricao || '', 'descricao'),
      ativo: request.ativo
    };
  }

  /**
   * Sanitizes string input based on field type and rules
   */
  sanitizeString(input: string, fieldType: 'nome' | 'descricao'): string {
    if (!input) return '';

    let sanitized = input;

    // Basic trimming
    sanitized = sanitized.trim();

    // Remove or escape dangerous content
    if (!this.validationRules.sanitization.allowScripts) {
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/javascript:/gi, '');
    }

    if (!this.validationRules.sanitization.allowEventHandlers) {
      sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    }

    if (!this.validationRules.sanitization.allowHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Normalize whitespace
    const maxSpaces = this.validationRules.sanitization.maxConsecutiveSpaces;
    const spacePattern = new RegExp(`\\s{${maxSpaces + 1},}`, 'g');
    sanitized = sanitized.replace(spacePattern, ' '.repeat(maxSpaces));

    // Apply field-specific length limits
    const rules = fieldType === 'nome' ? this.validationRules.nome : this.validationRules.descricao;
    if (sanitized.length > rules.maxLength) {
      sanitized = sanitized.substring(0, rules.maxLength);
    }

    return sanitized;
  }

  // ========== VALIDATION ORCHESTRATION ==========

  /**
   * Validates create category request
   */
  validateCreateRequest(request: CreateCategoryRequest): ValidationResult {
    const errors: ValidationErrorDetail[] = [];
    
    // Validate nome
    const nomeValidators = this.getNomeValidators();
    const nomeControl = { value: request.nome } as AbstractControl;
    
    for (const validator of nomeValidators.sync) {
      const error = validator(nomeControl);
      if (error) {
        errors.push(...this.extractErrorDetails(error));
      }
    }

    // Validate descricao
    const descricaoValidators = this.getDescricaoValidators();
    const descricaoControl = { value: request.descricao } as AbstractControl;
    
    for (const validator of descricaoValidators.sync) {
      const error = validator(descricaoControl);
      if (error) {
        errors.push(...this.extractErrorDetails(error));
      }
    }

    const valid = errors.length === 0;
    const sanitizedData = valid ? this.sanitizeCreateRequest(request) : undefined;

    return { valid, errors, sanitizedData };
  }

  /**
   * Validates update category request
   */
  validateUpdateRequest(request: UpdateCategoryRequest, excludeId?: number): ValidationResult {
    const errors: ValidationErrorDetail[] = [];
    
    // Validate nome
    const nomeValidators = this.getNomeValidators(excludeId);
    const nomeControl = { value: request.nome } as AbstractControl;
    
    for (const validator of nomeValidators.sync) {
      const error = validator(nomeControl);
      if (error) {
        errors.push(...this.extractErrorDetails(error));
      }
    }

    // Validate descricao
    const descricaoValidators = this.getDescricaoValidators();
    const descricaoControl = { value: request.descricao } as AbstractControl;
    
    for (const validator of descricaoValidators.sync) {
      const error = validator(descricaoControl);
      if (error) {
        errors.push(...this.extractErrorDetails(error));
      }
    }

    // Validate ativo
    if (typeof request.ativo !== 'boolean') {
      errors.push({
        field: 'ativo',
        code: 'INVALID_TYPE',
        message: 'Status deve ser verdadeiro ou falso',
        value: request.ativo
      });
    }

    const valid = errors.length === 0;
    const sanitizedData = valid ? this.sanitizeUpdateRequest(request) : undefined;

    return { valid, errors, sanitizedData };
  }

  // ========== HELPER METHODS ==========

  /**
   * Extracts error details from validation errors
   */
  private extractErrorDetails(errors: ValidationErrors): ValidationErrorDetail[] {
    const details: ValidationErrorDetail[] = [];
    
    for (const [key, error] of Object.entries(errors)) {
      if (error && typeof error === 'object' && error.field && error.code && error.message) {
        details.push(error as ValidationErrorDetail);
      } else {
        // Fallback for standard Angular validators
        details.push({
          field: 'unknown',
          code: key.toUpperCase(),
          message: this.getStandardErrorMessage(key, error),
          value: error?.value,
          params: error
        });
      }
    }
    
    return details;
  }

  /**
   * Gets standard error message for Angular validators
   */
  private getStandardErrorMessage(errorKey: string, error: any): string {
    switch (errorKey) {
      case 'required':
        return 'Campo obrigatório';
      case 'minlength':
        return `Deve ter pelo menos ${error.requiredLength} caracteres`;
      case 'maxlength':
        return `Deve ter no máximo ${error.requiredLength} caracteres`;
      case 'pattern':
        return 'Formato inválido';
      default:
        return 'Campo inválido';
    }
  }

  /**
   * Gets display name for field
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: Record<string, string> = {
      nome: 'Nome',
      descricao: 'Descrição',
      ativo: 'Status'
    };
    return displayNames[fieldName] || fieldName;
  }

  /**
   * Gets user-friendly error message
   */
  getErrorMessage(error: ValidationErrorDetail): string {
    return error.message;
  }

  /**
   * Gets all error messages for a field
   */
  getFieldErrorMessages(errors: ValidationErrorDetail[], fieldName: string): string[] {
    return errors
      .filter(error => error.field === fieldName)
      .map(error => this.getErrorMessage(error));
  }
}
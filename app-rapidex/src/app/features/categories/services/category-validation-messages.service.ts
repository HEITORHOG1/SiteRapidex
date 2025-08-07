import { Injectable } from '@angular/core';
import { ValidationErrorDetail } from './category-validation.service';

/**
 * Message templates for validation errors
 */
export interface ValidationMessageTemplates {
  [errorCode: string]: {
    template: string;
    severity: 'error' | 'warning' | 'info';
    category: 'validation' | 'security' | 'business';
  };
}

/**
 * Default validation message templates
 */
export const DEFAULT_MESSAGE_TEMPLATES: ValidationMessageTemplates = {
  // Required field errors
  REQUIRED: {
    template: '{fieldName} é obrigatório',
    severity: 'error',
    category: 'validation'
  },

  // Length validation errors
  MIN_LENGTH: {
    template: '{fieldName} deve ter pelo menos {minLength} caracteres',
    severity: 'error',
    category: 'validation'
  },
  MAX_LENGTH: {
    template: '{fieldName} deve ter no máximo {maxLength} caracteres',
    severity: 'error',
    category: 'validation'
  },

  // Pattern validation errors
  PATTERN: {
    template: '{fieldName} contém caracteres inválidos',
    severity: 'error',
    category: 'validation'
  },

  // Business rule errors
  NOT_UNIQUE: {
    template: 'Nome já existe neste estabelecimento',
    severity: 'error',
    category: 'business'
  },
  FORBIDDEN_WORD: {
    template: '{fieldName} não pode conter a palavra "{forbiddenWord}"',
    severity: 'error',
    category: 'business'
  },

  // Security validation errors
  XSS_SCRIPT: {
    template: '{fieldName} não pode conter scripts por motivos de segurança',
    severity: 'error',
    category: 'security'
  },
  XSS_JAVASCRIPT: {
    template: '{fieldName} não pode conter código JavaScript por motivos de segurança',
    severity: 'error',
    category: 'security'
  },
  XSS_EVENT_HANDLER: {
    template: '{fieldName} não pode conter manipuladores de eventos por motivos de segurança',
    severity: 'error',
    category: 'security'
  },
  HTML_NOT_ALLOWED: {
    template: '{fieldName} não pode conter tags HTML',
    severity: 'error',
    category: 'security'
  },

  // Whitespace validation errors
  EXCESSIVE_WHITESPACE: {
    template: '{fieldName} não pode ter mais de {maxSpaces} espaços consecutivos',
    severity: 'warning',
    category: 'validation'
  },
  LEADING_TRAILING_WHITESPACE: {
    template: '{fieldName} não pode começar ou terminar com espaços',
    severity: 'warning',
    category: 'validation'
  },

  // Server validation errors
  SERVER_VALIDATION_FAILED: {
    template: 'Falha na validação do servidor para {fieldName}',
    severity: 'error',
    category: 'validation'
  },
  SERVER_VALIDATION_ERROR: {
    template: 'Erro na validação do servidor para {fieldName}',
    severity: 'error',
    category: 'validation'
  },

  // Establishment context errors
  NO_ESTABLISHMENT: {
    template: 'Estabelecimento deve estar selecionado',
    severity: 'error',
    category: 'business'
  },

  // Generic errors
  INVALID_TYPE: {
    template: '{fieldName} tem tipo inválido',
    severity: 'error',
    category: 'validation'
  }
};

/**
 * Field display names in Portuguese
 */
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  nome: 'Nome da categoria',
  descricao: 'Descrição da categoria',
  ativo: 'Status da categoria'
};

/**
 * Contextual help messages for validation errors
 */
export const VALIDATION_HELP_MESSAGES: Record<string, string> = {
  REQUIRED: 'Este campo é obrigatório para criar ou atualizar a categoria.',
  MIN_LENGTH: 'Use um nome mais descritivo para facilitar a identificação da categoria.',
  MAX_LENGTH: 'Tente ser mais conciso na descrição da categoria.',
  PATTERN: 'Use apenas letras, números, espaços e os caracteres especiais permitidos: - _ & ( ) . , ! ?',
  NOT_UNIQUE: 'Escolha um nome diferente que não esteja sendo usado por outra categoria neste estabelecimento.',
  FORBIDDEN_WORD: 'Esta palavra é reservada pelo sistema. Escolha um nome diferente.',
  XSS_SCRIPT: 'Por segurança, não é permitido incluir código executável nos campos.',
  XSS_JAVASCRIPT: 'Por segurança, não é permitido incluir código JavaScript nos campos.',
  XSS_EVENT_HANDLER: 'Por segurança, não é permitido incluir manipuladores de eventos nos campos.',
  HTML_NOT_ALLOWED: 'Tags HTML não são permitidas neste campo. Use apenas texto simples.',
  EXCESSIVE_WHITESPACE: 'Evite usar muitos espaços consecutivos para manter a formatação limpa.',
  LEADING_TRAILING_WHITESPACE: 'Espaços no início ou fim do texto serão removidos automaticamente.',
  NO_ESTABLISHMENT: 'Selecione um estabelecimento antes de criar ou editar categorias.'
};

/**
 * Service for managing validation error messages
 * Provides localized, contextual, and user-friendly error messages
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryValidationMessagesService {
  private messageTemplates: ValidationMessageTemplates = { ...DEFAULT_MESSAGE_TEMPLATES };
  private fieldDisplayNames: Record<string, string> = { ...FIELD_DISPLAY_NAMES };
  private helpMessages: Record<string, string> = { ...VALIDATION_HELP_MESSAGES };

  /**
   * Updates message templates (useful for internationalization)
   */
  updateMessageTemplates(templates: Partial<ValidationMessageTemplates>): void {
    Object.assign(this.messageTemplates, templates);
  }

  /**
   * Updates field display names
   */
  updateFieldDisplayNames(names: Record<string, string>): void {
    this.fieldDisplayNames = { ...this.fieldDisplayNames, ...names };
  }

  /**
   * Updates help messages
   */
  updateHelpMessages(messages: Record<string, string>): void {
    this.helpMessages = { ...this.helpMessages, ...messages };
  }

  /**
   * Gets formatted error message for a validation error
   */
  getErrorMessage(error: ValidationErrorDetail): string {
    const template = this.messageTemplates[error.code];
    
    if (!template) {
      return error.message || 'Erro de validação';
    }

    return this.formatMessage(template.template, {
      fieldName: this.getFieldDisplayName(error.field),
      ...error.params,
      ...this.extractParamsFromError(error)
    });
  }

  /**
   * Gets error severity
   */
  getErrorSeverity(error: ValidationErrorDetail): 'error' | 'warning' | 'info' {
    const template = this.messageTemplates[error.code];
    return template?.severity || 'error';
  }

  /**
   * Gets error category
   */
  getErrorCategory(error: ValidationErrorDetail): 'validation' | 'security' | 'business' {
    const template = this.messageTemplates[error.code];
    return template?.category || 'validation';
  }

  /**
   * Gets help message for an error code
   */
  getHelpMessage(errorCode: string): string | null {
    return this.helpMessages[errorCode] || null;
  }

  /**
   * Gets all error messages for a field
   */
  getFieldErrorMessages(errors: ValidationErrorDetail[], fieldName: string): string[] {
    return errors
      .filter(error => error.field === fieldName)
      .map(error => this.getErrorMessage(error));
  }

  /**
   * Gets the first error message for a field
   */
  getFirstFieldErrorMessage(errors: ValidationErrorDetail[], fieldName: string): string | null {
    const fieldErrors = errors.filter(error => error.field === fieldName);
    return fieldErrors.length > 0 ? this.getErrorMessage(fieldErrors[0]) : null;
  }

  /**
   * Gets grouped error messages by severity
   */
  getGroupedErrorMessages(errors: ValidationErrorDetail[]): {
    errors: string[];
    warnings: string[];
    info: string[];
  } {
    const grouped = {
      errors: [] as string[],
      warnings: [] as string[],
      info: [] as string[]
    };

    for (const error of errors) {
      const message = this.getErrorMessage(error);
      const severity = this.getErrorSeverity(error);
      
      grouped[severity === 'error' ? 'errors' : severity === 'warning' ? 'warnings' : 'info'].push(message);
    }

    return grouped;
  }

  /**
   * Gets summary message for multiple errors
   */
  getErrorSummaryMessage(errors: ValidationErrorDetail[]): string {
    if (errors.length === 0) return '';
    
    if (errors.length === 1) {
      return this.getErrorMessage(errors[0]);
    }

    const grouped = this.getGroupedErrorMessages(errors);
    const parts: string[] = [];

    if (grouped.errors.length > 0) {
      parts.push(`${grouped.errors.length} erro${grouped.errors.length > 1 ? 's' : ''} de validação`);
    }
    
    if (grouped.warnings.length > 0) {
      parts.push(`${grouped.warnings.length} aviso${grouped.warnings.length > 1 ? 's' : ''}`);
    }

    return `Encontrados ${parts.join(' e ')}. Corrija os problemas antes de continuar.`;
  }

  /**
   * Checks if errors contain security-related issues
   */
  hasSecurityErrors(errors: ValidationErrorDetail[]): boolean {
    return errors.some(error => this.getErrorCategory(error) === 'security');
  }

  /**
   * Checks if errors contain business rule violations
   */
  hasBusinessRuleErrors(errors: ValidationErrorDetail[]): boolean {
    return errors.some(error => this.getErrorCategory(error) === 'business');
  }

  /**
   * Gets real-time validation feedback message
   */
  getRealTimeValidationMessage(fieldName: string, value: string, errors: ValidationErrorDetail[]): string {
    const fieldErrors = errors.filter(error => error.field === fieldName);
    
    if (fieldErrors.length === 0) {
      // Provide positive feedback
      if (value && value.trim().length > 0) {
        return `${this.getFieldDisplayName(fieldName)} válido`;
      }
      return '';
    }

    // Return the most relevant error
    const securityErrors = fieldErrors.filter(error => this.getErrorCategory(error) === 'security');
    const businessErrors = fieldErrors.filter(error => this.getErrorCategory(error) === 'business');
    
    if (securityErrors.length > 0) {
      return this.getErrorMessage(securityErrors[0]);
    }
    
    if (businessErrors.length > 0) {
      return this.getErrorMessage(businessErrors[0]);
    }
    
    return this.getErrorMessage(fieldErrors[0]);
  }

  /**
   * Gets accessibility-friendly error announcement
   */
  getAccessibilityErrorAnnouncement(errors: ValidationErrorDetail[]): string {
    if (errors.length === 0) return '';
    
    const grouped = this.getGroupedErrorMessages(errors);
    const announcements: string[] = [];

    if (grouped.errors.length > 0) {
      announcements.push(`${grouped.errors.length} erro${grouped.errors.length > 1 ? 's' : ''} encontrado${grouped.errors.length > 1 ? 's' : ''}`);
    }
    
    if (grouped.warnings.length > 0) {
      announcements.push(`${grouped.warnings.length} aviso${grouped.warnings.length > 1 ? 's' : ''} encontrado${grouped.warnings.length > 1 ? 's' : ''}`);
    }

    return announcements.join(', ');
  }

  // Private helper methods

  /**
   * Formats message template with parameters
   */
  private formatMessage(template: string, params: Record<string, any>): string {
    let formatted = template;
    
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      formatted = formatted.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return formatted;
  }

  /**
   * Gets display name for field
   */
  private getFieldDisplayName(fieldName: string): string {
    return this.fieldDisplayNames[fieldName] || fieldName;
  }

  /**
   * Extracts parameters from error object
   */
  private extractParamsFromError(error: ValidationErrorDetail): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extract common parameters
    if (error.params) {
      if (error.params['requiredLength']) params['minLength'] = error.params['requiredLength'];
      if (error.params['requiredLength']) params['maxLength'] = error.params['requiredLength'];
      if (error.params['maxConsecutiveSpaces']) params['maxSpaces'] = error.params['maxConsecutiveSpaces'];
      if (error.params['forbiddenWord']) params['forbiddenWord'] = error.params['forbiddenWord'];
    }
    
    return params;
  }
}
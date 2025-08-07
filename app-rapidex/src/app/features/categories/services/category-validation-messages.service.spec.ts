import { TestBed } from '@angular/core/testing';

import { 
  CategoryValidationMessagesService,
  DEFAULT_MESSAGE_TEMPLATES,
  FIELD_DISPLAY_NAMES,
  VALIDATION_HELP_MESSAGES
} from './category-validation-messages.service';
import { ValidationErrorDetail } from './category-validation.service';

describe('CategoryValidationMessagesService', () => {
  let service: CategoryValidationMessagesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CategoryValidationMessagesService]
    });
    service = TestBed.inject(CategoryValidationMessagesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Message Template Management', () => {
    it('should use default message templates', () => {
      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Original message'
      };

      const message = service.getErrorMessage(error);
      expect(message).toBe('Nome da categoria é obrigatório');
    });

    it('should allow updating message templates', () => {
      const customTemplates = {
        REQUIRED: {
          template: 'Custom required message for {fieldName}',
          severity: 'error' as const,
          category: 'validation' as const
        }
      };

      service.updateMessageTemplates(customTemplates);

      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Original message'
      };

      const message = service.getErrorMessage(error);
      expect(message).toBe('Custom required message for Nome da categoria');
    });

    it('should allow updating field display names', () => {
      service.updateFieldDisplayNames({
        nome: 'Category Title'
      });

      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Original message'
      };

      const message = service.getErrorMessage(error);
      expect(message).toBe('Category Title é obrigatório');
    });

    it('should allow updating help messages', () => {
      service.updateHelpMessages({
        REQUIRED: 'Custom help message for required fields'
      });

      const helpMessage = service.getHelpMessage('REQUIRED');
      expect(helpMessage).toBe('Custom help message for required fields');
    });
  });

  describe('Error Message Formatting', () => {
    it('should format simple error messages', () => {
      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Original message'
      };

      const message = service.getErrorMessage(error);
      expect(message).toBe('Nome da categoria é obrigatório');
    });

    it('should format error messages with parameters', () => {
      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'MIN_LENGTH',
        message: 'Original message',
        params: { requiredLength: 3 }
      };

      const message = service.getErrorMessage(error);
      expect(message).toBe('Nome da categoria deve ter pelo menos 3 caracteres');
    });

    it('should format error messages with forbidden words', () => {
      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'FORBIDDEN_WORD',
        message: 'Original message',
        params: { forbiddenWord: 'admin' }
      };

      const message = service.getErrorMessage(error);
      expect(message).toBe('Nome da categoria não pode conter a palavra "admin"');
    });

    it('should fallback to original message for unknown error codes', () => {
      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'UNKNOWN_ERROR',
        message: 'Original error message'
      };

      const message = service.getErrorMessage(error);
      expect(message).toBe('Original error message');
    });

    it('should fallback to generic message when no original message', () => {
      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'UNKNOWN_ERROR',
        message: ''
      };

      const message = service.getErrorMessage(error);
      expect(message).toBe('Erro de validação');
    });
  });

  describe('Error Severity and Category', () => {
    it('should return correct error severity', () => {
      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Error message'
      };

      const severity = service.getErrorSeverity(error);
      expect(severity).toBe('error');
    });

    it('should return correct warning severity', () => {
      const error: ValidationErrorDetail = {
        field: 'nome',
        code: 'EXCESSIVE_WHITESPACE',
        message: 'Warning message'
      };

      const severity = service.getErrorSeverity(error);
      expect(severity).toBe('warning');
    });

    it('should return correct error category', () => {
      const securityError: ValidationErrorDetail = {
        field: 'nome',
        code: 'XSS_SCRIPT',
        message: 'Security error'
      };

      const category = service.getErrorCategory(securityError);
      expect(category).toBe('security');
    });

    it('should return correct business category', () => {
      const businessError: ValidationErrorDetail = {
        field: 'nome',
        code: 'NOT_UNIQUE',
        message: 'Business error'
      };

      const category = service.getErrorCategory(businessError);
      expect(category).toBe('business');
    });

    it('should fallback to default severity and category', () => {
      const unknownError: ValidationErrorDetail = {
        field: 'nome',
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error'
      };

      expect(service.getErrorSeverity(unknownError)).toBe('error');
      expect(service.getErrorCategory(unknownError)).toBe('validation');
    });
  });

  describe('Help Messages', () => {
    it('should return help message for known error codes', () => {
      const helpMessage = service.getHelpMessage('REQUIRED');
      expect(helpMessage).toBe(VALIDATION_HELP_MESSAGES['REQUIRED']);
    });

    it('should return null for unknown error codes', () => {
      const helpMessage = service.getHelpMessage('UNKNOWN_ERROR');
      expect(helpMessage).toBeNull();
    });
  });

  describe('Field Error Messages', () => {
    const errors: ValidationErrorDetail[] = [
      {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Nome required'
      },
      {
        field: 'nome',
        code: 'MIN_LENGTH',
        message: 'Nome too short',
        params: { requiredLength: 3 }
      },
      {
        field: 'descricao',
        code: 'MAX_LENGTH',
        message: 'Description too long',
        params: { requiredLength: 500 }
      }
    ];

    it('should return all error messages for a field', () => {
      const messages = service.getFieldErrorMessages(errors, 'nome');
      expect(messages).toHaveSize(2);
      expect(messages[0]).toBe('Nome da categoria é obrigatório');
      expect(messages[1]).toBe('Nome da categoria deve ter pelo menos 3 caracteres');
    });

    it('should return empty array for field with no errors', () => {
      const messages = service.getFieldErrorMessages(errors, 'ativo');
      expect(messages).toEqual([]);
    });

    it('should return first error message for a field', () => {
      const message = service.getFirstFieldErrorMessage(errors, 'nome');
      expect(message).toBe('Nome da categoria é obrigatório');
    });

    it('should return null when field has no errors', () => {
      const message = service.getFirstFieldErrorMessage(errors, 'ativo');
      expect(message).toBeNull();
    });
  });

  describe('Grouped Error Messages', () => {
    const mixedErrors: ValidationErrorDetail[] = [
      {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Required error'
      },
      {
        field: 'nome',
        code: 'XSS_SCRIPT',
        message: 'Security error'
      },
      {
        field: 'descricao',
        code: 'EXCESSIVE_WHITESPACE',
        message: 'Warning error'
      }
    ];

    it('should group errors by severity', () => {
      const grouped = service.getGroupedErrorMessages(mixedErrors);

      expect(grouped.errors).toHaveSize(2);
      expect(grouped.warnings).toHaveSize(1);
      expect(grouped.info).toHaveSize(0);
    });

    it('should return correct error summary message', () => {
      const summary = service.getErrorSummaryMessage(mixedErrors);
      expect(summary).toBe('Encontrados 2 erros de validação e 1 aviso. Corrija os problemas antes de continuar.');
    });

    it('should return single error message for one error', () => {
      const singleError = [mixedErrors[0]];
      const summary = service.getErrorSummaryMessage(singleError);
      expect(summary).toBe('Nome da categoria é obrigatório');
    });

    it('should return empty string for no errors', () => {
      const summary = service.getErrorSummaryMessage([]);
      expect(summary).toBe('');
    });
  });

  describe('Error Type Detection', () => {
    const mixedErrors: ValidationErrorDetail[] = [
      {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Required error'
      },
      {
        field: 'nome',
        code: 'XSS_SCRIPT',
        message: 'Security error'
      },
      {
        field: 'descricao',
        code: 'NOT_UNIQUE',
        message: 'Business error'
      }
    ];

    it('should detect security errors', () => {
      const hasSecurityErrors = service.hasSecurityErrors(mixedErrors);
      expect(hasSecurityErrors).toBe(true);
    });

    it('should detect business rule errors', () => {
      const hasBusinessErrors = service.hasBusinessRuleErrors(mixedErrors);
      expect(hasBusinessErrors).toBe(true);
    });

    it('should return false when no security errors', () => {
      const validationOnlyErrors = [mixedErrors[0]]; // Only REQUIRED error
      const hasSecurityErrors = service.hasSecurityErrors(validationOnlyErrors);
      expect(hasSecurityErrors).toBe(false);
    });

    it('should return false when no business errors', () => {
      const validationOnlyErrors = [mixedErrors[0]]; // Only REQUIRED error
      const hasBusinessErrors = service.hasBusinessRuleErrors(validationOnlyErrors);
      expect(hasBusinessErrors).toBe(false);
    });
  });

  describe('Real-time Validation Messages', () => {
    const errors: ValidationErrorDetail[] = [
      {
        field: 'nome',
        code: 'XSS_SCRIPT',
        message: 'Security error'
      },
      {
        field: 'nome',
        code: 'NOT_UNIQUE',
        message: 'Business error'
      },
      {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Validation error'
      }
    ];

    it('should prioritize security errors in real-time feedback', () => {
      const message = service.getRealTimeValidationMessage('nome', 'test value', errors);
      expect(message).toBe('Nome da categoria não pode conter scripts por motivos de segurança');
    });

    it('should show business errors when no security errors', () => {
      const businessOnlyErrors = errors.slice(1); // Remove security error
      const message = service.getRealTimeValidationMessage('nome', 'test value', businessOnlyErrors);
      expect(message).toBe('Nome já existe neste estabelecimento');
    });

    it('should show validation errors when no security or business errors', () => {
      const validationOnlyErrors = errors.slice(2); // Only validation error
      const message = service.getRealTimeValidationMessage('nome', 'test value', validationOnlyErrors);
      expect(message).toBe('Nome da categoria é obrigatório');
    });

    it('should show positive feedback for valid values', () => {
      const message = service.getRealTimeValidationMessage('nome', 'valid value', []);
      expect(message).toBe('Nome da categoria válido');
    });

    it('should return empty string for empty values with no errors', () => {
      const message = service.getRealTimeValidationMessage('nome', '', []);
      expect(message).toBe('');
    });
  });

  describe('Accessibility Support', () => {
    const errors: ValidationErrorDetail[] = [
      {
        field: 'nome',
        code: 'REQUIRED',
        message: 'Required error'
      },
      {
        field: 'descricao',
        code: 'MAX_LENGTH',
        message: 'Too long error'
      }
    ];

    it('should create accessibility-friendly error announcements', () => {
      const announcement = service.getAccessibilityErrorAnnouncement(errors);
      expect(announcement).toBe('2 erros encontrados');
    });

    it('should handle single error announcement', () => {
      const singleError = [errors[0]];
      const announcement = service.getAccessibilityErrorAnnouncement(singleError);
      expect(announcement).toBe('1 erro encontrado');
    });

    it('should handle mixed error and warning announcements', () => {
      const mixedErrors: ValidationErrorDetail[] = [
        ...errors,
        {
          field: 'nome',
          code: 'EXCESSIVE_WHITESPACE',
          message: 'Warning error'
        }
      ];

      const announcement = service.getAccessibilityErrorAnnouncement(mixedErrors);
      expect(announcement).toBe('2 erros encontrados, 1 aviso encontrado');
    });

    it('should return empty string for no errors', () => {
      const announcement = service.getAccessibilityErrorAnnouncement([]);
      expect(announcement).toBe('');
    });
  });
});
import { TestBed } from '@angular/core/testing';
import { AbstractControl, FormControl } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { CategoryValidationService, DEFAULT_VALIDATION_RULES } from './category-validation.service';
import { CategoryHttpService } from './category-http.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../models/category-dto.models';

describe('CategoryValidationService', () => {
  let service: CategoryValidationService;
  let categoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let estabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;

  const mockEstabelecimento = {
    id: 1,
    nome: 'Restaurante Teste',
    ativo: true
  };

  beforeEach(() => {
    const categoryHttpServiceSpy = jasmine.createSpyObj('CategoryHttpService', [
      'validateCategoryName'
    ]);
    const estabelecimentoServiceSpy = jasmine.createSpyObj('EstabelecimentoService', [], {
      selectedEstabelecimento$: of(mockEstabelecimento)
    });

    TestBed.configureTestingModule({
      providers: [
        CategoryValidationService,
        { provide: CategoryHttpService, useValue: categoryHttpServiceSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoServiceSpy }
      ]
    });

    service = TestBed.inject(CategoryValidationService);
    categoryHttpService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    estabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Validation Rules Management', () => {
    it('should return default validation rules', () => {
      const rules = service.getValidationRules();
      expect(rules).toEqual(DEFAULT_VALIDATION_RULES);
    });

    it('should update validation rules', () => {
      const customRules = {
        nome: { 
          minLength: 3, 
          maxLength: 50,
          required: true,
          pattern: /^[a-zA-Z]+$/,
          forbiddenWords: []
        }
      };

      service.updateValidationRules(customRules);
      const updatedRules = service.getValidationRules();

      expect(updatedRules.nome.minLength).toBe(3);
      expect(updatedRules.nome.maxLength).toBe(50);
      expect(updatedRules.nome.required).toBe(DEFAULT_VALIDATION_RULES.nome.required); // Should preserve other properties
    });

    it('should merge validation rules correctly', () => {
      const customRules = {
        sanitization: { 
          allowHtml: true,
          allowScripts: false,
          allowEventHandlers: false,
          maxConsecutiveSpaces: 2
        }
      };

      service.updateValidationRules(customRules);
      const updatedRules = service.getValidationRules();

      expect(updatedRules.sanitization.allowHtml).toBeTrue();
      expect(updatedRules.sanitization.allowScripts).toBe(DEFAULT_VALIDATION_RULES.sanitization.allowScripts);
    });
  });

  describe('Synchronous Validators', () => {
    describe('requiredValidator', () => {
      it('should return error for empty value', () => {
        const validator = service.requiredValidator('nome');
        const control = new FormControl('');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['required'].code).toBe('REQUIRED');
        expect(result!['required'].message).toContain('Nome é obrigatório');
      });

      it('should return error for whitespace-only value', () => {
        const validator = service.requiredValidator('nome');
        const control = new FormControl('   ');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['required'].code).toBe('REQUIRED');
      });

      it('should return null for valid value', () => {
        const validator = service.requiredValidator('nome');
        const control = new FormControl('Bebidas');

        const result = validator(control);

        expect(result).toBeNull();
      });

      it('should return error for null value', () => {
        const validator = service.requiredValidator('nome');
        const control = new FormControl(null);

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['required'].code).toBe('REQUIRED');
      });
    });

    describe('minLengthValidator', () => {
      it('should return error for value shorter than minimum', () => {
        const validator = service.minLengthValidator('nome', 3);
        const control = new FormControl('AB');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['minlength'].code).toBe('MIN_LENGTH');
        expect(result!['minlength'].params.requiredLength).toBe(3);
        expect(result!['minlength'].params.actualLength).toBe(2);
      });

      it('should return null for value meeting minimum length', () => {
        const validator = service.minLengthValidator('nome', 3);
        const control = new FormControl('ABC');

        const result = validator(control);

        expect(result).toBeNull();
      });

      it('should trim whitespace before validation', () => {
        const validator = service.minLengthValidator('nome', 3);
        const control = new FormControl('  AB  ');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['minlength'].params.actualLength).toBe(2);
      });

      it('should return null for empty value', () => {
        const validator = service.minLengthValidator('nome', 3);
        const control = new FormControl('');

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('maxLengthValidator', () => {
      it('should return error for value longer than maximum', () => {
        const validator = service.maxLengthValidator('nome', 5);
        const control = new FormControl('ABCDEF');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['maxlength'].code).toBe('MAX_LENGTH');
        expect(result!['maxlength'].params.requiredLength).toBe(5);
        expect(result!['maxlength'].params.actualLength).toBe(6);
      });

      it('should return null for value within maximum length', () => {
        const validator = service.maxLengthValidator('nome', 5);
        const control = new FormControl('ABCDE');

        const result = validator(control);

        expect(result).toBeNull();
      });

      it('should return null for empty value', () => {
        const validator = service.maxLengthValidator('nome', 5);
        const control = new FormControl('');

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('patternValidator', () => {
      it('should return error for value not matching pattern', () => {
        const pattern = /^[A-Za-z]+$/;
        const validator = service.patternValidator('nome', pattern);
        const control = new FormControl('Bebidas123');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['pattern'].code).toBe('PATTERN');
        expect(result!['pattern'].message).toContain('caracteres inválidos');
      });

      it('should return null for value matching pattern', () => {
        const pattern = /^[A-Za-z]+$/;
        const validator = service.patternValidator('nome', pattern);
        const control = new FormControl('Bebidas');

        const result = validator(control);

        expect(result).toBeNull();
      });

      it('should use custom error message', () => {
        const pattern = /^[A-Za-z]+$/;
        const customMessage = 'Apenas letras são permitidas';
        const validator = service.patternValidator('nome', pattern, customMessage);
        const control = new FormControl('123');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['pattern'].message).toBe(customMessage);
      });

      it('should return null for empty value', () => {
        const pattern = /^[A-Za-z]+$/;
        const validator = service.patternValidator('nome', pattern);
        const control = new FormControl('');

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('forbiddenWordsValidator', () => {
      it('should return error for forbidden word', () => {
        const forbiddenWords = ['admin', 'root', 'system'];
        const validator = service.forbiddenWordsValidator('nome', forbiddenWords);
        const control = new FormControl('admin-category');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['forbiddenWord'].code).toBe('FORBIDDEN_WORD');
        expect(result!['forbiddenWord'].params.forbiddenWord).toBe('admin');
      });

      it('should be case insensitive', () => {
        const forbiddenWords = ['admin'];
        const validator = service.forbiddenWordsValidator('nome', forbiddenWords);
        const control = new FormControl('ADMIN-category');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['forbiddenWord'].params.forbiddenWord).toBe('admin');
      });

      it('should return null for allowed words', () => {
        const forbiddenWords = ['admin', 'root'];
        const validator = service.forbiddenWordsValidator('nome', forbiddenWords);
        const control = new FormControl('bebidas');

        const result = validator(control);

        expect(result).toBeNull();
      });

      it('should return null for empty value', () => {
        const forbiddenWords = ['admin'];
        const validator = service.forbiddenWordsValidator('nome', forbiddenWords);
        const control = new FormControl('');

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('xssPreventionValidator', () => {
      it('should detect script tags', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = new FormControl('<script>alert("xss")</script>');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['xss'].code).toBe('XSS_SCRIPT');
      });

      it('should detect javascript protocol', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = new FormControl('javascript:alert("xss")');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['xss'].code).toBe('XSS_JAVASCRIPT');
      });

      it('should detect event handlers', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = new FormControl('<img onerror="alert(1)" src="x">');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['xss'].code).toBe('XSS_EVENT_HANDLER');
      });

      it('should detect HTML tags when not allowed', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = new FormControl('<div>content</div>');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['html'].code).toBe('HTML_NOT_ALLOWED');
      });

      it('should allow HTML tags when configured', () => {
        service.updateValidationRules({
          sanitization: { allowHtml: true }
        });

        const validator = service.xssPreventionValidator('nome');
        const control = new FormControl('<div>content</div>');

        const result = validator(control);

        expect(result).toBeNull();
      });

      it('should return null for safe content', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = new FormControl('Bebidas & Comidas');

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('whitespaceValidator', () => {
      it('should detect excessive consecutive spaces', () => {
        const validator = service.whitespaceValidator('nome');
        const control = new FormControl('Bebidas    Geladas'); // 4 spaces

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['whitespace'].code).toBe('EXCESSIVE_WHITESPACE');
      });

      it('should detect leading whitespace', () => {
        const validator = service.whitespaceValidator('nome');
        const control = new FormControl('  Bebidas');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['whitespace'].code).toBe('LEADING_TRAILING_WHITESPACE');
      });

      it('should detect trailing whitespace', () => {
        const validator = service.whitespaceValidator('nome');
        const control = new FormControl('Bebidas  ');

        const result = validator(control);

        expect(result).not.toBeNull();
        expect(result!['whitespace'].code).toBe('LEADING_TRAILING_WHITESPACE');
      });

      it('should allow normal spacing', () => {
        const validator = service.whitespaceValidator('nome');
        const control = new FormControl('Bebidas Geladas');

        const result = validator(control);

        expect(result).toBeNull();
      });

      it('should return null for empty value', () => {
        const validator = service.whitespaceValidator('nome');
        const control = new FormControl('');

        const result = validator(control);

        expect(result).toBeNull();
      });
    });
  });

  describe('Asynchronous Validators', () => {
    describe('uniqueNameValidator', () => {
      it('should return null for unique name', (done) => {
        categoryHttpService.validateCategoryName.and.returnValue(of(true));
        const validator = service.uniqueNameValidator();
        const control = new FormControl('Bebidas');

        const result$ = validator(control);
        if (result$ instanceof Promise) {
          result$.then(result => {
            expect(result).toBeNull();
            expect(categoryHttpService.validateCategoryName).toHaveBeenCalledWith(1, 'Bebidas', undefined);
            done();
          });
        } else {
          result$.subscribe(result => {
            expect(result).toBeNull();
            expect(categoryHttpService.validateCategoryName).toHaveBeenCalledWith(1, 'Bebidas', undefined);
            done();
          });
        }
      });

      it('should return error for duplicate name', (done) => {
        categoryHttpService.validateCategoryName.and.returnValue(of(false));
        const validator = service.uniqueNameValidator();
        const control = new FormControl('Bebidas');

        validator(control).subscribe(result => {
          expect(result).not.toBeNull();
          expect(result!['unique'].code).toBe('NOT_UNIQUE');
          expect(result!['unique'].message).toContain('Nome já existe');
          done();
        });
      });

      it('should exclude specified ID from validation', (done) => {
        categoryHttpService.validateCategoryName.and.returnValue(of(true));
        const validator = service.uniqueNameValidator(123);
        const control = new FormControl('Bebidas');

        validator(control).subscribe(result => {
          expect(categoryHttpService.validateCategoryName).toHaveBeenCalledWith(1, 'Bebidas', 123);
          done();
        });
      });

      it('should return error when no establishment selected', (done) => {
        Object.defineProperty(estabelecimentoService, 'selectedEstabelecimento$', {
          value: of(null)
        });

        const validator = service.uniqueNameValidator();
        const control = new FormControl('Bebidas');

        validator(control).subscribe(result => {
          expect(result).not.toBeNull();
          expect(result!['establishment'].code).toBe('NO_ESTABLISHMENT');
          done();
        });
      });

      it('should return null for short names', (done) => {
        const validator = service.uniqueNameValidator();
        const control = new FormControl('A'); // Below minimum length

        validator(control).subscribe(result => {
          expect(result).toBeNull();
          expect(categoryHttpService.validateCategoryName).not.toHaveBeenCalled();
          done();
        });
      });

      it('should handle validation errors gracefully', (done) => {
        categoryHttpService.validateCategoryName.and.returnValue(
          throwError(() => new Error('Network error'))
        );
        const validator = service.uniqueNameValidator();
        const control = new FormControl('Bebidas');

        validator(control).subscribe(result => {
          expect(result).toBeNull(); // Should ignore validation errors
          done();
        });
      });

      it('should trim input before validation', (done) => {
        categoryHttpService.validateCategoryName.and.returnValue(of(true));
        const validator = service.uniqueNameValidator();
        const control = new FormControl('  Bebidas  ');

        validator(control).subscribe(result => {
          expect(categoryHttpService.validateCategoryName).toHaveBeenCalledWith(1, 'Bebidas', undefined);
          done();
        });
      });
    });

    describe('serverSideValidator', () => {
      it('should return null for valid server validation', (done) => {
        const validator = service.serverSideValidator('nome', '/validate-name');
        const control = new FormControl('Bebidas');

        validator(control).subscribe(result => {
          expect(result).toBeNull();
          done();
        });
      });

      it('should return null for empty value', (done) => {
        const validator = service.serverSideValidator('nome', '/validate-name');
        const control = new FormControl('');

        validator(control).subscribe(result => {
          expect(result).toBeNull();
          done();
        });
      });

      it('should return error when no establishment selected', (done) => {
        Object.defineProperty(estabelecimentoService, 'selectedEstabelecimento$', {
          value: of(null)
        });

        const validator = service.serverSideValidator('nome', '/validate-name');
        const control = new FormControl('Bebidas');

        validator(control).subscribe(result => {
          expect(result).not.toBeNull();
          expect(result!['server'].code).toBe('SERVER_VALIDATION_FAILED');
          done();
        });
      });
    });
  });

  describe('Composite Validators', () => {
    describe('getNomeValidators', () => {
      it('should return all nome validators', () => {
        const { sync, async } = service.getNomeValidators();

        expect(sync.length).toBeGreaterThan(0);
        expect(async.length).toBeGreaterThan(0);
      });

      it('should include required validator when configured', () => {
        const { sync } = service.getNomeValidators();
        const control = new FormControl('');

        // Test that at least one validator returns required error
        const hasRequiredValidator = sync.some(validator => {
          const result = validator(control);
          return result && result['required'];
        });

        expect(hasRequiredValidator).toBeTrue();
      });

      it('should exclude required validator when not configured', () => {
        service.updateValidationRules({
          nome: { required: false }
        });

        const { sync } = service.getNomeValidators();
        const control = new FormControl('');

        // Test that no validator returns required error
        const hasRequiredValidator = sync.some(validator => {
          const result = validator(control);
          return result && result['required'];
        });

        expect(hasRequiredValidator).toBeFalse();
      });

      it('should pass excludeId to unique validator', (done) => {
        categoryHttpService.validateCategoryName.and.returnValue(of(true));
        const { async } = service.getNomeValidators(123);
        const control = new FormControl('Bebidas');

        async[0](control).subscribe(() => {
          expect(categoryHttpService.validateCategoryName).toHaveBeenCalledWith(1, 'Bebidas', 123);
          done();
        });
      });
    });

    describe('getDescricaoValidators', () => {
      it('should return all descricao validators', () => {
        const { sync, async } = service.getDescricaoValidators();

        expect(sync.length).toBeGreaterThan(0);
        expect(async.length).toBeGreaterThanOrEqual(0);
      });

      it('should not include required validator by default', () => {
        const { sync } = service.getDescricaoValidators();
        const control = new FormControl('');

        // Test that no validator returns required error
        const hasRequiredValidator = sync.some(validator => {
          const result = validator(control);
          return result && result['required'];
        });

        expect(hasRequiredValidator).toBeFalse();
      });

      it('should include required validator when configured', () => {
        service.updateValidationRules({
          descricao: { required: true }
        });

        const { sync } = service.getDescricaoValidators();
        const control = new FormControl('');

        // Test that at least one validator returns required error
        const hasRequiredValidator = sync.some(validator => {
          const result = validator(control);
          return result && result['required'];
        });

        expect(hasRequiredValidator).toBeTrue();
      });
    });
  });

  describe('Data Sanitization', () => {
    describe('sanitizeString', () => {
      it('should remove script tags', () => {
        const input = '<script>alert("xss")</script>Bebidas';
        const result = service.sanitizeString(input, 'nome');

        expect(result).toBe('Bebidas');
        expect(result).not.toContain('<script>');
      });

      it('should remove javascript protocol', () => {
        const input = 'javascript:alert("xss") Bebidas';
        const result = service.sanitizeString(input, 'nome');

        expect(result).toBe(' Bebidas');
        expect(result).not.toContain('javascript:');
      });

      it('should remove event handlers', () => {
        const input = 'Bebidas onerror=alert(1)';
        const result = service.sanitizeString(input, 'nome');

        expect(result).toBe('Bebidas ');
        expect(result).not.toContain('onerror');
      });

      it('should remove HTML tags when not allowed', () => {
        const input = '<div>Bebidas</div>';
        const result = service.sanitizeString(input, 'nome');

        expect(result).toBe('Bebidas');
        expect(result).not.toContain('<div>');
      });

      it('should preserve HTML tags when allowed', () => {
        service.updateValidationRules({
          sanitization: { allowHtml: true }
        });

        const input = '<div>Bebidas</div>';
        const result = service.sanitizeString(input, 'nome');

        expect(result).toBe('<div>Bebidas</div>');
      });

      it('should normalize excessive whitespace', () => {
        const input = 'Bebidas    Geladas';
        const result = service.sanitizeString(input, 'nome');

        expect(result).toBe('Bebidas  Geladas'); // Reduced to max allowed spaces
      });

      it('should trim input', () => {
        const input = '  Bebidas  ';
        const result = service.sanitizeString(input, 'nome');

        expect(result).toBe('Bebidas');
      });

      it('should truncate to maximum length', () => {
        const longInput = 'A'.repeat(200);
        const result = service.sanitizeString(longInput, 'nome');

        expect(result.length).toBe(DEFAULT_VALIDATION_RULES.nome.maxLength);
      });

      it('should handle empty input', () => {
        const result = service.sanitizeString('', 'nome');
        expect(result).toBe('');
      });

      it('should handle null input', () => {
        const result = service.sanitizeString(null as any, 'nome');
        expect(result).toBe('');
      });
    });

    describe('sanitizeCreateRequest', () => {
      it('should sanitize all fields', () => {
        const request: CreateCategoryRequest = {
          nome: '<script>alert("xss")</script>Bebidas',
          descricao: 'Descrição com <img onerror="alert(1)" src="x">'
        };

        const sanitized = service.sanitizeCreateRequest(request);

        expect(sanitized.nome).toBe('Bebidas');
        expect(sanitized.descricao).not.toContain('<img');
        expect(sanitized.descricao).not.toContain('onerror');
      });

      it('should handle missing descricao', () => {
        const request: CreateCategoryRequest = {
          nome: 'Bebidas',
          descricao: undefined as any
        };

        const sanitized = service.sanitizeCreateRequest(request);

        expect(sanitized.nome).toBe('Bebidas');
        expect(sanitized.descricao).toBe('');
      });
    });

    describe('sanitizeUpdateRequest', () => {
      it('should sanitize all fields', () => {
        const request: UpdateCategoryRequest = {
          nome: '<script>alert("xss")</script>Bebidas',
          descricao: 'Descrição com <img onerror="alert(1)" src="x">',
          ativo: true
        };

        const sanitized = service.sanitizeUpdateRequest(request);

        expect(sanitized.nome).toBe('Bebidas');
        expect(sanitized.descricao).not.toContain('<img');
        expect(sanitized.ativo).toBe(true);
      });

      it('should preserve ativo field', () => {
        const request: UpdateCategoryRequest = {
          nome: 'Bebidas',
          descricao: 'Descrição',
          ativo: false
        };

        const sanitized = service.sanitizeUpdateRequest(request);

        expect(sanitized.ativo).toBe(false);
      });
    });
  });

  describe('Validation Orchestration', () => {
    describe('validateCreateRequest', () => {
      it('should validate valid request', () => {
        const request: CreateCategoryRequest = {
          nome: 'Bebidas',
          descricao: 'Categoria de bebidas'
        };

        const result = service.validateCreateRequest(request);

        expect(result.valid).toBeTrue();
        expect(result.errors).toEqual([]);
        expect(result.sanitizedData).toEqual(request);
      });

      it('should return errors for invalid request', () => {
        const request: CreateCategoryRequest = {
          nome: '', // Required field empty
          descricao: 'A'.repeat(600) // Too long
        };

        const result = service.validateCreateRequest(request);

        expect(result.valid).toBeFalse();
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.sanitizedData).toBeUndefined();
      });

      it('should sanitize valid request', () => {
        const request: CreateCategoryRequest = {
          nome: '<script>alert("xss")</script>Bebidas',
          descricao: 'Descrição normal'
        };

        const result = service.validateCreateRequest(request);

        expect(result.valid).toBeTrue();
        expect(result.sanitizedData!.nome).toBe('Bebidas');
      });

      it('should validate nome field', () => {
        const request: CreateCategoryRequest = {
          nome: 'A', // Too short
          descricao: 'Descrição'
        };

        const result = service.validateCreateRequest(request);

        expect(result.valid).toBeFalse();
        const nomeErrors = result.errors.filter(e => e.field === 'nome');
        expect(nomeErrors.length).toBeGreaterThan(0);
      });

      it('should validate descricao field', () => {
        const request: CreateCategoryRequest = {
          nome: 'Bebidas',
          descricao: 'A'.repeat(600) // Too long
        };

        const result = service.validateCreateRequest(request);

        expect(result.valid).toBeFalse();
        const descricaoErrors = result.errors.filter(e => e.field === 'descricao');
        expect(descricaoErrors.length).toBeGreaterThan(0);
      });
    });

    describe('validateUpdateRequest', () => {
      it('should validate valid request', () => {
        const request: UpdateCategoryRequest = {
          nome: 'Bebidas',
          descricao: 'Categoria de bebidas',
          ativo: true
        };

        const result = service.validateUpdateRequest(request);

        expect(result.valid).toBeTrue();
        expect(result.errors).toEqual([]);
        expect(result.sanitizedData).toEqual(request);
      });

      it('should validate ativo field type', () => {
        const request: UpdateCategoryRequest = {
          nome: 'Bebidas',
          descricao: 'Descrição',
          ativo: 'true' as any // Should be boolean
        };

        const result = service.validateUpdateRequest(request);

        expect(result.valid).toBeFalse();
        const ativoErrors = result.errors.filter(e => e.field === 'ativo');
        expect(ativoErrors.length).toBeGreaterThan(0);
        expect(ativoErrors[0].code).toBe('INVALID_TYPE');
      });

      it('should pass excludeId to validators', () => {
        const request: UpdateCategoryRequest = {
          nome: 'Bebidas',
          descricao: 'Descrição',
          ativo: true
        };

        const result = service.validateUpdateRequest(request, 123);

        // This test mainly ensures the method accepts excludeId parameter
        // The actual unique validation is tested in async validator tests
        expect(result).toBeDefined();
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getErrorMessage', () => {
      it('should return error message', () => {
        const error = {
          field: 'nome',
          code: 'REQUIRED',
          message: 'Nome é obrigatório',
          value: ''
        };

        const message = service.getErrorMessage(error);

        expect(message).toBe('Nome é obrigatório');
      });
    });

    describe('getFieldErrorMessages', () => {
      it('should return messages for specific field', () => {
        const errors = [
          {
            field: 'nome',
            code: 'REQUIRED',
            message: 'Nome é obrigatório',
            value: ''
          },
          {
            field: 'nome',
            code: 'MIN_LENGTH',
            message: 'Nome deve ter pelo menos 2 caracteres',
            value: 'A'
          },
          {
            field: 'descricao',
            code: 'MAX_LENGTH',
            message: 'Descrição muito longa',
            value: 'A'.repeat(600)
          }
        ];

        const nomeMessages = service.getFieldErrorMessages(errors, 'nome');

        expect(nomeMessages).toEqual([
          'Nome é obrigatório',
          'Nome deve ter pelo menos 2 caracteres'
        ]);
      });

      it('should return empty array for field without errors', () => {
        const errors = [
          {
            field: 'nome',
            code: 'REQUIRED',
            message: 'Nome é obrigatório',
            value: ''
          }
        ];

        const descricaoMessages = service.getFieldErrorMessages(errors, 'descricao');

        expect(descricaoMessages).toEqual([]);
      });
    });

    describe('extractErrorDetails', () => {
      it('should extract custom error details', () => {
        const validationErrors = {
          required: {
            field: 'nome',
            code: 'REQUIRED',
            message: 'Nome é obrigatório',
            value: ''
          }
        };

        const details = service['extractErrorDetails'](validationErrors);

        expect(details).toEqual([{
          field: 'nome',
          code: 'REQUIRED',
          message: 'Nome é obrigatório',
          value: ''
        }]);
      });

      it('should handle standard Angular validator errors', () => {
        const validationErrors = {
          required: true,
          minlength: { requiredLength: 3, actualLength: 1 }
        };

        const details = service['extractErrorDetails'](validationErrors);

        expect(details.length).toBe(2);
        expect(details[0].code).toBe('REQUIRED');
        expect(details[1].code).toBe('MINLENGTH');
      });
    });

    describe('getStandardErrorMessage', () => {
      it('should return standard error messages', () => {
        expect(service['getStandardErrorMessage']('required', {})).toBe('Campo obrigatório');
        expect(service['getStandardErrorMessage']('minlength', { requiredLength: 3 })).toContain('pelo menos 3');
        expect(service['getStandardErrorMessage']('maxlength', { requiredLength: 10 })).toContain('no máximo 10');
        expect(service['getStandardErrorMessage']('pattern', {})).toBe('Formato inválido');
        expect(service['getStandardErrorMessage']('unknown', {})).toBe('Campo inválido');
      });
    });

    describe('getFieldDisplayName', () => {
      it('should return display names for known fields', () => {
        expect(service['getFieldDisplayName']('nome')).toBe('Nome');
        expect(service['getFieldDisplayName']('descricao')).toBe('Descrição');
        expect(service['getFieldDisplayName']('ativo')).toBe('Status');
      });

      it('should return field name for unknown fields', () => {
        expect(service['getFieldDisplayName']('unknownField')).toBe('unknownField');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null validation rules gracefully', () => {
      service.updateValidationRules(null as any);
      const rules = service.getValidationRules();
      expect(rules).toBeDefined();
    });

    it('should handle undefined validation rules gracefully', () => {
      service.updateValidationRules(undefined as any);
      const rules = service.getValidationRules();
      expect(rules).toBeDefined();
    });

    it('should handle very long input strings', () => {
      const veryLongString = 'A'.repeat(10000);
      const result = service.sanitizeString(veryLongString, 'nome');
      expect(result.length).toBeLessThanOrEqual(DEFAULT_VALIDATION_RULES.nome.maxLength);
    });

    it('should handle special characters in input', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = service.sanitizeString(specialChars, 'nome');
      expect(result).toBeDefined();
    });

    it('should handle unicode characters', () => {
      const unicode = 'Café com açúcar 🍰';
      const result = service.sanitizeString(unicode, 'nome');
      expect(result).toContain('Café');
      expect(result).toContain('açúcar');
    });

    it('should handle mixed content types', () => {
      const mixed = 123 as any;
      const validator = service.requiredValidator('nome');
      const control = new FormControl(mixed);

      const result = validator(control);
      expect(result).toBeNull(); // Should handle non-string values
    });
  });
});
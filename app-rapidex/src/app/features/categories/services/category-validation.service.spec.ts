import { TestBed } from '@angular/core/testing';
import { AbstractControl } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { CategoryValidationService, DEFAULT_VALIDATION_RULES } from './category-validation.service';
import { CategoryHttpService } from './category-http.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../models/category-dto.models';

describe('CategoryValidationService', () => {
  let service: CategoryValidationService;
  let categoryServiceSpy: jasmine.SpyObj<CategoryHttpService>;
  let estabelecimentoServiceSpy: jasmine.SpyObj<EstabelecimentoService>;

  const mockEstablishment = {
    id: 1,
    nome: 'Test Establishment',
    ativo: true
  };

  beforeEach(() => {
    const categoryServiceSpyObj = jasmine.createSpyObj('CategoryHttpService', [
      'validateCategoryName'
    ]);
    const estabelecimentoServiceSpyObj = jasmine.createSpyObj('EstabelecimentoService', [], {
      selectedEstabelecimento$: of(mockEstablishment)
    });

    TestBed.configureTestingModule({
      providers: [
        CategoryValidationService,
        { provide: CategoryHttpService, useValue: categoryServiceSpyObj },
        { provide: EstabelecimentoService, useValue: estabelecimentoServiceSpyObj }
      ]
    });

    service = TestBed.inject(CategoryValidationService);
    categoryServiceSpy = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    estabelecimentoServiceSpy = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Validation Rules Management', () => {
    it('should return default validation rules', () => {
      const rules = service.getValidationRules();
      expect(rules).toEqual(DEFAULT_VALIDATION_RULES);
    });

    it('should update validation rules partially', () => {
      const newRules = {
        nome: { 
          minLength: 3, 
          maxLength: 50,
          required: true,
          pattern: /^[a-zA-Z]+$/,
          forbiddenWords: ['test']
        }
      };

      service.updateValidationRules(newRules);
      const updatedRules = service.getValidationRules();

      expect(updatedRules.nome.minLength).toBe(3);
      expect(updatedRules.nome.maxLength).toBe(50);
      expect(updatedRules.nome.required).toBe(true);
    });
  });

  describe('Synchronous Validators', () => {
    describe('requiredValidator', () => {
      it('should return error for empty value', () => {
        const validator = service.requiredValidator('nome');
        const control = { value: '' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          required: {
            field: 'nome',
            code: 'REQUIRED',
            message: 'Nome é obrigatório',
            value: ''
          }
        });
      });

      it('should return error for whitespace-only value', () => {
        const validator = service.requiredValidator('nome');
        const control = { value: '   ' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          required: {
            field: 'nome',
            code: 'REQUIRED',
            message: 'Nome é obrigatório',
            value: '   '
          }
        });
      });

      it('should return null for valid value', () => {
        const validator = service.requiredValidator('nome');
        const control = { value: 'Valid Name' } as AbstractControl;

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('minLengthValidator', () => {
      it('should return error for value shorter than minimum', () => {
        const validator = service.minLengthValidator('nome', 3);
        const control = { value: 'AB' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          minlength: {
            field: 'nome',
            code: 'MIN_LENGTH',
            message: 'Nome deve ter pelo menos 3 caracteres',
            value: 'AB',
            params: { requiredLength: 3, actualLength: 2 }
          }
        });
      });

      it('should return null for value meeting minimum length', () => {
        const validator = service.minLengthValidator('nome', 3);
        const control = { value: 'ABC' } as AbstractControl;

        const result = validator(control);

        expect(result).toBeNull();
      });

      it('should handle trimming for length calculation', () => {
        const validator = service.minLengthValidator('nome', 3);
        const control = { value: '  AB  ' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          minlength: {
            field: 'nome',
            code: 'MIN_LENGTH',
            message: 'Nome deve ter pelo menos 3 caracteres',
            value: '  AB  ',
            params: { requiredLength: 3, actualLength: 2 }
          }
        });
      });
    });

    describe('maxLengthValidator', () => {
      it('should return error for value longer than maximum', () => {
        const validator = service.maxLengthValidator('nome', 5);
        const control = { value: 'ABCDEF' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          maxlength: {
            field: 'nome',
            code: 'MAX_LENGTH',
            message: 'Nome deve ter no máximo 5 caracteres',
            value: 'ABCDEF',
            params: { requiredLength: 5, actualLength: 6 }
          }
        });
      });

      it('should return null for value within maximum length', () => {
        const validator = service.maxLengthValidator('nome', 5);
        const control = { value: 'ABCDE' } as AbstractControl;

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('xssPreventionValidator', () => {
      it('should detect script tags', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = { value: '<script>alert("xss")</script>' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          xss: {
            field: 'nome',
            code: 'XSS_SCRIPT',
            message: 'Nome não pode conter scripts',
            value: '<script>alert("xss")</script>'
          }
        });
      });

      it('should detect javascript protocol', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = { value: 'javascript:alert("xss")' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          xss: {
            field: 'nome',
            code: 'XSS_JAVASCRIPT',
            message: 'Nome não pode conter código JavaScript',
            value: 'javascript:alert("xss")'
          }
        });
      });

      it('should detect event handlers', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = { value: 'onclick=alert("xss")' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          xss: {
            field: 'nome',
            code: 'XSS_EVENT_HANDLER',
            message: 'Nome não pode conter manipuladores de eventos',
            value: 'onclick=alert("xss")'
          }
        });
      });

      it('should detect HTML tags when not allowed', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = { value: '<div>content</div>' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          html: {
            field: 'nome',
            code: 'HTML_NOT_ALLOWED',
            message: 'Nome não pode conter tags HTML',
            value: '<div>content</div>'
          }
        });
      });

      it('should return null for safe content', () => {
        const validator = service.xssPreventionValidator('nome');
        const control = { value: 'Safe Category Name' } as AbstractControl;

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('forbiddenWordsValidator', () => {
      it('should detect forbidden words', () => {
        const validator = service.forbiddenWordsValidator('nome', ['admin', 'root']);
        const control = { value: 'admin category' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          forbiddenWord: {
            field: 'nome',
            code: 'FORBIDDEN_WORD',
            message: 'Nome não pode conter a palavra "admin"',
            value: 'admin category',
            params: { forbiddenWord: 'admin' }
          }
        });
      });

      it('should be case insensitive', () => {
        const validator = service.forbiddenWordsValidator('nome', ['admin']);
        const control = { value: 'ADMIN Category' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          forbiddenWord: {
            field: 'nome',
            code: 'FORBIDDEN_WORD',
            message: 'Nome não pode conter a palavra "admin"',
            value: 'ADMIN Category',
            params: { forbiddenWord: 'admin' }
          }
        });
      });

      it('should return null for allowed words', () => {
        const validator = service.forbiddenWordsValidator('nome', ['admin', 'root']);
        const control = { value: 'Valid Category Name' } as AbstractControl;

        const result = validator(control);

        expect(result).toBeNull();
      });
    });

    describe('whitespaceValidator', () => {
      it('should detect leading/trailing whitespace', () => {
        const validator = service.whitespaceValidator('nome');
        const control = { value: '  Category Name  ' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          whitespace: {
            field: 'nome',
            code: 'LEADING_TRAILING_WHITESPACE',
            message: 'Nome não pode começar ou terminar com espaços',
            value: '  Category Name  '
          }
        });
      });

      it('should detect excessive consecutive spaces', () => {
        const validator = service.whitespaceValidator('nome');
        const control = { value: 'Category    Name' } as AbstractControl;

        const result = validator(control);

        expect(result).toEqual({
          whitespace: {
            field: 'nome',
            code: 'EXCESSIVE_WHITESPACE',
            message: 'Nome não pode ter mais de 2 espaços consecutivos',
            value: 'Category    Name',
            params: { maxConsecutiveSpaces: 2 }
          }
        });
      });

      it('should return null for properly formatted text', () => {
        const validator = service.whitespaceValidator('nome');
        const control = { value: 'Category Name' } as AbstractControl;

        const result = validator(control);

        expect(result).toBeNull();
      });
    });
  });

  describe('Asynchronous Validators', () => {
    describe('uniqueNameValidator', () => {
      it('should return null for short values', (done) => {
        const validator = service.uniqueNameValidator();
        const control = { value: 'A' } as AbstractControl;

        const result = validator(control);
        if (result instanceof Promise) {
          result.then((res: any) => {
            expect(res).toBeNull();
            done();
          });
        } else {
          result.subscribe((res: any) => {
            expect(res).toBeNull();
            done();
          });
        }
      });

      it('should validate unique name successfully', (done) => {
        categoryServiceSpy.validateCategoryName.and.returnValue(of(true));
        const validator = service.uniqueNameValidator();
        const control = { value: 'Unique Name' } as AbstractControl;

        const result = validator(control);
        if (result instanceof Promise) {
          result.then((res: any) => {
            expect(res).toBeNull();
            expect(categoryServiceSpy.validateCategoryName).toHaveBeenCalledWith(
              mockEstablishment.id,
              'Unique Name',
              undefined
            );
            done();
          });
        } else {
          result.subscribe((res: any) => {
            expect(res).toBeNull();
            expect(categoryServiceSpy.validateCategoryName).toHaveBeenCalledWith(
              mockEstablishment.id,
              'Unique Name',
              undefined
            );
            done();
          });
        }
      });

      it('should return error for duplicate name', (done) => {
        categoryServiceSpy.validateCategoryName.and.returnValue(of(false));
        const validator = service.uniqueNameValidator();
        const control = { value: 'Duplicate Name' } as AbstractControl;

        const result = validator(control);
        if (result instanceof Promise) {
          result.then((res: any) => {
            expect(res).toEqual({
              unique: {
                field: 'nome',
                code: 'NOT_UNIQUE',
                message: 'Nome já existe neste estabelecimento',
                value: 'Duplicate Name',
                params: { estabelecimentoId: mockEstablishment.id }
              }
            });
            done();
          });
        } else {
          result.subscribe((res: any) => {
            expect(res).toEqual({
              unique: {
                field: 'nome',
                code: 'NOT_UNIQUE',
                message: 'Nome já existe neste estabelecimento',
                value: 'Duplicate Name',
                params: { estabelecimentoId: mockEstablishment.id }
              }
            });
            done();
          });
        }
      });

      it('should handle validation service errors gracefully', (done) => {
        categoryServiceSpy.validateCategoryName.and.returnValue(throwError(() => new Error('Service error')));
        const validator = service.uniqueNameValidator();
        const control = { value: 'Test Name' } as AbstractControl;

        const result = validator(control);
        if (result instanceof Promise) {
          result.then((res: any) => {
            expect(res).toBeNull(); // Should not block form on service errors
            done();
          });
        } else {
          result.subscribe((res: any) => {
            expect(res).toBeNull(); // Should not block form on service errors
            done();
          });
        }
      });

      it('should exclude current category ID when editing', (done) => {
        categoryServiceSpy.validateCategoryName.and.returnValue(of(true));
        const validator = service.uniqueNameValidator(123);
        const control = { value: 'Test Name' } as AbstractControl;

        const result = validator(control);
        if (result instanceof Promise) {
          result.then((res: any) => {
            expect(categoryServiceSpy.validateCategoryName).toHaveBeenCalledWith(
              mockEstablishment.id,
              'Test Name',
              123
            );
            done();
          });
        } else {
          result.subscribe((res: any) => {
            expect(categoryServiceSpy.validateCategoryName).toHaveBeenCalledWith(
              mockEstablishment.id,
              'Test Name',
              123
            );
            done();
          });
        }
      });
    });
  });

  describe('Data Sanitization', () => {
    describe('sanitizeString', () => {
      it('should remove script tags', () => {
        const result = service.sanitizeString('<script>alert("xss")</script>Category', 'nome');
        expect(result).toBe('Category');
      });

      it('should remove javascript protocol', () => {
        const result = service.sanitizeString('javascript:alert("xss")Category', 'nome');
        expect(result).toBe('Category');
      });

      it('should remove event handlers', () => {
        const result = service.sanitizeString('onclick=alert("xss")Category', 'nome');
        expect(result).toBe('Category');
      });

      it('should remove HTML tags', () => {
        const result = service.sanitizeString('<div>Category</div>', 'nome');
        expect(result).toBe('Category');
      });

      it('should normalize excessive whitespace', () => {
        const result = service.sanitizeString('Category    Name', 'nome');
        expect(result).toBe('Category  Name'); // Reduced to max allowed spaces
      });

      it('should trim input', () => {
        const result = service.sanitizeString('  Category Name  ', 'nome');
        expect(result).toBe('Category Name');
      });

      it('should enforce length limits', () => {
        const longString = 'A'.repeat(150);
        const result = service.sanitizeString(longString, 'nome');
        expect(result.length).toBe(100); // Max length for nome
      });
    });

    describe('sanitizeCreateRequest', () => {
      it('should sanitize all fields', () => {
        const request: CreateCategoryRequest = {
          nome: '  <script>alert("xss")</script>Category  ',
          descricao: '<div>Description</div>  '
        };

        const result = service.sanitizeCreateRequest(request);

        expect(result).toEqual({
          nome: 'Category',
          descricao: 'Description'
        });
      });
    });

    describe('sanitizeUpdateRequest', () => {
      it('should sanitize all fields including ativo', () => {
        const request: UpdateCategoryRequest = {
          nome: '  <script>alert("xss")</script>Category  ',
          descricao: '<div>Description</div>  ',
          ativo: true
        };

        const result = service.sanitizeUpdateRequest(request);

        expect(result).toEqual({
          nome: 'Category',
          descricao: 'Description',
          ativo: true
        });
      });
    });
  });

  describe('Validation Orchestration', () => {
    describe('validateCreateRequest', () => {
      it('should validate valid create request', () => {
        const request: CreateCategoryRequest = {
          nome: 'Valid Category',
          descricao: 'Valid description'
        };

        const result = service.validateCreateRequest(request);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.sanitizedData).toEqual({
          nome: 'Valid Category',
          descricao: 'Valid description'
        });
      });

      it('should detect validation errors', () => {
        const request: CreateCategoryRequest = {
          nome: '', // Required field empty
          descricao: 'A'.repeat(600) // Too long
        };

        const result = service.validateCreateRequest(request);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.sanitizedData).toBeUndefined();
      });

      it('should detect security issues', () => {
        const request: CreateCategoryRequest = {
          nome: '<script>alert("xss")</script>',
          descricao: 'Valid description'
        };

        const result = service.validateCreateRequest(request);

        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.code === 'XSS_SCRIPT')).toBe(true);
      });
    });

    describe('validateUpdateRequest', () => {
      it('should validate valid update request', () => {
        const request: UpdateCategoryRequest = {
          nome: 'Valid Category',
          descricao: 'Valid description',
          ativo: true
        };

        const result = service.validateUpdateRequest(request);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.sanitizedData).toEqual({
          nome: 'Valid Category',
          descricao: 'Valid description',
          ativo: true
        });
      });

      it('should validate ativo field type', () => {
        const request: UpdateCategoryRequest = {
          nome: 'Valid Category',
          descricao: 'Valid description',
          ativo: 'true' as any // Invalid type
        };

        const result = service.validateUpdateRequest(request);

        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.code === 'INVALID_TYPE')).toBe(true);
      });
    });
  });

  describe('Validator Factories', () => {
    describe('getNomeValidators', () => {
      it('should return sync and async validators for nome field', () => {
        const validators = service.getNomeValidators();

        expect(validators.sync.length).toBeGreaterThan(0);
        expect(validators.async.length).toBeGreaterThan(0);
      });

      it('should include excludeId in async validator when provided', () => {
        const validators = service.getNomeValidators(123);

        expect(validators.async.length).toBeGreaterThan(0);
        // The excludeId is passed to the uniqueNameValidator internally
      });
    });

    describe('getDescricaoValidators', () => {
      it('should return sync validators for descricao field', () => {
        const validators = service.getDescricaoValidators();

        expect(validators.sync.length).toBeGreaterThan(0);
        expect(validators.async.length).toBe(0); // No async validation for description
      });
    });
  });
});
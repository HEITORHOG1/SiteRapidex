import { CategoryHttpService } from './category-http.service';
import { ApiConfigService } from '../../../core/services/api-config.service';
import { HttpClient } from '@angular/common/http';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../models';

/**
 * Integration test to verify CategoryHttpService implementation
 * This test validates the service structure and methods without requiring a browser
 */
describe('CategoryHttpService Integration', () => {
  let service: CategoryHttpService;
  let mockHttpClient: jasmine.SpyObj<HttpClient>;
  let mockApiConfig: jasmine.SpyObj<ApiConfigService>;

  beforeEach(() => {
    mockHttpClient = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete']);
    mockApiConfig = jasmine.createSpyObj('ApiConfigService', ['getConfiguredEndpoint', 'getBaseUrl']);
    
    // Create service instance manually for integration testing
    service = new CategoryHttpService();
    (service as any).http = mockHttpClient;
    (service as any).apiConfig = mockApiConfig;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have all required CRUD methods', () => {
    expect(service.getCategories).toBeDefined();
    expect(service.getCategoryById).toBeDefined();
    expect(service.getCategoryDetail).toBeDefined();
    expect(service.createCategory).toBeDefined();
    expect(service.updateCategory).toBeDefined();
    expect(service.deleteCategory).toBeDefined();
    expect(service.validateCategoryName).toBeDefined();
    expect(service.validateCategoryDeletion).toBeDefined();
    expect(service.searchCategories).toBeDefined();
  });

  it('should validate establishment ID correctly', () => {
    expect(() => (service as any).validateEstablishmentId(0)).toThrow();
    expect(() => (service as any).validateEstablishmentId(-1)).toThrow();
    expect(() => (service as any).validateEstablishmentId(null)).toThrow();
    expect(() => (service as any).validateEstablishmentId(undefined)).toThrow();
    expect(() => (service as any).validateEstablishmentId(1)).not.toThrow();
  });

  it('should validate category ID correctly', () => {
    expect(() => (service as any).validateCategoryId(0)).toThrow();
    expect(() => (service as any).validateCategoryId(-1)).toThrow();
    expect(() => (service as any).validateCategoryId(null)).toThrow();
    expect(() => (service as any).validateCategoryId(undefined)).toThrow();
    expect(() => (service as any).validateCategoryId(1)).not.toThrow();
  });

  it('should validate create request correctly', () => {
    const validRequest: CreateCategoryRequest = {
      nome: 'Bebidas',
      descricao: 'Categoria de bebidas'
    };

    const invalidRequests = [
      null,
      undefined,
      { nome: '', descricao: 'test' },
      { nome: 'A', descricao: 'test' },
      { nome: 'A'.repeat(101), descricao: 'test' },
      { nome: 'Test', descricao: 'A'.repeat(501) }
    ];

    expect(() => (service as any).validateCreateRequest(validRequest)).not.toThrow();
    
    invalidRequests.forEach(request => {
      expect(() => (service as any).validateCreateRequest(request)).toThrow();
    });
  });

  it('should validate update request correctly', () => {
    const validRequest: UpdateCategoryRequest = {
      nome: 'Bebidas',
      descricao: 'Categoria de bebidas',
      ativo: true
    };

    const invalidRequests = [
      null,
      undefined,
      { nome: '', descricao: 'test', ativo: true },
      { nome: 'A', descricao: 'test', ativo: true },
      { nome: 'A'.repeat(101), descricao: 'test', ativo: true },
      { nome: 'Test', descricao: 'A'.repeat(501), ativo: true },
      { nome: 'Test', descricao: 'test', ativo: 'true' as any }
    ];

    expect(() => (service as any).validateUpdateRequest(validRequest)).not.toThrow();
    
    invalidRequests.forEach(request => {
      expect(() => (service as any).validateUpdateRequest(request)).toThrow();
    });
  });

  it('should sanitize strings correctly', () => {
    const testCases = [
      { input: '<script>alert("xss")</script>Test', expected: 'Test' },
      { input: 'Test<script>alert("xss")</script>', expected: 'Test' },
      { input: 'Normal text', expected: 'Normal text' },
      { input: 'Text with <b>tags</b>', expected: 'Text with tags' },
      { input: 'javascript:alert("xss")', expected: 'alert("xss")' },
      { input: 'onclick="alert()"', expected: '' },
      { input: '  Trimmed text  ', expected: 'Trimmed text' }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = (service as any).sanitizeString(input);
      expect(result).toBe(expected);
    });
  });

  it('should build HTTP params correctly', () => {
    const params = {
      page: 1,
      limit: 10,
      search: 'test',
      ativo: true,
      sortBy: 'nome' as const,
      sortOrder: 'asc' as const
    };

    const httpParams = (service as any).buildHttpParams(params);
    
    expect(httpParams.get('page')).toBe('1');
    expect(httpParams.get('limit')).toBe('10');
    expect(httpParams.get('search')).toBe('test');
    expect(httpParams.get('ativo')).toBe('true');
    expect(httpParams.get('sortBy')).toBe('nome');
    expect(httpParams.get('sortOrder')).toBe('asc');
  });

  it('should handle empty params correctly', () => {
    const httpParams = (service as any).buildHttpParams();
    expect(httpParams.keys().length).toBe(0);

    const emptyParams = (service as any).buildHttpParams({});
    expect(emptyParams.keys().length).toBe(0);
  });

  it('should create validation errors correctly', () => {
    const error = (service as any).createValidationError('Test message');
    
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should sanitize create request correctly', () => {
    const maliciousRequest: CreateCategoryRequest = {
      nome: '<script>alert("xss")</script>Bebidas',
      descricao: 'Descrição com <script>alert("xss")</script> script'
    };

    const sanitized = (service as any).sanitizeCreateRequest(maliciousRequest);
    
    expect(sanitized.nome).toBe('Bebidas');
    expect(sanitized.descricao).toBe('Descrição com  script');
  });

  it('should sanitize update request correctly', () => {
    const maliciousRequest: UpdateCategoryRequest = {
      nome: '<script>alert("xss")</script>Bebidas',
      descricao: 'Descrição com <script>alert("xss")</script> script',
      ativo: true
    };

    const sanitized = (service as any).sanitizeUpdateRequest(maliciousRequest);
    
    expect(sanitized.nome).toBe('Bebidas');
    expect(sanitized.descricao).toBe('Descrição com  script');
    expect(sanitized.ativo).toBe(true);
  });
});
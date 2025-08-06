import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CategoryHttpService } from '../services/category-http.service';
import { validateCategoryRouteParams } from './category-ownership.guard';

describe('CategoryOwnershipGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockEstabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let mockCategoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated', 'isProprietario', 'getUserId'
    ]);
    const estabelecimentoServiceSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento'
    ]);
    const categoryHttpServiceSpy = jasmine.createSpyObj('CategoryHttpService', [
      'getCategoryById'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoServiceSpy },
        { provide: CategoryHttpService, useValue: categoryHttpServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockEstabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    mockCategoryHttpService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('Route Parameter Validation', () => {
    it('should validate valid route parameters', () => {
      const validRoute = {
        params: { estabelecimentoId: '1', id: '2' }
      } as any;

      const result = validateCategoryRouteParams(validRoute);

      expect(result.isValid).toBe(true);
      expect(result.estabelecimentoId).toBe(1);
      expect(result.categoryId).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid establishment ID', () => {
      const invalidRoute = {
        params: { estabelecimentoId: 'invalid', id: '2' }
      } as any;

      const result = validateCategoryRouteParams(invalidRoute);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID do estabelecimento inválido');
    });

    it('should detect missing establishment ID', () => {
      const invalidRoute = {
        params: { id: '2' }
      } as any;

      const result = validateCategoryRouteParams(invalidRoute);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID do estabelecimento não fornecido');
    });

    it('should allow missing category ID for list routes', () => {
      const listRoute = {
        params: { estabelecimentoId: '1' }
      } as any;

      const result = validateCategoryRouteParams(listRoute);

      expect(result.isValid).toBe(true);
      expect(result.estabelecimentoId).toBe(1);
      expect(result.categoryId).toBeUndefined();
    });
  });

  describe('Service Dependencies', () => {
    it('should inject all required services', () => {
      expect(mockAuthService).toBeDefined();
      expect(mockEstabelecimentoService).toBeDefined();
      expect(mockCategoryHttpService).toBeDefined();
      expect(mockRouter).toBeDefined();
    });
  });
});

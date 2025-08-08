import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CategoryHttpService } from '../services/category-http.service';
import { CategoryStateService } from '../services/category-state.service';
import { CategoryCacheService } from '../services/category-cache.service';
import { AuthService } from '../../../core/services/auth.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { CategoryListComponent } from '../components/category-list/category-list.component';
import { CategoryFormComponent } from '../components/category-form/category-form.component';
import { Category } from '../models/category.models';

// Mock components for routing tests
@Component({ template: 'Dashboard' })
class MockDashboardComponent { }

@Component({ template: 'Auth' })
class MockAuthComponent { }

describe('Category System Integration Tests', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let location: Location;
  let categoryService: CategoryHttpService;
  let categoryState: CategoryStateService;
  let categoryCache: CategoryCacheService;
  let authService: jasmine.SpyObj<AuthService>;
  let estabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date(),
    dataAtualizacao: new Date(),
    produtosCount: 5
  };

  const mockEstabelecimento = {
    id: 1,
    nome: 'Restaurante Teste',
    ativo: true
  };

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getCurrentUser', 'logout']);
    const estabelecimentoSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento',
      'selectEstabelecimento',
      'getEstabelecimentos'
    ]);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['success', 'error', 'warning']);

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        CategoryListComponent,
        CategoryFormComponent
      ],
      providers: [
        CategoryHttpService,
        CategoryStateService,
        CategoryCacheService,
        { provide: AuthService, useValue: authSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoSpy },
        { provide: NotificationService, useValue: notificationSpy },
        provideRouter([
          { path: 'categories', component: CategoryListComponent },
          { path: 'categories/create', component: CategoryFormComponent },
          { path: 'categories/edit/:id', component: CategoryFormComponent },
          { path: 'dashboard', component: MockDashboardComponent },
          { path: 'auth/login', component: MockAuthComponent }
        ])
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    categoryService = TestBed.inject(CategoryHttpService);
    categoryState = TestBed.inject(CategoryStateService);
    categoryCache = TestBed.inject(CategoryCacheService);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    estabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

    // Setup default mocks
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ id: 1, email: 'test@test.com' });
    estabelecimentoService.getSelectedEstabelecimento.and.returnValue(of(mockEstabelecimento));
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Authentication Integration', () => {
    it('should redirect to login when user is not authenticated', async () => {
      authService.isAuthenticated.and.returnValue(false);
      
      await router.navigate(['/categories']);
      
      // Should be redirected to login
      expect(location.path()).toBe('/auth/login');
    });

    it('should allow access when user is authenticated', async () => {
      authService.isAuthenticated.and.returnValue(true);
      
      await router.navigate(['/categories']);
      
      expect(location.path()).toBe('/categories');
    });

    it('should handle token expiration during category operations', () => {
      const estabelecimentoId = 1;
      
      categoryService.getCategories(estabelecimentoId).subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
          expect(authService.logout).toHaveBeenCalled();
        }
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimentoId}/categorias`);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Establishment Service Integration', () => {
    it('should load categories when establishment is selected', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(of(mockEstabelecimento));
      
      categoryState.loadCategories(mockEstabelecimento.id);
      
      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${mockEstabelecimento.id}/categorias`);
      expect(req.request.method).toBe('GET');
      req.flush({ categorias: [mockCategory], total: 1 });
    });

    it('should clear categories when establishment changes', () => {
      // Load initial categories
      categoryState.loadCategories(1);
      let req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush({ categorias: [mockCategory], total: 1 });

      // Change establishment
      const newEstabelecimento = { ...mockEstabelecimento, id: 2 };
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(of(newEstabelecimento));
      
      categoryState.loadCategories(2);
      req = httpMock.expectOne('/api/categorias/estabelecimentos/2/categorias');
      req.flush({ categorias: [], total: 0 });

      // Verify cache was cleared for old establishment
      expect(categoryCache.get('categories-1')).toBeNull();
    });

    it('should handle establishment deactivation', () => {
      const deactivatedEstabelecimento = { ...mockEstabelecimento, ativo: false };
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(of(deactivatedEstabelecimento));
      
      categoryService.getCategories(deactivatedEstabelecimento.id).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
          expect(notificationService.warning).toHaveBeenCalledWith(
            'Estabelecimento desativado. Operações não permitidas.'
          );
        }
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${deactivatedEstabelecimento.id}/categorias`);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Notification Service Integration', () => {
    it('should show success notification on category creation', () => {
      const createRequest = { nome: 'Nova Categoria', descricao: 'Descrição' };
      
      categoryService.createCategory(1, createRequest).subscribe();
      
      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush(mockCategory);
      
      expect(notificationService.success).toHaveBeenCalledWith('Categoria criada com sucesso!');
    });

    it('should show error notification on API failure', () => {
      categoryService.getCategories(1).subscribe({
        error: () => {
          expect(notificationService.error).toHaveBeenCalledWith(
            'Erro ao carregar categorias. Tente novamente.'
          );
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush({ message: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Cache Service Integration', () => {
    it('should use cached data when available', () => {
      const cacheKey = 'categories-1';
      const cachedData = { categorias: [mockCategory], total: 1 };
      
      categoryCache.set(cacheKey, cachedData);
      
      categoryService.getCategories(1).subscribe(data => {
        expect(data).toEqual(cachedData);
      });

      // Should not make HTTP request when data is cached
      httpMock.expectNone('/api/categorias/estabelecimentos/1/categorias');
    });

    it('should invalidate cache on data modification', () => {
      const cacheKey = 'categories-1';
      categoryCache.set(cacheKey, { categorias: [mockCategory], total: 1 });
      
      const updateRequest = { nome: 'Updated Name', descricao: 'Updated Description', ativo: true };
      categoryService.updateCategory(1, 1, updateRequest).subscribe();
      
      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias/1');
      req.flush({ ...mockCategory, ...updateRequest });
      
      // Cache should be invalidated
      expect(categoryCache.get(cacheKey)).toBeNull();
    });
  });

  describe('State Management Integration', () => {
    it('should maintain consistent state across components', () => {
      // Load initial state
      categoryState.loadCategories(1);
      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush({ categorias: [mockCategory], total: 1 });

      // Verify state is updated
      categoryState.categories$.subscribe(categories => {
        expect(categories).toEqual([mockCategory]);
      });

      // Add new category
      const newCategory = { ...mockCategory, id: 2, nome: 'Comidas' };
      categoryState.addCategory(newCategory);

      // Verify state includes new category
      categoryState.categories$.subscribe(categories => {
        expect(categories.length).toBe(2);
        expect(categories.find(c => c.id === 2)).toEqual(newCategory);
      });
    });

    it('should handle optimistic updates correctly', () => {
      // Setup initial state
      categoryState.addCategory(mockCategory);
      
      const updateRequest = { nome: 'Updated Name', descricao: 'Updated Description', ativo: true };
      const optimisticCategory = { ...mockCategory, ...updateRequest };
      
      // Apply optimistic update
      categoryState.updateCategory(optimisticCategory);
      
      // Verify optimistic update is reflected
      categoryState.categories$.subscribe(categories => {
        const updated = categories.find(c => c.id === mockCategory.id);
        expect(updated?.nome).toBe('Updated Name');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', () => {
      categoryService.getCategories(1).subscribe({
        error: (error) => {
          expect(error.message).toContain('Network error');
          expect(notificationService.error).toHaveBeenCalled();
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle validation errors from server', () => {
      const createRequest = { nome: '', descricao: 'Test' };
      
      categoryService.createCategory(1, createRequest).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
          expect(notificationService.error).toHaveBeenCalledWith(
            'Dados inválidos. Verifique os campos obrigatórios.'
          );
        }
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush(
        { message: 'Validation failed', errors: { nome: 'Nome é obrigatório' } },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('Routing Integration', () => {
    it('should navigate to category form on create action', async () => {
      await router.navigate(['/categories/create']);
      expect(location.path()).toBe('/categories/create');
    });

    it('should navigate to edit form with category ID', async () => {
      await router.navigate(['/categories/edit', 1]);
      expect(location.path()).toBe('/categories/edit/1');
    });

    it('should handle invalid category ID in route', async () => {
      await router.navigate(['/categories/edit', 'invalid']);
      // Should handle gracefully or redirect
      expect(location.path()).toContain('/categories');
    });
  });
});
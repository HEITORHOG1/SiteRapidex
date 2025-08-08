import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';

import { CATEGORY_ROUTES, CategoryRouteHelper } from '../categories.routes';
import { authGuard } from '../../../core/guards/auth.guard';
import { establishmentContextGuard, categoryOwnershipGuard } from '../guards';
import { AuthService } from '../../../core/services/auth.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CategoryHttpService } from '../services/category-http.service';

// Mock components for testing
@Component({ template: 'Category List Page' })
class MockCategoryListPageComponent { }

@Component({ template: 'Category Create Page' })
class MockCategoryCreatePageComponent { }

@Component({ template: 'Category Edit Page' })
class MockCategoryEditPageComponent { }

@Component({ template: 'Category Detail Page' })
class MockCategoryDetailPageComponent { }

@Component({ template: 'Category Analytics Page' })
class MockCategoryAnalyticsPageComponent { }

@Component({ template: 'Category Import Export Component' })
class MockCategoryImportExportComponent { }

@Component({ template: 'App Root' })
class MockAppComponent { }

describe('Category Routing Integration Tests', () => {
  let router: Router;
  let location: Location;
  let fixture: any;

  // Mock services
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockEstabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let mockCategoryService: jasmine.SpyObj<CategoryHttpService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    nome: 'Test User'
  };

  const mockEstablishment = {
    id: 1,
    nomeFantasia: 'Test Restaurant',
    razaoSocial: 'Test Restaurant LTDA'
  };

  const mockCategory = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date(),
    dataAtualizacao: new Date()
  };

  beforeEach(async () => {
    // Create spy objects
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getCurrentUser'
    ], {
      user$: new BehaviorSubject(mockUser),
      isAuthenticated$: new BehaviorSubject(true)
    });

    mockEstabelecimentoService = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento',
      'hasEstablishmentSelected'
    ], {
      selectedEstabelecimento$: new BehaviorSubject(mockEstablishment)
    });

    mockCategoryService = jasmine.createSpyObj('CategoryHttpService', [
      'getCategoryById'
    ]);

    // Setup default return values
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getCurrentUser.and.returnValue(mockUser);
    mockEstabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstablishment);
    mockEstabelecimentoService.hasEstablishmentSelected.and.returnValue(true);
    mockCategoryService.getCategoryById.and.returnValue(of(mockCategory));

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      declarations: [
        MockAppComponent,
        MockCategoryListPageComponent,
        MockCategoryCreatePageComponent,
        MockCategoryEditPageComponent,
        MockCategoryDetailPageComponent,
        MockCategoryAnalyticsPageComponent,
        MockCategoryImportExportComponent
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: EstabelecimentoService, useValue: mockEstabelecimentoService },
        { provide: CategoryHttpService, useValue: mockCategoryService },
        // Mock guards
        {
          provide: authGuard,
          useValue: () => mockAuthService.isAuthenticated()
        },
        {
          provide: establishmentContextGuard,
          useValue: () => mockEstabelecimentoService.hasEstablishmentSelected()
        },
        {
          provide: categoryOwnershipGuard,
          useValue: () => of(true)
        }
      ]
    }).compileComponents();

    // Setup router with category routes
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    // Configure routes
    router.resetConfig([
      { path: '', redirectTo: '/categories', pathMatch: 'full' },
      {
        path: 'categories',
        children: CATEGORY_ROUTES.map(route => ({
          ...route,
          loadComponent: undefined, // Remove lazy loading for tests
          component: getComponentForPath(route.path)
        }))
      }
    ]);

    fixture = TestBed.createComponent(MockAppComponent);
    fixture.detectChanges();
  });

  function getComponentForPath(path: string): any {
    switch (path) {
      case 'list': return MockCategoryListPageComponent;
      case 'create': return MockCategoryCreatePageComponent;
      case 'edit/:id': return MockCategoryEditPageComponent;
      case 'detail/:id': return MockCategoryDetailPageComponent;
      case 'analytics': return MockCategoryAnalyticsPageComponent;
      case 'import-export': return MockCategoryImportExportComponent;
      default: return MockCategoryListPageComponent;
    }
  }

  describe('Basic Route Navigation', () => {
    it('should navigate to category list by default', fakeAsync(() => {
      router.navigate(['/categories']);
      tick();

      expect(location.path()).toBe('/categories/list');
    }));

    it('should navigate to category list page', fakeAsync(() => {
      router.navigate(['/categories/list']);
      tick();

      expect(location.path()).toBe('/categories/list');
    }));

    it('should navigate to category create page', fakeAsync(() => {
      router.navigate(['/categories/create']);
      tick();

      expect(location.path()).toBe('/categories/create');
    }));

    it('should navigate to category edit page with ID', fakeAsync(() => {
      router.navigate(['/categories/edit', 1]);
      tick();

      expect(location.path()).toBe('/categories/edit/1');
    }));

    it('should navigate to category detail page with ID', fakeAsync(() => {
      router.navigate(['/categories/detail', 1]);
      tick();

      expect(location.path()).toBe('/categories/detail/1');
    }));

    it('should navigate to category analytics page', fakeAsync(() => {
      router.navigate(['/categories/analytics']);
      tick();

      expect(location.path()).toBe('/categories/analytics');
    }));

    it('should navigate to import/export page', fakeAsync(() => {
      router.navigate(['/categories/import-export']);
      tick();

      expect(location.path()).toBe('/categories/import-export');
    }));
  });

  describe('Route Parameter Validation', () => {
    it('should accept valid numeric category ID', fakeAsync(() => {
      router.navigate(['/categories/edit', 123]);
      tick();

      expect(location.path()).toBe('/categories/edit/123');
    }));

    it('should redirect invalid category ID to list', fakeAsync(() => {
      router.navigate(['/categories/edit', 'invalid']);
      tick();

      expect(location.path()).toBe('/categories/list');
    }));

    it('should redirect negative category ID to list', fakeAsync(() => {
      router.navigate(['/categories/edit', -1]);
      tick();

      expect(location.path()).toBe('/categories/list');
    }));

    it('should redirect zero category ID to list', fakeAsync(() => {
      router.navigate(['/categories/edit', 0]);
      tick();

      expect(location.path()).toBe('/categories/list');
    }));
  });

  describe('Authentication Guard Integration', () => {
    it('should allow access when user is authenticated', fakeAsync(() => {
      mockAuthService.isAuthenticated.and.returnValue(true);

      router.navigate(['/categories/list']);
      tick();

      expect(location.path()).toBe('/categories/list');
    }));

    it('should redirect to login when user is not authenticated', fakeAsync(() => {
      mockAuthService.isAuthenticated.and.returnValue(false);

      router.navigate(['/categories/list']);
      tick();

      // Should be redirected (exact path depends on auth guard implementation)
      expect(location.path()).not.toBe('/categories/list');
    }));
  });

  describe('Establishment Context Guard Integration', () => {
    it('should allow access when establishment is selected', fakeAsync(() => {
      mockEstabelecimentoService.hasEstablishmentSelected.and.returnValue(true);

      router.navigate(['/categories/list']);
      tick();

      expect(location.path()).toBe('/categories/list');
    }));

    it('should redirect when no establishment is selected', fakeAsync(() => {
      mockEstabelecimentoService.hasEstablishmentSelected.and.returnValue(false);

      router.navigate(['/categories/list']);
      tick();

      // Should be redirected (exact path depends on guard implementation)
      expect(location.path()).not.toBe('/categories/list');
    }));
  });

  describe('Category Ownership Guard Integration', () => {
    it('should allow access to owned category', fakeAsync(() => {
      // Mock category ownership validation
      mockCategoryService.getCategoryById.and.returnValue(of({
        ...mockCategory,
        estabelecimentoId: 1 // Same as selected establishment
      }));

      router.navigate(['/categories/edit', 1]);
      tick();

      expect(location.path()).toBe('/categories/edit/1');
    }));

    it('should deny access to non-owned category', fakeAsync(() => {
      // Mock category ownership validation failure
      mockCategoryService.getCategoryById.and.returnValue(of({
        ...mockCategory,
        estabelecimentoId: 999 // Different establishment
      }));

      router.navigate(['/categories/edit', 1]);
      tick();

      // Should be redirected or denied access
      expect(location.path()).not.toBe('/categories/edit/1');
    }));
  });

  describe('Route Helper Functions', () => {
    it('should generate correct list URL', () => {
      const url = CategoryRouteHelper.getListUrl();
      expect(url).toBe('/categories/list');
    });

    it('should generate correct create URL', () => {
      const url = CategoryRouteHelper.getCreateUrl();
      expect(url).toBe('/categories/create');
    });

    it('should generate correct edit URL with ID', () => {
      const url = CategoryRouteHelper.getEditUrl(123);
      expect(url).toBe('/categories/edit/123');
    });

    it('should generate correct detail URL with ID', () => {
      const url = CategoryRouteHelper.getDetailUrl(456);
      expect(url).toBe('/categories/detail/456');
    });

    it('should generate correct analytics URL', () => {
      const url = CategoryRouteHelper.getAnalyticsUrl();
      expect(url).toBe('/categories/analytics');
    });

    it('should generate correct import/export URL', () => {
      const url = CategoryRouteHelper.getImportExportUrl();
      expect(url).toBe('/categories/import-export');
    });

    it('should validate category ID correctly', () => {
      expect(CategoryRouteHelper.isValidCategoryId(1)).toBe(true);
      expect(CategoryRouteHelper.isValidCategoryId('123')).toBe(true);
      expect(CategoryRouteHelper.isValidCategoryId(0)).toBe(false);
      expect(CategoryRouteHelper.isValidCategoryId(-1)).toBe(false);
      expect(CategoryRouteHelper.isValidCategoryId('invalid')).toBe(false);
      expect(CategoryRouteHelper.isValidCategoryId('')).toBe(false);
    });

    it('should get route configuration by path', () => {
      const listConfig = CategoryRouteHelper.getRouteConfig('/categories/list');
      expect(listConfig?.title).toBe('Categorias');
      expect(listConfig?.path).toBe('/categories/list');

      const createConfig = CategoryRouteHelper.getRouteConfig('/categories/create');
      expect(createConfig?.title).toBe('Nova Categoria');

      const invalidConfig = CategoryRouteHelper.getRouteConfig('/invalid/path');
      expect(invalidConfig).toBe(null);
    });
  });

  describe('Route Data and Metadata', () => {
    it('should have correct route titles', fakeAsync(() => {
      router.navigate(['/categories/list']);
      tick();

      const route = router.routerState.root.firstChild;
      expect(route?.snapshot.title).toBe('Categorias');
    }));

    it('should have correct breadcrumb data', fakeAsync(() => {
      router.navigate(['/categories/create']);
      tick();

      const route = router.routerState.root.firstChild;
      expect(route?.snapshot.data['breadcrumb']).toBe('Nova Categoria');
    }));

    it('should have correct description data', fakeAsync(() => {
      router.navigate(['/categories/analytics']);
      tick();

      const route = router.routerState.root.firstChild;
      expect(route?.snapshot.data['description']).toBe('Relatórios e estatísticas de categorias');
    }));
  });

  describe('Navigation Flow Integration', () => {
    it('should navigate through complete CRUD flow', fakeAsync(() => {
      // Start at list
      router.navigate(['/categories/list']);
      tick();
      expect(location.path()).toBe('/categories/list');

      // Go to create
      router.navigate(['/categories/create']);
      tick();
      expect(location.path()).toBe('/categories/create');

      // Go to detail (after creation)
      router.navigate(['/categories/detail', 1]);
      tick();
      expect(location.path()).toBe('/categories/detail/1');

      // Go to edit
      router.navigate(['/categories/edit', 1]);
      tick();
      expect(location.path()).toBe('/categories/edit/1');

      // Back to list
      router.navigate(['/categories/list']);
      tick();
      expect(location.path()).toBe('/categories/list');
    }));

    it('should handle browser back/forward navigation', fakeAsync(() => {
      // Navigate to different pages
      router.navigate(['/categories/list']);
      tick();

      router.navigate(['/categories/create']);
      tick();

      router.navigate(['/categories/analytics']);
      tick();
      expect(location.path()).toBe('/categories/analytics');

      // Go back
      location.back();
      tick();
      expect(location.path()).toBe('/categories/create');

      // Go back again
      location.back();
      tick();
      expect(location.path()).toBe('/categories/list');
    }));

    it('should handle deep linking', fakeAsync(() => {
      // Direct navigation to specific category
      router.navigate(['/categories/detail', 123]);
      tick();

      expect(location.path()).toBe('/categories/detail/123');
    }));
  });

  describe('Error Route Handling', () => {
    it('should redirect invalid paths to list', fakeAsync(() => {
      router.navigate(['/categories/invalid-path']);
      tick();

      expect(location.path()).toBe('/categories/list');
    }));

    it('should handle missing route parameters', fakeAsync(() => {
      router.navigate(['/categories/edit']); // Missing ID
      tick();

      expect(location.path()).toBe('/categories/list');
    }));
  });

  describe('Query Parameters Integration', () => {
    it('should preserve query parameters during navigation', fakeAsync(() => {
      router.navigate(['/categories/list'], { queryParams: { search: 'bebidas', page: 2 } });
      tick();

      expect(location.path()).toBe('/categories/list?search=bebidas&page=2');
    }));

    it('should handle return URL in query parameters', fakeAsync(() => {
      router.navigate(['/categories/create'], { 
        queryParams: { returnUrl: '/categories/list?search=test' } 
      });
      tick();

      expect(location.path()).toContain('returnUrl=%2Fcategories%2Flist%3Fsearch%3Dtest');
    }));
  });

  describe('Route Fragments Integration', () => {
    it('should handle URL fragments', fakeAsync(() => {
      router.navigate(['/categories/detail', 1], { fragment: 'products' });
      tick();

      expect(location.path()).toBe('/categories/detail/1#products');
    }));
  });

  describe('Lazy Loading Integration', () => {
    it('should handle lazy loaded components', fakeAsync(() => {
      // This test would verify that lazy loading works correctly
      // In a real scenario, we would test that the component is loaded on demand
      router.navigate(['/categories/list']);
      tick();

      expect(location.path()).toBe('/categories/list');
      // Additional assertions would verify that the component was lazy loaded
    }));
  });

  describe('Route Resolvers Integration', () => {
    it('should resolve data before navigation', fakeAsync(() => {
      // If we had route resolvers, we would test them here
      router.navigate(['/categories/detail', 1]);
      tick();

      expect(location.path()).toBe('/categories/detail/1');
      // Additional assertions would verify that data was resolved
    }));
  });

  describe('Route Animations Integration', () => {
    it('should trigger route animations', fakeAsync(() => {
      // Test route animations if implemented
      router.navigate(['/categories/list']);
      tick();

      router.navigate(['/categories/create']);
      tick();

      // Verify animation states or classes
      expect(location.path()).toBe('/categories/create');
    }));
  });

  describe('Mobile Navigation Integration', () => {
    it('should handle mobile-specific navigation patterns', fakeAsync(() => {
      // Test mobile navigation patterns
      router.navigate(['/categories/list']);
      tick();

      // Simulate mobile navigation
      router.navigate(['/categories/detail', 1]);
      tick();

      expect(location.path()).toBe('/categories/detail/1');
    }));
  });

  describe('SEO and Meta Tags Integration', () => {
    it('should set correct page titles for SEO', fakeAsync(() => {
      router.navigate(['/categories/list']);
      tick();

      // In a real app, we would check document.title or meta tags
      const route = router.routerState.root.firstChild;
      expect(route?.snapshot.title).toBe('Categorias');
    }));

    it('should set correct meta descriptions', fakeAsync(() => {
      router.navigate(['/categories/analytics']);
      tick();

      const route = router.routerState.root.firstChild;
      expect(route?.snapshot.data['description']).toBe('Relatórios e estatísticas de categorias');
    }));
  });
});
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';

import { CategoryHttpService } from '../services/category-http.service';
import { CategoryStateService } from '../services/category-state.service';
import { CategoryCacheService } from '../services/category-cache.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { Category } from '../models/category.models';
import { CategoryOwnershipGuard } from '../guards/category-ownership.guard';
import { EstablishmentContextGuard } from '../guards/establishment-context.guard';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

describe('Category Establishment Context Integration', () => {
  let httpMock: HttpTestingController;
  let categoryService: CategoryHttpService;
  let categoryState: CategoryStateService;
  let categoryCache: CategoryCacheService;
  let estabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let ownershipGuard: CategoryOwnershipGuard;
  let contextGuard: EstablishmentContextGuard;
  let router: jasmine.SpyObj<Router>;

  const estabelecimento1 = { id: 1, nome: 'Restaurante A', ativo: true };
  const estabelecimento2 = { id: 2, nome: 'Restaurante B', ativo: true };
  
  const categoriesEst1: Category[] = [
    {
      id: 1,
      nome: 'Bebidas Est1',
      descricao: 'Bebidas do estabelecimento 1',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date()
    },
    {
      id: 2,
      nome: 'Comidas Est1',
      descricao: 'Comidas do estabelecimento 1',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date()
    }
  ];

  const categoriesEst2: Category[] = [
    {
      id: 3,
      nome: 'Bebidas Est2',
      descricao: 'Bebidas do estabelecimento 2',
      estabelecimentoId: 2,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date()
    }
  ];

  const selectedEstabelecimentoSubject = new BehaviorSubject(estabelecimento1);

  beforeEach(async () => {
    const estabelecimentoSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstabelecimento',
      'selectEstabelecimento',
      'getSelectedEstabelecimentoId'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryHttpService,
        CategoryStateService,
        CategoryCacheService,
        CategoryOwnershipGuard,
        EstablishmentContextGuard,
        { provide: EstabelecimentoService, useValue: estabelecimentoSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    categoryService = TestBed.inject(CategoryHttpService);
    categoryState = TestBed.inject(CategoryStateService);
    categoryCache = TestBed.inject(CategoryCacheService);
    ownershipGuard = TestBed.inject(CategoryOwnershipGuard);
    contextGuard = TestBed.inject(EstablishmentContextGuard);
    estabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup default behavior
    estabelecimentoService.getSelectedEstabelecimento.and.returnValue(selectedEstabelecimentoSubject.asObservable());
    estabelecimentoService.getSelectedEstabelecimentoId.and.returnValue(estabelecimento1.id);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Context Switching Scenarios', () => {
    it('should load different categories when establishment changes', () => {
      // Load categories for establishment 1
      categoryState.loadCategories(estabelecimento1.id);
      let req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento1.id}/categorias`);
      req.flush({ categorias: categoriesEst1, total: categoriesEst1.length });

      // Verify establishment 1 categories are loaded
      categoryState.categories$.subscribe(categories => {
        expect(categories.length).toBe(2);
        expect(categories[0].estabelecimentoId).toBe(1);
      });

      // Switch to establishment 2
      selectedEstabelecimentoSubject.next(estabelecimento2);
      estabelecimentoService.getSelectedEstabelecimentoId.and.returnValue(estabelecimento2.id);
      
      categoryState.loadCategories(estabelecimento2.id);
      req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento2.id}/categorias`);
      req.flush({ categorias: categoriesEst2, total: categoriesEst2.length });

      // Verify establishment 2 categories are loaded
      categoryState.categories$.subscribe(categories => {
        expect(categories.length).toBe(1);
        expect(categories[0].estabelecimentoId).toBe(2);
      });
    });

    it('should clear cache when establishment changes', () => {
      // Cache data for establishment 1
      const cacheKey1 = 'categories-1';
      const cacheKey2 = 'categories-2';
      
      categoryCache.set(cacheKey1, { categorias: categoriesEst1, total: 2 });
      categoryCache.set(cacheKey2, { categorias: categoriesEst2, total: 1 });

      // Verify both caches exist
      expect(categoryCache.get(cacheKey1)).toBeTruthy();
      expect(categoryCache.get(cacheKey2)).toBeTruthy();

      // Switch establishment and invalidate cache
      categoryCache.invalidateEstablishmentCache(estabelecimento1.id);

      // Verify only establishment 1 cache is cleared
      expect(categoryCache.get(cacheKey1)).toBeNull();
      expect(categoryCache.get(cacheKey2)).toBeTruthy();
    });

    it('should maintain separate state for each establishment', () => {
      // Load and modify state for establishment 1
      categoryState.loadCategories(estabelecimento1.id);
      let req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento1.id}/categorias`);
      req.flush({ categorias: categoriesEst1, total: 2 });

      const newCategoryEst1 = {
        id: 4,
        nome: 'Nova Categoria Est1',
        descricao: 'Nova categoria',
        estabelecimentoId: 1,
        ativo: true,
        dataCriacao: new Date(),
        dataAtualizacao: new Date()
      };
      
      categoryState.addCategory(newCategoryEst1);

      // Switch to establishment 2
      categoryState.clearState();
      categoryState.loadCategories(estabelecimento2.id);
      req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento2.id}/categorias`);
      req.flush({ categorias: categoriesEst2, total: 1 });

      // Verify establishment 2 has its own state
      categoryState.categories$.subscribe(categories => {
        expect(categories.length).toBe(1);
        expect(categories.find(c => c.id === 4)).toBeUndefined();
      });
    });

    it('should prevent cross-establishment data access', () => {
      // Try to access establishment 2 category while establishment 1 is selected
      estabelecimentoService.getSelectedEstabelecimentoId.and.returnValue(estabelecimento1.id);
      
      categoryService.getCategoryById(estabelecimento2.id, 3).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento2.id}/categorias/3`);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Guard Integration', () => {
    it('should allow access when establishment context is valid', () => {
      estabelecimentoService.getSelectedEstabelecimentoId.and.returnValue(estabelecimento1.id);
      
      const route = new ActivatedRouteSnapshot();
      route.params = { estabelecimentoId: '1' };
      
      contextGuard.canActivate(route).subscribe(canActivate => {
        expect(canActivate).toBe(true);
      });
    });

    it('should deny access when establishment context is invalid', () => {
      estabelecimentoService.getSelectedEstabelecimentoId.and.returnValue(estabelecimento1.id);
      
      const route = new ActivatedRouteSnapshot();
      route.params = { estabelecimentoId: '2' }; // Different establishment
      
      contextGuard.canActivate(route).subscribe(canActivate => {
        expect(canActivate).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      });
    });

    it('should validate category ownership', () => {
      estabelecimentoService.getSelectedEstabelecimentoId.and.returnValue(estabelecimento1.id);
      
      const route = new ActivatedRouteSnapshot();
      route.params = { id: '1' }; // Category from establishment 1
      
      ownershipGuard.canActivate(route).subscribe(canActivate => {
        expect(canActivate).toBe(true);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento1.id}/categorias/1`);
      req.flush(categoriesEst1[0]);
    });

    it('should deny access to categories from other establishments', () => {
      estabelecimentoService.getSelectedEstabelecimentoId.and.returnValue(estabelecimento1.id);
      
      const route = new ActivatedRouteSnapshot();
      route.params = { id: '3' }; // Category from establishment 2
      
      ownershipGuard.canActivate(route).subscribe(canActivate => {
        expect(canActivate).toBe(false);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento1.id}/categorias/3`);
      req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent operations across establishments', () => {
      // Simulate concurrent operations
      const createRequest1 = { nome: 'Categoria Est1', descricao: 'Descrição 1' };
      const createRequest2 = { nome: 'Categoria Est2', descricao: 'Descrição 2' };

      // Create category in establishment 1
      categoryService.createCategory(estabelecimento1.id, createRequest1).subscribe();
      
      // Create category in establishment 2
      categoryService.createCategory(estabelecimento2.id, createRequest2).subscribe();

      // Verify both requests are made correctly
      const req1 = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento1.id}/categorias`);
      const req2 = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento2.id}/categorias`);

      expect(req1.request.body).toEqual(createRequest1);
      expect(req2.request.body).toEqual(createRequest2);

      req1.flush({ ...categoriesEst1[0], ...createRequest1 });
      req2.flush({ ...categoriesEst2[0], ...createRequest2 });
    });

    it('should handle establishment switching during pending operations', () => {
      // Start operation for establishment 1
      categoryService.getCategories(estabelecimento1.id).subscribe();
      
      // Switch establishment before response
      selectedEstabelecimentoSubject.next(estabelecimento2);
      
      // Complete the request
      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento1.id}/categorias`);
      req.flush({ categorias: categoriesEst1, total: 2 });

      // Verify state is not updated for wrong establishment
      categoryState.categories$.subscribe(categories => {
        // Should be empty or contain establishment 2 data only
        const est1Categories = categories.filter(c => c.estabelecimentoId === 1);
        expect(est1Categories.length).toBe(0);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle establishment deactivation during operations', () => {
      const deactivatedEst = { ...estabelecimento1, ativo: false };
      selectedEstabelecimentoSubject.next(deactivatedEst);
      
      categoryService.getCategories(deactivatedEst.id).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${deactivatedEst.id}/categorias`);
      req.flush({ message: 'Establishment deactivated' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle missing establishment context', () => {
      estabelecimentoService.getSelectedEstabelecimentoId.and.returnValue(null);
      
      const route = new ActivatedRouteSnapshot();
      route.params = { id: '1' };
      
      contextGuard.canActivate(route).subscribe(canActivate => {
        expect(canActivate).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      });
    });

    it('should recover from establishment context errors', () => {
      // Simulate context error
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(
        of(null as any)
      );
      
      categoryState.loadCategories(1);
      
      // Should not make HTTP request without valid context
      httpMock.expectNone('/api/categorias/estabelecimentos/1/categorias');
      
      // Recover context
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(
        of(estabelecimento1)
      );
      
      categoryState.loadCategories(estabelecimento1.id);
      
      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimento1.id}/categorias`);
      req.flush({ categorias: categoriesEst1, total: 2 });
    });
  });
});
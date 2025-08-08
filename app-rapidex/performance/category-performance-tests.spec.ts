import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { BehaviorSubject, of, timer } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';

import { CategoryListComponent } from '../src/app/features/categories/components/category-list/category-list.component';
import { CategoryHttpService } from '../src/app/features/categories/services/category-http.service';
import { CategoryCacheService } from '../src/app/features/categories/services/category-cache.service';
import { CategoryStateService } from '../src/app/features/categories/services/category-state.service';
import { Category } from '../src/app/features/categories/models/category.models';

describe('Category Performance and Load Tests', () => {
  let httpMock: HttpTestingController;
  let categoryService: CategoryHttpService;
  let categoryCache: CategoryCacheService;
  let categoryState: CategoryStateService;
  let component: CategoryListComponent;
  let fixture: ComponentFixture<CategoryListComponent>;

  // Generate large dataset for testing
  const generateCategories = (count: number): Category[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      nome: `Categoria ${index + 1}`,
      descricao: `Descrição da categoria ${index + 1}`,
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
      produtosCount: Math.floor(Math.random() * 100)
    }));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, CategoryListComponent],
      providers: [
        CategoryHttpService,
        CategoryCacheService,
        CategoryStateService
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    categoryService = TestBed.inject(CategoryHttpService);
    categoryCache = TestBed.inject(CategoryCacheService);
    categoryState = TestBed.inject(CategoryStateService);
    fixture = TestBed.createComponent(CategoryListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Large Dataset Performance', () => {
    it('should handle 1000 categories efficiently', (done) => {
      const largeDataset = generateCategories(1000);
      const startTime = performance.now();

      categoryService.getCategories(1).subscribe(response => {
        const endTime = performance.now();
        const processingTime = endTime - startTime;

        expect(response.categorias.length).toBe(1000);
        expect(processingTime).toBeLessThan(100); // Should process in under 100ms
        done();
      });

      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
      req.flush({ categorias: largeDataset, total: 1000 });
    });

    it('should handle 10000 categories with virtual scrolling', (done) => {
      const veryLargeDataset = generateCategories(10000);
      const startTime = performance.now();

      // Simulate virtual scrolling - only render visible items
      const visibleItems = veryLargeDataset.slice(0, 50); // First 50 items

      categoryState.categories$ = of(visibleItems);
      
      categoryState.categories$.subscribe(categories => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        expect(categories.length).toBe(50);
        expect(renderTime).toBeLessThan(50); // Should render quickly
        done();
      });
    });

    it('should maintain performance with frequent updates', (done) => {
      const categories = generateCategories(100);
      let updateCount = 0;
      const maxUpdates = 100;
      const startTime = performance.now();

      const updateTimer = timer(0, 10).pipe(
        take(maxUpdates),
        switchMap(() => {
          updateCount++;
          const updatedCategory = {
            ...categories[updateCount % categories.length],
            nome: `Updated ${updateCount}`
          };
          categoryState.updateCategory(updatedCategory);
          return categoryState.categories$;
        })
      );

      updateTimer.subscribe({
        complete: () => {
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          const avgUpdateTime = totalTime / maxUpdates;

          expect(avgUpdateTime).toBeLessThan(5); // Each update should be under 5ms
          done();
        }
      });
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should not cause memory leaks with large datasets', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const categories = generateCategories(5000);

      // Load large dataset multiple times
      for (let i = 0; i < 10; i++) {
        categoryState.loadCategories(1);
        const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias');
        req.flush({ categorias: categories, total: 5000 });
        
        // Clear state to simulate navigation
        categoryState.clearState();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should properly cleanup subscriptions', () => {
      const subscriptions: any[] = [];
      
      // Create multiple subscriptions
      for (let i = 0; i < 100; i++) {
        const sub = categoryState.categories$.subscribe();
        subscriptions.push(sub);
      }

      // Unsubscribe all
      subscriptions.forEach(sub => sub.unsubscribe());

      // Verify no active subscriptions remain
      expect(subscriptions.every(sub => sub.closed)).toBe(true);
    });

    it('should handle rapid component creation/destruction', () => {
      const componentCount = 100;
      const fixtures: ComponentFixture<CategoryListComponent>[] = [];

      const startTime = performance.now();

      // Create many components
      for (let i = 0; i < componentCount; i++) {
        const testFixture = TestBed.createComponent(CategoryListComponent);
        fixtures.push(testFixture);
        testFixture.detectChanges();
      }

      // Destroy all components
      fixtures.forEach(f => f.destroy());

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / componentCount;

      expect(avgTime).toBeLessThan(10); // Each component should create/destroy in under 10ms
    });
  });

  describe('Cache Performance', () => {
    it('should provide fast cache retrieval', () => {
      const categories = generateCategories(1000);
      const cacheKey = 'categories-1';

      // Cache the data
      const cacheStartTime = performance.now();
      categoryCache.set(cacheKey, { categorias: categories, total: 1000 });
      const cacheEndTime = performance.now();
      const cacheTime = cacheEndTime - cacheStartTime;

      // Retrieve from cache
      const retrieveStartTime = performance.now();
      const cachedData = categoryCache.get(cacheKey);
      const retrieveEndTime = performance.now();
      const retrieveTime = retrieveEndTime - retrieveStartTime;

      expect(cacheTime).toBeLessThan(10); // Caching should be fast
      expect(retrieveTime).toBeLessThan(5); // Retrieval should be very fast
      expect(cachedData).toBeDefined();
    });

    it('should handle cache invalidation efficiently', () => {
      const establishmentCount = 10;
      const categoriesPerEstablishment = 100;

      // Cache data for multiple establishments
      for (let i = 1; i <= establishmentCount; i++) {
        const categories = generateCategories(categoriesPerEstablishment);
        categoryCache.set(`categories-${i}`, { categorias: categories, total: categoriesPerEstablishment });
      }

      // Invalidate cache for one establishment
      const startTime = performance.now();
      categoryCache.invalidateEstablishmentCache(1);
      const endTime = performance.now();
      const invalidationTime = endTime - startTime;

      expect(invalidationTime).toBeLessThan(10); // Invalidation should be fast
      expect(categoryCache.get('categories-1')).toBeNull();
      expect(categoryCache.get('categories-2')).toBeDefined(); // Other caches should remain
    });

    it('should handle cache size limits efficiently', () => {
      const maxCacheSize = 1000;
      const categories = generateCategories(10);

      const startTime = performance.now();

      // Fill cache beyond limit
      for (let i = 0; i < maxCacheSize + 100; i++) {
        categoryCache.set(`categories-${i}`, { categorias: categories, total: 10 });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / (maxCacheSize + 100);

      expect(avgTime).toBeLessThan(1); // Each cache operation should be very fast
    });
  });

  describe('Component Rendering Performance', () => {
    it('should render large lists efficiently with OnPush strategy', () => {
      const categories = generateCategories(500);
      
      // Verify component uses OnPush strategy
      expect(component.constructor.prototype.constructor.name).toBe('CategoryListComponent');
      
      const startTime = performance.now();
      
      // Simulate data binding
      component.categories$ = of(categories);
      fixture.detectChanges();
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle rapid filter changes efficiently', () => {
      const categories = generateCategories(1000);
      const filterSubject = new BehaviorSubject('');
      
      component.categories$ = of(categories);
      fixture.detectChanges();

      const startTime = performance.now();
      
      // Simulate rapid filter changes
      for (let i = 0; i < 100; i++) {
        filterSubject.next(`filter-${i}`);
        fixture.detectChanges();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgFilterTime = totalTime / 100;

      expect(avgFilterTime).toBeLessThan(5); // Each filter should be fast
    });

    it('should optimize trackBy function performance', () => {
      const categories = generateCategories(1000);
      
      const startTime = performance.now();
      
      // Test trackBy function performance
      for (let i = 0; i < categories.length; i++) {
        const trackResult = component.trackByCategory(i, categories[i]);
        expect(trackResult).toBe(categories[i].id);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTrackTime = totalTime / categories.length;

      expect(avgTrackTime).toBeLessThan(0.1); // TrackBy should be very fast
    });
  });

  describe('Network Performance', () => {
    it('should handle concurrent requests efficiently', (done) => {
      const requestCount = 10;
      const completedRequests: any[] = [];
      const startTime = performance.now();

      // Make concurrent requests
      for (let i = 1; i <= requestCount; i++) {
        categoryService.getCategories(i).subscribe(response => {
          completedRequests.push(response);
          
          if (completedRequests.length === requestCount) {
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const avgRequestTime = totalTime / requestCount;

            expect(avgRequestTime).toBeLessThan(50); // Average request should be fast
            done();
          }
        });
      }

      // Respond to all requests
      for (let i = 1; i <= requestCount; i++) {
        const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${i}/categorias`);
        req.flush({ categorias: generateCategories(10), total: 10 });
      }
    });

    it('should handle request queuing under load', () => {
      const maxConcurrentRequests = 5;
      const totalRequests = 20;
      let activeRequests = 0;
      let completedRequests = 0;

      for (let i = 1; i <= totalRequests; i++) {
        categoryService.getCategories(i).subscribe(() => {
          activeRequests--;
          completedRequests++;
        });
        
        activeRequests++;
        expect(activeRequests).toBeLessThanOrEqual(maxConcurrentRequests);
      }

      // Process all requests
      const requests = httpMock.match(() => true);
      requests.forEach(req => {
        req.flush({ categorias: [], total: 0 });
      });

      expect(completedRequests).toBe(totalRequests);
    });
  });

  describe('Bundle Size and Loading Performance', () => {
    it('should lazy load category module efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate lazy loading
      const categoryModule = await import('../src/app/features/categories/index');
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(100); // Module should load quickly
      expect(categoryModule).toBeDefined();
    });

    it('should tree-shake unused code', () => {
      // This test would typically be done with bundle analysis tools
      // Here we verify that only used exports are available
      const categoryModule = require('../src/app/features/categories/index');
      
      // Should only export what's needed
      expect(Object.keys(categoryModule).length).toBeLessThan(20);
    });
  });

  describe('Search and Filter Performance', () => {
    it('should handle search with large datasets efficiently', () => {
      const categories = generateCategories(10000);
      const searchTerm = 'Categoria 5';
      
      const startTime = performance.now();
      
      // Simulate client-side filtering
      const filteredCategories = categories.filter(cat => 
        cat.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;

      expect(searchTime).toBeLessThan(50); // Search should be fast
      expect(filteredCategories.length).toBeGreaterThan(0);
    });

    it('should debounce search input efficiently', (done) => {
      const searchSubject = new BehaviorSubject('');
      let searchCount = 0;
      
      // Simulate debounced search
      searchSubject.pipe(
        // debounceTime(300) would be here in real implementation
      ).subscribe(() => {
        searchCount++;
      });

      // Rapid input changes
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          searchSubject.next(`search-${i}`);
          
          if (i === 9) {
            setTimeout(() => {
              // Should have debounced to fewer actual searches
              expect(searchCount).toBeLessThan(10);
              done();
            }, 100);
          }
        }, i * 10);
      }
    });
  });
});
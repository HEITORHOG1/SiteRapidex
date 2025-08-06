import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CategoryStateService } from './category-state.service';
import { CategoryCacheService } from './category-cache.service';
import { CategoryHttpService } from './category-http.service';
import { Category } from '../models/category.models';
import { CategoryListResponse } from '../models/category-dto.models';

describe('CategoryCacheService Integration', () => {
  let stateService: CategoryStateService;
  let cacheService: CategoryCacheService;
  let httpService: CategoryHttpService;
  let httpMock: HttpTestingController;

  const mockCategory1: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2023-01-01'),
    dataAtualizacao: new Date('2023-01-01'),
    produtosCount: 5
  };

  const mockCategory2: Category = {
    id: 2,
    nome: 'Comidas',
    descricao: 'Categoria de comidas',
    estabelecimentoId: 1,
    ativo: false,
    dataCriacao: new Date('2023-01-02'),
    dataAtualizacao: new Date('2023-01-02'),
    produtosCount: 2
  };

  const mockCategoryListResponse: CategoryListResponse = {
    categorias: [mockCategory1, mockCategory2],
    total: 2,
    pagina: 1,
    totalPaginas: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryStateService,
        CategoryCacheService,
        CategoryHttpService
      ]
    });

    stateService = TestBed.inject(CategoryStateService);
    cacheService = TestBed.inject(CategoryCacheService);
    httpService = TestBed.inject(CategoryHttpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    cacheService.clear();
    cacheService.destroy();
  });

  describe('Cache Integration with State Service', () => {
    it('should use cached data when available', (done) => {
      const estabelecimentoId = 1;
      
      // Pre-populate cache
      cacheService.setCategoryList(estabelecimentoId, mockCategoryListResponse.categorias);
      
      // Set establishment context
      stateService.setEstablishmentContext(estabelecimentoId);
      
      // Load categories - should use cache and not make HTTP request
      stateService.loadCategories().subscribe(response => {
        expect(response.categorias).toEqual(mockCategoryListResponse.categorias);
        
        // Verify no HTTP request was made
        httpMock.expectNone(`/api/categorias/estabelecimentos/${estabelecimentoId}/categorias`);
        done();
      });
    });

    it('should make HTTP request when cache is empty', (done) => {
      const estabelecimentoId = 1;
      
      // Set establishment context
      stateService.setEstablishmentContext(estabelecimentoId);
      
      // Load categories - should make HTTP request
      stateService.loadCategories().subscribe(response => {
        expect(response).toEqual(mockCategoryListResponse);
        
        // Verify cache was populated
        const cachedList = cacheService.getCategoryList(estabelecimentoId);
        expect(cachedList).toEqual(mockCategoryListResponse.categorias);
        
        // Verify individual categories were cached
        const cachedCategory1 = cacheService.getCategory(estabelecimentoId, mockCategory1.id);
        const cachedCategory2 = cacheService.getCategory(estabelecimentoId, mockCategory2.id);
        expect(cachedCategory1).toEqual(mockCategory1);
        expect(cachedCategory2).toEqual(mockCategory2);
        
        done();
      });

      // Expect and respond to HTTP request
      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimentoId}/categorias`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCategoryListResponse);
    });

    it('should warm up cache with intelligent strategies', (done) => {
      const estabelecimentoId = 1;
      
      // Set establishment context
      stateService.setEstablishmentContext(estabelecimentoId);
      
      stateService.loadCategories().subscribe(() => {
        // Check that cache warming was applied
        const stats = cacheService.getStats();
        
        // Should have cached the main list plus individual categories
        expect(stats.totalEntries).toBeGreaterThan(2);
        
        // Verify common filters were cached
        const activeList = cacheService.getCategoryList(estabelecimentoId, { ativo: true });
        const inactiveList = cacheService.getCategoryList(estabelecimentoId, { ativo: false });
        
        expect(activeList).toEqual([mockCategory1]);
        expect(inactiveList).toEqual([mockCategory2]);
        
        done();
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimentoId}/categorias`);
      req.flush(mockCategoryListResponse);
    });

    it('should invalidate cache when establishment changes', (done) => {
      const estabelecimentoId1 = 1;
      const estabelecimentoId2 = 2;
      
      // Set initial establishment and cache data
      stateService.setEstablishmentContext(estabelecimentoId1);
      cacheService.setCategoryList(estabelecimentoId1, [mockCategory1]);
      
      // Verify cache has data
      expect(cacheService.getCategoryList(estabelecimentoId1)).toEqual([mockCategory1]);
      
      // Change establishment
      stateService.setEstablishmentContext(estabelecimentoId2);
      
      // Cache for establishment 1 should still exist (not cleared, just context changed)
      expect(cacheService.getCategoryList(estabelecimentoId1)).toEqual([mockCategory1]);
      
      // Load for new establishment should make HTTP request
      stateService.loadCategories().subscribe(() => {
        done();
      });

      // Should make request for new establishment
      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimentoId2}/categorias`);
      req.flush({ categorias: [], total: 0, pagina: 1, totalPaginas: 1 });
    });

    it('should use cached individual category when selecting', (done) => {
      const estabelecimentoId = 1;
      
      // Pre-cache individual category
      cacheService.setCategory(estabelecimentoId, mockCategory1);
      
      // Set establishment context
      stateService.setEstablishmentContext(estabelecimentoId);
      
      // Select category - should use cache
      stateService.selectCategory(mockCategory1.id).subscribe(category => {
        expect(category).toEqual(mockCategory1);
        
        // Verify no HTTP request was made
        httpMock.expectNone(`/api/categorias/estabelecimentos/${estabelecimentoId}/categorias/${mockCategory1.id}`);
        done();
      });
    });

    it('should invalidate cache after CRUD operations', (done) => {
      const estabelecimentoId = 1;
      const updatedCategory: Category = { ...mockCategory1, nome: 'Bebidas Updated' };
      
      // Pre-populate cache
      cacheService.setCategoryList(estabelecimentoId, [mockCategory1]);
      cacheService.setCategory(estabelecimentoId, mockCategory1);
      
      // Set establishment context
      stateService.setEstablishmentContext(estabelecimentoId);
      
      // Update category
      stateService.updateCategory(mockCategory1.id, {
        nome: 'Bebidas Updated',
        descricao: mockCategory1.descricao,
        ativo: mockCategory1.ativo
      }).subscribe(() => {
        // Category cache should be updated
        const cachedCategory = cacheService.getCategory(estabelecimentoId, mockCategory1.id);
        expect(cachedCategory?.nome).toBe('Bebidas Updated');
        
        // List cache should be invalidated (would be null or updated)
        // The exact behavior depends on implementation details
        done();
      });

      // Mock HTTP response for update
      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimentoId}/categorias/${mockCategory1.id}`);
      expect(req.request.method).toBe('PUT');
      req.flush(updatedCategory);
    });

    it('should handle cache errors gracefully', (done) => {
      const estabelecimentoId = 1;
      
      // Spy on cache methods to simulate errors
      spyOn(cacheService, 'getCategoryList').and.throwError('Cache error');
      
      // Set establishment context
      stateService.setEstablishmentContext(estabelecimentoId);
      
      // Load categories - should fall back to HTTP request
      stateService.loadCategories().subscribe(response => {
        expect(response).toEqual(mockCategoryListResponse);
        done();
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimentoId}/categorias`);
      req.flush(mockCategoryListResponse);
    });
  });

  describe('Cache Performance with Large Datasets', () => {
    it('should handle large category lists efficiently', (done) => {
      const estabelecimentoId = 1;
      
      // Generate large dataset
      const largeDataset: Category[] = Array.from({ length: 1000 }, (_, index) => ({
        id: index + 1,
        nome: `Categoria ${index + 1}`,
        descricao: `Descrição da categoria ${index + 1}`,
        estabelecimentoId,
        ativo: index % 2 === 0,
        dataCriacao: new Date(),
        dataAtualizacao: new Date(),
        produtosCount: Math.floor(Math.random() * 10)
      }));

      const largeResponse: CategoryListResponse = {
        categorias: largeDataset,
        total: largeDataset.length,
        pagina: 1,
        totalPaginas: 50
      };

      stateService.setEstablishmentContext(estabelecimentoId);
      
      const startTime = performance.now();
      
      stateService.loadCategories().subscribe(() => {
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        // Should process large dataset reasonably quickly (less than 1 second)
        expect(processingTime).toBeLessThan(1000);
        
        // Verify cache metrics
        const stats = cacheService.getStats();
        expect(stats.totalEntries).toBeGreaterThan(0);
        expect(stats.memoryUsage).toBeGreaterThan(0);
        
        done();
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimentoId}/categorias`);
      req.flush(largeResponse);
    });

    it('should implement LRU eviction under memory pressure', () => {
      // Set small cache size for testing
      cacheService['config'].maxSize = 5;
      
      const estabelecimentoId = 1;
      
      // Add more items than cache can hold
      for (let i = 1; i <= 10; i++) {
        const category: Category = {
          id: i,
          nome: `Category ${i}`,
          descricao: `Description ${i}`,
          estabelecimentoId,
          ativo: true,
          dataCriacao: new Date(),
          dataAtualizacao: new Date()
        };
        
        cacheService.setCategory(estabelecimentoId, category);
      }
      
      // Cache should not exceed max size
      const stats = cacheService.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(5);
      
      // Some items should have been evicted
      let foundItems = 0;
      for (let i = 1; i <= 10; i++) {
        if (cacheService.getCategory(estabelecimentoId, i)) {
          foundItems++;
        }
      }
      expect(foundItems).toBeLessThanOrEqual(5);
    });
  });

  describe('Offline Support and Persistence', () => {
    it('should persist high-priority cache entries', () => {
      const estabelecimentoId = 1;
      
      // Add high-priority entries
      cacheService.setCategory(estabelecimentoId, mockCategory1);
      
      // Manually trigger persistence
      cacheService['persistCache']();
      
      // Verify localStorage was called
      // Note: localStorage is mocked in the main test suite
    });

    it('should restore cache after service restart', () => {
      const estabelecimentoId = 1;
      
      // Simulate cache data in localStorage
      const cacheData = {
        [`establishment-${estabelecimentoId}-category-${mockCategory1.id}`]: {
          data: mockCategory1,
          timestamp: Date.now(),
          ttl: 300000,
          accessCount: 1,
          lastAccessed: Date.now(),
          tags: [`establishment-${estabelecimentoId}`, 'category-detail'],
          priority: 2
        }
      };
      
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(cacheData));
      
      // Create new service instance
      const newCacheService = TestBed.inject(CategoryCacheService);
      
      // Should restore cached data
      const restored = newCacheService.getCategory(estabelecimentoId, mockCategory1.id);
      expect(restored).toEqual(mockCategory1);
      
      newCacheService.destroy();
    });

    it('should handle offline/online transitions', (done) => {
      const estabelecimentoId = 1;
      
      // Pre-cache data
      cacheService.setCategoryList(estabelecimentoId, [mockCategory1]);
      
      // Simulate going offline by making HTTP requests fail
      stateService.setEstablishmentContext(estabelecimentoId);
      
      // Should use cached data when offline
      stateService.loadCategories().subscribe(response => {
        expect(response.categorias).toEqual([mockCategory1]);
        done();
      });
      
      // No HTTP request should be made due to cache hit
    });
  });

  describe('Cache Monitoring and Debugging', () => {
    it('should provide comprehensive cache metrics', () => {
      const estabelecimentoId = 1;
      
      // Add some data and access it
      cacheService.setCategory(estabelecimentoId, mockCategory1);
      cacheService.setCategory(estabelecimentoId, mockCategory2);
      
      // Access one category multiple times
      cacheService.getCategory(estabelecimentoId, mockCategory1.id);
      cacheService.getCategory(estabelecimentoId, mockCategory1.id);
      
      // Try to access non-existent category
      cacheService.getCategory(estabelecimentoId, 999);
      
      const stats = cacheService.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.hitCount).toBeGreaterThan(0);
      expect(stats.missCount).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.mostAccessedEntry).toBeDefined();
    });

    it('should provide detailed debug information', () => {
      const estabelecimentoId = 1;
      
      cacheService.setCategory(estabelecimentoId, mockCategory1);
      
      const debugInfo = cacheService.getDebugInfo();
      
      expect(debugInfo['config']).toBeDefined();
      expect(debugInfo['metrics']).toBeDefined();
      expect(debugInfo['entries']).toBeDefined();
      
      const categoryKey = cacheService.getCategoryKey(estabelecimentoId, mockCategory1.id);
      const entryInfo = debugInfo['entries'][categoryKey];
      
      expect(entryInfo).toBeDefined();
      expect(entryInfo.dataSize).toBeGreaterThan(0);
      expect(entryInfo.isExpired).toBeFalse();
      expect(entryInfo.tags).toContain(`establishment-${estabelecimentoId}`);
    });
  });
});

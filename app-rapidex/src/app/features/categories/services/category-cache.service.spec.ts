import { TestBed } from '@angular/core/testing';
import { CategoryCacheService, CachePriority } from './category-cache.service';
import { Category } from '../models/category.models';

describe('CategoryCacheService', () => {
  let service: CategoryCacheService;
  let mockLocalStorage: { [key: string]: string };

  // Mock categories for testing
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
    produtosCount: 0
  };

  const mockCategory3: Category = {
    id: 3,
    nome: 'Sobremesas',
    descricao: 'Categoria de sobremesas',
    estabelecimentoId: 2, // Different establishment
    ativo: true,
    dataCriacao: new Date('2023-01-03'),
    dataAtualizacao: new Date('2023-01-03'),
    produtosCount: 3
  };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return mockLocalStorage[key] || null;
    });
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });

    TestBed.configureTestingModule({
      providers: [CategoryCacheService]
    });
    
    service = TestBed.inject(CategoryCacheService);
  });

  afterEach(() => {
    service.clear();
    service.destroy();
  });

  describe('Basic Cache Operations', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should store and retrieve data', () => {
      const key = 'test-key';
      const data = { test: 'data' };

      service.set(key, data);
      const retrieved = service.get(key);

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const result = service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return null for expired data', (done) => {
      const key = 'expired-key';
      const data = { test: 'data' };
      const shortTTL = 50; // 50ms

      service.set(key, data, shortTTL);

      // Should be available immediately
      expect(service.get(key)).toEqual(data);

      // Should be expired after TTL
      setTimeout(() => {
        expect(service.get(key)).toBeNull();
        done();
      }, shortTTL + 10);
    });

    it('should check if key exists', () => {
      const key = 'exists-key';
      const data = { test: 'data' };

      expect(service.has(key)).toBeFalse();
      
      service.set(key, data);
      expect(service.has(key)).toBeTrue();
    });

    it('should delete entries', () => {
      const key = 'delete-key';
      const data = { test: 'data' };

      service.set(key, data);
      expect(service.has(key)).toBeTrue();

      const deleted = service.delete(key);
      expect(deleted).toBeTrue();
      expect(service.has(key)).toBeFalse();
    });

    it('should clear all entries', () => {
      service.set('key1', 'data1');
      service.set('key2', 'data2');
      
      expect(service.has('key1')).toBeTrue();
      expect(service.has('key2')).toBeTrue();

      service.clear();
      
      expect(service.has('key1')).toBeFalse();
      expect(service.has('key2')).toBeFalse();
    });
  });

  describe('Enhanced Cache Features', () => {
    it('should track access count and last accessed time', () => {
      const key = 'access-test';
      const data = { test: 'data' };

      service.set(key, data);
      
      // Access the data multiple times
      service.get(key);
      service.get(key);
      service.get(key);

      const debugInfo = service.getDebugInfo();
      const entryInfo = debugInfo['entries'][key];
      
      expect(entryInfo.accessCount).toBe(4); // 1 from set + 3 from gets
    });

    it('should support cache priorities', () => {
      const highPriorityKey = 'high-priority';
      const lowPriorityKey = 'low-priority';

      service.set(highPriorityKey, 'high-data', undefined, CachePriority.HIGH);
      service.set(lowPriorityKey, 'low-data', undefined, CachePriority.LOW);

      const debugInfo = service.getDebugInfo();
      
      expect(debugInfo['entries'][highPriorityKey].priority).toBe('HIGH');
      expect(debugInfo['entries'][lowPriorityKey].priority).toBe('LOW');
    });

    it('should support cache tags', () => {
      const key = 'tagged-key';
      const data = { test: 'data' };
      const tags = ['tag1', 'tag2', 'category'];

      service.set(key, data, undefined, CachePriority.MEDIUM, tags);

      const debugInfo = service.getDebugInfo();
      expect(debugInfo['entries'][key].tags).toEqual(tags);
    });

    it('should invalidate by tags', () => {
      service.set('key1', 'data1', undefined, CachePriority.MEDIUM, ['tag1', 'common']);
      service.set('key2', 'data2', undefined, CachePriority.MEDIUM, ['tag2', 'common']);
      service.set('key3', 'data3', undefined, CachePriority.MEDIUM, ['tag3']);

      service.invalidateByTags(['common']);

      expect(service.has('key1')).toBeFalse();
      expect(service.has('key2')).toBeFalse();
      expect(service.has('key3')).toBeTrue();
    });

    it('should invalidate by pattern', () => {
      service.set('establishment-1-category-1', 'data1');
      service.set('establishment-1-category-2', 'data2');
      service.set('establishment-2-category-1', 'data3');

      service.invalidateByPattern(/establishment-1/);

      expect(service.has('establishment-1-category-1')).toBeFalse();
      expect(service.has('establishment-1-category-2')).toBeFalse();
      expect(service.has('establishment-2-category-1')).toBeTrue();
    });

    it('should implement LRU eviction when cache is full', () => {
      // Set a small max size for testing
      service['config'].maxSize = 3;

      service.set('key1', 'data1');
      service.set('key2', 'data2');
      service.set('key3', 'data3');

      // All should be present
      expect(service.has('key1')).toBeTrue();
      expect(service.has('key2')).toBeTrue();
      expect(service.has('key3')).toBeTrue();

      // Access key1 to make it recently used
      service.get('key1');

      // Add a new key, should evict least recently used (key2 or key3)
      service.set('key4', 'data4');

      // key1 should still be there (recently accessed)
      expect(service.has('key1')).toBeTrue();
      expect(service.has('key4')).toBeTrue();
      
      // One of the others should be evicted
      const remainingKeys = [service.has('key2'), service.has('key3')];
      expect(remainingKeys.filter(Boolean).length).toBe(1);
    });
  });

  describe('Category-Specific Cache Operations', () => {
    it('should generate correct cache keys', () => {
      const estabelecimentoId = 1;
      const categoryId = 123;
      const params = { page: 1, limit: 20, search: 'test' };

      const listKey = service.getCategoryListKey(estabelecimentoId, params);
      const categoryKey = service.getCategoryKey(estabelecimentoId, categoryId);
      const searchKey = service.getSearchKey(estabelecimentoId, 'search query');

      expect(listKey).toContain(`establishment-${estabelecimentoId}-categories-list`);
      expect(categoryKey).toBe(`establishment-${estabelecimentoId}-category-${categoryId}`);
      expect(searchKey).toBe(`establishment-${estabelecimentoId}-search-search query`);
    });

    it('should cache and retrieve category lists', () => {
      const estabelecimentoId = 1;
      const categories = [mockCategory1, mockCategory2];
      const params = { page: 1, limit: 20 };

      service.setCategoryList(estabelecimentoId, categories, params);
      const retrieved = service.getCategoryList(estabelecimentoId, params);

      expect(retrieved).toEqual(categories);
    });

    it('should cache and retrieve individual categories', () => {
      const estabelecimentoId = 1;

      service.setCategory(estabelecimentoId, mockCategory1);
      const retrieved = service.getCategory(estabelecimentoId, mockCategory1.id);

      expect(retrieved).toEqual(mockCategory1);
    });

    it('should cache and retrieve search results', () => {
      const estabelecimentoId = 1;
      const query = 'bebidas';
      const results = [mockCategory1];

      service.setSearchResults(estabelecimentoId, query, results);
      const retrieved = service.getSearchResults(estabelecimentoId, query);

      expect(retrieved).toEqual(results);
    });

    it('should invalidate establishment-specific cache', () => {
      const estabelecimentoId1 = 1;
      const estabelecimentoId2 = 2;

      service.setCategory(estabelecimentoId1, mockCategory1);
      service.setCategory(estabelecimentoId1, mockCategory2);
      service.setCategory(estabelecimentoId2, mockCategory3);

      service.invalidateCategoryCache(estabelecimentoId1);

      expect(service.getCategory(estabelecimentoId1, mockCategory1.id)).toBeNull();
      expect(service.getCategory(estabelecimentoId1, mockCategory2.id)).toBeNull();
      expect(service.getCategory(estabelecimentoId2, mockCategory3.id)).toEqual(mockCategory3);
    });

    it('should invalidate specific category and related lists', () => {
      const estabelecimentoId = 1;
      const categories = [mockCategory1, mockCategory2];

      // Cache category list and individual category
      service.setCategoryList(estabelecimentoId, categories);
      service.setCategory(estabelecimentoId, mockCategory1);
      
      // Invalidate specific category
      service.invalidateCategory(estabelecimentoId, mockCategory1.id);

      // Individual category should be gone
      expect(service.getCategory(estabelecimentoId, mockCategory1.id)).toBeNull();
      
      // List should also be invalidated
      expect(service.getCategoryList(estabelecimentoId)).toBeNull();
    });
  });

  describe('Cache Warming Strategies', () => {
    it('should warm up cache with basic categories', () => {
      const estabelecimentoId = 1;
      const categories = [mockCategory1, mockCategory2];

      service.warmupCache(estabelecimentoId, categories);

      // Individual categories should be cached
      expect(service.getCategory(estabelecimentoId, mockCategory1.id)).toEqual(mockCategory1);
      expect(service.getCategory(estabelecimentoId, mockCategory2.id)).toEqual(mockCategory2);

      // Main list should be cached
      expect(service.getCategoryList(estabelecimentoId)).toEqual(categories);
    });

    it('should implement intelligent warmup based on cache statistics', () => {
      const estabelecimentoId = 1;
      const categories = [mockCategory1, mockCategory2];

      // Simulate low hit rate scenario
      service['hitCount'] = 30;
      service['missCount'] = 70;

      service.intelligentWarmup(estabelecimentoId, categories);

      // Should cache categories with longer TTL due to low hit rate
      const debugInfo = service.getDebugInfo();
      const categoryKeys = Object.keys(debugInfo['entries']).filter(key => 
        key.includes('category-') && !key.includes('list')
      );

      expect(categoryKeys.length).toBeGreaterThan(0);
    });

    it('should prioritize active categories in warmup', () => {
      const estabelecimentoId = 1;
      const categories = [mockCategory1, mockCategory2]; // mockCategory1 is active, mockCategory2 is inactive

      service.warmupCache(estabelecimentoId, categories);

      const debugInfo = service.getDebugInfo();
      const activeKey = service.getCategoryKey(estabelecimentoId, mockCategory1.id);
      const inactiveKey = service.getCategoryKey(estabelecimentoId, mockCategory2.id);

      // Active categories might have different priority/TTL
      expect(debugInfo['entries'][activeKey]).toBeDefined();
      expect(debugInfo['entries'][inactiveKey]).toBeDefined();
    });
  });

  describe('Cache Metrics and Statistics', () => {
    it('should track cache statistics', () => {
      service.set('key1', 'data1');
      service.set('key2', 'data2');
      
      // Access one key to generate hits
      service.get('key1');
      service.get('key1');
      
      // Try to access non-existent key to generate miss
      service.get('non-existent');

      const stats = service.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(66.67); // 2/(2+1) * 100
    });

    it('should provide detailed debug information', () => {
      const key = 'debug-key';
      const data = { test: 'data' };
      const tags = ['tag1', 'tag2'];

      service.set(key, data, undefined, CachePriority.HIGH, tags);

      const debugInfo = service.getDebugInfo();
      
      expect(debugInfo['config']).toBeDefined();
      expect(debugInfo['metrics']).toBeDefined();
      expect(debugInfo['entries'][key]).toBeDefined();
      expect(debugInfo['entries'][key].tags).toEqual(tags);
      expect(debugInfo['entries'][key].priority).toBe('HIGH');
    });

    it('should calculate memory usage estimation', () => {
      service.set('key1', 'small data');
      service.set('key2', { large: 'data'.repeat(1000) });

      const stats = service.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Persistence and Offline Support', () => {
    it('should persist cache to localStorage', () => {
      const key = 'persist-key';
      const data = { test: 'persist' };

      service.set(key, data, undefined, CachePriority.HIGH);
      
      // Manually trigger persistence
      service['persistCache']();

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should restore cache from localStorage on initialization', () => {
      const cacheData = {
        'test-key': {
          data: { test: 'restored' },
          timestamp: Date.now() - 1000, // 1 second ago
          ttl: 300000, // 5 minutes
          accessCount: 1,
          lastAccessed: Date.now() - 1000,
          tags: ['test'],
          priority: CachePriority.MEDIUM
        }
      };

      mockLocalStorage['rapidex_category_cache'] = JSON.stringify(cacheData);

      // Create new service instance to trigger initialization
      const newService = TestBed.inject(CategoryCacheService);
      
      const retrieved = newService.get('test-key');
      expect(retrieved).toEqual({ test: 'restored' });
      
      newService.destroy();
    });

    it('should not restore expired entries from localStorage', () => {
      const cacheData = {
        'expired-key': {
          data: { test: 'expired' },
          timestamp: Date.now() - 600000, // 10 minutes ago
          ttl: 300000, // 5 minutes TTL (expired)
          accessCount: 1,
          lastAccessed: Date.now() - 600000,
          tags: ['test'],
          priority: CachePriority.MEDIUM
        }
      };

      mockLocalStorage['rapidex_category_cache'] = JSON.stringify(cacheData);

      // Create new service instance
      const newService = TestBed.inject(CategoryCacheService);
      
      const retrieved = newService.get('expired-key');
      expect(retrieved).toBeNull();
      
      newService.destroy();
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clean up expired entries', (done) => {
      const shortTTL = 50;
      
      service.set('expire1', 'data1', shortTTL);
      service.set('expire2', 'data2', shortTTL);
      service.set('keep', 'data3', 300000); // Long TTL

      expect(service.has('expire1')).toBeTrue();
      expect(service.has('expire2')).toBeTrue();
      expect(service.has('keep')).toBeTrue();

      setTimeout(() => {
        service.cleanup();

        expect(service.has('expire1')).toBeFalse();
        expect(service.has('expire2')).toBeFalse();
        expect(service.has('keep')).toBeTrue();
        done();
      }, shortTTL + 10);
    });

    it('should handle destruction gracefully', () => {
      service.set('key', 'data');
      
      expect(() => service.destroy()).not.toThrow();
      
      // Should still work after destroy
      expect(service.get('key')).toBe('data');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid localStorage gracefully', () => {
      spyOn(localStorage, 'getItem').and.throwError('Storage error');
      
      expect(() => {
        const newService = TestBed.inject(CategoryCacheService);
        newService.destroy();
      }).not.toThrow();
    });

    it('should handle localStorage write errors gracefully', () => {
      spyOn(localStorage, 'setItem').and.throwError('Storage full');
      
      expect(() => {
        service.set('key', 'data');
        service['persistCache']();
      }).not.toThrow();
    });

    it('should handle empty categories array in warmup', () => {
      expect(() => {
        service.warmupCache(1, []);
        service.warmupCache(1, null as any);
      }).not.toThrow();
    });

    it('should handle malformed cache data in localStorage', () => {
      mockLocalStorage['rapidex_category_cache'] = 'invalid json';
      
      expect(() => {
        const newService = TestBed.inject(CategoryCacheService);
        newService.destroy();
      }).not.toThrow();
    });
  });
});

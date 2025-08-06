import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, fromEvent, merge } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { Category, CategoryListParams } from '../models/category.models';

/**
 * Cache entry interface with enhanced metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  priority: CachePriority;
}

/**
 * Cache priority levels
 */
export enum CachePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  expiredEntries: number;
  memoryUsage: number;
  oldestEntry?: {
    key: string;
    timestamp: number;
  };
  mostAccessedEntry?: {
    key: string;
    accessCount: number;
  };
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  persistToStorage: boolean;
  storageKey: string;
  enableMetrics: boolean;
}

/**
 * Cache service for categories with TTL-based caching and establishment isolation
 * Enhanced with offline support, metrics, and advanced invalidation strategies
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly config: CacheConfig = {
    maxSize: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000, // 1 minute
    persistToStorage: true,
    storageKey: 'rapidex_category_cache',
    enableMetrics: true
  };

  // Metrics tracking
  private metricsSubject = new BehaviorSubject<CacheStats>({
    totalEntries: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    expiredEntries: 0,
    memoryUsage: 0
  });

  private hitCount = 0;
  private missCount = 0;
  private cleanupTimer?: number;

  // Public observables
  readonly metrics$ = this.metricsSubject.asObservable();

  constructor() {
    this.initializeCache();
    this.startCleanupTimer();
    this.setupOfflineHandlers();
  }

  /**
   * Initialize cache from localStorage if available
   */
  private initializeCache(): void {
    if (!this.config.persistToStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();
        
        // Restore non-expired entries
        Object.entries(cacheData).forEach(([key, entry]: [string, any]) => {
          if (entry && (now - entry.timestamp) <= entry.ttl) {
            this.cache.set(key, {
              ...entry,
              accessCount: 0, // Reset access count on restore
              lastAccessed: now
            });
          }
        });

        this.updateMetrics();
      }
    } catch (error) {
      console.warn('Failed to restore cache from localStorage:', error);
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistCache(): void {
    if (!this.config.persistToStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const cacheObj: { [key: string]: CacheEntry<any> } = {};
      this.cache.forEach((value, key) => {
        // Only persist high priority or recent entries
        if (value.priority >= CachePriority.HIGH || 
            (Date.now() - value.timestamp) < (this.config.defaultTTL / 2)) {
          cacheObj[key] = value;
        }
      });

      localStorage.setItem(this.config.storageKey, JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to persist cache to localStorage:', error);
    }
  }

  /**
   * Setup offline handlers for cache persistence
   */
  private setupOfflineHandlers(): void {
    if (typeof window === 'undefined') return;

    // Save cache when going offline
    const offlineEvents = fromEvent(window, 'beforeunload');
    const visibilityChange = fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'hidden')
    );

    merge(offlineEvents, visibilityChange).subscribe(() => {
      this.persistCache();
    });

    // Clean expired entries when coming back online
    fromEvent(window, 'online').subscribe(() => {
      this.cleanup();
    });
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
      this.updateMetrics();
      this.persistCache();
    }, this.config.cleanupInterval);
  }

  /**
   * Gets cached data by key with metrics tracking
   */
  get<T>(key: string, updateAccess = true): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      this.updateMetrics();
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      this.updateMetrics();
      return null;
    }

    // Update access tracking
    if (updateAccess) {
      entry.accessCount++;
      entry.lastAccessed = now;
    }

    this.hitCount++;
    this.updateMetrics();
    return entry.data;
  }

  /**
   * Sets cached data with enhanced metadata
   */
  set<T>(
    key: string, 
    data: T, 
    ttl: number = this.config.defaultTTL,
    priority: CachePriority = CachePriority.MEDIUM,
    tags: string[] = []
  ): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now,
      tags,
      priority
    });

    this.updateMetrics();
  }

  /**
   * Implements LRU eviction strategy
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();
    let lruPriority = CachePriority.CRITICAL;

    // Find the least recently used entry with lowest priority
    for (const [key, entry] of this.cache.entries()) {
      if (entry.priority < lruPriority || 
          (entry.priority === lruPriority && entry.lastAccessed < lruTime)) {
        lruKey = key;
        lruTime = entry.lastAccessed;
        lruPriority = entry.priority;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Updates cache metrics
   */
  private updateMetrics(): void {
    if (!this.config.enableMetrics) return;

    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const totalSize = this.calculateCacheSize();
    const hitRate = this.hitCount + this.missCount > 0 ? 
      (this.hitCount / (this.hitCount + this.missCount)) * 100 : 0;

    let oldestEntry: { key: string; timestamp: number } | undefined;
    let mostAccessedEntry: { key: string; accessCount: number } | undefined;
    let expiredCount = 0;

    const now = Date.now();
    let oldestTime = now;
    let maxAccess = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }

      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestEntry = { key, timestamp: entry.timestamp };
      }

      if (entry.accessCount > maxAccess) {
        maxAccess = entry.accessCount;
        mostAccessedEntry = { key, accessCount: entry.accessCount };
      }
    }

    const stats: CacheStats = {
      totalEntries,
      totalSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      expiredEntries: expiredCount,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry,
      mostAccessedEntry
    };

    this.metricsSubject.next(stats);
  }

  /**
   * Calculates total cache size
   */
  private calculateCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Estimates memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // String characters are 2 bytes
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 64; // Estimate for entry metadata
    }
    return totalSize;
  }

  /**
   * Removes cached data by key
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.updateMetrics();
    }
    return result;
  }

  /**
   * Checks if key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key, false) !== null;
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.updateMetrics();
    this.persistCache();
  }

  /**
   * Invalidates all cache entries for a specific establishment
   */
  invalidateEstablishmentCache(estabelecimentoId: number): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(`establishment-${estabelecimentoId}`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateMetrics();
    this.persistCache();
  }

  /**
   * Invalidates cache entries matching a pattern
   */
  invalidateByPattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateMetrics();
  }

  /**
   * Invalidates cache entries by tags
   */
  invalidateByTags(tags: string[]): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateMetrics();
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    this.updateMetrics();
    return this.metricsSubject.value;
  }

  /**
   * Gets detailed cache information for debugging
   */
  getDebugInfo(): { [key: string]: any } {
    const entries: { [key: string]: any } = {};
    
    for (const [key, entry] of this.cache.entries()) {
      entries[key] = {
        timestamp: new Date(entry.timestamp).toISOString(),
        ttl: entry.ttl,
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed).toISOString(),
        tags: entry.tags,
        priority: CachePriority[entry.priority],
        isExpired: (Date.now() - entry.timestamp) > entry.ttl,
        dataSize: JSON.stringify(entry.data).length
      };
    }

    return {
      config: this.config,
      metrics: this.getStats(),
      entries
    };
  }

  /**
   * Cleans up expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.updateMetrics();
    }
  }

  // Category-specific cache methods with enhanced functionality

  /**
   * Generates cache key for category list with enhanced parameters
   */
  getCategoryListKey(estabelecimentoId: number, params?: CategoryListParams): string {
    const paramsStr = params ? this.serializeParams(params) : '';
    return `establishment-${estabelecimentoId}-categories-list-${paramsStr}`;
  }

  /**
   * Generates cache key for individual category
   */
  getCategoryKey(estabelecimentoId: number, categoryId: number): string {
    return `establishment-${estabelecimentoId}-category-${categoryId}`;
  }

  /**
   * Generates cache key for search results
   */
  getSearchKey(estabelecimentoId: number, query: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    return `establishment-${estabelecimentoId}-search-${normalizedQuery}`;
  }

  /**
   * Serializes parameters consistently for cache keys
   */
  private serializeParams(params: CategoryListParams): string {
    const normalized = {
      page: params.page || 1,
      limit: params.limit || 20,
      search: params.search?.toLowerCase().trim() || '',
      ativo: params.ativo,
      sortBy: params.sortBy || 'nome',
      sortOrder: params.sortOrder || 'asc'
    };
    return btoa(JSON.stringify(normalized));
  }

  /**
   * Caches category list with enhanced metadata
   */
  setCategoryList(
    estabelecimentoId: number, 
    categories: Category[], 
    params?: CategoryListParams, 
    ttl?: number
  ): void {
    const key = this.getCategoryListKey(estabelecimentoId, params);
    const tags = [
      `establishment-${estabelecimentoId}`,
      'category-list',
      ...this.generateTagsFromParams(params)
    ];
    
    this.set(key, categories, ttl, CachePriority.HIGH, tags);
  }

  /**
   * Gets cached category list
   */
  getCategoryList(estabelecimentoId: number, params?: CategoryListParams): Category[] | null {
    const key = this.getCategoryListKey(estabelecimentoId, params);
    return this.get<Category[]>(key);
  }

  /**
   * Caches individual category with enhanced metadata
   */
  setCategory(estabelecimentoId: number, category: Category, ttl?: number): void {
    const key = this.getCategoryKey(estabelecimentoId, category.id);
    const tags = [
      `establishment-${estabelecimentoId}`,
      'category-detail',
      `category-${category.id}`,
      category.ativo ? 'active-category' : 'inactive-category'
    ];
    
    this.set(key, category, ttl, CachePriority.MEDIUM, tags);
  }

  /**
   * Gets cached individual category
   */
  getCategory(estabelecimentoId: number, categoryId: number): Category | null {
    const key = this.getCategoryKey(estabelecimentoId, categoryId);
    return this.get<Category>(key);
  }

  /**
   * Caches search results
   */
  setSearchResults(
    estabelecimentoId: number, 
    query: string, 
    results: Category[], 
    ttl?: number
  ): void {
    const key = this.getSearchKey(estabelecimentoId, query);
    const tags = [
      `establishment-${estabelecimentoId}`,
      'search-results',
      `search-${query.length > 10 ? 'long' : 'short'}`
    ];
    
    this.set(key, results, ttl || this.config.defaultTTL / 2, CachePriority.LOW, tags);
  }

  /**
   * Gets cached search results
   */
  getSearchResults(estabelecimentoId: number, query: string): Category[] | null {
    const key = this.getSearchKey(estabelecimentoId, query);
    return this.get<Category[]>(key);
  }

  /**
   * Generates tags from search/filter parameters
   */
  private generateTagsFromParams(params?: CategoryListParams): string[] {
    if (!params) return [];
    
    const tags: string[] = [];
    
    if (params.search) tags.push('filtered');
    if (params.ativo !== undefined) tags.push(`active-${params.ativo}`);
    if (params.sortBy) tags.push(`sorted-by-${params.sortBy}`);
    
    return tags;
  }

  /**
   * Advanced cache warming with intelligent prefetching
   */
  warmupCache(estabelecimentoId: number, categories: Category[]): void {
    if (!categories || categories.length === 0) return;

    // Cache individual categories with appropriate priority
    categories.forEach(category => {
      const priority = category.ativo ? CachePriority.MEDIUM : CachePriority.LOW;
      const ttl = category.ativo ? this.config.defaultTTL : this.config.defaultTTL * 2;
      
      this.setCategory(estabelecimentoId, category, ttl);
    });
    
    // Cache the main list with high priority
    this.setCategoryList(estabelecimentoId, categories, undefined, this.config.defaultTTL);
    
    // Cache common filtered views
    this.warmupCommonFilters(estabelecimentoId, categories);
    
    // Cache frequently accessed categories with higher TTL
    this.warmupFrequentlyAccessed(estabelecimentoId, categories);
  }

  /**
   * Warms up cache with common filter combinations
   */
  private warmupCommonFilters(estabelecimentoId: number, categories: Category[]): void {
    // Active categories only
    const activeCategories = categories.filter(c => c.ativo);
    if (activeCategories.length > 0) {
      this.setCategoryList(estabelecimentoId, activeCategories, { ativo: true });
    }

    // Inactive categories only
    const inactiveCategories = categories.filter(c => !c.ativo);
    if (inactiveCategories.length > 0) {
      this.setCategoryList(estabelecimentoId, inactiveCategories, { ativo: false });
    }

    // Different sorting options
    const sortOptions = [
      { sortBy: 'nome', sortOrder: 'asc' },
      { sortBy: 'dataCriacao', sortOrder: 'desc' },
      { sortBy: 'dataAtualizacao', sortOrder: 'desc' }
    ] as const;

    sortOptions.forEach(sortOption => {
      const sorted = [...categories].sort((a, b) => this.compareByField(a, b, sortOption));
      this.setCategoryList(estabelecimentoId, sorted, sortOption);
    });
  }

  /**
   * Warms up frequently accessed categories
   */
  private warmupFrequentlyAccessed(estabelecimentoId: number, categories: Category[]): void {
    // Categories with products get higher priority and longer TTL
    const categoriesWithProducts = categories.filter(c => c.produtosCount && c.produtosCount > 0);
    
    categoriesWithProducts.forEach(category => {
      this.setCategory(estabelecimentoId, category, this.config.defaultTTL * 1.5);
    });
  }

  /**
   * Helper method for sorting categories
   */
  private compareByField(a: Category, b: Category, sort: { sortBy: string; sortOrder: string }): number {
    let aValue: any;
    let bValue: any;

    switch (sort.sortBy) {
      case 'nome':
        aValue = a.nome.toLowerCase();
        bValue = b.nome.toLowerCase();
        break;
      case 'dataCriacao':
        aValue = new Date(a.dataCriacao).getTime();
        bValue = new Date(b.dataCriacao).getTime();
        break;
      case 'dataAtualizacao':
        aValue = new Date(a.dataAtualizacao).getTime();
        bValue = new Date(b.dataAtualizacao).getTime();
        break;
      default:
        return 0;
    }

    const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sort.sortOrder === 'desc' ? -result : result;
  }

  /**
   * Invalidates all category caches for an establishment
   */
  invalidateCategoryCache(estabelecimentoId: number): void {
    this.invalidateByTags([`establishment-${estabelecimentoId}`]);
  }

  /**
   * Invalidates cache for a specific category and related lists
   */
  invalidateCategory(estabelecimentoId: number, categoryId: number): void {
    // Invalidate the specific category
    this.invalidateByTags([`category-${categoryId}`]);
    
    // Invalidate all lists for this establishment as they might contain this category
    this.invalidateByTags([`establishment-${estabelecimentoId}`, 'category-list']);
    
    // Invalidate search results as they might contain this category
    this.invalidateByTags([`establishment-${estabelecimentoId}`, 'search-results']);
  }

  /**
   * Intelligently pre-warms cache based on usage patterns
   */
  intelligentWarmup(estabelecimentoId: number, categories: Category[]): void {
    const stats = this.getStats();
    
    // If cache hit rate is low, be more aggressive with caching
    const aggressiveCaching = stats.hitRate < 70;
    const baseTTL = aggressiveCaching ? this.config.defaultTTL * 1.5 : this.config.defaultTTL;
    
    // Prioritize active categories
    const activeCategories = categories.filter(c => c.ativo);
    const inactiveCategories = categories.filter(c => !c.ativo);
    
    // Cache active categories with higher priority and longer TTL
    activeCategories.forEach(category => {
      this.setCategory(estabelecimentoId, category, baseTTL);
    });
    
    // Cache inactive categories with lower priority
    inactiveCategories.forEach(category => {
      this.setCategory(estabelecimentoId, category, baseTTL * 0.5);
    });
    
    // Cache common list views
    this.setCategoryList(estabelecimentoId, activeCategories, { ativo: true }, baseTTL);
    this.setCategoryList(estabelecimentoId, categories, undefined, baseTTL);
    
    // If we have space and good hit rate, cache more variations
    if (stats.totalEntries < this.config.maxSize * 0.8 && stats.hitRate > 80) {
      this.warmupCommonFilters(estabelecimentoId, categories);
    }
  }

  /**
   * Cleanup method called on service destruction
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.persistCache();
  }
}
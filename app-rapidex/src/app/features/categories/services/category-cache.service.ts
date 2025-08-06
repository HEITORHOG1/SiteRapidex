import { Injectable } from '@angular/core';
import { Category } from '../models/category.models';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Cache service for categories with TTL-based caching and establishment isolation
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Gets cached data by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Sets cached data with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Removes cached data by key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Checks if key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
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
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
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
  }

  // Category-specific cache methods

  /**
   * Generates cache key for category list
   */
  getCategoryListKey(estabelecimentoId: number, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `establishment-${estabelecimentoId}-categories-list-${paramsStr}`;
  }

  /**
   * Generates cache key for individual category
   */
  getCategoryKey(estabelecimentoId: number, categoryId: number): string {
    return `establishment-${estabelecimentoId}-category-${categoryId}`;
  }

  /**
   * Caches category list
   */
  setCategoryList(estabelecimentoId: number, categories: Category[], params?: any, ttl?: number): void {
    const key = this.getCategoryListKey(estabelecimentoId, params);
    this.set(key, categories, ttl);
  }

  /**
   * Gets cached category list
   */
  getCategoryList(estabelecimentoId: number, params?: any): Category[] | null {
    const key = this.getCategoryListKey(estabelecimentoId, params);
    return this.get<Category[]>(key);
  }

  /**
   * Caches individual category
   */
  setCategory(estabelecimentoId: number, category: Category, ttl?: number): void {
    const key = this.getCategoryKey(estabelecimentoId, category.id);
    this.set(key, category, ttl);
  }

  /**
   * Gets cached individual category
   */
  getCategory(estabelecimentoId: number, categoryId: number): Category | null {
    const key = this.getCategoryKey(estabelecimentoId, categoryId);
    return this.get<Category>(key);
  }

  /**
   * Invalidates all category caches for an establishment
   */
  invalidateCategoryCache(estabelecimentoId: number): void {
    this.invalidateEstablishmentCache(estabelecimentoId);
  }

  /**
   * Invalidates cache for a specific category
   */
  invalidateCategory(estabelecimentoId: number, categoryId: number): void {
    const categoryKey = this.getCategoryKey(estabelecimentoId, categoryId);
    this.delete(categoryKey);
    
    // Also invalidate list caches that might contain this category
    this.invalidateByPattern(new RegExp(`establishment-${estabelecimentoId}-categories-list`));
  }

  /**
   * Warms up cache with initial data
   */
  warmupCache(estabelecimentoId: number, categories: Category[]): void {
    // Cache individual categories
    categories.forEach(category => {
      this.setCategory(estabelecimentoId, category);
    });
    
    // Cache the list
    this.setCategoryList(estabelecimentoId, categories);
  }
}
// Category services exports
export { CategoryHttpService } from './category-http.service';
export { CategoryStateService } from './category-state.service';
export { CategoryCacheService, CachePriority, type CacheStats, type CacheConfig } from './category-cache.service';
export { CategoryCacheMetricsService, type CachePerformanceMetrics } from './category-cache-metrics.service';
export { 
  CategoryCacheConfigService, 
  type CategoryCacheConfiguration,
  DEFAULT_CACHE_CONFIG,
  CACHE_CONFIG_PROFILES,
  CATEGORY_CACHE_CONFIG 
} from './category-cache-config.service';
export { 
  CategorySearchService, 
  type SearchSuggestion, 
  type SearchHistory, 
  type AdvancedFilters 
} from './category-search.service';
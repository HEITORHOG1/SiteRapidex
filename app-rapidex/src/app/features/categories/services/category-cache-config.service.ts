import { Injectable, InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Cache configuration options
 */
export interface CategoryCacheConfiguration {
  // Basic settings
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  
  // Persistence settings
  persistToStorage: boolean;
  storageKey: string;
  
  // Performance settings
  enableMetrics: boolean;
  enableCompression: boolean;
  maxMemoryUsage: number;
  
  // Warmup settings
  enableIntelligentWarmup: boolean;
  warmupBatchSize: number;
  aggressiveWarmupThreshold: number;
  
  // Eviction settings
  evictionStrategy: 'lru' | 'lfu' | 'fifo';
  lowPriorityTTLMultiplier: number;
  highPriorityTTLMultiplier: number;
  
  // Debugging and monitoring
  enableDebugLogging: boolean;
  metricsUpdateInterval: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CategoryCacheConfiguration = {
  // Basic settings
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
  
  // Persistence settings
  persistToStorage: true,
  storageKey: 'rapidex_category_cache',
  
  // Performance settings
  enableMetrics: true,
  enableCompression: false,
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  
  // Warmup settings
  enableIntelligentWarmup: true,
  warmupBatchSize: 50,
  aggressiveWarmupThreshold: 70, // Hit rate threshold
  
  // Eviction settings
  evictionStrategy: 'lru',
  lowPriorityTTLMultiplier: 0.5,
  highPriorityTTLMultiplier: 1.5,
  
  // Debugging and monitoring
  enableDebugLogging: false,
  metricsUpdateInterval: 30 * 1000 // 30 seconds
};

/**
 * Injection token for cache configuration
 */
export const CATEGORY_CACHE_CONFIG = new InjectionToken<CategoryCacheConfiguration>('CATEGORY_CACHE_CONFIG');

/**
 * Cache configuration profiles for different environments
 */
export const CACHE_CONFIG_PROFILES = {
  development: {
    ...DEFAULT_CACHE_CONFIG,
    enableDebugLogging: true,
    metricsUpdateInterval: 10 * 1000, // 10 seconds
    maxSize: 500
  },
  
  production: {
    ...DEFAULT_CACHE_CONFIG,
    enableDebugLogging: false,
    enableCompression: true,
    maxSize: 2000,
    defaultTTL: 10 * 60 * 1000 // 10 minutes
  },
  
  'low-memory': {
    ...DEFAULT_CACHE_CONFIG,
    maxSize: 200,
    maxMemoryUsage: 20 * 1024 * 1024, // 20MB
    defaultTTL: 3 * 60 * 1000, // 3 minutes
    lowPriorityTTLMultiplier: 0.3,
    enableCompression: true
  },
  
  'high-performance': {
    ...DEFAULT_CACHE_CONFIG,
    maxSize: 5000,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    enableIntelligentWarmup: true,
    warmupBatchSize: 100,
    aggressiveWarmupThreshold: 80
  }
} as const;

/**
 * Service for managing cache configuration at runtime
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryCacheConfigService {
  private configSubject = new BehaviorSubject<CategoryCacheConfiguration>(DEFAULT_CACHE_CONFIG);
  
  // Observable for configuration changes
  readonly config$ = this.configSubject.asObservable();

  constructor() {
    this.initializeConfiguration();
  }

  /**
   * Initialize configuration from environment or stored preferences
   */
  private initializeConfiguration(): void {
    // Try to load from localStorage
    const storedConfig = this.loadStoredConfig();
    if (storedConfig) {
      this.configSubject.next({ ...DEFAULT_CACHE_CONFIG, ...storedConfig });
      return;
    }

    // Detect environment and apply appropriate profile
    const environmentProfile = this.detectEnvironmentProfile();
    if (environmentProfile) {
      this.configSubject.next(environmentProfile);
    }
  }

  /**
   * Load configuration from localStorage
   */
  private loadStoredConfig(): Partial<CategoryCacheConfiguration> | null {
    try {
      const stored = localStorage.getItem('rapidex_cache_config');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load cache configuration from storage:', error);
      return null;
    }
  }

  /**
   * Detect appropriate configuration profile based on environment
   */
  private detectEnvironmentProfile(): CategoryCacheConfiguration | null {
    // Check if development mode
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      return CACHE_CONFIG_PROFILES.development;
    }

    // Check memory constraints
    if (this.isLowMemoryEnvironment()) {
      return CACHE_CONFIG_PROFILES['low-memory'];
    }

    // Check for high performance requirements
    if (this.isHighPerformanceEnvironment()) {
      return CACHE_CONFIG_PROFILES['high-performance'];
    }

    // Default to production profile
    return CACHE_CONFIG_PROFILES.production;
  }

  /**
   * Check if running in low memory environment
   */
  private isLowMemoryEnvironment(): boolean {
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      return (navigator as any).deviceMemory <= 2; // 2GB or less
    }
    
    if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
      return navigator.hardwareConcurrency <= 2; // 2 cores or less
    }
    
    return false;
  }

  /**
   * Check if high performance environment
   */
  private isHighPerformanceEnvironment(): boolean {
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      return (navigator as any).deviceMemory >= 8; // 8GB or more
    }
    
    if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
      return navigator.hardwareConcurrency >= 8; // 8 cores or more
    }
    
    return false;
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): CategoryCacheConfiguration {
    return this.configSubject.value;
  }

  /**
   * Update specific configuration options
   */
  updateConfig(updates: Partial<CategoryCacheConfiguration>): void {
    const currentConfig = this.configSubject.value;
    const newConfig = { ...currentConfig, ...updates };
    
    this.configSubject.next(newConfig);
    this.saveConfigToStorage(newConfig);
  }

  /**
   * Apply a predefined configuration profile
   */
  applyProfile(profileName: keyof typeof CACHE_CONFIG_PROFILES): void {
    const profile = CACHE_CONFIG_PROFILES[profileName];
    if (profile) {
      this.configSubject.next(profile);
      this.saveConfigToStorage(profile);
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.configSubject.next(DEFAULT_CACHE_CONFIG);
    this.clearStoredConfig();
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfigToStorage(config: CategoryCacheConfiguration): void {
    try {
      localStorage.setItem('rapidex_cache_config', JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save cache configuration to storage:', error);
    }
  }

  /**
   * Clear stored configuration
   */
  private clearStoredConfig(): void {
    try {
      localStorage.removeItem('rapidex_cache_config');
    } catch (error) {
      console.warn('Failed to clear stored cache configuration:', error);
    }
  }

  /**
   * Get configuration for specific use case
   */
  getConfigForUseCase(useCase: 'mobile' | 'desktop' | 'embedded'): CategoryCacheConfiguration {
    const baseConfig = this.getCurrentConfig();
    
    switch (useCase) {
      case 'mobile':
        return {
          ...baseConfig,
          maxSize: Math.floor(baseConfig.maxSize * 0.5),
          maxMemoryUsage: Math.floor(baseConfig.maxMemoryUsage * 0.5),
          defaultTTL: baseConfig.defaultTTL * 0.7,
          enableCompression: true
        };
        
      case 'desktop':
        return {
          ...baseConfig,
          maxSize: Math.floor(baseConfig.maxSize * 1.5),
          maxMemoryUsage: Math.floor(baseConfig.maxMemoryUsage * 1.5),
          defaultTTL: baseConfig.defaultTTL * 1.3
        };
        
      case 'embedded':
        return {
          ...baseConfig,
          maxSize: Math.floor(baseConfig.maxSize * 0.3),
          maxMemoryUsage: Math.floor(baseConfig.maxMemoryUsage * 0.3),
          defaultTTL: baseConfig.defaultTTL * 0.5,
          enableMetrics: false,
          persistToStorage: false
        };
        
      default:
        return baseConfig;
    }
  }

  /**
   * Validate configuration options
   */
  validateConfig(config: Partial<CategoryCacheConfiguration>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxSize !== undefined) {
      if (config.maxSize <= 0) {
        errors.push('maxSize must be greater than 0');
      } else if (config.maxSize > 10000) {
        warnings.push('maxSize is very large and may impact performance');
      }
    }

    if (config.defaultTTL !== undefined) {
      if (config.defaultTTL <= 0) {
        errors.push('defaultTTL must be greater than 0');
      } else if (config.defaultTTL > 60 * 60 * 1000) {
        warnings.push('defaultTTL is longer than 1 hour');
      }
    }

    if (config.maxMemoryUsage !== undefined) {
      if (config.maxMemoryUsage <= 0) {
        errors.push('maxMemoryUsage must be greater than 0');
      } else if (config.maxMemoryUsage > 500 * 1024 * 1024) {
        warnings.push('maxMemoryUsage is very high (>500MB)');
      }
    }

    if (config.cleanupInterval !== undefined) {
      if (config.cleanupInterval < 10000) {
        warnings.push('cleanupInterval is very short (<10s)');
      } else if (config.cleanupInterval > 300000) {
        warnings.push('cleanupInterval is very long (>5m)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get configuration recommendations based on current usage
   */
  getConfigRecommendations(currentMetrics: {
    hitRate: number;
    memoryUsage: number;
    avgResponseTime: number;
    cacheSize: number;
  }): {
    category: string;
    recommendation: string;
    configChanges: Partial<CategoryCacheConfiguration>;
    impact: 'high' | 'medium' | 'low';
  }[] {
    const recommendations = [];
    const currentConfig = this.getCurrentConfig();

    // Hit rate recommendations
    if (currentMetrics.hitRate < 70) {
      recommendations.push({
        category: 'Cache Effectiveness',
        recommendation: 'Increase TTL values and enable aggressive warmup',
        configChanges: {
          defaultTTL: currentConfig.defaultTTL * 1.5,
          enableIntelligentWarmup: true,
          aggressiveWarmupThreshold: 60
        },
        impact: 'high' as const
      });
    }

    // Memory usage recommendations
    if (currentMetrics.memoryUsage > currentConfig.maxMemoryUsage * 0.8) {
      recommendations.push({
        category: 'Memory Optimization',
        recommendation: 'Enable compression and reduce cache size',
        configChanges: {
          enableCompression: true,
          maxSize: Math.floor(currentConfig.maxSize * 0.8)
        },
        impact: 'medium' as const
      });
    }

    // Response time recommendations
    if (currentMetrics.avgResponseTime > 100) {
      recommendations.push({
        category: 'Performance Optimization',
        recommendation: 'Reduce cleanup frequency and increase warmup batch size',
        configChanges: {
          cleanupInterval: Math.min(currentConfig.cleanupInterval * 1.5, 300000),
          warmupBatchSize: Math.min(currentConfig.warmupBatchSize * 1.5, 200)
        },
        impact: 'medium' as const
      });
    }

    // Cache size recommendations
    if (currentMetrics.cacheSize > currentConfig.maxSize * 0.9) {
      recommendations.push({
        category: 'Capacity Management',
        recommendation: 'Increase cache size or implement more aggressive eviction',
        configChanges: {
          maxSize: Math.floor(currentConfig.maxSize * 1.3)
        },
        impact: 'low' as const
      });
    }

    return recommendations;
  }

  /**
   * Export current configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.getCurrentConfig(), null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  importConfig(configJson: string): { success: boolean; error?: string } {
    try {
      const config = JSON.parse(configJson);
      const validation = this.validateConfig(config);
      
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      this.updateConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Invalid JSON format' };
    }
  }
}

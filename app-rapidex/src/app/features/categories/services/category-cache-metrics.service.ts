import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, combineLatest } from 'rxjs';
import { map, shareReplay, startWith } from 'rxjs/operators';
import { CategoryCacheService, CacheStats } from './category-cache.service';

/**
 * Cache performance metrics interface
 */
export interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  avgResponseTime: number;
  cacheSize: number;
  memoryUsage: number;
  expiredEntries: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
}

/**
 * Cache health thresholds
 */
const CACHE_THRESHOLDS = {
  HEALTHY_HIT_RATE: 80,
  WARNING_HIT_RATE: 60,
  MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  WARNING_MEMORY_USAGE: 30 * 1024 * 1024, // 30MB
  MAX_EXPIRED_RATIO: 0.2 // 20% expired entries
};

/**
 * Service for monitoring cache performance and providing insights
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryCacheMetricsService {
  private metricsSubject = new BehaviorSubject<CachePerformanceMetrics>({
    hitRate: 0,
    missRate: 0,
    avgResponseTime: 0,
    cacheSize: 0,
    memoryUsage: 0,
    expiredEntries: 0,
    healthStatus: 'healthy',
    recommendations: []
  });

  private responseTimesSubject = new BehaviorSubject<number[]>([]);

  // Public observables
  readonly metrics$ = this.metricsSubject.asObservable();
  readonly healthStatus$ = this.metrics$.pipe(
    map(metrics => metrics.healthStatus),
    shareReplay(1)
  );
  readonly recommendations$ = this.metrics$.pipe(
    map(metrics => metrics.recommendations),
    shareReplay(1)
  );

  constructor(private categoryCache: CategoryCacheService) {
    this.startMetricsCollection();
  }

  /**
   * Start collecting metrics periodically
   */
  private startMetricsCollection(): void {
    // Update metrics every 30 seconds
    interval(30000).pipe(
      startWith(0)
    ).subscribe(() => {
      this.updateMetrics();
    });

    // Monitor cache metrics changes
    this.categoryCache.metrics$.subscribe(cacheStats => {
      this.processCacheStats(cacheStats);
    });
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const cacheStats = this.categoryCache.getStats();
    const responseTimes = this.responseTimesSubject.value;
    
    const metrics: CachePerformanceMetrics = {
      hitRate: cacheStats.hitRate,
      missRate: 100 - cacheStats.hitRate,
      avgResponseTime: this.calculateAverageResponseTime(responseTimes),
      cacheSize: cacheStats.totalEntries,
      memoryUsage: cacheStats.memoryUsage,
      expiredEntries: cacheStats.expiredEntries,
      healthStatus: this.calculateHealthStatus(cacheStats),
      recommendations: this.generateRecommendations(cacheStats, responseTimes)
    };

    this.metricsSubject.next(metrics);
  }

  /**
   * Process cache statistics from the cache service
   */
  private processCacheStats(cacheStats: CacheStats): void {
    const currentMetrics = this.metricsSubject.value;
    
    const updatedMetrics: CachePerformanceMetrics = {
      ...currentMetrics,
      hitRate: cacheStats.hitRate,
      missRate: 100 - cacheStats.hitRate,
      cacheSize: cacheStats.totalEntries,
      memoryUsage: cacheStats.memoryUsage,
      expiredEntries: cacheStats.expiredEntries,
      healthStatus: this.calculateHealthStatus(cacheStats),
      recommendations: this.generateRecommendations(cacheStats, this.responseTimesSubject.value)
    };

    this.metricsSubject.next(updatedMetrics);
  }

  /**
   * Record response time for metrics calculation
   */
  recordResponseTime(responseTime: number): void {
    const currentTimes = this.responseTimesSubject.value;
    const updatedTimes = [...currentTimes, responseTime];
    
    // Keep only last 100 response times
    if (updatedTimes.length > 100) {
      updatedTimes.shift();
    }
    
    this.responseTimesSubject.next(updatedTimes);
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(responseTimes: number[]): number {
    if (responseTimes.length === 0) return 0;
    
    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / responseTimes.length);
  }

  /**
   * Calculate overall cache health status
   */
  private calculateHealthStatus(cacheStats: CacheStats): 'healthy' | 'warning' | 'critical' {
    const expiredRatio = cacheStats.totalEntries > 0 ? 
      cacheStats.expiredEntries / cacheStats.totalEntries : 0;

    // Critical conditions
    if (cacheStats.hitRate < CACHE_THRESHOLDS.WARNING_HIT_RATE ||
        cacheStats.memoryUsage > CACHE_THRESHOLDS.MAX_MEMORY_USAGE ||
        expiredRatio > CACHE_THRESHOLDS.MAX_EXPIRED_RATIO) {
      return 'critical';
    }

    // Warning conditions
    if (cacheStats.hitRate < CACHE_THRESHOLDS.HEALTHY_HIT_RATE ||
        cacheStats.memoryUsage > CACHE_THRESHOLDS.WARNING_MEMORY_USAGE ||
        expiredRatio > CACHE_THRESHOLDS.MAX_EXPIRED_RATIO / 2) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(cacheStats: CacheStats, responseTimes: number[]): string[] {
    const recommendations: string[] = [];
    const expiredRatio = cacheStats.totalEntries > 0 ? 
      cacheStats.expiredEntries / cacheStats.totalEntries : 0;
    const avgResponseTime = this.calculateAverageResponseTime(responseTimes);

    // Hit rate recommendations
    if (cacheStats.hitRate < CACHE_THRESHOLDS.WARNING_HIT_RATE) {
      recommendations.push('Cache hit rate is low. Consider increasing TTL values or improving cache warming strategies.');
    }

    if (cacheStats.hitRate < CACHE_THRESHOLDS.HEALTHY_HIT_RATE) {
      recommendations.push('Consider implementing more aggressive cache warming for frequently accessed data.');
    }

    // Memory usage recommendations
    if (cacheStats.memoryUsage > CACHE_THRESHOLDS.MAX_MEMORY_USAGE) {
      recommendations.push('Cache memory usage is high. Consider reducing cache size or implementing more aggressive eviction policies.');
    }

    if (cacheStats.memoryUsage > CACHE_THRESHOLDS.WARNING_MEMORY_USAGE) {
      recommendations.push('Monitor memory usage and consider optimizing data structures or reducing TTL for large objects.');
    }

    // Expired entries recommendations
    if (expiredRatio > CACHE_THRESHOLDS.MAX_EXPIRED_RATIO) {
      recommendations.push('High number of expired entries detected. Consider more frequent cleanup or adjusted TTL values.');
    }

    // Response time recommendations
    if (avgResponseTime > 100) {
      recommendations.push('Average response time is high. Cache performance may be impacted by memory pressure or large data sizes.');
    }

    // Positive recommendations
    if (recommendations.length === 0) {
      recommendations.push('Cache is performing optimally. Consider maintaining current configuration.');
    }

    // Size-based recommendations
    if (cacheStats.totalEntries === 0) {
      recommendations.push('Cache is empty. Ensure cache warming strategies are active.');
    }

    if (cacheStats.totalEntries > 1000) {
      recommendations.push('Large cache detected. Monitor performance and consider implementing tiered caching.');
    }

    return recommendations;
  }

  /**
   * Get current cache metrics
   */
  getCurrentMetrics(): CachePerformanceMetrics {
    return this.metricsSubject.value;
  }

  /**
   * Get cache health summary
   */
  getHealthSummary(): Observable<{
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    summary: string;
  }> {
    return this.metrics$.pipe(
      map(metrics => {
        let score = 100;
        
        // Deduct points for poor hit rate
        if (metrics.hitRate < CACHE_THRESHOLDS.HEALTHY_HIT_RATE) {
          score -= (CACHE_THRESHOLDS.HEALTHY_HIT_RATE - metrics.hitRate);
        }
        
        // Deduct points for high memory usage
        const memoryUsageRatio = metrics.memoryUsage / CACHE_THRESHOLDS.MAX_MEMORY_USAGE;
        if (memoryUsageRatio > 0.5) {
          score -= (memoryUsageRatio - 0.5) * 40;
        }
        
        // Deduct points for expired entries
        if (metrics.expiredEntries > 0 && metrics.cacheSize > 0) {
          const expiredRatio = metrics.expiredEntries / metrics.cacheSize;
          score -= expiredRatio * 30;
        }
        
        score = Math.max(0, Math.round(score));
        
        let summary = '';
        switch (metrics.healthStatus) {
          case 'healthy':
            summary = `Cache is performing well with ${metrics.hitRate.toFixed(1)}% hit rate`;
            break;
          case 'warning':
            summary = `Cache performance needs attention. Hit rate: ${metrics.hitRate.toFixed(1)}%`;
            break;
          case 'critical':
            summary = `Cache performance is critical. Immediate action required`;
            break;
        }
        
        return {
          status: metrics.healthStatus,
          score,
          summary
        };
      })
    );
  }

  /**
   * Reset metrics collection
   */
  resetMetrics(): void {
    this.responseTimesSubject.next([]);
    this.updateMetrics();
  }

  /**
   * Get trending data for dashboard visualization
   */
  getTrendingData(): Observable<{
    hitRateHistory: number[];
    memoryUsageHistory: number[];
    responseTimes: number[];
  }> {
    return combineLatest([
      this.metrics$,
      this.responseTimesSubject.asObservable()
    ]).pipe(
      map(([metrics, responseTimes]) => ({
        hitRateHistory: [metrics.hitRate], // Would be expanded with historical data
        memoryUsageHistory: [metrics.memoryUsage],
        responseTimes: responseTimes.slice(-20) // Last 20 response times
      }))
    );
  }

  /**
   * Generate cache optimization report
   */
  generateOptimizationReport(): Observable<{
    currentPerformance: CachePerformanceMetrics;
    optimizationSuggestions: {
      category: string;
      priority: 'high' | 'medium' | 'low';
      suggestion: string;
      expectedImpact: string;
    }[];
    estimatedImprovements: {
      hitRateIncrease: number;
      memoryReduction: number;
      responseTimeImprovement: number;
    };
  }> {
    return this.metrics$.pipe(
      map(metrics => {
        const suggestions = [];
        let hitRateIncrease = 0;
        let memoryReduction = 0;
        let responseTimeImprovement = 0;

        // Analyze and generate suggestions
        if (metrics.hitRate < 80) {
          suggestions.push({
            category: 'Cache Strategy',
            priority: 'high' as const,
            suggestion: 'Implement more aggressive cache warming for popular categories',
            expectedImpact: 'Could increase hit rate by 10-15%'
          });
          hitRateIncrease = 12;
        }

        if (metrics.memoryUsage > CACHE_THRESHOLDS.WARNING_MEMORY_USAGE) {
          suggestions.push({
            category: 'Memory Optimization',
            priority: 'medium' as const,
            suggestion: 'Implement data compression or reduce cache size limits',
            expectedImpact: 'Could reduce memory usage by 20-30%'
          });
          memoryReduction = 25;
          responseTimeImprovement = 15;
        }

        if (metrics.expiredEntries > metrics.cacheSize * 0.1) {
          suggestions.push({
            category: 'TTL Management',
            priority: 'medium' as const,
            suggestion: 'Optimize TTL values based on access patterns',
            expectedImpact: 'Reduce expired entries and improve efficiency'
          });
        }

        return {
          currentPerformance: metrics,
          optimizationSuggestions: suggestions,
          estimatedImprovements: {
            hitRateIncrease,
            memoryReduction,
            responseTimeImprovement
          }
        };
      })
    );
  }
}

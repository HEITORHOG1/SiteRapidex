import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CategoryLoggerService } from './category-logger.service';

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  metricType: 'api_call' | 'component_render' | 'user_interaction' | 'navigation' | 'cache_operation';
  operation: string;
  duration: number; // in milliseconds
  success: boolean;
  errorMessage?: string;
  metadata?: any;
  userId?: string;
  establishmentId?: number;
}

export interface PerformanceDashboard {
  averageApiResponseTime: number;
  averageComponentRenderTime: number;
  averageUserInteractionTime: number;
  totalOperations: number;
  successRate: number;
  slowestOperations: PerformanceMetric[];
  fastestOperations: PerformanceMetric[];
  operationsByType: { [key: string]: number };
  performanceOverTime: { timestamp: Date; avgDuration: number }[];
  criticalPerformanceIssues: PerformanceMetric[];
}

@Injectable({
  providedIn: 'root'
})
export class CategoryPerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory
  private performanceThresholds = {
    api_call: 2000, // 2 seconds
    component_render: 100, // 100ms
    user_interaction: 300, // 300ms
    navigation: 1000, // 1 second
    cache_operation: 50 // 50ms
  };

  private dashboardSubject = new BehaviorSubject<PerformanceDashboard>(this.createEmptyDashboard());
  public dashboard$ = this.dashboardSubject.asObservable();

  constructor(private logger: CategoryLoggerService) {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    // Set up performance observer for navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name.includes('category') || entry.name.includes('/categories/')) {
              this.recordMetric(
                'navigation',
                entry.name,
                entry.duration,
                true,
                { entryType: entry.entryType }
              );
            }
          });
        });
        
        observer.observe({ entryTypes: ['navigation', 'measure'] });
      } catch (error) {
        this.logger.warn('CategoryPerformanceMonitor', 'PerformanceObserver not supported', { error });
      }
    }

    this.logger.info('CategoryPerformanceMonitor', 'Performance monitoring initialized');
  }

  private createEmptyDashboard(): PerformanceDashboard {
    return {
      averageApiResponseTime: 0,
      averageComponentRenderTime: 0,
      averageUserInteractionTime: 0,
      totalOperations: 0,
      successRate: 0,
      slowestOperations: [],
      fastestOperations: [],
      operationsByType: {},
      performanceOverTime: [],
      criticalPerformanceIssues: []
    };
  }

  private generateMetricId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateDashboard(): void {
    if (this.metrics.length === 0) {
      this.dashboardSubject.next(this.createEmptyDashboard());
      return;
    }

    const apiMetrics = this.metrics.filter(m => m.metricType === 'api_call');
    const componentMetrics = this.metrics.filter(m => m.metricType === 'component_render');
    const interactionMetrics = this.metrics.filter(m => m.metricType === 'user_interaction');
    const successfulMetrics = this.metrics.filter(m => m.success);

    const operationsByType: { [key: string]: number } = {};
    this.metrics.forEach(metric => {
      operationsByType[metric.metricType] = (operationsByType[metric.metricType] || 0) + 1;
    });

    // Calculate performance over time (last 24 hours in hourly buckets)
    const performanceOverTime = this.calculatePerformanceOverTime();

    // Find critical performance issues
    const criticalPerformanceIssues = this.metrics.filter(metric => {
      const threshold = this.performanceThresholds[metric.metricType];
      return metric.duration > threshold * 2; // 2x the threshold is critical
    }).slice(-10); // Last 10 critical issues

    const dashboard: PerformanceDashboard = {
      averageApiResponseTime: this.calculateAverage(apiMetrics),
      averageComponentRenderTime: this.calculateAverage(componentMetrics),
      averageUserInteractionTime: this.calculateAverage(interactionMetrics),
      totalOperations: this.metrics.length,
      successRate: (successfulMetrics.length / this.metrics.length) * 100,
      slowestOperations: [...this.metrics].sort((a, b) => b.duration - a.duration).slice(0, 10),
      fastestOperations: [...this.metrics].sort((a, b) => a.duration - b.duration).slice(0, 10),
      operationsByType,
      performanceOverTime,
      criticalPerformanceIssues
    };

    this.dashboardSubject.next(dashboard);
  }

  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + metric.duration, 0);
    return Math.round(sum / metrics.length);
  }

  private calculatePerformanceOverTime(): { timestamp: Date; avgDuration: number }[] {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(metric => metric.timestamp >= oneDayAgo);
    
    // Group by hour
    const hourlyBuckets: { [key: string]: PerformanceMetric[] } = {};
    
    recentMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();
      
      if (!hourlyBuckets[hourKey]) {
        hourlyBuckets[hourKey] = [];
      }
      hourlyBuckets[hourKey].push(metric);
    });

    return Object.entries(hourlyBuckets).map(([hourKey, metrics]) => ({
      timestamp: new Date(hourKey),
      avgDuration: this.calculateAverage(metrics)
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private storeMetric(metric: PerformanceMetric): void {
    try {
      const storedMetrics = JSON.parse(localStorage.getItem('category_performance') || '[]');
      storedMetrics.push(metric);
      
      // Keep only last 100 metrics in localStorage
      if (storedMetrics.length > 100) {
        storedMetrics.splice(0, storedMetrics.length - 100);
      }
      
      localStorage.setItem('category_performance', JSON.stringify(storedMetrics));
      
    } catch (error) {
      this.logger.error('CategoryPerformanceMonitor', 'Failed to store performance metric', { error });
    }
  }

  // Public methods
  recordMetric(
    metricType: PerformanceMetric['metricType'],
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any,
    userId?: string,
    establishmentId?: number,
    errorMessage?: string
  ): string {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date(),
      metricType,
      operation,
      duration,
      success,
      errorMessage,
      metadata,
      userId,
      establishmentId
    };

    this.metrics.push(metric);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.updateDashboard();
    this.storeMetric(metric);

    // Log performance issues
    const threshold = this.performanceThresholds[metricType];
    if (duration > threshold) {
      this.logger.warn('CategoryPerformanceMonitor', `Slow ${metricType}: ${operation}`, {
        duration,
        threshold,
        metricId: metric.id
      });
    }

    return metric.id;
  }

  // Convenience methods for specific operations
  startTimer(operation: string): () => string {
    const startTime = performance.now();
    
    return (metricType: PerformanceMetric['metricType'] = 'user_interaction', success: boolean = true, metadata?: any, userId?: string, establishmentId?: number, errorMessage?: string) => {
      const duration = performance.now() - startTime;
      return this.recordMetric(metricType, operation, duration, success, metadata, userId, establishmentId, errorMessage);
    };
  }

  recordApiCall(
    endpoint: string,
    method: string,
    duration: number,
    success: boolean,
    statusCode?: number,
    userId?: string,
    establishmentId?: number,
    errorMessage?: string
  ): string {
    return this.recordMetric(
      'api_call',
      `${method} ${endpoint}`,
      duration,
      success,
      { statusCode, method, endpoint },
      userId,
      establishmentId,
      errorMessage
    );
  }

  recordComponentRender(
    componentName: string,
    duration: number,
    success: boolean = true,
    metadata?: any
  ): string {
    return this.recordMetric(
      'component_render',
      `Render ${componentName}`,
      duration,
      success,
      metadata
    );
  }

  recordUserInteraction(
    interaction: string,
    duration: number,
    success: boolean = true,
    userId?: string,
    establishmentId?: number
  ): string {
    return this.recordMetric(
      'user_interaction',
      interaction,
      duration,
      success,
      undefined,
      userId,
      establishmentId
    );
  }

  recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    key: string,
    duration: number,
    success: boolean = true
  ): string {
    return this.recordMetric(
      'cache_operation',
      `Cache ${operation}: ${key}`,
      duration,
      success,
      { operation, key }
    );
  }

  // Query methods
  getMetrics(metricType?: PerformanceMetric['metricType'], operation?: string): PerformanceMetric[] {
    return this.metrics.filter(metric => {
      if (metricType && metric.metricType !== metricType) return false;
      if (operation && !metric.operation.includes(operation)) return false;
      return true;
    });
  }

  getDashboard(): PerformanceDashboard {
    return this.dashboardSubject.value;
  }

  getSlowOperations(threshold?: number): PerformanceMetric[] {
    return this.metrics.filter(metric => {
      const metricThreshold = threshold || this.performanceThresholds[metric.metricType];
      return metric.duration > metricThreshold;
    });
  }

  clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem('category_performance');
    this.updateDashboard();
    this.logger.info('CategoryPerformanceMonitor', 'Performance metrics cleared');
  }

  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  // Health check
  getPerformanceHealth(): 'good' | 'warning' | 'critical' {
    const dashboard = this.getDashboard();
    
    if (dashboard.successRate < 90 || dashboard.criticalPerformanceIssues.length > 5) {
      return 'critical';
    }
    
    if (dashboard.successRate < 95 || dashboard.averageApiResponseTime > 1000) {
      return 'warning';
    }
    
    return 'good';
  }
}
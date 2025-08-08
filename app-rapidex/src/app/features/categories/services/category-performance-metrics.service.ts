import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'load' | 'render' | 'interaction' | 'bundle';
  metadata?: Record<string, any>;
}

export interface CategoryPerformanceData {
  componentLoadTime: number;
  listRenderTime: number;
  searchResponseTime: number;
  cacheHitRate: number;
  bundleSize: number;
  memoryUsage: number;
  apiResponseTimes: number[];
}

@Injectable({
  providedIn: 'root'
})
export class CategoryPerformanceMetricsService {
  private metricsSubject = new BehaviorSubject<PerformanceMetric[]>([]);
  private performanceData = new BehaviorSubject<CategoryPerformanceData>({
    componentLoadTime: 0,
    listRenderTime: 0,
    searchResponseTime: 0,
    cacheHitRate: 0,
    bundleSize: 0,
    memoryUsage: 0,
    apiResponseTimes: []
  });

  metrics$ = this.metricsSubject.asObservable();
  performanceData$ = this.performanceData.asObservable();

  private metrics: PerformanceMetric[] = [];
  private observer?: PerformanceObserver;

  constructor() {
    this.initializePerformanceObserver();
    this.startMemoryMonitoring();
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, category: PerformanceMetric['category'], metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata
    };

    this.metrics.push(metric);
    this.metricsSubject.next([...this.metrics]);

    // Update performance data
    this.updatePerformanceData(metric);

    // Log to console in development
    if (!this.isProduction()) {
      console.log(`[Performance] ${name}: ${value}ms`, metadata);
    }
  }

  /**
   * Start timing a performance metric
   */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(name, duration, 'interaction');
    };
  }

  /**
   * Measure component load time
   */
  measureComponentLoad(componentName: string): void {
    const startTime = performance.now();
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const loadTime = performance.now() - startTime;
      this.recordMetric(`${componentName}_load`, loadTime, 'load', {
        component: componentName
      });
    });
  }

  /**
   * Measure list rendering performance
   */
  measureListRender(itemCount: number): void {
    const startTime = performance.now();
    
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      this.recordMetric('category_list_render', renderTime, 'render', {
        itemCount
      });
    });
  }

  /**
   * Measure API response time
   */
  measureApiCall(endpoint: string, startTime: number): void {
    const responseTime = performance.now() - startTime;
    this.recordMetric(`api_${endpoint}`, responseTime, 'interaction', {
      endpoint
    });

    // Update API response times array
    const currentData = this.performanceData.value;
    const updatedApiTimes = [...currentData.apiResponseTimes, responseTime].slice(-10); // Keep last 10
    
    this.performanceData.next({
      ...currentData,
      apiResponseTimes: updatedApiTimes
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Observable<CategoryPerformanceData> {
    return this.performanceData$;
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.category === category);
  }

  /**
   * Clear old metrics (keep last 100)
   */
  clearOldMetrics(): void {
    this.metrics = this.metrics.slice(-100);
    this.metricsSubject.next([...this.metrics]);
  }

  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordMetric('page_load', entry.duration, 'load');
          } else if (entry.entryType === 'paint') {
            this.recordMetric(entry.name, entry.startTime, 'render');
          }
        }
      });

      try {
        this.observer.observe({ entryTypes: ['navigation', 'paint', 'measure'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        const memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024; // MB
        
        const currentData = this.performanceData.value;
        this.performanceData.next({
          ...currentData,
          memoryUsage
        });
      }, 5000); // Every 5 seconds
    }
  }

  private updatePerformanceData(metric: PerformanceMetric): void {
    const currentData = this.performanceData.value;
    const updates: Partial<CategoryPerformanceData> = {};

    switch (metric.name) {
      case 'category_list_component_load':
        updates.componentLoadTime = metric.value;
        break;
      case 'category_list_render':
        updates.listRenderTime = metric.value;
        break;
      case 'category_search':
        updates.searchResponseTime = metric.value;
        break;
    }

    if (Object.keys(updates).length > 0) {
      this.performanceData.next({
        ...currentData,
        ...updates
      });
    }
  }

  private isProduction(): boolean {
    return typeof window !== 'undefined' && 
           window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('dev');
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
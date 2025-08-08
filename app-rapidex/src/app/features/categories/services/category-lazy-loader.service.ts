import { Injectable, ComponentRef, ViewContainerRef, Type } from '@angular/core';
import { CategoryPerformanceMetricsService } from './category-performance-metrics.service';

export interface LazyComponentConfig {
  componentName: string;
  loadCondition?: () => boolean;
  preloadDelay?: number;
  priority: 'high' | 'medium' | 'low';
}

@Injectable({
  providedIn: 'root'
})
export class CategoryLazyLoaderService {
  private loadedComponents = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private preloadQueue: LazyComponentConfig[] = [];

  constructor(private performanceMetrics: CategoryPerformanceMetricsService) {
    this.initializePreloading();
  }

  /**
   * Lazy load category analytics component
   */
  async loadAnalyticsComponent(): Promise<Type<any>> {
    const componentName = 'CategoryAnalyticsDashboard';
    
    if (this.loadedComponents.has(componentName)) {
      return this.loadedComponents.get(componentName);
    }

    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    const startTime = performance.now();
    
    const loadPromise = import('../components/category-analytics-dashboard/category-analytics-dashboard.component')
      .then(module => {
        const component = module.CategoryAnalyticsDashboardComponent;
        this.loadedComponents.set(componentName, component);
        
        this.performanceMetrics.recordMetric(
          `lazy_load_${componentName}`,
          performance.now() - startTime,
          'load',
          { componentName }
        );
        
        return component;
      })
      .catch(error => {
        console.error(`Failed to load ${componentName}:`, error);
        throw error;
      })
      .finally(() => {
        this.loadingPromises.delete(componentName);
      });

    this.loadingPromises.set(componentName, loadPromise);
    return loadPromise;
  }

  /**
   * Lazy load category import/export component
   */
  async loadImportExportComponent(): Promise<Type<any>> {
    const componentName = 'CategoryImportExport';
    
    if (this.loadedComponents.has(componentName)) {
      return this.loadedComponents.get(componentName);
    }

    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    const startTime = performance.now();
    
    const loadPromise = import('../components/category-import-export/category-import-export.component')
      .then(module => {
        const component = module.CategoryImportExportComponent;
        this.loadedComponents.set(componentName, component);
        
        this.performanceMetrics.recordMetric(
          `lazy_load_${componentName}`,
          performance.now() - startTime,
          'load',
          { componentName }
        );
        
        return component;
      })
      .catch(error => {
        console.error(`Failed to load ${componentName}:`, error);
        throw error;
      })
      .finally(() => {
        this.loadingPromises.delete(componentName);
      });

    this.loadingPromises.set(componentName, loadPromise);
    return loadPromise;
  }

  /**
   * Lazy load scheduled reports component
   */
  async loadScheduledReportsComponent(): Promise<Type<any>> {
    const componentName = 'ScheduledReports';
    
    if (this.loadedComponents.has(componentName)) {
      return this.loadedComponents.get(componentName);
    }

    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    const startTime = performance.now();
    
    const loadPromise = import('../components/scheduled-reports/scheduled-reports.component')
      .then(module => {
        const component = module.ScheduledReportsComponent;
        this.loadedComponents.set(componentName, component);
        
        this.performanceMetrics.recordMetric(
          `lazy_load_${componentName}`,
          performance.now() - startTime,
          'load',
          { componentName }
        );
        
        return component;
      })
      .catch(error => {
        console.error(`Failed to load ${componentName}:`, error);
        throw error;
      })
      .finally(() => {
        this.loadingPromises.delete(componentName);
      });

    this.loadingPromises.set(componentName, loadPromise);
    return loadPromise;
  }

  /**
   * Dynamically create and insert lazy component
   */
  async createLazyComponent<T>(
    componentName: string,
    viewContainer: ViewContainerRef,
    loader: () => Promise<Type<T>>
  ): Promise<ComponentRef<T>> {
    const startTime = performance.now();
    
    try {
      const componentType = await loader();
      const componentRef = viewContainer.createComponent(componentType);
      
      this.performanceMetrics.recordMetric(
        `create_lazy_component_${componentName}`,
        performance.now() - startTime,
        'load',
        { componentName }
      );
      
      return componentRef;
    } catch (error) {
      console.error(`Failed to create lazy component ${componentName}:`, error);
      throw error;
    }
  }

  /**
   * Preload components based on user behavior
   */
  preloadComponent(config: LazyComponentConfig): void {
    if (config.loadCondition && !config.loadCondition()) {
      return;
    }

    const delay = config.preloadDelay || this.getPreloadDelay(config.priority);
    
    setTimeout(() => {
      this.preloadQueue.push(config);
      this.processPreloadQueue();
    }, delay);
  }

  /**
   * Check if component is already loaded
   */
  isComponentLoaded(componentName: string): boolean {
    return this.loadedComponents.has(componentName);
  }

  /**
   * Get loading status of component
   */
  isComponentLoading(componentName: string): boolean {
    return this.loadingPromises.has(componentName);
  }

  /**
   * Clear loaded components to free memory
   */
  clearLoadedComponents(): void {
    this.loadedComponents.clear();
    console.log('Cleared lazy loaded components from memory');
  }

  private initializePreloading(): void {
    // Preload high-priority components after initial load
    setTimeout(() => {
      this.preloadComponent({
        componentName: 'CategoryAnalyticsDashboard',
        priority: 'medium',
        loadCondition: () => this.shouldPreloadAnalytics()
      });
    }, 2000);
  }

  private processPreloadQueue(): void {
    if (this.preloadQueue.length === 0) return;

    // Sort by priority
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const config = this.preloadQueue.shift()!;
    
    switch (config.componentName) {
      case 'CategoryAnalyticsDashboard':
        this.loadAnalyticsComponent().catch(console.error);
        break;
      case 'CategoryImportExport':
        this.loadImportExportComponent().catch(console.error);
        break;
      case 'ScheduledReports':
        this.loadScheduledReportsComponent().catch(console.error);
        break;
    }

    // Process next item in queue
    if (this.preloadQueue.length > 0) {
      setTimeout(() => this.processPreloadQueue(), 100);
    }
  }

  private getPreloadDelay(priority: LazyComponentConfig['priority']): number {
    switch (priority) {
      case 'high': return 500;
      case 'medium': return 2000;
      case 'low': return 5000;
      default: return 2000;
    }
  }

  private shouldPreloadAnalytics(): boolean {
    // Check if user has accessed analytics before or has admin role
    return localStorage.getItem('hasAccessedAnalytics') === 'true' ||
           this.hasAnalyticsPermission();
  }

  private hasAnalyticsPermission(): boolean {
    // Check user permissions for analytics
    return true; // Simplified for now
  }
}
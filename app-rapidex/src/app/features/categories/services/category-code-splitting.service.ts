import { Injectable } from '@angular/core';
import { CategoryPerformanceMetricsService } from './category-performance-metrics.service';

export interface CodeSplitConfig {
  chunkName: string;
  modules: string[];
  loadCondition?: () => boolean;
  preload?: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface TreeShakingReport {
  totalModules: number;
  unusedModules: string[];
  potentialSavings: number; // in KB
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CategoryCodeSplittingService {
  private loadedChunks = new Map<string, any>();
  private chunkConfigs: CodeSplitConfig[] = [
    {
      chunkName: 'category-analytics',
      modules: ['analytics-dashboard', 'chart-service', 'analytics-service'],
      loadCondition: () => this.hasAnalyticsPermission(),
      preload: false,
      priority: 'medium'
    },
    {
      chunkName: 'category-import-export',
      modules: ['import-service', 'export-service', 'file-processor'],
      loadCondition: () => this.hasImportExportPermission(),
      preload: false,
      priority: 'low'
    },

    {
      chunkName: 'category-advanced-features',
      modules: ['scheduled-reports', 'bulk-operations', 'advanced-search'],
      loadCondition: () => this.hasAdvancedFeatures(),
      preload: false,
      priority: 'low'
    }
  ];

  constructor(private performanceMetrics: CategoryPerformanceMetricsService) {}

  /**
   * Load analytics chunk dynamically
   */
  async loadAnalyticsChunk(): Promise<any> {
    const chunkName = 'category-analytics';
    
    if (this.loadedChunks.has(chunkName)) {
      return this.loadedChunks.get(chunkName);
    }

    const startTime = performance.now();

    try {
      // Dynamic import with webpack magic comments for chunk naming
      const [analyticsModule, chartModule, serviceModule] = await Promise.all([
        import(
          /* webpackChunkName: "category-analytics-dashboard" */
          '../components/category-analytics-dashboard/category-analytics-dashboard.component'
        ),
        import(
          /* webpackChunkName: "category-chart-service" */
          '../services/category-chart.service'
        ),
        import(
          /* webpackChunkName: "category-analytics-service" */
          '../services/category-analytics.service'
        )
      ]);

      const chunk = {
        AnalyticsDashboard: analyticsModule.CategoryAnalyticsDashboardComponent,
        ChartService: chartModule.CategoryChartService,
        AnalyticsService: serviceModule.CategoryAnalyticsService
      };

      this.loadedChunks.set(chunkName, chunk);
      
      this.performanceMetrics.recordMetric(
        `chunk_load_${chunkName}`,
        performance.now() - startTime,
        'load',
        { chunkName, modules: 3 }
      );

      return chunk;
    } catch (error) {
      console.error(`Failed to load ${chunkName} chunk:`, error);
      throw error;
    }
  }

  /**
   * Load import/export chunk dynamically
   */
  async loadImportExportChunk(): Promise<any> {
    const chunkName = 'category-import-export';
    
    if (this.loadedChunks.has(chunkName)) {
      return this.loadedChunks.get(chunkName);
    }

    const startTime = performance.now();

    try {
      const [importModule, exportModule, componentModule] = await Promise.all([
        import(
          /* webpackChunkName: "category-import-service" */
          '../services/category-import.service'
        ),
        import(
          /* webpackChunkName: "category-export-service" */
          '../services/category-export.service'
        ),
        import(
          /* webpackChunkName: "category-import-export-component" */
          '../components/category-import-export/category-import-export.component'
        )
      ]);

      const chunk = {
        ImportService: importModule.CategoryImportService,
        ExportService: exportModule.CategoryExportService,
        ImportExportComponent: componentModule.CategoryImportExportComponent
      };

      this.loadedChunks.set(chunkName, chunk);
      
      this.performanceMetrics.recordMetric(
        `chunk_load_${chunkName}`,
        performance.now() - startTime,
        'load',
        { chunkName, modules: 3 }
      );

      return chunk;
    } catch (error) {
      console.error(`Failed to load ${chunkName} chunk:`, error);
      throw error;
    }
  }

  /**
   * Load offline capabilities chunk - REMOVED (offline functionality disabled)
   */
  async loadOfflineChunk(): Promise<any> {
    throw new Error('Offline functionality has been removed from the application');
  }

  /**
   * Load advanced features chunk
   */
  async loadAdvancedFeaturesChunk(): Promise<any> {
    const chunkName = 'category-advanced-features';
    
    if (this.loadedChunks.has(chunkName)) {
      return this.loadedChunks.get(chunkName);
    }

    const startTime = performance.now();

    try {
      const [reportsModule, searchModule] = await Promise.all([
        import(
          /* webpackChunkName: "category-scheduled-reports" */
          '../components/scheduled-reports/scheduled-reports.component'
        ),
        import(
          /* webpackChunkName: "category-advanced-search" */
          '../components/advanced-search/advanced-search.component'
        )
      ]);

      const chunk = {
        ScheduledReports: reportsModule.ScheduledReportsComponent,
        AdvancedSearch: searchModule.AdvancedSearchComponent
      };

      this.loadedChunks.set(chunkName, chunk);
      
      this.performanceMetrics.recordMetric(
        `chunk_load_${chunkName}`,
        performance.now() - startTime,
        'load',
        { chunkName, modules: 2 }
      );

      return chunk;
    } catch (error) {
      console.error(`Failed to load ${chunkName} chunk:`, error);
      throw error;
    }
  }

  /**
   * Preload chunks based on conditions
   */
  preloadChunks(): void {
    this.chunkConfigs
      .filter(config => config.preload && (!config.loadCondition || config.loadCondition()))
      .forEach(config => {
        setTimeout(() => {
          this.loadChunkByName(config.chunkName).catch(console.error);
        }, this.getPreloadDelay(config.priority));
      });
  }

  /**
   * Load chunk by name
   */
  async loadChunkByName(chunkName: string): Promise<any> {
    switch (chunkName) {
      case 'category-analytics':
        return this.loadAnalyticsChunk();
      case 'category-import-export':
        return this.loadImportExportChunk();
      case 'category-offline':
        throw new Error('Offline functionality has been removed from the application');
      case 'category-advanced-features':
        return this.loadAdvancedFeaturesChunk();
      default:
        throw new Error(`Unknown chunk: ${chunkName}`);
    }
  }

  /**
   * Check if chunk is loaded
   */
  isChunkLoaded(chunkName: string): boolean {
    return this.loadedChunks.has(chunkName);
  }

  /**
   * Get loaded chunks
   */
  getLoadedChunks(): string[] {
    return Array.from(this.loadedChunks.keys());
  }

  /**
   * Analyze tree shaking opportunities
   */
  analyzeTreeShaking(): TreeShakingReport {
    // In a real implementation, this would analyze the actual bundle
    const unusedModules = [
      'unused-utility-function',
      'deprecated-component',
      'old-service-method'
    ];

    return {
      totalModules: 45,
      unusedModules,
      potentialSavings: 15, // KB
      recommendations: [
        'Remove unused utility functions',
        'Use specific imports instead of barrel imports',
        'Mark unused exports with /* tree-shake */ comments',
        'Use dynamic imports for conditional code',
        'Remove deprecated components and services'
      ]
    };
  }

  /**
   * Get tree shaking recommendations
   */
  getTreeShakingRecommendations(): string[] {
    return [
      // Import optimizations
      'Use specific imports: import { CategoryService } from "./category.service" instead of import * as Category from "./category"',
      'Avoid barrel imports that import everything: import { Component } from "./components" should be import { Component } from "./components/component"',
      
      // Code structure optimizations
      'Mark side-effect-free modules with "sideEffects": false in package.json',
      'Use pure functions and avoid global state modifications',
      'Implement conditional imports with dynamic import() for optional features',
      
      // Bundle optimizations
      'Configure webpack to use production mode for tree shaking',
      'Use UglifyJS or Terser for dead code elimination',
      'Enable module concatenation with optimization.concatenateModules',
      
      // Angular specific optimizations
      'Use OnPush change detection to reduce bundle size',
      'Implement lazy loading for feature modules',
      'Use Angular CLI build optimizer for better tree shaking'
    ];
  }

  /**
   * Clear loaded chunks to free memory
   */
  clearLoadedChunks(): void {
    this.loadedChunks.clear();
    console.log('Cleared all loaded chunks from memory');
  }

  private hasAnalyticsPermission(): boolean {
    // Always return true - permissions should be handled by backend
    return true;
  }

  private hasImportExportPermission(): boolean {
    // Always return true - permissions should be handled by backend
    return true;
  }

  private isOfflineCapabilityNeeded(): boolean {
    // Offline functionality has been removed
    return false;
  }

  private hasAdvancedFeatures(): boolean {
    // Always return true - permissions should be handled by backend
    return true;
  }

  private getPreloadDelay(priority: CodeSplitConfig['priority']): number {
    switch (priority) {
      case 'high': return 1000;   // 1 second
      case 'medium': return 3000; // 3 seconds
      case 'low': return 5000;    // 5 seconds
      default: return 3000;
    }
  }
}
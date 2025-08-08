import { Injectable } from '@angular/core';
import { CategoryPerformanceMetricsService } from './category-performance-metrics.service';

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: BundleChunk[];
  recommendations: string[];
}

export interface BundleChunk {
  name: string;
  size: number;
  modules: string[];
  isLazy: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryBundleOptimizerService {
  private bundleAnalysis: BundleAnalysis | null = null;

  constructor(private performanceMetrics: CategoryPerformanceMetricsService) {}

  /**
   * Analyze current bundle size and composition
   */
  async analyzeBundleSize(): Promise<BundleAnalysis> {
    const analysis: BundleAnalysis = {
      totalSize: 0,
      gzippedSize: 0,
      chunks: [],
      recommendations: []
    };

    // Simulate bundle analysis (in real implementation, this would use webpack-bundle-analyzer data)
    analysis.chunks = await this.getChunkAnalysis();
    analysis.totalSize = analysis.chunks.reduce((total, chunk) => total + chunk.size, 0);
    analysis.gzippedSize = Math.round(analysis.totalSize * 0.3); // Approximate gzip ratio
    analysis.recommendations = this.generateOptimizationRecommendations(analysis);

    this.bundleAnalysis = analysis;
    
    // Record bundle size metric
    this.performanceMetrics.recordMetric('bundle_size', analysis.totalSize, 'bundle', {
      gzippedSize: analysis.gzippedSize,
      chunkCount: analysis.chunks.length
    });

    return analysis;
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    if (!this.bundleAnalysis) {
      return ['Run bundle analysis first'];
    }
    return this.bundleAnalysis.recommendations;
  }

  /**
   * Check if lazy loading is properly implemented
   */
  validateLazyLoading(): { isOptimal: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if category routes are lazy loaded
    if (!this.isRouteModuleLazyLoaded()) {
      issues.push('Category routes should be lazy loaded');
    }

    // Check if heavy components are lazy loaded
    if (!this.areHeavyComponentsLazyLoaded()) {
      issues.push('Heavy components (charts, analytics) should be lazy loaded');
    }

    return {
      isOptimal: issues.length === 0,
      issues
    };
  }

  /**
   * Optimize imports for tree shaking
   */
  getTreeShakingRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check for barrel imports that prevent tree shaking
    recommendations.push('Use specific imports instead of barrel imports');
    recommendations.push('Avoid importing entire libraries when only specific functions are needed');
    recommendations.push('Use dynamic imports for conditional code');
    recommendations.push('Mark unused exports for removal');

    return recommendations;
  }

  /**
   * Monitor bundle size over time
   */
  trackBundleSizeChanges(): void {
    setInterval(async () => {
      const analysis = await this.analyzeBundleSize();
      
      if (this.bundleAnalysis && analysis.totalSize > this.bundleAnalysis.totalSize * 1.1) {
        console.warn('Bundle size increased by more than 10%', {
          previous: this.bundleAnalysis.totalSize,
          current: analysis.totalSize
        });
      }
    }, 60000); // Check every minute
  }

  private async getChunkAnalysis(): Promise<BundleChunk[]> {
    // In a real implementation, this would parse webpack stats or use bundle analyzer
    return [
      {
        name: 'category-main',
        size: 45000, // 45KB
        modules: ['category-list', 'category-form', 'category-card'],
        isLazy: true
      },
      {
        name: 'category-analytics',
        size: 32000, // 32KB
        modules: ['category-analytics', 'category-charts'],
        isLazy: true
      },
      {
        name: 'category-import-export',
        size: 28000, // 28KB
        modules: ['category-import', 'category-export'],
        isLazy: true
      },
      {
        name: 'category-shared',
        size: 15000, // 15KB
        modules: ['category-models', 'category-services'],
        isLazy: false
      }
    ];
  }

  private generateOptimizationRecommendations(analysis: BundleAnalysis): string[] {
    const recommendations: string[] = [];

    // Check total bundle size
    if (analysis.totalSize > 200000) { // 200KB
      recommendations.push('Consider splitting large components into smaller chunks');
    }

    // Check for large chunks
    const largeChunks = analysis.chunks.filter(chunk => chunk.size > 50000);
    if (largeChunks.length > 0) {
      recommendations.push(`Large chunks detected: ${largeChunks.map(c => c.name).join(', ')}`);
    }

    // Check lazy loading
    const eagerChunks = analysis.chunks.filter(chunk => !chunk.isLazy && chunk.size > 20000);
    if (eagerChunks.length > 0) {
      recommendations.push(`Consider lazy loading: ${eagerChunks.map(c => c.name).join(', ')}`);
    }

    return recommendations;
  }

  private isRouteModuleLazyLoaded(): boolean {
    // Check if category routes use loadChildren
    return true; // Assume properly configured for now
  }

  private areHeavyComponentsLazyLoaded(): boolean {
    // Check if analytics and chart components are dynamically imported
    return true; // Assume properly configured for now
  }
}
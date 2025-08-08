import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CategoryPerformanceMetricsService, PerformanceMetric } from './category-performance-metrics.service';

export interface PerformanceBudget {
  name: string;
  metric: string;
  threshold: number;
  unit: 'ms' | 'kb' | 'mb' | '%';
  severity: 'warning' | 'error';
  description: string;
}

export interface BudgetViolation {
  budget: PerformanceBudget;
  actualValue: number;
  timestamp: number;
  severity: 'warning' | 'error';
  message: string;
}

export interface PerformanceReport {
  timestamp: number;
  budgets: PerformanceBudget[];
  violations: BudgetViolation[];
  overallScore: number;
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CategoryPerformanceBudgetService {
  private budgets: PerformanceBudget[] = [
    {
      name: 'Component Load Time',
      metric: 'component_load',
      threshold: 100,
      unit: 'ms',
      severity: 'warning',
      description: 'Category components should load within 100ms'
    },
    {
      name: 'List Render Time',
      metric: 'list_render',
      threshold: 200,
      unit: 'ms',
      severity: 'error',
      description: 'Category list should render within 200ms'
    },
    {
      name: 'Search Response Time',
      metric: 'search_response',
      threshold: 300,
      unit: 'ms',
      severity: 'warning',
      description: 'Search results should appear within 300ms'
    },
    {
      name: 'API Response Time',
      metric: 'api_response',
      threshold: 1000,
      unit: 'ms',
      severity: 'error',
      description: 'API calls should complete within 1 second'
    },
    {
      name: 'Bundle Size',
      metric: 'bundle_size',
      threshold: 250,
      unit: 'kb',
      severity: 'warning',
      description: 'Category module bundle should be under 250KB'
    },
    {
      name: 'Memory Usage',
      metric: 'memory_usage',
      threshold: 50,
      unit: 'mb',
      severity: 'warning',
      description: 'Memory usage should stay under 50MB'
    },
    {
      name: 'Cache Hit Rate',
      metric: 'cache_hit_rate',
      threshold: 80,
      unit: '%',
      severity: 'warning',
      description: 'Cache hit rate should be above 80%'
    }
  ];

  private violationsSubject = new BehaviorSubject<BudgetViolation[]>([]);
  private reportSubject = new BehaviorSubject<PerformanceReport | null>(null);

  violations$ = this.violationsSubject.asObservable();
  report$ = this.reportSubject.asObservable();

  private violations: BudgetViolation[] = [];
  private monitoringInterval?: number;

  constructor(private performanceMetrics: CategoryPerformanceMetricsService) {
    this.startMonitoring();
  }

  /**
   * Add custom performance budget
   */
  addBudget(budget: PerformanceBudget): void {
    this.budgets.push(budget);
  }

  /**
   * Remove performance budget
   */
  removeBudget(budgetName: string): void {
    this.budgets = this.budgets.filter(budget => budget.name !== budgetName);
  }

  /**
   * Update performance budget threshold
   */
  updateBudgetThreshold(budgetName: string, newThreshold: number): void {
    const budget = this.budgets.find(b => b.name === budgetName);
    if (budget) {
      budget.threshold = newThreshold;
    }
  }

  /**
   * Get all performance budgets
   */
  getBudgets(): PerformanceBudget[] {
    return [...this.budgets];
  }

  /**
   * Check if metric violates budget
   */
  checkBudgetViolation(metric: PerformanceMetric): BudgetViolation | null {
    const budget = this.budgets.find(b => 
      metric.name.includes(b.metric) || b.metric.includes(metric.name)
    );

    if (!budget) return null;

    const actualValue = this.convertMetricValue(metric.value, metric.category, budget.unit);
    
    if (actualValue > budget.threshold) {
      return {
        budget,
        actualValue,
        timestamp: Date.now(),
        severity: budget.severity,
        message: `${budget.name} exceeded: ${actualValue}${budget.unit} > ${budget.threshold}${budget.unit}`
      };
    }

    return null;
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const recentViolations = this.violations.filter(v => now - v.timestamp < 300000); // Last 5 minutes
    
    const report: PerformanceReport = {
      timestamp: now,
      budgets: [...this.budgets],
      violations: recentViolations,
      overallScore: this.calculateOverallScore(recentViolations),
      recommendations: this.generateRecommendations(recentViolations)
    };

    this.reportSubject.next(report);
    return report;
  }

  /**
   * Get current violations
   */
  getCurrentViolations(): BudgetViolation[] {
    return [...this.violations];
  }

  /**
   * Clear old violations
   */
  clearOldViolations(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.violations = this.violations.filter(v => v.timestamp > oneHourAgo);
    this.violationsSubject.next([...this.violations]);
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const recentViolations = this.violations.filter(v => 
      Date.now() - v.timestamp < 300000 // Last 5 minutes
    );
    return this.calculateOverallScore(recentViolations);
  }

  /**
   * Export performance data
   */
  exportPerformanceData(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  private startMonitoring(): void {
    // Subscribe to performance metrics
    this.performanceMetrics.metrics$.subscribe(metrics => {
      metrics.forEach(metric => {
        const violation = this.checkBudgetViolation(metric);
        if (violation) {
          this.addViolation(violation);
        }
      });
    });

    // Generate reports periodically
    this.monitoringInterval = window.setInterval(() => {
      this.generateReport();
      this.clearOldViolations();
    }, 60000); // Every minute
  }

  private addViolation(violation: BudgetViolation): void {
    this.violations.push(violation);
    this.violationsSubject.next([...this.violations]);

    // Log violation
    const logLevel = violation.severity === 'error' ? 'error' : 'warn';
    console[logLevel](`Performance Budget Violation: ${violation.message}`);

    // Trigger alert for critical violations
    if (violation.severity === 'error') {
      this.triggerAlert(violation);
    }
  }

  private convertMetricValue(value: number, category: string, targetUnit: string): number {
    switch (targetUnit) {
      case 'ms':
        return value; // Already in milliseconds
      case 'kb':
        return category === 'bundle' ? value / 1024 : value;
      case 'mb':
        return value / (1024 * 1024);
      case '%':
        return value * 100; // Assuming value is a ratio
      default:
        return value;
    }
  }

  private calculateOverallScore(violations: BudgetViolation[]): number {
    if (violations.length === 0) return 100;

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    // Deduct points for violations
    let score = 100;
    score -= errorCount * 20; // 20 points per error
    score -= warningCount * 10; // 10 points per warning

    return Math.max(0, score);
  }

  private generateRecommendations(violations: BudgetViolation[]): string[] {
    const recommendations: string[] = [];
    const violationTypes = new Set(violations.map(v => v.budget.metric));

    if (violationTypes.has('component_load')) {
      recommendations.push('Consider lazy loading heavy components');
      recommendations.push('Optimize component initialization logic');
    }

    if (violationTypes.has('list_render')) {
      recommendations.push('Implement virtual scrolling for large lists');
      recommendations.push('Use OnPush change detection strategy');
    }

    if (violationTypes.has('search_response')) {
      recommendations.push('Implement search debouncing');
      recommendations.push('Add client-side caching for search results');
    }

    if (violationTypes.has('api_response')) {
      recommendations.push('Optimize API queries and indexes');
      recommendations.push('Implement request caching');
    }

    if (violationTypes.has('bundle_size')) {
      recommendations.push('Enable tree shaking and code splitting');
      recommendations.push('Remove unused dependencies');
    }

    if (violationTypes.has('memory_usage')) {
      recommendations.push('Implement proper component cleanup');
      recommendations.push('Optimize data structures and caching');
    }

    if (violationTypes.has('cache_hit_rate')) {
      recommendations.push('Review cache invalidation strategy');
      recommendations.push('Increase cache TTL for stable data');
    }

    return recommendations;
  }

  private triggerAlert(violation: BudgetViolation): void {
    // In a real application, this would send alerts to monitoring systems
    console.error('CRITICAL PERFORMANCE VIOLATION:', violation);
    
    // Could integrate with services like:
    // - Sentry for error tracking
    // - DataDog for monitoring
    // - Custom alerting systems
  }

  ngOnDestroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}
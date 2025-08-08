import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ChangeDetectionStrategy, 
  signal, 
  computed 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval } from 'rxjs';

import { CategoryPerformanceMetricsService, CategoryPerformanceData } from '../../services/category-performance-metrics.service';
import { CategoryPerformanceBudgetService, PerformanceReport } from '../../services/category-performance-budget.service';
import { CategoryBundleOptimizerService, BundleAnalysis } from '../../services/category-bundle-optimizer.service';
import { CategoryCodeSplittingService, TreeShakingReport } from '../../services/category-code-splitting.service';

@Component({
  selector: 'app-category-performance-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="performance-dashboard">
      <div class="dashboard-header">
        <h2>Performance Dashboard - Categorias</h2>
        <div class="dashboard-controls">
          <button 
            class="btn btn-secondary"
            (click)="refreshData()"
            [disabled]="loading()">
            {{ loading() ? 'Atualizando...' : 'Atualizar' }}
          </button>
          <button 
            class="btn btn-primary"
            (click)="exportReport()">
            Exportar Relatório
          </button>
        </div>
      </div>

      <!-- Performance Score -->
      <div class="performance-score-card">
        <div class="score-circle" [class]="getScoreClass()">
          <span class="score-value">{{ performanceScore() }}</span>
          <span class="score-label">Score</span>
        </div>
        <div class="score-details">
          <h3>Performance Geral</h3>
          <p class="score-description">{{ getScoreDescription() }}</p>
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon">⚡</div>
          <div class="metric-content">
            <h4>Tempo de Carregamento</h4>
            <span class="metric-value">{{ performanceData()?.componentLoadTime || 0 | number:'1.0-0' }}ms</span>
            <span class="metric-status" [class]="getMetricStatus('load')">
              {{ getMetricStatusText('load') }}
            </span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">🎨</div>
          <div class="metric-content">
            <h4>Renderização da Lista</h4>
            <span class="metric-value">{{ performanceData()?.listRenderTime || 0 | number:'1.0-0' }}ms</span>
            <span class="metric-status" [class]="getMetricStatus('render')">
              {{ getMetricStatusText('render') }}
            </span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">🔍</div>
          <div class="metric-content">
            <h4>Tempo de Busca</h4>
            <span class="metric-value">{{ performanceData()?.searchResponseTime || 0 | number:'1.0-0' }}ms</span>
            <span class="metric-status" [class]="getMetricStatus('search')">
              {{ getMetricStatusText('search') }}
            </span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">💾</div>
          <div class="metric-content">
            <h4>Taxa de Cache</h4>
            <span class="metric-value">{{ performanceData()?.cacheHitRate || 0 | number:'1.0-0' }}%</span>
            <span class="metric-status" [class]="getMetricStatus('cache')">
              {{ getMetricStatusText('cache') }}
            </span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">📦</div>
          <div class="metric-content">
            <h4>Tamanho do Bundle</h4>
            <span class="metric-value">{{ bundleAnalysis()?.totalSize || 0 | number:'1.0-0' }}KB</span>
            <span class="metric-status" [class]="getMetricStatus('bundle')">
              {{ getMetricStatusText('bundle') }}
            </span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">🧠</div>
          <div class="metric-content">
            <h4>Uso de Memória</h4>
            <span class="metric-value">{{ performanceData()?.memoryUsage || 0 | number:'1.0-0' }}MB</span>
            <span class="metric-status" [class]="getMetricStatus('memory')">
              {{ getMetricStatusText('memory') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Budget Violations -->
      <div class="violations-section" *ngIf="budgetViolations().length > 0">
        <h3>Violações de Performance</h3>
        <div class="violations-list">
          <div 
            *ngFor="let violation of budgetViolations()" 
            class="violation-item"
            [class]="'violation-' + violation.severity">
            <div class="violation-icon">
              {{ violation.severity === 'error' ? '❌' : '⚠️' }}
            </div>
            <div class="violation-content">
              <h4>{{ violation.budget.name }}</h4>
              <p>{{ violation.message }}</p>
              <small>{{ violation.timestamp | date:'short' }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="recommendations-section" *ngIf="recommendations().length > 0">
        <h3>Recomendações de Otimização</h3>
        <div class="recommendations-list">
          <div 
            *ngFor="let recommendation of recommendations()" 
            class="recommendation-item">
            <div class="recommendation-icon">💡</div>
            <div class="recommendation-content">
              <p>{{ recommendation }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bundle Analysis -->
      <div class="bundle-section" *ngIf="bundleAnalysis()">
        <h3>Análise do Bundle</h3>
        <div class="bundle-stats">
          <div class="bundle-stat">
            <span class="stat-label">Tamanho Total:</span>
            <span class="stat-value">{{ bundleAnalysis()!.totalSize | number:'1.0-0' }}KB</span>
          </div>
          <div class="bundle-stat">
            <span class="stat-label">Comprimido (Gzip):</span>
            <span class="stat-value">{{ bundleAnalysis()!.gzippedSize | number:'1.0-0' }}KB</span>
          </div>
          <div class="bundle-stat">
            <span class="stat-label">Chunks:</span>
            <span class="stat-value">{{ bundleAnalysis()!.chunks.length }}</span>
          </div>
        </div>

        <div class="chunks-list">
          <h4>Chunks do Bundle</h4>
          <div 
            *ngFor="let chunk of bundleAnalysis()!.chunks" 
            class="chunk-item">
            <div class="chunk-header">
              <span class="chunk-name">{{ chunk.name }}</span>
              <span class="chunk-size">{{ chunk.size | number:'1.0-0' }}KB</span>
              <span class="chunk-lazy" [class.lazy]="chunk.isLazy">
                {{ chunk.isLazy ? 'Lazy' : 'Eager' }}
              </span>
            </div>
            <div class="chunk-modules">
              <small>Módulos: {{ chunk.modules.join(', ') }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Tree Shaking Report -->
      <div class="tree-shaking-section" *ngIf="treeShakingReport()">
        <h3>Relatório de Tree Shaking</h3>
        <div class="tree-shaking-stats">
          <div class="tree-stat">
            <span class="stat-label">Total de Módulos:</span>
            <span class="stat-value">{{ treeShakingReport()!.totalModules }}</span>
          </div>
          <div class="tree-stat">
            <span class="stat-label">Módulos Não Utilizados:</span>
            <span class="stat-value">{{ treeShakingReport()!.unusedModules.length }}</span>
          </div>
          <div class="tree-stat">
            <span class="stat-label">Economia Potencial:</span>
            <span class="stat-value">{{ treeShakingReport()!.potentialSavings }}KB</span>
          </div>
        </div>

        <div class="unused-modules" *ngIf="treeShakingReport()!.unusedModules.length > 0">
          <h4>Módulos Não Utilizados</h4>
          <ul>
            <li *ngFor="let module of treeShakingReport()!.unusedModules">
              {{ module }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Performance Timeline -->
      <div class="timeline-section">
        <h3>Timeline de Performance</h3>
        <div class="timeline-chart">
          <div 
            *ngFor="let metric of recentMetrics()" 
            class="timeline-item">
            <div class="timeline-time">
              {{ metric.timestamp | date:'HH:mm:ss' }}
            </div>
            <div class="timeline-metric">
              <span class="metric-name">{{ metric.name }}</span>
              <span class="metric-value">{{ metric.value | number:'1.0-0' }}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .performance-dashboard {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--border-color);
    }

    .dashboard-controls {
      display: flex;
      gap: 1rem;
    }

    .performance-score-card {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 2rem;
      background: var(--surface-color);
      border-radius: 0.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      position: relative;
    }

    .score-circle.excellent {
      background: conic-gradient(#22c55e 0deg 360deg, #e5e7eb 360deg);
      color: #22c55e;
    }

    .score-circle.good {
      background: conic-gradient(#3b82f6 0deg 288deg, #e5e7eb 288deg);
      color: #3b82f6;
    }

    .score-circle.poor {
      background: conic-gradient(#f59e0b 0deg 216deg, #e5e7eb 216deg);
      color: #f59e0b;
    }

    .score-circle.critical {
      background: conic-gradient(#ef4444 0deg 144deg, #e5e7eb 144deg);
      color: #ef4444;
    }

    .score-value {
      font-size: 2rem;
      line-height: 1;
    }

    .score-label {
      font-size: 0.875rem;
      opacity: 0.8;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: var(--surface-color);
      border-radius: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .metric-icon {
      font-size: 2rem;
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-color-light);
      border-radius: 0.5rem;
    }

    .metric-content h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .metric-value {
      display: block;
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .metric-status {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-weight: 500;
    }

    .metric-status.excellent {
      background: #dcfce7;
      color: #166534;
    }

    .metric-status.good {
      background: #dbeafe;
      color: #1e40af;
    }

    .metric-status.warning {
      background: #fef3c7;
      color: #92400e;
    }

    .metric-status.critical {
      background: #fee2e2;
      color: #991b1b;
    }

    .violations-section,
    .recommendations-section,
    .bundle-section,
    .tree-shaking-section,
    .timeline-section {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--surface-color);
      border-radius: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .violations-list,
    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .violation-item,
    .recommendation-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      border-radius: 0.5rem;
    }

    .violation-item.violation-error {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
    }

    .violation-item.violation-warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
    }

    .recommendation-item {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
    }

    .bundle-stats,
    .tree-shaking-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .bundle-stat,
    .tree-stat {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      background: var(--background-color);
      border-radius: 0.25rem;
    }

    .chunks-list {
      margin-top: 1.5rem;
    }

    .chunk-item {
      padding: 1rem;
      border: 1px solid var(--border-color);
      border-radius: 0.25rem;
      margin-bottom: 0.5rem;
    }

    .chunk-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .chunk-name {
      font-weight: 500;
    }

    .chunk-lazy.lazy {
      background: #dcfce7;
      color: #166534;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .timeline-chart {
      max-height: 300px;
      overflow-y: auto;
    }

    .timeline-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      border-bottom: 1px solid var(--border-light);
    }

    .timeline-item:last-child {
      border-bottom: none;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
    }

    .btn-secondary {
      background: var(--surface-color);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .btn:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .performance-score-card {
        flex-direction: column;
        text-align: center;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CategoryPerformanceDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  loading = signal(false);
  performanceData = signal<CategoryPerformanceData | null>(null);
  performanceScore = signal(0);
  budgetViolations = signal<any[]>([]);
  recommendations = signal<string[]>([]);
  bundleAnalysis = signal<BundleAnalysis | null>(null);
  treeShakingReport = signal<TreeShakingReport | null>(null);
  recentMetrics = signal<any[]>([]);

  constructor(
    private performanceMetrics: CategoryPerformanceMetricsService,
    private performanceBudget: CategoryPerformanceBudgetService,
    private bundleOptimizer: CategoryBundleOptimizerService,
    private codeSplitting: CategoryCodeSplittingService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.setupDataSubscriptions();
    this.startPeriodicUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadInitialData(): Promise<void> {
    this.loading.set(true);

    try {
      // Load performance data
      this.performanceMetrics.getPerformanceSummary().pipe(
        takeUntil(this.destroy$)
      ).subscribe(data => {
        this.performanceData.set(data);
      });

      // Load budget violations
      this.performanceBudget.violations$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(violations => {
        this.budgetViolations.set(violations);
      });

      // Load performance score
      const score = this.performanceBudget.getPerformanceScore();
      this.performanceScore.set(score);

      // Load bundle analysis
      const bundleAnalysis = await this.bundleOptimizer.analyzeBundleSize();
      this.bundleAnalysis.set(bundleAnalysis);
      this.recommendations.set(bundleAnalysis.recommendations);

      // Load tree shaking report
      const treeShakingReport = this.codeSplitting.analyzeTreeShaking();
      this.treeShakingReport.set(treeShakingReport);

    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private setupDataSubscriptions(): void {
    // Subscribe to performance metrics
    this.performanceMetrics.metrics$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(metrics => {
      // Keep only recent metrics (last 20)
      const recent = metrics.slice(-20);
      this.recentMetrics.set(recent);
    });

    // Subscribe to performance reports
    this.performanceBudget.report$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(report => {
      if (report) {
        this.performanceScore.set(report.overallScore);
        this.recommendations.set([
          ...this.recommendations(),
          ...report.recommendations
        ]);
      }
    });
  }

  private startPeriodicUpdates(): void {
    // Update data every 30 seconds
    interval(30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.refreshData();
    });
  }

  refreshData(): void {
    this.loadInitialData();
  }

  exportReport(): void {
    const report = this.performanceBudget.exportPerformanceData();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `category-performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getScoreClass(): string {
    const score = this.performanceScore();
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'poor';
    return 'critical';
  }

  getScoreDescription(): string {
    const score = this.performanceScore();
    if (score >= 90) return 'Excelente performance! O sistema está otimizado.';
    if (score >= 70) return 'Boa performance com algumas oportunidades de melhoria.';
    if (score >= 50) return 'Performance moderada. Recomenda-se otimizações.';
    return 'Performance crítica. Otimizações urgentes necessárias.';
  }

  getMetricStatus(metricType: string): string {
    const data = this.performanceData();
    if (!data) return 'unknown';

    switch (metricType) {
      case 'load':
        return data.componentLoadTime < 100 ? 'excellent' : 
               data.componentLoadTime < 200 ? 'good' : 
               data.componentLoadTime < 500 ? 'warning' : 'critical';
      case 'render':
        return data.listRenderTime < 200 ? 'excellent' : 
               data.listRenderTime < 500 ? 'good' : 
               data.listRenderTime < 1000 ? 'warning' : 'critical';
      case 'search':
        return data.searchResponseTime < 300 ? 'excellent' : 
               data.searchResponseTime < 600 ? 'good' : 
               data.searchResponseTime < 1000 ? 'warning' : 'critical';
      case 'cache':
        return data.cacheHitRate > 80 ? 'excellent' : 
               data.cacheHitRate > 60 ? 'good' : 
               data.cacheHitRate > 40 ? 'warning' : 'critical';
      case 'bundle':
        const bundleSize = this.bundleAnalysis()?.totalSize || 0;
        return bundleSize < 200 ? 'excellent' : 
               bundleSize < 400 ? 'good' : 
               bundleSize < 600 ? 'warning' : 'critical';
      case 'memory':
        return data.memoryUsage < 30 ? 'excellent' : 
               data.memoryUsage < 50 ? 'good' : 
               data.memoryUsage < 80 ? 'warning' : 'critical';
      default:
        return 'unknown';
    }
  }

  getMetricStatusText(metricType: string): string {
    const status = this.getMetricStatus(metricType);
    switch (status) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bom';
      case 'warning': return 'Atenção';
      case 'critical': return 'Crítico';
      default: return 'Desconhecido';
    }
  }
}
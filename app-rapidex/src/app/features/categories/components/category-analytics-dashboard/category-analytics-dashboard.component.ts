import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { CategoryAnalyticsService } from '../../services/category-analytics.service';
import { CategoryChartService } from '../../services/category-chart.service';
import { CategoryExportService } from '../../services/category-export.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import {
  CategoryAnalyticsSummary,
  AnalyticsFilters,
  ExportFormat,
  ReportConfig
} from '../../models/category-analytics.models';

/**
 * Category Analytics Dashboard Component
 * Displays comprehensive analytics and reporting for categories
 */
@Component({
  selector: 'app-category-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatMenuModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './category-analytics-dashboard.component.html',
  styleUrls: ['./category-analytics-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryAnalyticsDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly analyticsService = inject(CategoryAnalyticsService);
  private readonly chartService = inject(CategoryChartService);
  private readonly exportService = inject(CategoryExportService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);

  // Signals for reactive state management
  analyticsData = signal<CategoryAnalyticsSummary | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedEstablishment = signal<number | null>(null);
  chartsInitialized = signal<boolean>(false);

  // Form for filters
  filtersForm: FormGroup;

  // Computed values
  hasData = computed(() => this.analyticsData() !== null);
  performanceMetrics = computed(() => this.analyticsData()?.performanceMetrics || null);
  usageStats = computed(() => this.analyticsData()?.usageStats || []);
  trends = computed(() => this.analyticsData()?.trends || null);

  // Export options
  exportFormats: { value: ExportFormat; label: string }[] = [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
    { value: 'csv', label: 'CSV' }
  ];

  constructor() {
    this.filtersForm = this.fb.group({
      startDate: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), Validators.required],
      endDate: [new Date(), Validators.required],
      includeInactive: [false],
      groupBy: ['day', Validators.required]
    });
  }

  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    // Initialize charts after view is ready
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chartService.destroyAllCharts();
  }

  /**
   * Setup reactive subscriptions
   */
  private setupSubscriptions(): void {
    // Subscribe to establishment changes
    this.estabelecimentoService.selectedEstabelecimento$
      .pipe(takeUntil(this.destroy$))
      .subscribe(establishment => {
        if (establishment?.id) {
          this.selectedEstablishment.set(establishment.id);
          this.loadAnalyticsData();
        }
      });

    // Subscribe to analytics service state
    combineLatest([
      this.analyticsService.analyticsData$,
      this.analyticsService.loading$,
      this.analyticsService.error$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([data, loading, error]) => {
        this.analyticsData.set(data);
        this.loading.set(loading);
        this.error.set(error);

        if (data && !loading) {
          this.updateCharts();
        }
      });

    // Subscribe to form changes for real-time filtering
    this.filtersForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.filtersForm.valid && this.selectedEstablishment()) {
          this.loadAnalyticsData();
        }
      });
  }

  /**
   * Load initial data
   */
  private loadInitialData(): void {
    const establishment = this.estabelecimentoService.getSelectedEstabelecimento();
    if (establishment?.id) {
      this.selectedEstablishment.set(establishment.id);
      this.loadAnalyticsData();
    }
  }

  /**
   * Load analytics data based on current filters
   */
  loadAnalyticsData(): void {
    const establishmentId = this.selectedEstablishment();
    if (!establishmentId) return;

    const formValue = this.filtersForm.value;
    const filters: AnalyticsFilters = {
      dateRange: {
        startDate: formValue.startDate,
        endDate: formValue.endDate
      },
      includeInactive: formValue.includeInactive,
      groupBy: formValue.groupBy
    };

    this.analyticsService.getCategoryAnalytics(establishmentId, filters).subscribe({
      error: (error) => {
        console.error('Error loading analytics data:', error);
        // Fallback to mock data for development
        const mockData = this.analyticsService.generateMockAnalyticsData(establishmentId);
        this.analyticsData.set(mockData);
        this.updateCharts();
      }
    });
  }

  /**
   * Initialize all charts
   */
  private initializeCharts(): void {
    if (this.chartsInitialized()) return;

    const data = this.analyticsData();
    if (!data) return;

    try {
      // Initialize charts with current data
      this.updateCharts();
      this.chartsInitialized.set(true);
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  }

  /**
   * Update all charts with current data
   */
  private updateCharts(): void {
    const data = this.analyticsData();
    if (!data) return;

    try {
      // Usage chart
      this.chartService.createUsageChart('usageChart', data.usageStats);

      // Product distribution chart
      this.chartService.createProductDistributionChart(
        'distributionChart',
        data.trends.productDistribution
      );

      // Trend chart
      this.chartService.createTrendChart(
        'trendChart',
        data.trends.categoryGrowth,
        'Crescimento de Categorias'
      );

      // Usage over time chart
      this.chartService.createUsageOverTimeChart(
        'usageTimeChart',
        data.trends.usageOverTime
      );

      // Performance comparison chart
      this.chartService.createPerformanceComparisonChart(
        'performanceChart',
        data.usageStats
      );
    } catch (error) {
      console.error('Error updating charts:', error);
    }
  }

  /**
   * Refresh analytics data
   */
  onRefresh(): void {
    this.loadAnalyticsData();
  }

  /**
   * Reset filters to default values
   */
  onResetFilters(): void {
    this.filtersForm.patchValue({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      includeInactive: false,
      groupBy: 'day'
    });
  }

  /**
   * Export analytics data
   */
  onExport(format: ExportFormat): void {
    const data = this.analyticsData();
    const establishmentId = this.selectedEstablishment();
    
    if (!data || !establishmentId) return;

    const formValue = this.filtersForm.value;
    const config: ReportConfig = {
      establishmentId,
      dateRange: {
        startDate: formValue.startDate,
        endDate: formValue.endDate
      },
      includeCharts: true,
      includeDetailedStats: true,
      format
    };

    this.exportService.exportAnalyticsData(data, format, config).subscribe({
      next: (blob) => {
        const filename = this.exportService.generateFilename(establishmentId, format);
        this.exportService.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Error exporting data:', error);
        this.error.set('Erro ao exportar dados');
      }
    });
  }

  /**
   * Get usage frequency color
   */
  getUsageFrequencyColor(frequency: string): string {
    const colors = {
      'high': '#4CAF50',
      'medium': '#FF9800',
      'low': '#F44336',
      'unused': '#9E9E9E'
    };
    return colors[frequency as keyof typeof colors] || '#9E9E9E';
  }

  /**
   * Get usage frequency label
   */
  getUsageFrequencyLabel(frequency: string): string {
    const labels = {
      'high': 'Alta',
      'medium': 'Média',
      'low': 'Baixa',
      'unused': 'Não utilizada'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Format percentage value
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Format date value
   */
  formatDate(date: Date | null): string {
    if (!date) return 'Nunca';
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  /**
   * TrackBy function for usage stats table
   */
  trackByStat(index: number, stat: any): number {
    return stat.categoryId;
  }
}
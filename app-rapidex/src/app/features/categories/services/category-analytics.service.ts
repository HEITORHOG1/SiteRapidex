import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  CategoryAnalyticsSummary,
  CategoryUsageStats,
  CategoryPerformanceMetrics,
  AnalyticsFilters,
  ReportConfig,
  ExportFormat,
  ScheduledReportConfig
} from '../models/category-analytics.models';

/**
 * Service for category analytics and reporting functionality
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryAnalyticsService {
  private readonly baseUrl = '/api/categorias/estabelecimentos';
  
  // State management
  private analyticsDataSubject = new BehaviorSubject<CategoryAnalyticsSummary | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  public readonly analyticsData$ = this.analyticsDataSubject.asObservable();
  public readonly loading$ = this.loadingSubject.asObservable();
  public readonly error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get category analytics summary for an establishment
   */
  getCategoryAnalytics(
    establishmentId: number, 
    filters?: AnalyticsFilters
  ): Observable<CategoryAnalyticsSummary> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    let params = new HttpParams();
    
    if (filters) {
      params = params.set('startDate', filters.dateRange.startDate.toISOString());
      params = params.set('endDate', filters.dateRange.endDate.toISOString());
      params = params.set('includeInactive', filters.includeInactive.toString());
      params = params.set('groupBy', filters.groupBy);
      
      if (filters.categoryIds?.length) {
        params = params.set('categoryIds', filters.categoryIds.join(','));
      }
    }

    const url = `${this.baseUrl}/${establishmentId}/categorias/analytics`;
    
    return this.http.get<CategoryAnalyticsSummary>(url, { params }).pipe(
      tap(data => {
        this.analyticsDataSubject.next(data);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.errorSubject.next('Erro ao carregar dados de analytics');
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }

  /**
   * Get category usage statistics
   */
  getCategoryUsageStats(
    establishmentId: number,
    filters?: AnalyticsFilters
  ): Observable<CategoryUsageStats[]> {
    let params = new HttpParams();
    
    if (filters) {
      params = params.set('startDate', filters.dateRange.startDate.toISOString());
      params = params.set('endDate', filters.dateRange.endDate.toISOString());
      params = params.set('includeInactive', filters.includeInactive.toString());
    }

    const url = `${this.baseUrl}/${establishmentId}/categorias/usage-stats`;
    
    return this.http.get<CategoryUsageStats[]>(url, { params });
  }

  /**
   * Get category performance metrics
   */
  getCategoryPerformanceMetrics(
    establishmentId: number
  ): Observable<CategoryPerformanceMetrics> {
    const url = `${this.baseUrl}/${establishmentId}/categorias/performance-metrics`;
    
    return this.http.get<CategoryPerformanceMetrics>(url);
  }

  /**
   * Export analytics report
   */
  exportReport(
    establishmentId: number,
    config: ReportConfig
  ): Observable<Blob> {
    const url = `${this.baseUrl}/${establishmentId}/categorias/export-report`;
    
    return this.http.post(url, config, {
      responseType: 'blob',
      headers: {
        'Accept': this.getAcceptHeader(config.format)
      }
    });
  }

  /**
   * Schedule a report
   */
  scheduleReport(
    establishmentId: number,
    config: ScheduledReportConfig
  ): Observable<{ success: boolean; scheduleId: string }> {
    const url = `${this.baseUrl}/${establishmentId}/categorias/schedule-report`;
    
    return this.http.post<{ success: boolean; scheduleId: string }>(url, config);
  }

  /**
   * Get scheduled reports
   */
  getScheduledReports(establishmentId: number): Observable<ScheduledReportConfig[]> {
    const url = `${this.baseUrl}/${establishmentId}/categorias/scheduled-reports`;
    
    return this.http.get<ScheduledReportConfig[]>(url);
  }

  /**
   * Update scheduled report
   */
  updateScheduledReport(
    establishmentId: number,
    scheduleId: string,
    config: ScheduledReportConfig
  ): Observable<{ success: boolean }> {
    const url = `${this.baseUrl}/${establishmentId}/categorias/scheduled-reports/${scheduleId}`;
    
    return this.http.put<{ success: boolean }>(url, config);
  }

  /**
   * Delete scheduled report
   */
  deleteScheduledReport(
    establishmentId: number,
    scheduleId: string
  ): Observable<{ success: boolean }> {
    const url = `${this.baseUrl}/${establishmentId}/categorias/scheduled-reports/${scheduleId}`;
    
    return this.http.delete<{ success: boolean }>(url);
  }

  /**
   * Clear analytics data
   */
  clearAnalyticsData(): void {
    this.analyticsDataSubject.next(null);
    this.errorSubject.next(null);
  }

  /**
   * Get current analytics data
   */
  getCurrentAnalyticsData(): CategoryAnalyticsSummary | null {
    return this.analyticsDataSubject.value;
  }

  /**
   * Generate mock data for development/testing
   */
  generateMockAnalyticsData(establishmentId: number): CategoryAnalyticsSummary {
    const mockData: CategoryAnalyticsSummary = {
      establishmentId,
      reportDate: new Date(),
      performanceMetrics: {
        establishmentId,
        totalCategories: 15,
        activeCategories: 12,
        inactiveCategories: 3,
        averageProductsPerCategory: 8.5,
        mostUsedCategory: {
          categoryId: 1,
          categoryName: 'Bebidas',
          productCount: 25,
          activeProductCount: 23,
          inactiveProductCount: 2,
          totalViews: 1250,
          totalOrders: 340,
          revenue: 15600.50,
          lastUsed: new Date(),
          usageFrequency: 'high'
        },
        leastUsedCategory: {
          categoryId: 8,
          categoryName: 'Sobremesas',
          productCount: 3,
          activeProductCount: 2,
          inactiveProductCount: 1,
          totalViews: 45,
          totalOrders: 8,
          revenue: 120.00,
          lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          usageFrequency: 'low'
        },
        categoriesWithoutProducts: 2,
        recentlyCreatedCategories: 3,
        recentlyUpdatedCategories: 5
      },
      usageStats: this.generateMockUsageStats(),
      trends: {
        categoryGrowth: this.generateMockTrendData(),
        productDistribution: this.generateMockProductDistribution(),
        usageOverTime: this.generateMockUsageTimeData()
      }
    };

    return mockData;
  }

  private generateMockUsageStats(): CategoryUsageStats[] {
    const categories = [
      'Bebidas', 'Pratos Principais', 'Entradas', 'Sobremesas', 'Lanches',
      'Saladas', 'Pizzas', 'Massas', 'Carnes', 'Peixes'
    ];

    return categories.map((name, index) => ({
      categoryId: index + 1,
      categoryName: name,
      productCount: Math.floor(Math.random() * 20) + 3,
      activeProductCount: Math.floor(Math.random() * 15) + 2,
      inactiveProductCount: Math.floor(Math.random() * 5),
      totalViews: Math.floor(Math.random() * 1000) + 50,
      totalOrders: Math.floor(Math.random() * 200) + 10,
      revenue: Math.floor(Math.random() * 10000) + 500,
      lastUsed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      usageFrequency: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any
    }));
  }

  private generateMockTrendData() {
    const data = [];
    for (let i = 30; i >= 0; i--) {
      data.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        value: Math.floor(Math.random() * 50) + 10,
        label: `Dia ${31 - i}`
      });
    }
    return data;
  }

  private generateMockProductDistribution() {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    return [
      { categoryName: 'Bebidas', productCount: 25, percentage: 30, color: colors[0] },
      { categoryName: 'Pratos Principais', productCount: 20, percentage: 24, color: colors[1] },
      { categoryName: 'Entradas', productCount: 15, percentage: 18, color: colors[2] },
      { categoryName: 'Sobremesas', productCount: 12, percentage: 14, color: colors[3] },
      { categoryName: 'Lanches', productCount: 8, percentage: 10, color: colors[4] },
      { categoryName: 'Outros', productCount: 4, percentage: 4, color: colors[5] }
    ];
  }

  private generateMockUsageTimeData() {
    const data = [];
    for (let i = 30; i >= 0; i--) {
      data.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        views: Math.floor(Math.random() * 100) + 20,
        orders: Math.floor(Math.random() * 30) + 5,
        revenue: Math.floor(Math.random() * 1000) + 200
      });
    }
    return data;
  }

  private getAcceptHeader(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }
}
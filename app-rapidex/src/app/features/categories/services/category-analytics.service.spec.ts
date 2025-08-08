import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CategoryAnalyticsService } from './category-analytics.service';
import {
  CategoryAnalyticsSummary,
  CategoryUsageStats,
  CategoryPerformanceMetrics,
  AnalyticsFilters,
  ReportConfig,
  ScheduledReportConfig
} from '../models/category-analytics.models';

describe('CategoryAnalyticsService', () => {
  let service: CategoryAnalyticsService;
  let httpMock: HttpTestingController;

  const mockAnalyticsSummary: CategoryAnalyticsSummary = {
    establishmentId: 1,
    reportDate: new Date(),
    performanceMetrics: {
      establishmentId: 1,
      totalCategories: 10,
      activeCategories: 8,
      inactiveCategories: 2,
      averageProductsPerCategory: 5.5,
      mostUsedCategory: {
        categoryId: 1,
        categoryName: 'Bebidas',
        productCount: 15,
        activeProductCount: 14,
        inactiveProductCount: 1,
        totalViews: 500,
        totalOrders: 100,
        revenue: 2500.00,
        lastUsed: new Date(),
        usageFrequency: 'high'
      },
      leastUsedCategory: null,
      categoriesWithoutProducts: 1,
      recentlyCreatedCategories: 2,
      recentlyUpdatedCategories: 3
    },
    usageStats: [
      {
        categoryId: 1,
        categoryName: 'Bebidas',
        productCount: 15,
        activeProductCount: 14,
        inactiveProductCount: 1,
        totalViews: 500,
        totalOrders: 100,
        revenue: 2500.00,
        lastUsed: new Date(),
        usageFrequency: 'high'
      }
    ],
    trends: {
      categoryGrowth: [],
      productDistribution: [],
      usageOverTime: []
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CategoryAnalyticsService]
    });
    service = TestBed.inject(CategoryAnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCategoryAnalytics', () => {
    it('should fetch category analytics data', () => {
      const establishmentId = 1;
      const filters: AnalyticsFilters = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        includeInactive: false,
        groupBy: 'day'
      };

      service.getCategoryAnalytics(establishmentId, filters).subscribe(data => {
        expect(data).toEqual(mockAnalyticsSummary);
      });

      const req = httpMock.expectOne(request => 
        request.url === `/api/categorias/estabelecimentos/${establishmentId}/categorias/analytics` &&
        request.method === 'GET'
      );

      expect(req.request.params.get('startDate')).toBe(filters.dateRange.startDate.toISOString());
      expect(req.request.params.get('endDate')).toBe(filters.dateRange.endDate.toISOString());
      expect(req.request.params.get('includeInactive')).toBe('false');
      expect(req.request.params.get('groupBy')).toBe('day');

      req.flush(mockAnalyticsSummary);
    });

    it('should update loading state during request', () => {
      const establishmentId = 1;
      let loadingStates: boolean[] = [];

      service.loading$.subscribe(loading => loadingStates.push(loading));

      service.getCategoryAnalytics(establishmentId).subscribe();

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/analytics`);
      req.flush(mockAnalyticsSummary);

      expect(loadingStates).toEqual([false, true, false]);
    });

    it('should handle errors properly', () => {
      const establishmentId = 1;
      let errorMessage: string | null = null;

      service.error$.subscribe(error => errorMessage = error);

      service.getCategoryAnalytics(establishmentId).subscribe({
        error: () => {} // Handle error to prevent test failure
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/analytics`);
      req.error(new ErrorEvent('Network error'));

      expect(errorMessage).toEqual('Erro ao carregar dados de analytics');
    });
  });

  describe('getCategoryUsageStats', () => {
    it('should fetch usage statistics', () => {
      const establishmentId = 1;
      const mockUsageStats: CategoryUsageStats[] = [
        {
          categoryId: 1,
          categoryName: 'Bebidas',
          productCount: 15,
          activeProductCount: 14,
          inactiveProductCount: 1,
          totalViews: 500,
          totalOrders: 100,
          revenue: 2500.00,
          lastUsed: new Date(),
          usageFrequency: 'high'
        }
      ];

      service.getCategoryUsageStats(establishmentId).subscribe(stats => {
        expect(stats).toEqual(mockUsageStats);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/usage-stats`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsageStats);
    });
  });

  describe('getCategoryPerformanceMetrics', () => {
    it('should fetch performance metrics', () => {
      const establishmentId = 1;
      const mockMetrics: CategoryPerformanceMetrics = {
        establishmentId: 1,
        totalCategories: 10,
        activeCategories: 8,
        inactiveCategories: 2,
        averageProductsPerCategory: 5.5,
        mostUsedCategory: null,
        leastUsedCategory: null,
        categoriesWithoutProducts: 1,
        recentlyCreatedCategories: 2,
        recentlyUpdatedCategories: 3
      };

      service.getCategoryPerformanceMetrics(establishmentId).subscribe(metrics => {
        expect(metrics).toEqual(mockMetrics);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/performance-metrics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMetrics);
    });
  });

  describe('exportReport', () => {
    it('should export report as blob', () => {
      const establishmentId = 1;
      const config: ReportConfig = {
        establishmentId,
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        includeCharts: true,
        includeDetailedStats: true,
        format: 'pdf'
      };

      const mockBlob = new Blob(['test'], { type: 'application/pdf' });

      service.exportReport(establishmentId, config).subscribe(blob => {
        expect(blob).toEqual(mockBlob);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/export-report`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(config);
      expect(req.request.headers.get('Accept')).toBe('application/pdf');
      req.flush(mockBlob);
    });
  });

  describe('scheduleReport', () => {
    it('should schedule a report', () => {
      const establishmentId = 1;
      const config: ScheduledReportConfig = {
        frequency: 'weekly',
        dayOfWeek: 1,
        time: '09:00',
        recipients: ['test@example.com'],
        enabled: true
      };

      const mockResponse = { success: true, scheduleId: 'schedule-123' };

      service.scheduleReport(establishmentId, config).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/schedule-report`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(config);
      req.flush(mockResponse);
    });
  });

  describe('getScheduledReports', () => {
    it('should fetch scheduled reports', () => {
      const establishmentId = 1;
      const mockReports: ScheduledReportConfig[] = [
        {
          frequency: 'weekly',
          dayOfWeek: 1,
          time: '09:00',
          recipients: ['test@example.com'],
          enabled: true
        }
      ];

      service.getScheduledReports(establishmentId).subscribe(reports => {
        expect(reports).toEqual(mockReports);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/scheduled-reports`);
      expect(req.request.method).toBe('GET');
      req.flush(mockReports);
    });
  });

  describe('updateScheduledReport', () => {
    it('should update a scheduled report', () => {
      const establishmentId = 1;
      const scheduleId = 'schedule-123';
      const config: ScheduledReportConfig = {
        frequency: 'daily',
        time: '08:00',
        recipients: ['updated@example.com'],
        enabled: false
      };

      const mockResponse = { success: true };

      service.updateScheduledReport(establishmentId, scheduleId, config).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/scheduled-reports/${scheduleId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(config);
      req.flush(mockResponse);
    });
  });

  describe('deleteScheduledReport', () => {
    it('should delete a scheduled report', () => {
      const establishmentId = 1;
      const scheduleId = 'schedule-123';
      const mockResponse = { success: true };

      service.deleteScheduledReport(establishmentId, scheduleId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${establishmentId}/categorias/scheduled-reports/${scheduleId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });

  describe('state management', () => {
    it('should clear analytics data', () => {
      service.clearAnalyticsData();

      service.analyticsData$.subscribe(data => {
        expect(data).toBeNull();
      });

      service.error$.subscribe(error => {
        expect(error).toBeNull();
      });
    });

    it('should get current analytics data', () => {
      // Initially should be null
      expect(service.getCurrentAnalyticsData()).toBeNull();

      // After loading data
      service.getCategoryAnalytics(1).subscribe();
      const req = httpMock.expectOne('/api/categorias/estabelecimentos/1/categorias/analytics');
      req.flush(mockAnalyticsSummary);

      expect(service.getCurrentAnalyticsData()).toEqual(mockAnalyticsSummary);
    });
  });

  describe('generateMockAnalyticsData', () => {
    it('should generate mock data for development', () => {
      const establishmentId = 1;
      const mockData = service.generateMockAnalyticsData(establishmentId);

      expect(mockData.establishmentId).toBe(establishmentId);
      expect(mockData.performanceMetrics).toBeDefined();
      expect(mockData.usageStats).toBeDefined();
      expect(mockData.trends).toBeDefined();
      expect(mockData.usageStats.length).toBeGreaterThan(0);
    });
  });
});
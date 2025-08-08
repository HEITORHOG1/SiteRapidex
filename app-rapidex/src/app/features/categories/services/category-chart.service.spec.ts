import { TestBed } from '@angular/core/testing';
import { CategoryChartService } from './category-chart.service';
import {
  CategoryUsageStats,
  ProductDistributionData,
  TrendData,
  UsageTimeData
} from '../models/category-analytics.models';

// Mock Chart.js
const mockChart = {
  destroy: jasmine.createSpy('destroy'),
  update: jasmine.createSpy('update'),
  toBase64Image: jasmine.createSpy('toBase64Image').and.returnValue('data:image/png;base64,mock-image-data')
};

const MockChart = jasmine.createSpy('Chart').and.returnValue(mockChart);

describe('CategoryChartService', () => {
  let service: CategoryChartService;

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
    },
    {
      categoryId: 2,
      categoryName: 'Comidas',
      productCount: 20,
      activeProductCount: 18,
      inactiveProductCount: 2,
      totalViews: 800,
      totalOrders: 150,
      revenue: 4500.00,
      lastUsed: new Date(),
      usageFrequency: 'high'
    }
  ];

  const mockDistributionData: ProductDistributionData[] = [
    {
      categoryName: 'Bebidas',
      productCount: 15,
      percentage: 42.9,
      color: '#FF6384'
    },
    {
      categoryName: 'Comidas',
      productCount: 20,
      percentage: 57.1,
      color: '#36A2EB'
    }
  ];

  const mockTrendData: TrendData[] = [
    {
      date: new Date('2024-01-01'),
      value: 10,
      label: 'Jan 1'
    },
    {
      date: new Date('2024-01-02'),
      value: 15,
      label: 'Jan 2'
    }
  ];

  const mockUsageTimeData: UsageTimeData[] = [
    {
      date: new Date('2024-01-01'),
      views: 100,
      orders: 20,
      revenue: 500
    },
    {
      date: new Date('2024-01-02'),
      views: 150,
      orders: 30,
      revenue: 750
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CategoryChartService]
    });
    service = TestBed.inject(CategoryChartService);

    // Mock DOM elements
    const mockCanvas = document.createElement('canvas');
    spyOn(document, 'getElementById').and.returnValue(mockCanvas);
    
    // Mock Chart constructor
    (window as any).Chart = MockChart;
  });

  afterEach(() => {
    MockChart.calls.reset();
    mockChart.destroy.calls.reset();
    mockChart.update.calls.reset();
    mockChart.toBase64Image.calls.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createUsageChart', () => {
    it('should create a usage chart', () => {
      const canvasId = 'usageChart';
      
      const chart = service.createUsageChart(canvasId, mockUsageStats);
      
      expect(chart).toBeDefined();
      expect(document.getElementById).toHaveBeenCalledWith(canvasId);
    });

    it('should throw error if canvas element not found', () => {
      spyOn(document, 'getElementById').and.returnValue(null);
      
      expect(() => {
        service.createUsageChart('nonexistent', mockUsageStats);
      }).toThrow("Canvas element with id 'nonexistent' not found");
    });

    it('should destroy existing chart before creating new one', () => {
      const canvasId = 'usageChart';
      const existingChart = { destroy: jasmine.createSpy('destroy') };
      
      // Create first chart
      service.createUsageChart(canvasId, mockUsageStats);
      
      // Mock the chart in the service's internal map
      (service as any).charts.set(canvasId, existingChart);
      
      // Create second chart
      service.createUsageChart(canvasId, mockUsageStats);
      
      expect(existingChart.destroy).toHaveBeenCalled();
    });
  });

  describe('createProductDistributionChart', () => {
    it('should create a product distribution chart', () => {
      const canvasId = 'distributionChart';
      
      const chart = service.createProductDistributionChart(canvasId, mockDistributionData);
      
      expect(chart).toBeDefined();
      expect(document.getElementById).toHaveBeenCalledWith(canvasId);
    });

    it('should throw error if canvas element not found', () => {
      spyOn(document, 'getElementById').and.returnValue(null);
      
      expect(() => {
        service.createProductDistributionChart('nonexistent', mockDistributionData);
      }).toThrow("Canvas element with id 'nonexistent' not found");
    });
  });

  describe('createTrendChart', () => {
    it('should create a trend chart with default title', () => {
      const canvasId = 'trendChart';
      
      const chart = service.createTrendChart(canvasId, mockTrendData);
      
      expect(chart).toBeDefined();
      expect(document.getElementById).toHaveBeenCalledWith(canvasId);
    });

    it('should create a trend chart with custom title', () => {
      const canvasId = 'trendChart';
      const customTitle = 'Custom Trend Chart';
      
      const chart = service.createTrendChart(canvasId, mockTrendData, customTitle);
      
      expect(chart).toBeDefined();
    });

    it('should throw error if canvas element not found', () => {
      spyOn(document, 'getElementById').and.returnValue(null);
      
      expect(() => {
        service.createTrendChart('nonexistent', mockTrendData);
      }).toThrow("Canvas element with id 'nonexistent' not found");
    });
  });

  describe('createUsageOverTimeChart', () => {
    it('should create a usage over time chart', () => {
      const canvasId = 'usageTimeChart';
      
      const chart = service.createUsageOverTimeChart(canvasId, mockUsageTimeData);
      
      expect(chart).toBeDefined();
      expect(document.getElementById).toHaveBeenCalledWith(canvasId);
    });

    it('should throw error if canvas element not found', () => {
      spyOn(document, 'getElementById').and.returnValue(null);
      
      expect(() => {
        service.createUsageOverTimeChart('nonexistent', mockUsageTimeData);
      }).toThrow("Canvas element with id 'nonexistent' not found");
    });
  });

  describe('createPerformanceComparisonChart', () => {
    it('should create a performance comparison chart', () => {
      const canvasId = 'performanceChart';
      
      const chart = service.createPerformanceComparisonChart(canvasId, mockUsageStats);
      
      expect(chart).toBeDefined();
      expect(document.getElementById).toHaveBeenCalledWith(canvasId);
    });

    it('should sort stats by revenue and limit to top 10', () => {
      const canvasId = 'performanceChart';
      const manyStats = Array.from({ length: 15 }, (_, i) => ({
        ...mockUsageStats[0],
        categoryId: i + 1,
        categoryName: `Category ${i + 1}`,
        revenue: Math.random() * 1000
      }));
      
      const chart = service.createPerformanceComparisonChart(canvasId, manyStats);
      
      expect(chart).toBeDefined();
    });

    it('should throw error if canvas element not found', () => {
      spyOn(document, 'getElementById').and.returnValue(null);
      
      expect(() => {
        service.createPerformanceComparisonChart('nonexistent', mockUsageStats);
      }).toThrow("Canvas element with id 'nonexistent' not found");
    });
  });

  describe('chart management', () => {
    it('should update chart data', () => {
      const canvasId = 'testChart';
      const testChart = { 
        data: {},
        update: jasmine.createSpy('update')
      };
      
      // Mock the chart in the service's internal map
      (service as any).charts.set(canvasId, testChart);
      
      const newData = { labels: ['A', 'B'], datasets: [] };
      service.updateChart(canvasId, newData);
      
      expect(testChart.data).toEqual(newData);
      expect(testChart.update).toHaveBeenCalled();
    });

    it('should not update non-existent chart', () => {
      const newData = { labels: ['A', 'B'], datasets: [] };
      
      // Should not throw error
      expect(() => {
        service.updateChart('nonexistent', newData);
      }).not.toThrow();
    });

    it('should destroy specific chart', () => {
      const canvasId = 'testChart';
      const testChart = { destroy: jasmine.createSpy('destroy') };
      
      // Mock the chart in the service's internal map
      (service as any).charts.set(canvasId, testChart);
      
      service.destroyChart(canvasId);
      
      expect(testChart.destroy).toHaveBeenCalled();
      expect(service.getChart(canvasId)).toBeUndefined();
    });

    it('should destroy all charts', () => {
      const testChart1 = { destroy: jasmine.createSpy('destroy') };
      const testChart2 = { destroy: jasmine.createSpy('destroy') };
      
      // Mock charts in the service's internal map
      (service as any).charts.set('chart1', testChart1);
      (service as any).charts.set('chart2', testChart2);
      
      service.destroyAllCharts();
      
      expect(testChart1.destroy).toHaveBeenCalled();
      expect(testChart2.destroy).toHaveBeenCalled();
      expect(service.getChart('chart1')).toBeUndefined();
      expect(service.getChart('chart2')).toBeUndefined();
    });

    it('should get chart instance', () => {
      const canvasId = 'testChart';
      const testChart = { destroy: jasmine.createSpy('destroy') };
      
      // Initially should be undefined
      expect(service.getChart(canvasId)).toBeUndefined();
      
      // Mock the chart in the service's internal map
      (service as any).charts.set(canvasId, testChart);
      
      expect(service.getChart(canvasId)).toBe(testChart);
    });

    it('should export chart as image', () => {
      const canvasId = 'testChart';
      const testChart = { 
        toBase64Image: jasmine.createSpy('toBase64Image').and.returnValue('data:image/png;base64,mock-image-data')
      };
      
      // Mock the chart in the service's internal map
      (service as any).charts.set(canvasId, testChart);
      
      const imageData = service.exportChartAsImage(canvasId, 'png');
      
      expect(imageData).toBe('data:image/png;base64,mock-image-data');
      expect(testChart.toBase64Image).toHaveBeenCalledWith('image/png', 1.0);
    });

    it('should return null for non-existent chart export', () => {
      const imageData = service.exportChartAsImage('nonexistent');
      
      expect(imageData).toBeNull();
    });

    it('should export chart as jpeg', () => {
      const canvasId = 'testChart';
      const testChart = { 
        toBase64Image: jasmine.createSpy('toBase64Image').and.returnValue('data:image/jpeg;base64,mock-image-data')
      };
      
      // Mock the chart in the service's internal map
      (service as any).charts.set(canvasId, testChart);
      
      const imageData = service.exportChartAsImage(canvasId, 'jpeg');
      
      expect(imageData).toBe('data:image/jpeg;base64,mock-image-data');
      expect(testChart.toBase64Image).toHaveBeenCalledWith('image/jpeg', 1.0);
    });
  });
});
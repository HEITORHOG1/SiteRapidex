/**
 * Category analytics models for reporting and statistics
 */

/**
 * Category usage statistics interface
 */
export interface CategoryUsageStats {
  categoryId: number;
  categoryName: string;
  productCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
  totalViews: number;
  totalOrders: number;
  revenue: number;
  lastUsed: Date | null;
  usageFrequency: 'high' | 'medium' | 'low' | 'unused';
}

/**
 * Category performance metrics interface
 */
export interface CategoryPerformanceMetrics {
  establishmentId: number;
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  averageProductsPerCategory: number;
  mostUsedCategory: CategoryUsageStats | null;
  leastUsedCategory: CategoryUsageStats | null;
  categoriesWithoutProducts: number;
  recentlyCreatedCategories: number; // Last 30 days
  recentlyUpdatedCategories: number; // Last 30 days
}

/**
 * Category analytics summary interface
 */
export interface CategoryAnalyticsSummary {
  establishmentId: number;
  reportDate: Date;
  performanceMetrics: CategoryPerformanceMetrics;
  usageStats: CategoryUsageStats[];
  trends: CategoryTrends;
}

/**
 * Category trends interface
 */
export interface CategoryTrends {
  categoryGrowth: TrendData[];
  productDistribution: ProductDistributionData[];
  usageOverTime: UsageTimeData[];
}

/**
 * Trend data interface for charts
 */
export interface TrendData {
  date: Date;
  value: number;
  label: string;
}

/**
 * Product distribution data for pie charts
 */
export interface ProductDistributionData {
  categoryName: string;
  productCount: number;
  percentage: number;
  color: string;
}

/**
 * Usage time data for line charts
 */
export interface UsageTimeData {
  date: Date;
  views: number;
  orders: number;
  revenue: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'pdf' | 'excel' | 'csv';

/**
 * Report configuration interface
 */
export interface ReportConfig {
  establishmentId: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  includeCharts: boolean;
  includeDetailedStats: boolean;
  format: ExportFormat;
  scheduledReporting?: ScheduledReportConfig;
}

/**
 * Scheduled report configuration
 */
export interface ScheduledReportConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // For weekly reports (0-6, Sunday-Saturday)
  dayOfMonth?: number; // For monthly reports (1-31)
  time: string; // HH:mm format
  recipients: string[]; // Email addresses
  enabled: boolean;
}

/**
 * Chart configuration interface
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  data: any;
  options: any;
}

/**
 * Analytics filter interface
 */
export interface AnalyticsFilters {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  categoryIds?: number[];
  includeInactive: boolean;
  groupBy: 'day' | 'week' | 'month';
}
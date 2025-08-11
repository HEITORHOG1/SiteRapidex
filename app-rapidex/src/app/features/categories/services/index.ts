// Category services exports
export { CategoryHttpService } from './category-http.service';
export { CategoryStateService } from './category-state.service';
export { 
  CategorySearchService, 
  type SearchSuggestion, 
  type SearchHistory, 
  type AdvancedFilters 
} from './category-search.service';
export { 
  CategoryDeletionService,
  type DeletionImpactAnalysis,
  type PendingUndo
} from './category-deletion.service';
export { CategoryAnalyticsService } from './category-analytics.service';
export { CategoryChartService } from './category-chart.service';
export { CategoryExportService } from './category-export.service';
export { CategoryImportService } from './category-import.service';
export { CategoryConflictResolutionService, type ConflictResolution, type CategoryConflict } from './category-conflict-resolution.service';
export { CategoryAccessibilityService, type AccessibilitySettings, type FocusableElement } from './category-accessibility.service';
export { 
  CategoryAccessibilityTestingService, 
  type AccessibilityTestResult, 
  type AccessibilityViolation, 
  type AccessibilityWarning 
} from './category-accessibility-testing.service';

// Help and Documentation Services
export { CategoryHelpService, type HelpContent, type TourStep } from './category-help.service';

// Monitoring and Logging Services
export { CategoryLoggerService, type LogEntry, type LogMetrics } from './category-logger.service';
export { CategoryErrorTrackerService, type ErrorReport, type ErrorMetrics } from './category-error-tracker.service';
export { CategoryPerformanceMonitorService, type PerformanceMetric, type PerformanceDashboard } from './category-performance-monitor.service';
export { CategoryAnalyticsTrackerService, type UserBehaviorEvent, type UserSession, type BehaviorAnalytics } from './category-analytics-tracker.service';
export { CategorySecurityAuditService, type SecurityAuditEvent, type SecurityMetrics } from './category-security-audit.service';
export { CategoryAlertingService, type Alert, type AlertRule, type AlertCondition, type AlertMetrics } from './category-alerting.service';
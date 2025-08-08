import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, Subject, takeUntil, interval } from 'rxjs';

import { CategoryLoggerService, LogMetrics } from '../../services/category-logger.service';
import { CategoryErrorTrackerService, ErrorMetrics } from '../../services/category-error-tracker.service';
import { CategoryPerformanceMonitorService, PerformanceDashboard } from '../../services/category-performance-monitor.service';
import { CategoryAnalyticsTrackerService, BehaviorAnalytics } from '../../services/category-analytics-tracker.service';
import { CategorySecurityAuditService, SecurityMetrics } from '../../services/category-security-audit.service';
import { CategoryAlertingService, AlertMetrics, Alert } from '../../services/category-alerting.service';

@Component({
  selector: 'app-category-monitoring-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="monitoring-dashboard">
      <div class="dashboard-header">
        <h2>Category Management Monitoring Dashboard</h2>
        <div class="system-health" [class]="systemHealth()">
          <span class="health-indicator"></span>
          System Health: {{ systemHealth() | titlecase }}
        </div>
        <div class="last-updated">
          Last Updated: {{ lastUpdated() | date:'medium' }}
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- System Overview -->
        <div class="dashboard-card overview-card">
          <h3>System Overview</h3>
          <div class="metrics-grid">
            <div class="metric">
              <span class="metric-value">{{ logMetrics().totalLogs }}</span>
              <span class="metric-label">Total Logs</span>
            </div>
            <div class="metric">
              <span class="metric-value">{{ errorMetrics().totalErrors }}</span>
              <span class="metric-label">Total Errors</span>
            </div>
            <div class="metric">
              <span class="metric-value">{{ performanceMetrics().totalOperations }}</span>
              <span class="metric-label">Operations</span>
            </div>
            <div class="metric">
              <span class="metric-value">{{ securityMetrics().totalEvents }}</span>
              <span class="metric-label">Security Events</span>
            </div>
          </div>
        </div>

        <!-- Active Alerts -->
        <div class="dashboard-card alerts-card">
          <h3>Active Alerts</h3>
          <div class="alerts-summary">
            <div class="alert-count critical">
              <span class="count">{{ alertMetrics().criticalAlerts }}</span>
              <span class="label">Critical</span>
            </div>
            <div class="alert-count high">
              <span class="count">{{ alertMetrics().highPriorityAlerts }}</span>
              <span class="label">High</span>
            </div>
            <div class="alert-count total">
              <span class="count">{{ alertMetrics().activeAlerts }}</span>
              <span class="label">Active</span>
            </div>
          </div>
          <div class="recent-alerts">
            <h4>Recent Alerts</h4>
            <div class="alert-list">
              @for (alert of recentAlerts(); track alert.id) {
                <div class="alert-item" [class]="alert.severity">
                  <div class="alert-info">
                    <span class="alert-title">{{ alert.title }}</span>
                    <span class="alert-time">{{ alert.timestamp | date:'short' }}</span>
                  </div>
                  <div class="alert-actions">
                    @if (!alert.acknowledged) {
                      <button (click)="acknowledgeAlert(alert.id)" class="btn-acknowledge">
                        Acknowledge
                      </button>
                    }
                    @if (!alert.resolved) {
                      <button (click)="resolveAlert(alert.id)" class="btn-resolve">
                        Resolve
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div class="dashboard-card performance-card">
          <h3>Performance Metrics</h3>
          <div class="performance-stats">
            <div class="stat">
              <span class="stat-label">Avg API Response</span>
              <span class="stat-value">{{ performanceMetrics().averageApiResponseTime }}ms</span>
            </div>
            <div class="stat">
              <span class="stat-label">Success Rate</span>
              <span class="stat-value">{{ performanceMetrics().successRate | number:'1.1-1' }}%</span>
            </div>
            <div class="stat">
              <span class="stat-label">Avg Render Time</span>
              <span class="stat-value">{{ performanceMetrics().averageComponentRenderTime }}ms</span>
            </div>
          </div>
          <div class="performance-issues">
            <h4>Critical Performance Issues</h4>
            @for (issue of performanceMetrics().criticalPerformanceIssues.slice(0, 3); track issue.id) {
              <div class="issue-item">
                <span class="issue-operation">{{ issue.operation }}</span>
                <span class="issue-duration">{{ issue.duration }}ms</span>
              </div>
            }
          </div>
        </div>

        <!-- Error Tracking -->
        <div class="dashboard-card errors-card">
          <h3>Error Tracking</h3>
          <div class="error-stats">
            <div class="error-severity critical">
              <span class="count">{{ errorMetrics().criticalErrors }}</span>
              <span class="label">Critical</span>
            </div>
            <div class="error-severity high">
              <span class="count">{{ errorMetrics().highSeverityErrors }}</span>
              <span class="label">High</span>
            </div>
            <div class="error-severity medium">
              <span class="count">{{ errorMetrics().mediumSeverityErrors }}</span>
              <span class="label">Medium</span>
            </div>
            <div class="error-severity low">
              <span class="count">{{ errorMetrics().lowSeverityErrors }}</span>
              <span class="label">Low</span>
            </div>
          </div>
          <div class="error-types">
            <h4>Error Types</h4>
            @for (errorType of getTopErrorTypes(); track errorType.type) {
              <div class="error-type-item">
                <span class="type-name">{{ errorType.type }}</span>
                <span class="type-count">{{ errorType.count }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Security Audit -->
        <div class="dashboard-card security-card">
          <h3>Security Audit</h3>
          <div class="security-stats">
            <div class="security-metric">
              <span class="metric-label">Security Events</span>
              <span class="metric-value">{{ securityMetrics().totalEvents }}</span>
            </div>
            <div class="security-metric">
              <span class="metric-label">Failed Attempts</span>
              <span class="metric-value">{{ securityMetrics().failedAttempts }}</span>
            </div>
            <div class="security-metric">
              <span class="metric-label">Blocked Attempts</span>
              <span class="metric-value">{{ securityMetrics().blockedAttempts }}</span>
            </div>
          </div>
          <div class="security-alerts">
            <h4>Security Alerts</h4>
            @for (alert of securityMetrics().securityAlerts.slice(0, 3); track alert.id) {
              <div class="security-alert-item" [class]="alert.severity">
                <span class="alert-action">{{ alert.action }}</span>
                <span class="alert-time">{{ alert.timestamp | date:'short' }}</span>
              </div>
            }
          </div>
        </div>

        <!-- User Analytics -->
        <div class="dashboard-card analytics-card">
          <h3>User Analytics</h3>
          <div class="analytics-stats">
            <div class="analytic-metric">
              <span class="metric-label">Total Sessions</span>
              <span class="metric-value">{{ behaviorAnalytics().totalSessions }}</span>
            </div>
            <div class="analytic-metric">
              <span class="metric-label">Avg Session Duration</span>
              <span class="metric-value">{{ formatDuration(behaviorAnalytics().averageSessionDuration) }}</span>
            </div>
            <div class="analytic-metric">
              <span class="metric-label">Bounce Rate</span>
              <span class="metric-value">{{ behaviorAnalytics().bounceRate | number:'1.1-1' }}%</span>
            </div>
          </div>
          <div class="popular-features">
            <h4>Most Used Features</h4>
            @for (feature of behaviorAnalytics().mostUsedFeatures.slice(0, 3); track feature.feature) {
              <div class="feature-item">
                <span class="feature-name">{{ feature.feature }}</span>
                <span class="feature-usage">{{ feature.usage }}</span>
              </div>
            }
          </div>
        </div>

        <!-- System Actions -->
        <div class="dashboard-card actions-card">
          <h3>System Actions</h3>
          <div class="action-buttons">
            <button (click)="exportLogs()" class="btn-action">
              Export Logs
            </button>
            <button (click)="exportErrors()" class="btn-action">
              Export Errors
            </button>
            <button (click)="exportPerformance()" class="btn-action">
              Export Performance
            </button>
            <button (click)="exportSecurity()" class="btn-action">
              Export Security
            </button>
            <button (click)="exportAnalytics()" class="btn-action">
              Export Analytics
            </button>
            <button (click)="clearAllData()" class="btn-action danger">
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitoring-dashboard {
      padding: 20px;
      background: #f5f5f5;
      min-height: 100vh;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .dashboard-header h2 {
      margin: 0;
      color: #333;
    }

    .system-health {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
    }

    .system-health.healthy {
      background: #d4edda;
      color: #155724;
    }

    .system-health.warning {
      background: #fff3cd;
      color: #856404;
    }

    .system-health.critical {
      background: #f8d7da;
      color: #721c24;
    }

    .health-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .healthy .health-indicator {
      background: #28a745;
    }

    .warning .health-indicator {
      background: #ffc107;
    }

    .critical .health-indicator {
      background: #dc3545;
    }

    .last-updated {
      color: #666;
      font-size: 14px;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .dashboard-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .dashboard-card h3 {
      margin: 0 0 20px 0;
      color: #333;
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .metric {
      text-align: center;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .metric-value {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #007bff;
    }

    .metric-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }

    .alerts-summary {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }

    .alert-count {
      text-align: center;
      padding: 10px;
      border-radius: 6px;
      flex: 1;
    }

    .alert-count.critical {
      background: #f8d7da;
      color: #721c24;
    }

    .alert-count.high {
      background: #fff3cd;
      color: #856404;
    }

    .alert-count.total {
      background: #d1ecf1;
      color: #0c5460;
    }

    .alert-count .count {
      display: block;
      font-size: 20px;
      font-weight: bold;
    }

    .alert-count .label {
      display: block;
      font-size: 12px;
    }

    .alert-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .alert-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      margin-bottom: 8px;
      border-radius: 4px;
      border-left: 4px solid #ddd;
    }

    .alert-item.critical {
      border-left-color: #dc3545;
      background: #f8f9fa;
    }

    .alert-item.high {
      border-left-color: #ffc107;
      background: #f8f9fa;
    }

    .alert-info {
      display: flex;
      flex-direction: column;
    }

    .alert-title {
      font-weight: 600;
      color: #333;
    }

    .alert-time {
      font-size: 12px;
      color: #666;
    }

    .alert-actions {
      display: flex;
      gap: 8px;
    }

    .btn-acknowledge, .btn-resolve {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-acknowledge {
      background: #17a2b8;
      color: white;
    }

    .btn-resolve {
      background: #28a745;
      color: white;
    }

    .performance-stats, .error-stats, .security-stats, .analytics-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }

    .stat, .error-severity, .security-metric, .analytic-metric {
      text-align: center;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .stat-label, .label, .metric-label {
      display: block;
      font-size: 12px;
      color: #666;
    }

    .stat-value, .count, .metric-value {
      display: block;
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }

    .error-severity.critical .count {
      color: #dc3545;
    }

    .error-severity.high .count {
      color: #fd7e14;
    }

    .error-severity.medium .count {
      color: #ffc107;
    }

    .error-severity.low .count {
      color: #28a745;
    }

    .error-type-item, .issue-item, .security-alert-item, .feature-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .error-type-item:last-child, .issue-item:last-child, 
    .security-alert-item:last-child, .feature-item:last-child {
      border-bottom: none;
    }

    .type-name, .issue-operation, .alert-action, .feature-name {
      font-weight: 500;
      color: #333;
    }

    .type-count, .issue-duration, .alert-time, .feature-usage {
      color: #666;
      font-size: 14px;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }

    .btn-action {
      padding: 10px 15px;
      border: 1px solid #007bff;
      background: white;
      color: #007bff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-action:hover {
      background: #007bff;
      color: white;
    }

    .btn-action.danger {
      border-color: #dc3545;
      color: #dc3545;
    }

    .btn-action.danger:hover {
      background: #dc3545;
      color: white;
    }

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      
      .dashboard-header {
        flex-direction: column;
        gap: 10px;
        text-align: center;
      }
      
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      
      .alerts-summary {
        flex-direction: column;
      }
    }
  `]
})
export class CategoryMonitoringDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals for reactive data
  logMetrics = signal<LogMetrics>({
    totalLogs: 0,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    debugCount: 0,
    lastLogTime: null
  });

  errorMetrics = signal<ErrorMetrics>({
    totalErrors: 0,
    unresolvedErrors: 0,
    criticalErrors: 0,
    highSeverityErrors: 0,
    mediumSeverityErrors: 0,
    lowSeverityErrors: 0,
    errorsByType: {},
    lastErrorTime: null
  });

  performanceMetrics = signal<PerformanceDashboard>({
    averageApiResponseTime: 0,
    averageComponentRenderTime: 0,
    averageUserInteractionTime: 0,
    totalOperations: 0,
    successRate: 0,
    slowestOperations: [],
    fastestOperations: [],
    operationsByType: {},
    performanceOverTime: [],
    criticalPerformanceIssues: []
  });

  behaviorAnalytics = signal<BehaviorAnalytics>({
    totalSessions: 0,
    totalEvents: 0,
    averageSessionDuration: 0,
    averagePageViews: 0,
    averageInteractions: 0,
    bounceRate: 0,
    mostViewedPages: [],
    mostUsedFeatures: [],
    searchQueries: [],
    errorsByPage: [],
    userJourney: [],
    conversionFunnel: []
  });

  securityMetrics = signal<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    highRiskEvents: 0,
    mediumRiskEvents: 0,
    lowRiskEvents: 0,
    failedAttempts: 0,
    blockedAttempts: 0,
    suspiciousActivities: 0,
    eventsByType: {},
    riskTrend: [],
    topRiskyUsers: [],
    securityAlerts: []
  });

  alertMetrics = signal<AlertMetrics>({
    totalAlerts: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    highPriorityAlerts: 0,
    acknowledgedAlerts: 0,
    resolvedAlerts: 0,
    alertsByType: {},
    alertsBySource: {},
    averageResolutionTime: 0,
    escalationRate: 0
  });

  recentAlerts = signal<Alert[]>([]);
  systemHealth = signal<'healthy' | 'warning' | 'critical'>('healthy');
  lastUpdated = signal<Date>(new Date());

  constructor(
    private logger: CategoryLoggerService,
    private errorTracker: CategoryErrorTrackerService,
    private performanceMonitor: CategoryPerformanceMonitorService,
    private analyticsTracker: CategoryAnalyticsTrackerService,
    private securityAudit: CategorySecurityAuditService,
    private alerting: CategoryAlertingService
  ) {}

  ngOnInit(): void {
    this.subscribeToMetrics();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToMetrics(): void {
    // Subscribe to all metrics
    combineLatest([
      this.logger.metrics$,
      this.errorTracker.metrics$,
      this.performanceMonitor.dashboard$,
      this.analyticsTracker.analytics$,
      this.securityAudit.metrics$,
      this.alerting.metrics$,
      this.alerting.alerts$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([
      logMetrics,
      errorMetrics,
      performanceMetrics,
      behaviorAnalytics,
      securityMetrics,
      alertMetrics,
      alerts
    ]) => {
      this.logMetrics.set(logMetrics);
      this.errorMetrics.set(errorMetrics);
      this.performanceMetrics.set(performanceMetrics);
      this.behaviorAnalytics.set(behaviorAnalytics);
      this.securityMetrics.set(securityMetrics);
      this.alertMetrics.set(alertMetrics);
      this.recentAlerts.set(alerts.filter(a => !a.resolved).slice(-5));
      
      this.updateSystemHealth();
      this.lastUpdated.set(new Date());
    });
  }

  private startAutoRefresh(): void {
    // Refresh every 30 seconds
    interval(30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.lastUpdated.set(new Date());
    });
  }

  private updateSystemHealth(): void {
    const criticalAlerts = this.alertMetrics().criticalAlerts;
    const criticalErrors = this.errorMetrics().criticalErrors;
    const securityViolations = this.securityMetrics().criticalEvents;
    
    if (criticalAlerts > 0 || criticalErrors > 0 || securityViolations > 0) {
      this.systemHealth.set('critical');
    } else if (this.alertMetrics().activeAlerts > 5 || this.errorMetrics().highSeverityErrors > 10) {
      this.systemHealth.set('warning');
    } else {
      this.systemHealth.set('healthy');
    }
  }

  // Helper methods
  getTopErrorTypes(): { type: string; count: number }[] {
    const errorsByType = this.errorMetrics().errorsByType;
    return Object.entries(errorsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Action methods
  acknowledgeAlert(alertId: string): void {
    this.alerting.acknowledgeAlert(alertId, 'dashboard_user');
  }

  resolveAlert(alertId: string): void {
    this.alerting.resolveAlert(alertId, 'dashboard_user');
  }

  exportLogs(): void {
    const logs = this.logger.exportLogs();
    this.downloadFile(logs, 'category-logs.json');
  }

  exportErrors(): void {
    const errors = this.errorTracker.exportErrors();
    this.downloadFile(errors, 'category-errors.json');
  }

  exportPerformance(): void {
    const performance = this.performanceMonitor.exportMetrics();
    this.downloadFile(performance, 'category-performance.json');
  }

  exportSecurity(): void {
    const security = this.securityAudit.exportAuditLog();
    this.downloadFile(security, 'category-security.json');
  }

  exportAnalytics(): void {
    const analytics = this.analyticsTracker.exportAnalytics();
    this.downloadFile(analytics, 'category-analytics.json');
  }

  clearAllData(): void {
    if (confirm('Are you sure you want to clear all monitoring data? This action cannot be undone.')) {
      this.logger.clearLogs();
      this.errorTracker.clearErrors();
      this.performanceMonitor.clearMetrics();
      this.analyticsTracker.clearAnalytics();
      this.securityAudit.clearAuditLog();
      this.alerting.clearAlerts();
      
      alert('All monitoring data has been cleared.');
    }
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
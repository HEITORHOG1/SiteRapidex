import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, combineLatest } from 'rxjs';
import { CategoryLoggerService } from './category-logger.service';
import { CategoryErrorTrackerService } from './category-error-tracker.service';
import { CategoryPerformanceMonitorService } from './category-performance-monitor.service';
import { CategorySecurityAuditService } from './category-security-audit.service';

export interface Alert {
  id: string;
  timestamp: Date;
  type: 'error' | 'performance' | 'security' | 'system' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  metadata: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalated: boolean;
  escalatedAt?: Date;
  notificationsSent: string[]; // channels where notifications were sent
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: Alert['type'];
  severity: Alert['severity'];
  enabled: boolean;
  condition: AlertCondition;
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
  notificationChannels: string[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  threshold: number;
  timeWindow: number; // minutes
  aggregation?: 'count' | 'avg' | 'max' | 'min' | 'sum';
}

export interface AlertMetrics {
  totalAlerts: number;
  activeAlerts: number;
  criticalAlerts: number;
  highPriorityAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  alertsByType: { [key: string]: number };
  alertsBySource: { [key: string]: number };
  averageResolutionTime: number;
  escalationRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryAlertingService {
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private maxAlerts = 500; // Keep last 500 alerts in memory
  private monitoringInterval = 60000; // Check every minute

  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  private metricsSubject = new BehaviorSubject<AlertMetrics>(this.createEmptyMetrics());

  public alerts$ = this.alertsSubject.asObservable();
  public metrics$ = this.metricsSubject.asObservable();

  constructor(
    private logger: CategoryLoggerService,
    private errorTracker: CategoryErrorTrackerService,
    private performanceMonitor: CategoryPerformanceMonitorService,
    private securityAudit: CategorySecurityAuditService
  ) {
    this.initializeAlerting();
  }

  private initializeAlerting(): void {
    this.setupDefaultAlertRules();
    this.startMonitoring();
    
    this.logger.info('CategoryAlerting', 'Alerting system initialized');
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Triggers when error rate exceeds 10% in 5 minutes',
        type: 'error',
        severity: 'high',
        enabled: true,
        condition: {
          metric: 'error_rate',
          operator: '>',
          threshold: 10,
          timeWindow: 5,
          aggregation: 'avg'
        },
        cooldownPeriod: 15,
        notificationChannels: ['console', 'storage']
      },
      {
        id: 'critical_errors',
        name: 'Critical Errors',
        description: 'Triggers on any critical error',
        type: 'error',
        severity: 'critical',
        enabled: true,
        condition: {
          metric: 'critical_error_count',
          operator: '>',
          threshold: 0,
          timeWindow: 1,
          aggregation: 'count'
        },
        cooldownPeriod: 5,
        notificationChannels: ['console', 'storage']
      },
      {
        id: 'slow_api_response',
        name: 'Slow API Response',
        description: 'Triggers when API response time exceeds 3 seconds',
        type: 'performance',
        severity: 'medium',
        enabled: true,
        condition: {
          metric: 'api_response_time',
          operator: '>',
          threshold: 3000,
          timeWindow: 5,
          aggregation: 'avg'
        },
        cooldownPeriod: 10,
        notificationChannels: ['console', 'storage']
      },
      {
        id: 'security_violations',
        name: 'Security Violations',
        description: 'Triggers on security violations',
        type: 'security',
        severity: 'critical',
        enabled: true,
        condition: {
          metric: 'security_violation_count',
          operator: '>',
          threshold: 0,
          timeWindow: 1,
          aggregation: 'count'
        },
        cooldownPeriod: 1,
        notificationChannels: ['console', 'storage']
      },
      {
        id: 'failed_authentication',
        name: 'Multiple Failed Authentication',
        description: 'Triggers on multiple failed authentication attempts',
        type: 'security',
        severity: 'high',
        enabled: true,
        condition: {
          metric: 'failed_auth_count',
          operator: '>',
          threshold: 5,
          timeWindow: 10,
          aggregation: 'count'
        },
        cooldownPeriod: 30,
        notificationChannels: ['console', 'storage']
      },
      {
        id: 'low_success_rate',
        name: 'Low Success Rate',
        description: 'Triggers when operation success rate drops below 90%',
        type: 'system',
        severity: 'medium',
        enabled: true,
        condition: {
          metric: 'success_rate',
          operator: '<',
          threshold: 90,
          timeWindow: 10,
          aggregation: 'avg'
        },
        cooldownPeriod: 20,
        notificationChannels: ['console', 'storage']
      }
    ];

    this.alertRules = defaultRules;
    this.logger.info('CategoryAlerting', 'Default alert rules configured', { ruleCount: defaultRules.length });
  }

  private startMonitoring(): void {
    // Monitor metrics every minute
    interval(this.monitoringInterval).subscribe(() => {
      this.checkAlertRules();
    });

    // Also monitor in real-time for critical events
    this.errorTracker.metrics$.subscribe(errorMetrics => {
      this.checkCriticalErrors(errorMetrics);
    });

    this.securityAudit.metrics$.subscribe(securityMetrics => {
      this.checkSecurityAlerts(securityMetrics);
    });
  }

  private checkAlertRules(): void {
    this.alertRules.filter(rule => rule.enabled).forEach(rule => {
      if (this.isInCooldown(rule)) {
        return;
      }

      const shouldTrigger = this.evaluateCondition(rule.condition);
      if (shouldTrigger) {
        this.triggerAlert(rule);
      }
    });
  }

  private isInCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return false;
    
    const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownPeriod * 60 * 1000);
    return new Date() < cooldownEnd;
  }

  private evaluateCondition(condition: AlertCondition): boolean {
    const metricValue = this.getMetricValue(condition.metric, condition.timeWindow, condition.aggregation);
    
    switch (condition.operator) {
      case '>': return metricValue > condition.threshold;
      case '<': return metricValue < condition.threshold;
      case '=': return metricValue === condition.threshold;
      case '>=': return metricValue >= condition.threshold;
      case '<=': return metricValue <= condition.threshold;
      case '!=': return metricValue !== condition.threshold;
      default: return false;
    }
  }

  private getMetricValue(metric: string, timeWindow: number, aggregation?: string): number {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);

    switch (metric) {
      case 'error_rate':
        return this.calculateErrorRate(cutoff);
      case 'critical_error_count':
        return this.getCriticalErrorCount(cutoff);
      case 'api_response_time':
        return this.getAverageApiResponseTime(cutoff);
      case 'security_violation_count':
        return this.getSecurityViolationCount(cutoff);
      case 'failed_auth_count':
        return this.getFailedAuthCount(cutoff);
      case 'success_rate':
        return this.calculateSuccessRate(cutoff);
      default:
        return 0;
    }
  }

  private calculateErrorRate(cutoff: Date): number {
    const errorMetrics = this.errorTracker.getMetrics();
    const recentErrors = this.errorTracker.getErrors().filter(e => e.timestamp >= cutoff);
    const performanceMetrics = this.performanceMonitor.getMetrics('api_call').filter(m => m.timestamp >= cutoff);
    
    if (performanceMetrics.length === 0) return 0;
    
    return (recentErrors.length / performanceMetrics.length) * 100;
  }

  private getCriticalErrorCount(cutoff: Date): number {
    return this.errorTracker.getErrors('critical').filter(e => e.timestamp >= cutoff).length;
  }

  private getAverageApiResponseTime(cutoff: Date): number {
    const apiMetrics = this.performanceMonitor.getMetrics('api_call').filter(m => m.timestamp >= cutoff);
    if (apiMetrics.length === 0) return 0;
    
    return apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length;
  }

  private getSecurityViolationCount(cutoff: Date): number {
    return this.securityAudit.getAuditEvents('security_violation').filter(e => e.timestamp >= cutoff).length;
  }

  private getFailedAuthCount(cutoff: Date): number {
    return this.securityAudit.getAuditEvents('authentication').filter(e => 
      e.timestamp >= cutoff && e.outcome === 'failure'
    ).length;
  }

  private calculateSuccessRate(cutoff: Date): number {
    const performanceMetrics = this.performanceMonitor.getMetrics().filter(m => m.timestamp >= cutoff);
    if (performanceMetrics.length === 0) return 100;
    
    const successfulMetrics = performanceMetrics.filter(m => m.success);
    return (successfulMetrics.length / performanceMetrics.length) * 100;
  }

  private checkCriticalErrors(errorMetrics: any): void {
    if (errorMetrics.criticalErrors > 0) {
      const recentCriticalErrors = this.errorTracker.getErrors('critical').slice(-1);
      if (recentCriticalErrors.length > 0) {
        const error = recentCriticalErrors[0];
        this.createAlert(
          'error',
          'critical',
          'Critical Error Detected',
          `Critical error occurred: ${error.message}`,
          'error_tracker',
          { errorId: error.id, errorType: error.errorType }
        );
      }
    }
  }

  private checkSecurityAlerts(securityMetrics: any): void {
    if (securityMetrics.criticalEvents > 0) {
      const recentCriticalEvents = this.securityAudit.getAuditEvents().filter(e => e.severity === 'critical').slice(-1);
      if (recentCriticalEvents.length > 0) {
        const event = recentCriticalEvents[0];
        this.createAlert(
          'security',
          'critical',
          'Security Violation Detected',
          `Security violation: ${event.action}`,
          'security_audit',
          { eventId: event.id, eventType: event.eventType }
        );
      }
    }
  }

  private triggerAlert(rule: AlertRule): void {
    rule.lastTriggered = new Date();
    
    this.createAlert(
      rule.type,
      rule.severity,
      rule.name,
      rule.description,
      'alert_rule',
      { ruleId: rule.id, ruleName: rule.name }
    );

    this.sendNotifications(rule);
  }

  private sendNotifications(rule: AlertRule): void {
    rule.notificationChannels.forEach(channel => {
      this.sendNotification(channel, rule);
    });
  }

  private sendNotification(channel: string, rule: AlertRule): void {
    switch (channel) {
      case 'console':
        console.warn(`[ALERT] ${rule.severity.toUpperCase()}: ${rule.name} - ${rule.description}`);
        break;
      case 'storage':
        this.storeNotification(rule);
        break;
      // In a real implementation, you would add email, SMS, webhook, etc.
      default:
        this.logger.warn('CategoryAlerting', `Unknown notification channel: ${channel}`);
    }
  }

  private storeNotification(rule: AlertRule): void {
    try {
      const notifications = JSON.parse(localStorage.getItem('category_notifications') || '[]');
      notifications.push({
        timestamp: new Date().toISOString(),
        rule: rule.name,
        severity: rule.severity,
        description: rule.description
      });
      
      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(0, notifications.length - 50);
      }
      
      localStorage.setItem('category_notifications', JSON.stringify(notifications));
    } catch (error) {
      this.logger.error('CategoryAlerting', 'Failed to store notification', { error });
    }
  }

  private createEmptyMetrics(): AlertMetrics {
    return {
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
    };
  }

  private updateMetrics(): void {
    if (this.alerts.length === 0) {
      this.metricsSubject.next(this.createEmptyMetrics());
      return;
    }

    const alertsByType: { [key: string]: number } = {};
    const alertsBySource: { [key: string]: number } = {};
    
    this.alerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySource[alert.source] = (alertsBySource[alert.source] || 0) + 1;
    });

    const resolvedAlerts = this.alerts.filter(a => a.resolved);
    const averageResolutionTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, alert) => {
          if (alert.resolvedAt) {
            return sum + (alert.resolvedAt.getTime() - alert.timestamp.getTime());
          }
          return sum;
        }, 0) / resolvedAlerts.length
      : 0;

    const escalatedAlerts = this.alerts.filter(a => a.escalated);
    const escalationRate = (escalatedAlerts.length / this.alerts.length) * 100;

    const metrics: AlertMetrics = {
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => !a.resolved).length,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
      highPriorityAlerts: this.alerts.filter(a => a.severity === 'high').length,
      acknowledgedAlerts: this.alerts.filter(a => a.acknowledged).length,
      resolvedAlerts: resolvedAlerts.length,
      alertsByType,
      alertsBySource,
      averageResolutionTime: Math.round(averageResolutionTime / 1000 / 60), // Convert to minutes
      escalationRate
    };

    this.metricsSubject.next(metrics);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    message: string,
    source: string,
    metadata: any = {}
  ): string {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      type,
      severity,
      title,
      message,
      source,
      metadata,
      acknowledged: false,
      resolved: false,
      escalated: false,
      notificationsSent: []
    };

    this.alerts.push(alert);
    
    // Keep only the last maxAlerts entries
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    this.updateMetrics();
    this.alertsSubject.next([...this.alerts]);

    this.logger.info('CategoryAlerting', `Alert created: ${title}`, {
      alertId: alert.id,
      type,
      severity
    });

    return alert.id;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      
      this.updateMetrics();
      this.alertsSubject.next([...this.alerts]);
      
      this.logger.info('CategoryAlerting', `Alert acknowledged: ${alertId}`, { acknowledgedBy });
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date();
      
      this.updateMetrics();
      this.alertsSubject.next([...this.alerts]);
      
      this.logger.info('CategoryAlerting', `Alert resolved: ${alertId}`, { resolvedBy });
      return true;
    }
    return false;
  }

  escalateAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.escalated) {
      alert.escalated = true;
      alert.escalatedAt = new Date();
      
      // In a real implementation, this would trigger escalation procedures
      this.logger.warn('CategoryAlerting', `Alert escalated: ${alert.title}`, { alertId });
      
      this.updateMetrics();
      this.alertsSubject.next([...this.alerts]);
      
      return true;
    }
    return false;
  }

  // Alert rule management
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.alertRules.push(newRule);
    this.logger.info('CategoryAlerting', `Alert rule added: ${newRule.name}`, { ruleId: newRule.id });
    
    return newRule.id;
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.logger.info('CategoryAlerting', `Alert rule updated: ${ruleId}`);
      return true;
    }
    return false;
  }

  deleteAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      this.logger.info('CategoryAlerting', `Alert rule deleted: ${ruleId}`);
      return true;
    }
    return false;
  }

  // Query methods
  getAlerts(
    type?: Alert['type'],
    severity?: Alert['severity'],
    resolved?: boolean
  ): Alert[] {
    return this.alerts.filter(alert => {
      if (type && alert.type !== type) return false;
      if (severity && alert.severity !== severity) return false;
      if (resolved !== undefined && alert.resolved !== resolved) return false;
      return true;
    });
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getCriticalAlerts(): Alert[] {
    return this.alerts.filter(alert => alert.severity === 'critical' && !alert.resolved);
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  getMetrics(): AlertMetrics {
    return this.metricsSubject.value;
  }

  clearAlerts(): void {
    this.alerts = [];
    this.updateMetrics();
    this.alertsSubject.next([]);
    this.logger.info('CategoryAlerting', 'All alerts cleared');
  }

  exportAlerts(): string {
    return JSON.stringify({
      alerts: this.alerts,
      rules: this.alertRules,
      metrics: this.getMetrics()
    }, null, 2);
  }

  // System health check
  getSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const criticalAlerts = this.getCriticalAlerts();
    const activeAlerts = this.getActiveAlerts();
    
    if (criticalAlerts.length > 0) {
      return 'critical';
    }
    
    if (activeAlerts.length > 10) {
      return 'warning';
    }
    
    return 'healthy';
  }
}
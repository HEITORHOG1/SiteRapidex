import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CategoryLoggerService } from './category-logger.service';

export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'security_violation' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  establishmentId?: number;
  sessionId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'blocked';
  details: any;
  ipAddress?: string;
  userAgent: string;
  location?: string;
  riskScore: number; // 0-100
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highRiskEvents: number;
  mediumRiskEvents: number;
  lowRiskEvents: number;
  failedAttempts: number;
  blockedAttempts: number;
  suspiciousActivities: number;
  eventsByType: { [key: string]: number };
  riskTrend: { timestamp: Date; avgRiskScore: number }[];
  topRiskyUsers: { userId: string; riskScore: number; eventCount: number }[];
  securityAlerts: SecurityAuditEvent[];
}

@Injectable({
  providedIn: 'root'
})
export class CategorySecurityAuditService {
  private auditEvents: SecurityAuditEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 security events in memory
  private riskThresholds = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90
  };

  private metricsSubject = new BehaviorSubject<SecurityMetrics>(this.createEmptyMetrics());
  public metrics$ = this.metricsSubject.asObservable();

  constructor(private logger: CategoryLoggerService) {
    this.initializeSecurityAudit();
  }

  private initializeSecurityAudit(): void {
    // Set up security monitoring
    this.setupSecurityMonitoring();
    
    this.logger.info('CategorySecurityAudit', 'Security audit logging initialized');
    this.logSecurityEvent(
      'authentication',
      'low',
      'audit_system_start',
      'security_audit_service',
      'success',
      { message: 'Security audit system initialized' }
    );
  }

  private setupSecurityMonitoring(): void {
    // Monitor for suspicious patterns
    setInterval(() => {
      this.detectSuspiciousPatterns();
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Monitor for failed authentication attempts
    this.monitorFailedAttempts();
  }

  private detectSuspiciousPatterns(): void {
    const recentEvents = this.getRecentEvents(15 * 60 * 1000); // Last 15 minutes
    
    // Detect rapid successive failures
    const failedEvents = recentEvents.filter(e => e.outcome === 'failure');
    if (failedEvents.length > 10) {
      this.logSecurityEvent(
        'suspicious_activity',
        'high',
        'rapid_failures_detected',
        'pattern_detection',
        'blocked',
        { 
          failureCount: failedEvents.length,
          timeWindow: '15 minutes',
          pattern: 'rapid_successive_failures'
        }
      );
    }

    // Detect unusual access patterns
    const accessEvents = recentEvents.filter(e => e.eventType === 'data_access');
    const uniqueResources = new Set(accessEvents.map(e => e.resource));
    if (uniqueResources.size > 50) {
      this.logSecurityEvent(
        'suspicious_activity',
        'medium',
        'unusual_access_pattern',
        'pattern_detection',
        'success',
        {
          resourceCount: uniqueResources.size,
          timeWindow: '15 minutes',
          pattern: 'excessive_resource_access'
        }
      );
    }
  }

  private monitorFailedAttempts(): void {
    // This would typically integrate with authentication service
    // For now, we'll monitor based on logged events
  }

  private getRecentEvents(timeWindowMs: number): SecurityAuditEvent[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.auditEvents.filter(event => event.timestamp >= cutoff);
  }

  private createEmptyMetrics(): SecurityMetrics {
    return {
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
    };
  }

  private calculateRiskScore(
    eventType: SecurityAuditEvent['eventType'],
    outcome: SecurityAuditEvent['outcome'],
    details: any
  ): number {
    let baseScore = 0;

    // Base score by event type
    switch (eventType) {
      case 'security_violation':
        baseScore = 80;
        break;
      case 'suspicious_activity':
        baseScore = 60;
        break;
      case 'authorization':
        baseScore = outcome === 'failure' ? 40 : 10;
        break;
      case 'authentication':
        baseScore = outcome === 'failure' ? 30 : 5;
        break;
      case 'data_modification':
        baseScore = 20;
        break;
      case 'data_access':
        baseScore = 10;
        break;
    }

    // Adjust based on outcome
    if (outcome === 'failure') baseScore += 20;
    if (outcome === 'blocked') baseScore += 30;

    // Adjust based on details
    if (details.attemptCount && details.attemptCount > 3) baseScore += 15;
    if (details.privilegeEscalation) baseScore += 25;
    if (details.crossEstablishmentAccess) baseScore += 40;
    if (details.injectionAttempt) baseScore += 50;

    return Math.min(100, Math.max(0, baseScore));
  }

  private determineSeverity(riskScore: number): SecurityAuditEvent['severity'] {
    if (riskScore >= this.riskThresholds.critical) return 'critical';
    if (riskScore >= this.riskThresholds.high) return 'high';
    if (riskScore >= this.riskThresholds.medium) return 'medium';
    return 'low';
  }

  private updateMetrics(): void {
    if (this.auditEvents.length === 0) {
      this.metricsSubject.next(this.createEmptyMetrics());
      return;
    }

    const eventsByType: { [key: string]: number } = {};
    this.auditEvents.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });

    // Calculate risk trend (last 24 hours in hourly buckets)
    const riskTrend = this.calculateRiskTrend();

    // Find top risky users
    const userRiskMap: { [userId: string]: { totalRisk: number; eventCount: number } } = {};
    this.auditEvents.forEach(event => {
      if (event.userId) {
        if (!userRiskMap[event.userId]) {
          userRiskMap[event.userId] = { totalRisk: 0, eventCount: 0 };
        }
        userRiskMap[event.userId].totalRisk += event.riskScore;
        userRiskMap[event.userId].eventCount++;
      }
    });

    const topRiskyUsers = Object.entries(userRiskMap)
      .map(([userId, data]) => ({
        userId,
        riskScore: Math.round(data.totalRisk / data.eventCount),
        eventCount: data.eventCount
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Get security alerts (high and critical events from last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const securityAlerts = this.auditEvents.filter(event => 
      event.timestamp >= oneDayAgo && 
      (event.severity === 'high' || event.severity === 'critical')
    ).slice(-20); // Last 20 alerts

    const metrics: SecurityMetrics = {
      totalEvents: this.auditEvents.length,
      criticalEvents: this.auditEvents.filter(e => e.severity === 'critical').length,
      highRiskEvents: this.auditEvents.filter(e => e.severity === 'high').length,
      mediumRiskEvents: this.auditEvents.filter(e => e.severity === 'medium').length,
      lowRiskEvents: this.auditEvents.filter(e => e.severity === 'low').length,
      failedAttempts: this.auditEvents.filter(e => e.outcome === 'failure').length,
      blockedAttempts: this.auditEvents.filter(e => e.outcome === 'blocked').length,
      suspiciousActivities: this.auditEvents.filter(e => e.eventType === 'suspicious_activity').length,
      eventsByType,
      riskTrend,
      topRiskyUsers,
      securityAlerts
    };

    this.metricsSubject.next(metrics);
  }

  private calculateRiskTrend(): { timestamp: Date; avgRiskScore: number }[] {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = this.auditEvents.filter(event => event.timestamp >= oneDayAgo);
    
    // Group by hour
    const hourlyBuckets: { [key: string]: SecurityAuditEvent[] } = {};
    
    recentEvents.forEach(event => {
      const hour = new Date(event.timestamp);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();
      
      if (!hourlyBuckets[hourKey]) {
        hourlyBuckets[hourKey] = [];
      }
      hourlyBuckets[hourKey].push(event);
    });

    return Object.entries(hourlyBuckets).map(([hourKey, events]) => ({
      timestamp: new Date(hourKey),
      avgRiskScore: events.length > 0 
        ? Math.round(events.reduce((sum, e) => sum + e.riskScore, 0) / events.length)
        : 0
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private storeAuditEvent(event: SecurityAuditEvent): void {
    try {
      const storedEvents = JSON.parse(localStorage.getItem('category_security_audit') || '[]');
      storedEvents.push(event);
      
      // Keep only last 100 security events in localStorage
      if (storedEvents.length > 100) {
        storedEvents.splice(0, storedEvents.length - 100);
      }
      
      localStorage.setItem('category_security_audit', JSON.stringify(storedEvents));
      
      // Also send to server in real implementation
      this.sendToSecurityService(event);
      
    } catch (error) {
      this.logger.error('CategorySecurityAudit', 'Failed to store security audit event', { error });
    }
  }

  private sendToSecurityService(event: SecurityAuditEvent): void {
    // In a real implementation, this would send to a security monitoring service
    // For now, we'll just log to console for critical events
    if (event.severity === 'critical' || event.severity === 'high') {
      console.warn(`[SECURITY ALERT] ${event.eventType}: ${event.action}`, event);
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  logSecurityEvent(
    eventType: SecurityAuditEvent['eventType'],
    severity: SecurityAuditEvent['severity'] | 'auto',
    action: string,
    resource: string,
    outcome: SecurityAuditEvent['outcome'],
    details: any,
    userId?: string,
    establishmentId?: number,
    ipAddress?: string
  ): string {
    const riskScore = this.calculateRiskScore(eventType, outcome, details);
    const finalSeverity = severity === 'auto' ? this.determineSeverity(riskScore) : severity;

    const auditEvent: SecurityAuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      severity: finalSeverity,
      userId,
      establishmentId,
      sessionId: this.logger['sessionId'], // Access private property
      action,
      resource,
      outcome,
      details,
      ipAddress,
      userAgent: navigator.userAgent,
      riskScore
    };

    this.auditEvents.push(auditEvent);
    
    // Keep only the last maxEvents entries
    if (this.auditEvents.length > this.maxEvents) {
      this.auditEvents = this.auditEvents.slice(-this.maxEvents);
    }

    this.updateMetrics();
    this.storeAuditEvent(auditEvent);

    // Log to main logger
    this.logger.info('CategorySecurityAudit', `Security event: ${action}`, {
      eventId: auditEvent.id,
      eventType,
      severity: finalSeverity,
      riskScore,
      outcome
    });

    return auditEvent.id;
  }

  // Category-specific security logging methods
  logCategoryAccess(
    categoryId: number,
    action: 'view' | 'create' | 'update' | 'delete',
    outcome: SecurityAuditEvent['outcome'],
    userId?: string,
    establishmentId?: number,
    details?: any
  ): string {
    return this.logSecurityEvent(
      'data_access',
      'auto',
      `category_${action}`,
      `category:${categoryId}`,
      outcome,
      { categoryId, action, ...details },
      userId,
      establishmentId
    );
  }

  logEstablishmentIsolationViolation(
    attemptedEstablishmentId: number,
    userEstablishmentId: number,
    resource: string,
    userId?: string
  ): string {
    return this.logSecurityEvent(
      'security_violation',
      'critical',
      'establishment_isolation_violation',
      resource,
      'blocked',
      {
        attemptedEstablishmentId,
        userEstablishmentId,
        violationType: 'cross_establishment_access'
      },
      userId
    );
  }

  logAuthenticationAttempt(
    outcome: SecurityAuditEvent['outcome'],
    userId?: string,
    details?: any
  ): string {
    return this.logSecurityEvent(
      'authentication',
      'auto',
      'user_authentication',
      'auth_system',
      outcome,
      details,
      userId
    );
  }

  logAuthorizationCheck(
    resource: string,
    permission: string,
    outcome: SecurityAuditEvent['outcome'],
    userId?: string,
    establishmentId?: number
  ): string {
    return this.logSecurityEvent(
      'authorization',
      'auto',
      `check_permission_${permission}`,
      resource,
      outcome,
      { permission },
      userId,
      establishmentId
    );
  }

  logSuspiciousActivity(
    activityType: string,
    details: any,
    userId?: string,
    establishmentId?: number
  ): string {
    return this.logSecurityEvent(
      'suspicious_activity',
      'high',
      activityType,
      'system',
      'blocked',
      details,
      userId,
      establishmentId
    );
  }

  logDataModification(
    resource: string,
    modificationType: 'create' | 'update' | 'delete',
    outcome: SecurityAuditEvent['outcome'],
    userId?: string,
    establishmentId?: number,
    details?: any
  ): string {
    return this.logSecurityEvent(
      'data_modification',
      'auto',
      `${modificationType}_${resource}`,
      resource,
      outcome,
      { modificationType, ...details },
      userId,
      establishmentId
    );
  }

  // Query methods
  getAuditEvents(
    eventType?: SecurityAuditEvent['eventType'],
    severity?: SecurityAuditEvent['severity'],
    userId?: string,
    establishmentId?: number
  ): SecurityAuditEvent[] {
    return this.auditEvents.filter(event => {
      if (eventType && event.eventType !== eventType) return false;
      if (severity && event.severity !== severity) return false;
      if (userId && event.userId !== userId) return false;
      if (establishmentId && event.establishmentId !== establishmentId) return false;
      return true;
    });
  }

  getMetrics(): SecurityMetrics {
    return this.metricsSubject.value;
  }

  getSecurityAlerts(): SecurityAuditEvent[] {
    return this.getMetrics().securityAlerts;
  }

  clearAuditLog(): void {
    this.auditEvents = [];
    localStorage.removeItem('category_security_audit');
    this.updateMetrics();
    this.logger.info('CategorySecurityAudit', 'Security audit log cleared');
  }

  exportAuditLog(): string {
    return JSON.stringify(this.auditEvents, null, 2);
  }

  // Security health check
  getSecurityHealth(): 'good' | 'warning' | 'critical' {
    const metrics = this.getMetrics();
    
    if (metrics.criticalEvents > 0 || metrics.suspiciousActivities > 10) {
      return 'critical';
    }
    
    if (metrics.highRiskEvents > 5 || metrics.failedAttempts > 20) {
      return 'warning';
    }
    
    return 'good';
  }
}
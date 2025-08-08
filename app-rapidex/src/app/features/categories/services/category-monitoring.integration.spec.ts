import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';

import { CategoryLoggerService } from './category-logger.service';
import { CategoryErrorTrackerService } from './category-error-tracker.service';
import { CategoryPerformanceMonitorService } from './category-performance-monitor.service';
import { CategoryAnalyticsTrackerService } from './category-analytics-tracker.service';
import { CategorySecurityAuditService } from './category-security-audit.service';
import { CategoryAlertingService } from './category-alerting.service';
import { CategoryMonitoringInterceptor } from '../interceptors/category-monitoring.interceptor';

describe('Category Monitoring Integration', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let logger: CategoryLoggerService;
  let errorTracker: CategoryErrorTrackerService;
  let performanceMonitor: CategoryPerformanceMonitorService;
  let analyticsTracker: CategoryAnalyticsTrackerService;
  let securityAudit: CategorySecurityAuditService;
  let alerting: CategoryAlertingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryLoggerService,
        CategoryErrorTrackerService,
        CategoryPerformanceMonitorService,
        CategoryAnalyticsTrackerService,
        CategorySecurityAuditService,
        CategoryAlertingService,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: CategoryMonitoringInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    logger = TestBed.inject(CategoryLoggerService);
    errorTracker = TestBed.inject(CategoryErrorTrackerService);
    performanceMonitor = TestBed.inject(CategoryPerformanceMonitorService);
    analyticsTracker = TestBed.inject(CategoryAnalyticsTrackerService);
    securityAudit = TestBed.inject(CategorySecurityAuditService);
    alerting = TestBed.inject(CategoryAlertingService);

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should monitor successful HTTP requests', (done) => {
    const url = '/api/categorias/estabelecimentos/1/categorias';
    const mockResponse = { categorias: [], total: 0 };

    // Make HTTP request
    httpClient.get(url).subscribe(response => {
      expect(response).toEqual(mockResponse);
      
      // Check that monitoring services recorded the request
      setTimeout(() => {
        // Check logger
        const logs = logger.getLogs();
        const requestLogs = logs.filter(log => log.message.includes('HTTP Request'));
        expect(requestLogs.length).toBeGreaterThanOrEqual(2); // Start and complete

        // Check performance monitor
        const apiMetrics = performanceMonitor.getMetrics('api_call');
        expect(apiMetrics.length).toBe(1);
        expect(apiMetrics[0].success).toBe(true);

        // Check analytics
        const events = analyticsTracker.getEvents('click', 'API');
        expect(events.length).toBeGreaterThanOrEqual(1);

        // Check security audit
        const auditEvents = securityAudit.getAuditEvents('data_access');
        expect(auditEvents.length).toBe(1);
        expect(auditEvents[0].outcome).toBe('success');

        done();
      }, 100);
    });

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should monitor failed HTTP requests', (done) => {
    const url = '/api/categorias/estabelecimentos/1/categorias/999';
    const errorResponse = { error: 'Category not found' };

    // Make HTTP request
    httpClient.get(url).subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error.status).toBe(404);
        
        // Check that monitoring services recorded the error
        setTimeout(() => {
          // Check error tracker
          const errors = errorTracker.getErrors();
          expect(errors.length).toBe(1);
          expect(errors[0].errorType).toBe('Category READ Error');

          // Check performance monitor
          const apiMetrics = performanceMonitor.getMetrics('api_call');
          expect(apiMetrics.length).toBe(1);
          expect(apiMetrics[0].success).toBe(false);

          // Check security audit
          const auditEvents = securityAudit.getAuditEvents('data_access');
          expect(auditEvents.length).toBe(1);
          expect(auditEvents[0].outcome).toBe('failure');

          done();
        }, 100);
      }
    });

    const req = httpMock.expectOne(url);
    req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
  });

  it('should trigger alerts for critical errors', (done) => {
    // Track a critical error
    const criticalError = new Error('Critical system failure');
    errorTracker.trackError(criticalError, 'SystemError', 'critical');

    setTimeout(() => {
      // Check that an alert was created
      const alerts = alerting.getAlerts('error', 'critical');
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      
      const criticalAlerts = alerting.getCriticalAlerts();
      expect(criticalAlerts.length).toBeGreaterThanOrEqual(1);

      done();
    }, 100);
  });

  it('should track user behavior analytics', () => {
    const userId = 'user123';
    const establishmentId = 456;

    // Track various user actions
    analyticsTracker.trackPageView('/categories', userId, establishmentId);
    analyticsTracker.trackButtonClick('create-category', userId, establishmentId);
    analyticsTracker.trackFormSubmit('category-form', true, userId, establishmentId);
    analyticsTracker.trackSearch('beverages', 5, userId, establishmentId);

    // Check analytics
    const analytics = analyticsTracker.getAnalytics();
    expect(analytics.totalEvents).toBe(4);

    const pageViews = analyticsTracker.getEvents('page_view');
    const clicks = analyticsTracker.getEvents('click');
    const formSubmits = analyticsTracker.getEvents('form_submit');
    const searches = analyticsTracker.getEvents('search');

    expect(pageViews.length).toBe(1);
    expect(clicks.length).toBe(1);
    expect(formSubmits.length).toBe(1);
    expect(searches.length).toBe(1);
  });

  it('should audit security events', () => {
    const userId = 'user123';
    const establishmentId = 456;

    // Log various security events
    securityAudit.logAuthenticationAttempt('success', userId);
    securityAudit.logCategoryAccess(1, 'view', 'success', userId, establishmentId);
    securityAudit.logEstablishmentIsolationViolation(999, establishmentId, 'category:1', userId);

    // Check security metrics
    const metrics = securityAudit.getMetrics();
    expect(metrics.totalEvents).toBe(3);
    expect(metrics.criticalEvents).toBe(1); // Isolation violation

    const auditEvents = securityAudit.getAuditEvents();
    expect(auditEvents.length).toBe(3);

    const violations = securityAudit.getAuditEvents('security_violation');
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe('critical');
  });

  it('should monitor performance metrics', () => {
    const timer = performanceMonitor.startTimer('test-operation');
    
    // Simulate some work
    setTimeout(() => {
      const metricId = timer('user_interaction', true, { test: true });
      expect(metricId).toBeTruthy();

      // Check performance dashboard
      const dashboard = performanceMonitor.getDashboard();
      expect(dashboard.totalOperations).toBe(1);
      expect(dashboard.averageUserInteractionTime).toBeGreaterThan(0);

      // Record API call
      performanceMonitor.recordApiCall('/api/categories', 'GET', 150, true, 200);
      
      const updatedDashboard = performanceMonitor.getDashboard();
      expect(updatedDashboard.totalOperations).toBe(2);
      expect(updatedDashboard.averageApiResponseTime).toBe(150);
    }, 10);
  });

  it('should integrate all monitoring services', (done) => {
    const userId = 'user123';
    const establishmentId = 456;

    // Simulate a complete user workflow
    analyticsTracker.trackPageView('/categories', userId, establishmentId);
    
    // Make API request
    const url = '/api/categorias/estabelecimentos/456/categorias';
    httpClient.post(url, { nome: 'Test Category', descricao: 'Test Description' }).subscribe({
      next: (response) => {
        // Track successful creation
        analyticsTracker.trackCategoryOperation('create', 1, true, userId, establishmentId);
        
        setTimeout(() => {
          // Verify all services have data
          expect(logger.getLogs().length).toBeGreaterThan(0);
          expect(performanceMonitor.getMetrics().length).toBeGreaterThan(0);
          expect(analyticsTracker.getEvents().length).toBeGreaterThan(0);
          expect(securityAudit.getAuditEvents().length).toBeGreaterThan(0);
          
          // Check system health
          const loggerHealth = logger.getMetrics();
          const performanceHealth = performanceMonitor.getPerformanceHealth();
          const securityHealth = securityAudit.getSecurityHealth();
          const systemHealth = alerting.getSystemHealth();
          
          expect(loggerHealth.totalLogs).toBeGreaterThan(0);
          expect(['good', 'warning', 'critical']).toContain(performanceHealth);
          expect(['good', 'warning', 'critical']).toContain(securityHealth);
          expect(['healthy', 'warning', 'critical']).toContain(systemHealth);
          
          done();
        }, 100);
      },
      error: (error) => {
        fail('Request should have succeeded');
      }
    });

    const req = httpMock.expectOne(url);
    req.flush({ id: 1, nome: 'Test Category', descricao: 'Test Description' });
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw errors
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jasmine.createSpy('setItem').and.throwError('Storage error');

    // All services should handle the error gracefully
    expect(() => {
      logger.info('Test', 'Test message');
      errorTracker.trackError(new Error('Test'), 'TestError');
      performanceMonitor.recordApiCall('/test', 'GET', 100, true);
      analyticsTracker.trackPageView('/test');
      securityAudit.logAuthenticationAttempt('success');
    }).not.toThrow();

    // Restore localStorage
    localStorage.setItem = originalSetItem;
  });

  it('should export all monitoring data', () => {
    // Add some data to each service
    logger.info('Test', 'Test log');
    errorTracker.trackError(new Error('Test error'), 'TestError');
    performanceMonitor.recordApiCall('/test', 'GET', 100, true);
    analyticsTracker.trackPageView('/test');
    securityAudit.logAuthenticationAttempt('success');

    // Export data from all services
    const logExport = logger.exportLogs();
    const errorExport = errorTracker.exportErrors();
    const performanceExport = performanceMonitor.exportMetrics();
    const analyticsExport = analyticsTracker.exportAnalytics();
    const securityExport = securityAudit.exportAuditLog();
    const alertExport = alerting.exportAlerts();

    // Verify all exports are valid JSON
    expect(() => JSON.parse(logExport)).not.toThrow();
    expect(() => JSON.parse(errorExport)).not.toThrow();
    expect(() => JSON.parse(performanceExport)).not.toThrow();
    expect(() => JSON.parse(analyticsExport)).not.toThrow();
    expect(() => JSON.parse(securityExport)).not.toThrow();
    expect(() => JSON.parse(alertExport)).not.toThrow();

    // Verify exports contain data
    expect(JSON.parse(logExport).length).toBeGreaterThan(0);
    expect(JSON.parse(errorExport).length).toBeGreaterThan(0);
    expect(JSON.parse(performanceExport).length).toBeGreaterThan(0);
    expect(JSON.parse(analyticsExport).events.length).toBeGreaterThan(0);
    expect(JSON.parse(securityExport).length).toBeGreaterThan(0);
    expect(JSON.parse(alertExport).alerts).toBeDefined();
  });
});
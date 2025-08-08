import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { CategoryLoggerService } from '../services/category-logger.service';
import { CategoryErrorTrackerService } from '../services/category-error-tracker.service';
import { CategoryPerformanceMonitorService } from '../services/category-performance-monitor.service';
import { CategorySecurityAuditService } from '../services/category-security-audit.service';
import { CategoryAnalyticsTrackerService } from '../services/category-analytics-tracker.service';

@Injectable()
export class CategoryMonitoringInterceptor implements HttpInterceptor {
  constructor(
    private logger: CategoryLoggerService,
    private errorTracker: CategoryErrorTrackerService,
    private performanceMonitor: CategoryPerformanceMonitorService,
    private securityAudit: CategorySecurityAuditService,
    private analyticsTracker: CategoryAnalyticsTrackerService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only monitor category-related requests
    if (!this.isCategoryRequest(req)) {
      return next.handle(req);
    }

    const startTime = performance.now();
    const requestId = this.generateRequestId();
    const userId = this.extractUserId(req);
    const establishmentId = this.extractEstablishmentId(req);

    // Log request start
    this.logger.info('CategoryMonitoring', `HTTP Request Started: ${req.method} ${req.url}`, {
      requestId,
      method: req.method,
      url: req.url,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body)
    }, userId, establishmentId);

    // Track analytics
    this.analyticsTracker.trackEvent(
      'API',
      'api_request_start',
      `${req.method} ${this.getEndpointPath(req.url)}`,
      undefined,
      { method: req.method, endpoint: req.url },
      userId,
      establishmentId
    );

    // Security audit for sensitive operations
    this.auditSecurityEvent(req, userId, establishmentId);

    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const duration = performance.now() - startTime;
          
          // Log successful response
          this.logger.info('CategoryMonitoring', `HTTP Request Completed: ${req.method} ${req.url}`, {
            requestId,
            statusCode: event.status,
            duration: Math.round(duration),
            responseSize: this.getResponseSize(event)
          }, userId, establishmentId);

          // Record performance metrics
          this.performanceMonitor.recordApiCall(
            this.getEndpointPath(req.url),
            req.method,
            duration,
            true,
            event.status,
            userId,
            establishmentId
          );

          // Track successful operation
          this.analyticsTracker.trackEvent(
            'API',
            'api_request_success',
            `${req.method} ${this.getEndpointPath(req.url)}`,
            event.status,
            { 
              method: req.method, 
              endpoint: req.url, 
              duration: Math.round(duration),
              statusCode: event.status
            },
            userId,
            establishmentId
          );

          // Security audit for successful operations
          this.securityAudit.logCategoryAccess(
            this.extractCategoryId(req.url) || 0,
            this.mapMethodToAction(req.method),
            'success',
            userId,
            establishmentId,
            { statusCode: event.status, duration: Math.round(duration) }
          );
        }
      }),
      catchError((error: HttpErrorResponse) => {
        const duration = performance.now() - startTime;
        
        // Log error
        this.logger.error('CategoryMonitoring', `HTTP Request Failed: ${req.method} ${req.url}`, {
          requestId,
          statusCode: error.status,
          errorMessage: error.message,
          duration: Math.round(duration),
          errorBody: error.error
        }, userId, establishmentId);

        // Track error
        this.errorTracker.trackCategoryOperationError(
          this.mapMethodToAction(req.method),
          error,
          this.extractCategoryId(req.url),
          establishmentId,
          userId
        );

        // Record performance metrics for failed request
        this.performanceMonitor.recordApiCall(
          this.getEndpointPath(req.url),
          req.method,
          duration,
          false,
          error.status,
          userId,
          establishmentId,
          error.message
        );

        // Track failed operation
        this.analyticsTracker.trackEvent(
          'API',
          'api_request_error',
          `${req.method} ${this.getEndpointPath(req.url)}`,
          error.status,
          { 
            method: req.method, 
            endpoint: req.url, 
            duration: Math.round(duration),
            statusCode: error.status,
            errorMessage: error.message
          },
          userId,
          establishmentId
        );

        // Security audit for failed operations
        this.securityAudit.logCategoryAccess(
          this.extractCategoryId(req.url) || 0,
          this.mapMethodToAction(req.method),
          'failure',
          userId,
          establishmentId,
          { 
            statusCode: error.status, 
            errorMessage: error.message,
            duration: Math.round(duration)
          }
        );

        // Check for security violations
        if (error.status === 403 || error.status === 401) {
          this.securityAudit.logAuthorizationCheck(
            req.url,
            req.method,
            'failure',
            userId,
            establishmentId
          );
        }

        return throwError(() => error);
      })
    );
  }

  private isCategoryRequest(req: HttpRequest<any>): boolean {
    return req.url.includes('/categorias/') || 
           req.url.includes('/categories/') ||
           req.url.includes('category');
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractUserId(req: HttpRequest<any>): string | undefined {
    // Extract user ID from headers or token
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      // In a real implementation, you would decode the JWT token
      // For now, we'll return a placeholder
      return 'user_from_token';
    }
    return undefined;
  }

  private extractEstablishmentId(req: HttpRequest<any>): number | undefined {
    // Extract establishment ID from URL
    const match = req.url.match(/estabelecimentos\/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractCategoryId(url: string): number | undefined {
    // Extract category ID from URL
    const match = url.match(/categorias\/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private getEndpointPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private mapMethodToAction(method: string): 'create' | 'read' | 'update' | 'delete' | 'list' {
    switch (method.toUpperCase()) {
      case 'POST': return 'create';
      case 'GET': return 'read';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return 'read';
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized: any = {};
    headers.keys().forEach((key: string) => {
      if (key.toLowerCase() !== 'authorization') {
        sanitized[key] = headers.get(key);
      } else {
        sanitized[key] = '[REDACTED]';
      }
    });
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private getResponseSize(response: HttpResponse<any>): number {
    try {
      return JSON.stringify(response.body).length;
    } catch {
      return 0;
    }
  }

  private auditSecurityEvent(req: HttpRequest<any>, userId?: string, establishmentId?: number): void {
    // Audit sensitive operations
    if (req.method === 'DELETE') {
      this.securityAudit.logDataModification(
        `category:${this.extractCategoryId(req.url) || 'unknown'}`,
        'delete',
        'success', // Will be updated in error handler if it fails
        userId,
        establishmentId,
        { endpoint: req.url, method: req.method }
      );
    } else if (req.method === 'POST') {
      this.securityAudit.logDataModification(
        'category:new',
        'create',
        'success', // Will be updated in error handler if it fails
        userId,
        establishmentId,
        { endpoint: req.url, method: req.method }
      );
    } else if (req.method === 'PUT' || req.method === 'PATCH') {
      this.securityAudit.logDataModification(
        `category:${this.extractCategoryId(req.url) || 'unknown'}`,
        'update',
        'success', // Will be updated in error handler if it fails
        userId,
        establishmentId,
        { endpoint: req.url, method: req.method }
      );
    }

    // Check for potential security issues
    if (req.body && typeof req.body === 'string') {
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /union\s+select/i,
        /drop\s+table/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(req.body))) {
        this.securityAudit.logSuspiciousActivity(
          'potential_injection_attempt',
          {
            endpoint: req.url,
            method: req.method,
            suspiciousContent: req.body.substring(0, 200) // First 200 chars
          },
          userId,
          establishmentId
        );
      }
    }
  }
}
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CategoryLoggerService } from './category-logger.service';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  errorType: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  establishmentId?: number;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: any;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  unresolvedErrors: number;
  criticalErrors: number;
  highSeverityErrors: number;
  mediumSeverityErrors: number;
  lowSeverityErrors: number;
  errorsByType: { [key: string]: number };
  lastErrorTime: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryErrorTrackerService {
  private errors: ErrorReport[] = [];
  private maxErrors = 500; // Keep last 500 errors in memory
  
  private metricsSubject = new BehaviorSubject<ErrorMetrics>({
    totalErrors: 0,
    unresolvedErrors: 0,
    criticalErrors: 0,
    highSeverityErrors: 0,
    mediumSeverityErrors: 0,
    lowSeverityErrors: 0,
    errorsByType: {},
    lastErrorTime: null
  });

  public metrics$ = this.metricsSubject.asObservable();

  constructor(private logger: CategoryLoggerService) {
    this.initializeErrorTracking();
  }

  private initializeErrorTracking(): void {
    // Set up global error handler for category-related errors
    window.addEventListener('error', (event) => {
      if (this.isCategoryRelatedError(event.error)) {
        this.trackError(event.error, 'JavaScript Error', 'high');
      }
    });

    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isCategoryRelatedError(event.reason)) {
        this.trackError(event.reason, 'Unhandled Promise Rejection', 'high');
      }
    });

    this.logger.info('CategoryErrorTracker', 'Error tracking initialized');
  }

  private isCategoryRelatedError(error: any): boolean {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    const stackString = error.stack?.toLowerCase() || '';
    
    return errorString.includes('category') || 
           stackString.includes('category') ||
           stackString.includes('/categories/');
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(error: any, context?: any): ErrorReport['severity'] {
    // Determine severity based on error type and context
    if (error.name === 'SecurityError' || error.message?.includes('403') || error.message?.includes('401')) {
      return 'critical';
    }
    
    if (error.name === 'NetworkError' || error.message?.includes('500') || error.message?.includes('timeout')) {
      return 'high';
    }
    
    if (error.name === 'ValidationError' || error.message?.includes('400')) {
      return 'medium';
    }
    
    return 'low';
  }

  private updateMetrics(): void {
    const errorsByType: { [key: string]: number } = {};
    
    this.errors.forEach(error => {
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
    });

    const metrics: ErrorMetrics = {
      totalErrors: this.errors.length,
      unresolvedErrors: this.errors.filter(error => !error.resolved).length,
      criticalErrors: this.errors.filter(error => error.severity === 'critical').length,
      highSeverityErrors: this.errors.filter(error => error.severity === 'high').length,
      mediumSeverityErrors: this.errors.filter(error => error.severity === 'medium').length,
      lowSeverityErrors: this.errors.filter(error => error.severity === 'low').length,
      errorsByType,
      lastErrorTime: this.errors.length > 0 ? this.errors[this.errors.length - 1].timestamp : null
    };

    this.metricsSubject.next(metrics);
  }

  private sendErrorReport(errorReport: ErrorReport): void {
    // In a real implementation, this would send to an error tracking service
    try {
      const storedErrors = JSON.parse(localStorage.getItem('category_errors') || '[]');
      storedErrors.push(errorReport);
      
      // Keep only last 50 errors in localStorage
      if (storedErrors.length > 50) {
        storedErrors.splice(0, storedErrors.length - 50);
      }
      
      localStorage.setItem('category_errors', JSON.stringify(storedErrors));
      
      // Log to our logging service
      this.logger.error('CategoryErrorTracker', `${errorReport.severity.toUpperCase()} Error: ${errorReport.message}`, {
        errorId: errorReport.id,
        errorType: errorReport.errorType,
        stack: errorReport.stack,
        context: errorReport.context
      });
      
    } catch (error) {
      console.error('Failed to store error report:', error);
    }
  }

  // Public methods
  trackError(
    error: Error | any, 
    errorType: string = 'Unknown Error', 
    severity?: ErrorReport['severity'],
    context?: any,
    userId?: string,
    establishmentId?: number
  ): string {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      errorType,
      message: error.message || error.toString(),
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId,
      establishmentId,
      sessionId: this.logger['sessionId'], // Access private property
      severity: severity || this.determineSeverity(error, context),
      context,
      resolved: false
    };

    this.errors.push(errorReport);
    
    // Keep only the last maxErrors entries
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    this.updateMetrics();
    this.sendErrorReport(errorReport);

    return errorReport.id;
  }

  resolveError(errorId: string, resolvedBy?: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error && !error.resolved) {
      error.resolved = true;
      error.resolvedAt = new Date();
      error.resolvedBy = resolvedBy;
      
      this.updateMetrics();
      this.logger.info('CategoryErrorTracker', `Error resolved: ${errorId}`, { resolvedBy });
      
      return true;
    }
    return false;
  }

  getErrors(severity?: ErrorReport['severity'], resolved?: boolean): ErrorReport[] {
    return this.errors.filter(error => {
      if (severity && error.severity !== severity) return false;
      if (resolved !== undefined && error.resolved !== resolved) return false;
      return true;
    });
  }

  getErrorById(errorId: string): ErrorReport | undefined {
    return this.errors.find(error => error.id === errorId);
  }

  getMetrics(): ErrorMetrics {
    return this.metricsSubject.value;
  }

  clearErrors(): void {
    this.errors = [];
    localStorage.removeItem('category_errors');
    this.updateMetrics();
    this.logger.info('CategoryErrorTracker', 'Error history cleared');
  }

  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  // Category-specific error tracking methods
  trackCategoryOperationError(
    operation: 'create' | 'read' | 'update' | 'delete' | 'list',
    error: any,
    categoryId?: number,
    establishmentId?: number,
    userId?: string
  ): string {
    return this.trackError(
      error,
      `Category ${operation.toUpperCase()} Error`,
      'high',
      { operation, categoryId, establishmentId },
      userId,
      establishmentId
    );
  }

  trackValidationError(
    field: string,
    value: any,
    error: any,
    establishmentId?: number,
    userId?: string
  ): string {
    return this.trackError(
      error,
      'Category Validation Error',
      'medium',
      { field, value, establishmentId },
      userId,
      establishmentId
    );
  }

  trackSecurityError(
    securityType: 'authentication' | 'authorization' | 'injection' | 'xss',
    error: any,
    establishmentId?: number,
    userId?: string
  ): string {
    return this.trackError(
      error,
      `Category Security Error - ${securityType}`,
      'critical',
      { securityType, establishmentId },
      userId,
      establishmentId
    );
  }
}
import { TestBed } from '@angular/core/testing';
import { CategoryErrorTrackerService, ErrorReport } from './category-error-tracker.service';
import { CategoryLoggerService } from './category-logger.service';

describe('CategoryErrorTrackerService', () => {
  let service: CategoryErrorTrackerService;
  let loggerService: jasmine.SpyObj<CategoryLoggerService>;

  beforeEach(() => {
    const loggerSpy = jasmine.createSpyObj('CategoryLoggerService', ['info', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: CategoryLoggerService, useValue: loggerSpy }
      ]
    });
    
    service = TestBed.inject(CategoryErrorTrackerService);
    loggerService = TestBed.inject(CategoryLoggerService) as jasmine.SpyObj<CategoryLoggerService>;
    
    // Clear localStorage before each test
    localStorage.removeItem('category_errors');
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.removeItem('category_errors');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should track errors', () => {
    const error = new Error('Test error');
    const errorType = 'TestError';
    const userId = 'user123';
    const establishmentId = 456;

    const errorId = service.trackError(error, errorType, 'high', {}, userId, establishmentId);

    expect(errorId).toBeTruthy();
    
    const errors = service.getErrors();
    expect(errors.length).toBe(1);
    expect(errors[0].id).toBe(errorId);
    expect(errors[0].errorType).toBe(errorType);
    expect(errors[0].message).toBe('Test error');
    expect(errors[0].severity).toBe('high');
    expect(errors[0].userId).toBe(userId);
    expect(errors[0].establishmentId).toBe(establishmentId);
  });

  it('should auto-determine severity', () => {
    const securityError = { name: 'SecurityError', message: '403 Forbidden' };
    const networkError = { name: 'NetworkError', message: '500 Internal Server Error' };
    const validationError = { name: 'ValidationError', message: '400 Bad Request' };
    const genericError = { name: 'Error', message: 'Generic error' };

    service.trackError(securityError, 'SecurityError');
    service.trackError(networkError, 'NetworkError');
    service.trackError(validationError, 'ValidationError');
    service.trackError(genericError, 'GenericError');

    const errors = service.getErrors();
    
    const securityErr = errors.find(e => e.errorType === 'SecurityError');
    const networkErr = errors.find(e => e.errorType === 'NetworkError');
    const validationErr = errors.find(e => e.errorType === 'ValidationError');
    const genericErr = errors.find(e => e.errorType === 'GenericError');

    expect(securityErr?.severity).toBe('critical');
    expect(networkErr?.severity).toBe('high');
    expect(validationErr?.severity).toBe('medium');
    expect(genericErr?.severity).toBe('low');
  });

  it('should resolve errors', () => {
    const error = new Error('Test error');
    const errorId = service.trackError(error, 'TestError');
    const resolvedBy = 'admin';

    const resolved = service.resolveError(errorId, resolvedBy);

    expect(resolved).toBe(true);
    
    const errorReport = service.getErrorById(errorId);
    expect(errorReport?.resolved).toBe(true);
    expect(errorReport?.resolvedBy).toBe(resolvedBy);
    expect(errorReport?.resolvedAt).toBeInstanceOf(Date);
  });

  it('should not resolve already resolved errors', () => {
    const error = new Error('Test error');
    const errorId = service.trackError(error, 'TestError');
    
    service.resolveError(errorId, 'admin1');
    const secondResolve = service.resolveError(errorId, 'admin2');

    expect(secondResolve).toBe(false);
    
    const errorReport = service.getErrorById(errorId);
    expect(errorReport?.resolvedBy).toBe('admin1');
  });

  it('should filter errors by severity', () => {
    service.trackError(new Error('Critical error'), 'CriticalError', 'critical');
    service.trackError(new Error('High error'), 'HighError', 'high');
    service.trackError(new Error('Medium error'), 'MediumError', 'medium');
    service.trackError(new Error('Low error'), 'LowError', 'low');

    const criticalErrors = service.getErrors('critical');
    const highErrors = service.getErrors('high');

    expect(criticalErrors.length).toBe(1);
    expect(criticalErrors[0].severity).toBe('critical');
    
    expect(highErrors.length).toBe(1);
    expect(highErrors[0].severity).toBe('high');
  });

  it('should filter errors by resolved status', () => {
    const error1Id = service.trackError(new Error('Error 1'), 'Error1');
    const error2Id = service.trackError(new Error('Error 2'), 'Error2');
    
    service.resolveError(error1Id);

    const unresolvedErrors = service.getErrors(undefined, false);
    const resolvedErrors = service.getErrors(undefined, true);

    expect(unresolvedErrors.length).toBe(1);
    expect(unresolvedErrors[0].id).toBe(error2Id);
    
    expect(resolvedErrors.length).toBe(1);
    expect(resolvedErrors[0].id).toBe(error1Id);
  });

  it('should update metrics correctly', () => {
    service.trackError(new Error('Critical error'), 'CriticalError', 'critical');
    service.trackError(new Error('High error'), 'HighError', 'high');
    service.trackError(new Error('Medium error'), 'MediumError', 'medium');
    service.trackError(new Error('Low error'), 'LowError', 'low');
    
    const error1Id = service.getErrors()[0].id;
    service.resolveError(error1Id);

    const metrics = service.getMetrics();
    
    expect(metrics.totalErrors).toBe(4);
    expect(metrics.criticalErrors).toBe(1);
    expect(metrics.highSeverityErrors).toBe(1);
    expect(metrics.mediumSeverityErrors).toBe(1);
    expect(metrics.lowSeverityErrors).toBe(1);
    expect(metrics.unresolvedErrors).toBe(3);
    expect(metrics.errorsByType['CriticalError']).toBe(1);
  });

  it('should track category operation errors', () => {
    const error = new Error('Category creation failed');
    const categoryId = 123;
    const establishmentId = 456;
    const userId = 'user789';

    const errorId = service.trackCategoryOperationError(
      'create',
      error,
      categoryId,
      establishmentId,
      userId
    );

    const errorReport = service.getErrorById(errorId);
    expect(errorReport?.errorType).toBe('Category CREATE Error');
    expect(errorReport?.severity).toBe('high');
    expect(errorReport?.context).toEqual({
      operation: 'create',
      categoryId,
      establishmentId
    });
  });

  it('should track validation errors', () => {
    const error = new Error('Invalid category name');
    const field = 'name';
    const value = '';

    const errorId = service.trackValidationError(field, value, error);

    const errorReport = service.getErrorById(errorId);
    expect(errorReport?.errorType).toBe('Category Validation Error');
    expect(errorReport?.severity).toBe('medium');
    expect(errorReport?.context).toEqual({
      field,
      value,
      establishmentId: undefined
    });
  });

  it('should track security errors', () => {
    const error = new Error('Unauthorized access');
    const securityType = 'authorization';
    const userId = 'user123';

    const errorId = service.trackSecurityError(securityType, error, undefined, userId);

    const errorReport = service.getErrorById(errorId);
    expect(errorReport?.errorType).toBe('Category Security Error - authorization');
    expect(errorReport?.severity).toBe('critical');
  });

  it('should clear errors', () => {
    service.trackError(new Error('Error 1'), 'Error1');
    service.trackError(new Error('Error 2'), 'Error2');
    
    expect(service.getErrors().length).toBe(2);
    
    service.clearErrors();
    
    expect(service.getErrors().length).toBe(0);
  });

  it('should export errors as JSON', () => {
    service.trackError(new Error('Test error'), 'TestError');
    
    const exported = service.exportErrors();
    const parsed = JSON.parse(exported);
    
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0]).toHaveProperty('id');
    expect(parsed[0]).toHaveProperty('errorType');
    expect(parsed[0]).toHaveProperty('message');
  });

  it('should emit metrics updates', (done) => {
    let updateCount = 0;
    
    service.metrics$.subscribe(metrics => {
      updateCount++;
      if (updateCount === 2) { // Skip initial empty state
        expect(metrics.totalErrors).toBe(1);
        done();
      }
    });
    
    service.trackError(new Error('Test error'), 'TestError');
  });

  it('should store errors in localStorage', () => {
    service.trackError(new Error('Test error'), 'TestError');
    
    const storedErrors = JSON.parse(localStorage.getItem('category_errors') || '[]');
    expect(storedErrors.length).toBe(1);
    expect(storedErrors[0].message).toBe('Test error');
  });

  it('should limit localStorage entries', () => {
    // Add more than 50 errors
    for (let i = 0; i < 55; i++) {
      service.trackError(new Error(`Error ${i}`), 'TestError');
    }
    
    const storedErrors = JSON.parse(localStorage.getItem('category_errors') || '[]');
    expect(storedErrors.length).toBeLessThanOrEqual(50);
  });
});
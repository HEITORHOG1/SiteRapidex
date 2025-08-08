import { TestBed } from '@angular/core/testing';
import { CategoryLoggerService, LogEntry } from './category-logger.service';

describe('CategoryLoggerService', () => {
  let service: CategoryLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryLoggerService);
    
    // Clear localStorage before each test
    localStorage.removeItem('category_logs');
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.removeItem('category_logs');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log info messages', () => {
    const category = 'TestCategory';
    const message = 'Test info message';
    const data = { test: 'data' };

    service.info(category, message, data);

    const logs = service.getLogs();
    expect(logs.length).toBe(2); // 1 initialization log + 1 test log
    
    const testLog = logs.find(log => log.message === message);
    expect(testLog).toBeTruthy();
    expect(testLog?.level).toBe('info');
    expect(testLog?.category).toBe(category);
    expect(testLog?.data).toEqual(data);
  });

  it('should log error messages', () => {
    const category = 'TestCategory';
    const message = 'Test error message';
    const userId = 'user123';
    const establishmentId = 456;

    service.error(category, message, undefined, userId, establishmentId);

    const logs = service.getLogs('error');
    expect(logs.length).toBe(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].userId).toBe(userId);
    expect(logs[0].establishmentId).toBe(establishmentId);
  });

  it('should update metrics correctly', () => {
    service.info('Test', 'Info message');
    service.warn('Test', 'Warning message');
    service.error('Test', 'Error message');
    service.debug('Test', 'Debug message');

    const metrics = service.getMetrics();
    expect(metrics.totalLogs).toBe(5); // Including initialization log
    expect(metrics.infoCount).toBe(2); // Including initialization log
    expect(metrics.warningCount).toBe(1);
    expect(metrics.errorCount).toBe(1);
    expect(metrics.debugCount).toBe(1);
    expect(metrics.lastLogTime).toBeTruthy();
  });

  it('should filter logs by level', () => {
    service.info('Test', 'Info message');
    service.error('Test', 'Error message');
    service.warn('Test', 'Warning message');

    const errorLogs = service.getLogs('error');
    const infoLogs = service.getLogs('info');

    expect(errorLogs.length).toBe(1);
    expect(errorLogs[0].level).toBe('error');
    
    expect(infoLogs.length).toBe(2); // Including initialization log
    expect(infoLogs.every(log => log.level === 'info')).toBe(true);
  });

  it('should filter logs by category', () => {
    service.info('Category1', 'Message 1');
    service.info('Category2', 'Message 2');
    service.error('Category1', 'Error message');

    const category1Logs = service.getLogs(undefined, 'Category1');
    const category2Logs = service.getLogs(undefined, 'Category2');

    expect(category1Logs.length).toBe(2);
    expect(category1Logs.every(log => log.category === 'Category1')).toBe(true);
    
    expect(category2Logs.length).toBe(1);
    expect(category2Logs[0].category).toBe('Category2');
  });

  it('should clear logs', () => {
    service.info('Test', 'Message 1');
    service.error('Test', 'Message 2');
    
    expect(service.getLogs().length).toBeGreaterThan(0);
    
    service.clearLogs();
    
    expect(service.getLogs().length).toBe(1); // Only the clear log message
  });

  it('should export logs as JSON', () => {
    service.info('Test', 'Test message');
    
    const exported = service.exportLogs();
    const parsed = JSON.parse(exported);
    
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('id');
    expect(parsed[0]).toHaveProperty('timestamp');
    expect(parsed[0]).toHaveProperty('level');
  });

  it('should store logs in localStorage', () => {
    service.info('Test', 'Test message');
    
    const storedLogs = JSON.parse(localStorage.getItem('category_logs') || '[]');
    expect(storedLogs.length).toBeGreaterThan(0);
    
    const testLog = storedLogs.find((log: LogEntry) => log.message === 'Test message');
    expect(testLog).toBeTruthy();
  });

  it('should limit localStorage entries', () => {
    // Add more than 100 logs
    for (let i = 0; i < 105; i++) {
      service.info('Test', `Message ${i}`);
    }
    
    const storedLogs = JSON.parse(localStorage.getItem('category_logs') || '[]');
    expect(storedLogs.length).toBeLessThanOrEqual(100);
  });

  it('should emit metrics updates', (done) => {
    service.metrics$.subscribe(metrics => {
      if (metrics.totalLogs > 1) { // Skip initial state
        expect(metrics.totalLogs).toBeGreaterThan(1);
        expect(metrics.lastLogTime).toBeTruthy();
        done();
      }
    });
    
    service.info('Test', 'Test message');
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw an error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jasmine.createSpy('setItem').and.throwError('Storage error');
    
    // Should not throw an error
    expect(() => {
      service.info('Test', 'Test message');
    }).not.toThrow();
    
    // Restore original localStorage
    localStorage.setItem = originalSetItem;
  });

  it('should include session information in logs', () => {
    service.info('Test', 'Test message');
    
    const logs = service.getLogs();
    const testLog = logs.find(log => log.message === 'Test message');
    
    expect(testLog?.sessionId).toBeTruthy();
    expect(testLog?.userAgent).toBeTruthy();
    expect(testLog?.timestamp).toBeInstanceOf(Date);
  });
});
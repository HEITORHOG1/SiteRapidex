import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
  userId?: string;
  establishmentId?: number;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
}

export interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
  lastLogTime: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryLoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private sessionId = this.generateSessionId();
  
  private metricsSubject = new BehaviorSubject<LogMetrics>({
    totalLogs: 0,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    debugCount: 0,
    lastLogTime: null
  });

  public metrics$ = this.metricsSubject.asObservable();

  constructor() {
    this.initializeLogger();
  }

  private initializeLogger(): void {
    // Initialize session tracking
    this.info('CategoryLogger', 'Logger initialized', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any,
    userId?: string,
    establishmentId?: number
  ): LogEntry {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      userId,
      establishmentId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      ip: 'client' // Will be populated by server if needed
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.updateMetrics();
    this.sendToServer(entry);
  }

  private updateMetrics(): void {
    const metrics: LogMetrics = {
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(log => log.level === 'error').length,
      warningCount: this.logs.filter(log => log.level === 'warn').length,
      infoCount: this.logs.filter(log => log.level === 'info').length,
      debugCount: this.logs.filter(log => log.level === 'debug').length,
      lastLogTime: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
    };

    this.metricsSubject.next(metrics);
  }

  private sendToServer(entry: LogEntry): void {
    // In a real implementation, this would send logs to a logging service
    // For now, we'll store in localStorage and console
    try {
      const storedLogs = JSON.parse(localStorage.getItem('category_logs') || '[]');
      storedLogs.push(entry);
      
      // Keep only last 100 logs in localStorage
      if (storedLogs.length > 100) {
        storedLogs.splice(0, storedLogs.length - 100);
      }
      
      localStorage.setItem('category_logs', JSON.stringify(storedLogs));
      
      // Console output for development
      const consoleMethod = entry.level === 'error' ? 'error' : 
                           entry.level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${entry.level.toUpperCase()}] ${entry.category}: ${entry.message}`, entry.data);
      
    } catch (error) {
      console.error('Failed to store log entry:', error);
    }
  }

  // Public logging methods
  info(category: string, message: string, data?: any, userId?: string, establishmentId?: number): void {
    const entry = this.createLogEntry('info', category, message, data, userId, establishmentId);
    this.addLog(entry);
  }

  warn(category: string, message: string, data?: any, userId?: string, establishmentId?: number): void {
    const entry = this.createLogEntry('warn', category, message, data, userId, establishmentId);
    this.addLog(entry);
  }

  error(category: string, message: string, data?: any, userId?: string, establishmentId?: number): void {
    const entry = this.createLogEntry('error', category, message, data, userId, establishmentId);
    this.addLog(entry);
  }

  debug(category: string, message: string, data?: any, userId?: string, establishmentId?: number): void {
    const entry = this.createLogEntry('debug', category, message, data, userId, establishmentId);
    this.addLog(entry);
  }

  // Utility methods
  getLogs(level?: LogEntry['level'], category?: string): LogEntry[] {
    return this.logs.filter(log => {
      if (level && log.level !== level) return false;
      if (category && log.category !== category) return false;
      return true;
    });
  }

  getMetrics(): LogMetrics {
    return this.metricsSubject.value;
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('category_logs');
    this.updateMetrics();
    this.info('CategoryLogger', 'Logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}
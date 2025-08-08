import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CategoryLoggerService } from './category-logger.service';

export interface UserBehaviorEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  establishmentId?: number;
  sessionId: string;
  eventType: 'page_view' | 'click' | 'form_submit' | 'search' | 'filter' | 'sort' | 'navigation' | 'error';
  eventCategory: string;
  eventAction: string;
  eventLabel?: string;
  eventValue?: number;
  metadata?: any;
  userAgent: string;
  url: string;
  referrer: string;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  establishmentId?: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  interactions: number;
  errors: number;
  lastActivity: Date;
  userAgent: string;
  entryUrl: string;
  exitUrl?: string;
}

export interface BehaviorAnalytics {
  totalSessions: number;
  totalEvents: number;
  averageSessionDuration: number;
  averagePageViews: number;
  averageInteractions: number;
  bounceRate: number;
  mostViewedPages: { page: string; views: number }[];
  mostUsedFeatures: { feature: string; usage: number }[];
  searchQueries: { query: string; count: number }[];
  errorsByPage: { page: string; errors: number }[];
  userJourney: { step: string; users: number; dropoff: number }[];
  conversionFunnel: { stage: string; users: number; conversionRate: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class CategoryAnalyticsTrackerService {
  private events: UserBehaviorEvent[] = [];
  private sessions: Map<string, UserSession> = new Map();
  private maxEvents = 2000; // Keep last 2000 events in memory
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private currentSessionId = this.generateSessionId();

  private analyticsSubject = new BehaviorSubject<BehaviorAnalytics>(this.createEmptyAnalytics());
  public analytics$ = this.analyticsSubject.asObservable();

  constructor(private logger: CategoryLoggerService) {
    this.initializeAnalytics();
  }

  private initializeAnalytics(): void {
    // Start a new session
    this.startSession();
    
    // Set up session timeout cleanup
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('navigation', 'page_hidden', window.location.pathname);
      } else {
        this.trackEvent('navigation', 'page_visible', window.location.pathname);
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.endCurrentSession();
    });

    this.logger.info('CategoryAnalyticsTracker', 'User behavior analytics initialized');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startSession(userId?: string, establishmentId?: number): void {
    const session: UserSession = {
      sessionId: this.currentSessionId,
      userId,
      establishmentId,
      startTime: new Date(),
      pageViews: 0,
      interactions: 0,
      errors: 0,
      lastActivity: new Date(),
      userAgent: navigator.userAgent,
      entryUrl: window.location.href
    };

    this.sessions.set(this.currentSessionId, session);
    this.logger.info('CategoryAnalyticsTracker', 'New session started', { sessionId: this.currentSessionId });
  }

  private updateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      session.duration = session.lastActivity.getTime() - session.startTime.getTime();
    }
  }

  private endCurrentSession(): void {
    const session = this.sessions.get(this.currentSessionId);
    if (session && !session.endTime) {
      session.endTime = new Date();
      session.exitUrl = window.location.href;
      session.duration = session.endTime.getTime() - session.startTime.getTime();
      
      this.logger.info('CategoryAnalyticsTracker', 'Session ended', {
        sessionId: this.currentSessionId,
        duration: session.duration
      });
    }
  }

  private cleanupExpiredSessions(): void {
    const now = new Date().getTime();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity.getTime() > this.sessionTimeout) {
        if (!session.endTime) {
          session.endTime = session.lastActivity;
          session.duration = session.endTime.getTime() - session.startTime.getTime();
        }
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      this.logger.info('CategoryAnalyticsTracker', 'Session expired', { sessionId });
    });
  }

  private createEmptyAnalytics(): BehaviorAnalytics {
    return {
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
    };
  }

  private updateAnalytics(): void {
    const sessions = Array.from(this.sessions.values());
    const completedSessions = sessions.filter(s => s.endTime);

    if (sessions.length === 0) {
      this.analyticsSubject.next(this.createEmptyAnalytics());
      return;
    }

    // Calculate basic metrics
    const totalSessions = sessions.length;
    const totalEvents = this.events.length;
    const averageSessionDuration = completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0;
    const averagePageViews = sessions.reduce((sum, s) => sum + s.pageViews, 0) / sessions.length;
    const averageInteractions = sessions.reduce((sum, s) => sum + s.interactions, 0) / sessions.length;
    const bounceRate = (sessions.filter(s => s.pageViews <= 1).length / sessions.length) * 100;

    // Most viewed pages
    const pageViews: { [key: string]: number } = {};
    this.events.filter(e => e.eventType === 'page_view').forEach(event => {
      const page = event.eventLabel || event.url;
      pageViews[page] = (pageViews[page] || 0) + 1;
    });
    const mostViewedPages = Object.entries(pageViews)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Most used features
    const featureUsage: { [key: string]: number } = {};
    this.events.filter(e => e.eventType === 'click').forEach(event => {
      const feature = event.eventAction;
      featureUsage[feature] = (featureUsage[feature] || 0) + 1;
    });
    const mostUsedFeatures = Object.entries(featureUsage)
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    // Search queries
    const searches: { [key: string]: number } = {};
    this.events.filter(e => e.eventType === 'search').forEach(event => {
      const query = event.eventLabel || '';
      if (query) {
        searches[query] = (searches[query] || 0) + 1;
      }
    });
    const searchQueries = Object.entries(searches)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Errors by page
    const errors: { [key: string]: number } = {};
    this.events.filter(e => e.eventType === 'error').forEach(event => {
      const page = new URL(event.url).pathname;
      errors[page] = (errors[page] || 0) + 1;
    });
    const errorsByPage = Object.entries(errors)
      .map(([page, errors]) => ({ page, errors }))
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 10);

    // User journey (simplified)
    const userJourney = this.calculateUserJourney();
    const conversionFunnel = this.calculateConversionFunnel();

    const analytics: BehaviorAnalytics = {
      totalSessions,
      totalEvents,
      averageSessionDuration,
      averagePageViews,
      averageInteractions,
      bounceRate,
      mostViewedPages,
      mostUsedFeatures,
      searchQueries,
      errorsByPage,
      userJourney,
      conversionFunnel
    };

    this.analyticsSubject.next(analytics);
  }

  private calculateUserJourney(): { step: string; users: number; dropoff: number }[] {
    // Simplified user journey for category management
    const journeySteps = [
      'category_list_view',
      'category_create_click',
      'category_form_view',
      'category_form_submit',
      'category_created'
    ];

    const stepCounts: { [key: string]: number } = {};
    
    journeySteps.forEach(step => {
      stepCounts[step] = this.events.filter(e => 
        e.eventAction === step || e.eventLabel === step
      ).length;
    });

    return journeySteps.map((step, index) => {
      const users = stepCounts[step] || 0;
      const previousUsers = index > 0 ? (stepCounts[journeySteps[index - 1]] || 0) : users;
      const dropoff = previousUsers > 0 ? ((previousUsers - users) / previousUsers) * 100 : 0;
      
      return { step, users, dropoff };
    });
  }

  private calculateConversionFunnel(): { stage: string; users: number; conversionRate: number }[] {
    const funnelStages = [
      { stage: 'Visited Categories', events: ['page_view'] },
      { stage: 'Clicked Create', events: ['category_create_click'] },
      { stage: 'Filled Form', events: ['form_input'] },
      { stage: 'Submitted Form', events: ['form_submit'] },
      { stage: 'Created Category', events: ['category_created'] }
    ];

    let previousUsers = 0;

    return funnelStages.map((funnel, index) => {
      const users = this.events.filter(e => 
        funnel.events.includes(e.eventType) || funnel.events.includes(e.eventAction)
      ).length;

      const conversionRate = index === 0 ? 100 : previousUsers > 0 ? (users / previousUsers) * 100 : 0;
      previousUsers = users;

      return {
        stage: funnel.stage,
        users,
        conversionRate
      };
    });
  }

  private storeEvent(event: UserBehaviorEvent): void {
    try {
      const storedEvents = JSON.parse(localStorage.getItem('category_analytics') || '[]');
      storedEvents.push(event);
      
      // Keep only last 200 events in localStorage
      if (storedEvents.length > 200) {
        storedEvents.splice(0, storedEvents.length - 200);
      }
      
      localStorage.setItem('category_analytics', JSON.stringify(storedEvents));
      
    } catch (error) {
      this.logger.error('CategoryAnalyticsTracker', 'Failed to store analytics event', { error });
    }
  }

  // Public methods
  trackEvent(
    eventCategory: string,
    eventAction: string,
    eventLabel?: string,
    eventValue?: number,
    metadata?: any,
    userId?: string,
    establishmentId?: number
  ): string {
    const event: UserBehaviorEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      userId,
      establishmentId,
      sessionId: this.currentSessionId,
      eventType: this.determineEventType(eventAction),
      eventCategory,
      eventAction,
      eventLabel,
      eventValue,
      metadata,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer
    };

    this.events.push(event);
    
    // Keep only the last maxEvents entries
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update session
    this.updateSession(this.currentSessionId);
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      if (event.eventType === 'page_view') {
        session.pageViews++;
      } else if (event.eventType === 'click') {
        session.interactions++;
      } else if (event.eventType === 'error') {
        session.errors++;
      }
    }

    this.updateAnalytics();
    this.storeEvent(event);

    return event.id;
  }

  private determineEventType(eventAction: string): UserBehaviorEvent['eventType'] {
    if (eventAction.includes('view') || eventAction.includes('page')) return 'page_view';
    if (eventAction.includes('click') || eventAction.includes('button')) return 'click';
    if (eventAction.includes('submit') || eventAction.includes('form')) return 'form_submit';
    if (eventAction.includes('search')) return 'search';
    if (eventAction.includes('filter')) return 'filter';
    if (eventAction.includes('sort')) return 'sort';
    if (eventAction.includes('navigate') || eventAction.includes('route')) return 'navigation';
    if (eventAction.includes('error')) return 'error';
    return 'click'; // default
  }

  // Convenience methods
  trackPageView(page: string, userId?: string, establishmentId?: number): string {
    return this.trackEvent('Navigation', 'page_view', page, undefined, undefined, userId, establishmentId);
  }

  trackButtonClick(buttonName: string, userId?: string, establishmentId?: number): string {
    return this.trackEvent('Interaction', 'button_click', buttonName, undefined, undefined, userId, establishmentId);
  }

  trackFormSubmit(formName: string, success: boolean, userId?: string, establishmentId?: number): string {
    return this.trackEvent('Form', 'form_submit', formName, success ? 1 : 0, { success }, userId, establishmentId);
  }

  trackSearch(query: string, resultsCount: number, userId?: string, establishmentId?: number): string {
    return this.trackEvent('Search', 'search_query', query, resultsCount, { resultsCount }, userId, establishmentId);
  }

  trackError(errorType: string, errorMessage: string, userId?: string, establishmentId?: number): string {
    return this.trackEvent('Error', 'error_occurred', errorType, undefined, { errorMessage }, userId, establishmentId);
  }

  // Category-specific tracking methods
  trackCategoryOperation(
    operation: 'create' | 'read' | 'update' | 'delete' | 'list',
    categoryId?: number,
    success: boolean = true,
    userId?: string,
    establishmentId?: number
  ): string {
    return this.trackEvent(
      'Category',
      `category_${operation}`,
      categoryId?.toString(),
      success ? 1 : 0,
      { operation, categoryId, success },
      userId,
      establishmentId
    );
  }

  // Query methods
  getEvents(eventType?: UserBehaviorEvent['eventType'], category?: string): UserBehaviorEvent[] {
    return this.events.filter(event => {
      if (eventType && event.eventType !== eventType) return false;
      if (category && event.eventCategory !== category) return false;
      return true;
    });
  }

  getAnalytics(): BehaviorAnalytics {
    return this.analyticsSubject.value;
  }

  getSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  getCurrentSession(): UserSession | undefined {
    return this.sessions.get(this.currentSessionId);
  }

  clearAnalytics(): void {
    this.events = [];
    this.sessions.clear();
    localStorage.removeItem('category_analytics');
    this.startSession(); // Start a new session
    this.updateAnalytics();
    this.logger.info('CategoryAnalyticsTracker', 'Analytics data cleared');
  }

  exportAnalytics(): string {
    return JSON.stringify({
      events: this.events,
      sessions: Array.from(this.sessions.values()),
      analytics: this.getAnalytics()
    }, null, 2);
  }
}
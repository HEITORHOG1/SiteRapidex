import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map, filter } from 'rxjs/operators';

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  updateAvailable: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryServiceWorkerRegistrationService {
  private statusSubject = new BehaviorSubject<ServiceWorkerStatus>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isActive: false,
    updateAvailable: false,
    error: null
  });

  public status$ = this.statusSubject.asObservable();
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (this.isServiceWorkerSupported()) {
      this.registerServiceWorker();
      this.setupEventListeners();
    }
  }

  /**
   * Check if service worker is supported
   */
  private isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Register the category service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      console.log('Registering category service worker...');
      
      this.registration = await navigator.serviceWorker.register(
        '/assets/workers/category-sw.js',
        {
          scope: '/categories'
        }
      );

      console.log('Category service worker registered:', this.registration);

      this.updateStatus({
        isRegistered: true,
        isActive: this.registration.active !== null,
        error: null
      });

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        console.log('Category service worker update found');
        this.handleServiceWorkerUpdate();
      });

      // Check if service worker is already active
      if (this.registration.active) {
        this.setupMessageChannel();
      }

      // Wait for service worker to become active
      if (this.registration.installing) {
        this.registration.installing.addEventListener('statechange', (event) => {
          const sw = event.target as ServiceWorker;
          if (sw.state === 'activated') {
            this.updateStatus({ isActive: true });
            this.setupMessageChannel();
          }
        });
      }

    } catch (error) {
      console.error('Category service worker registration failed:', error);
      this.updateStatus({
        error: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  /**
   * Handle service worker updates
   */
  private handleServiceWorkerUpdate(): void {
    if (!this.registration?.installing) return;

    const installingWorker = this.registration.installing;

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('Category service worker update available');
        this.updateStatus({ updateAvailable: true });
      }
    });
  }

  /**
   * Setup event listeners for service worker events
   */
  private setupEventListeners(): void {
    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });

    // Listen for service worker controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Category service worker controller changed');
      window.location.reload();
    });
  }

  /**
   * Setup message channel with service worker
   */
  private setupMessageChannel(): void {
    if (!this.registration?.active) return;

    // Test communication with service worker
    this.postMessage({
      type: 'PING',
      timestamp: Date.now()
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(data: any): void {
    console.log('Message from category service worker:', data);

    switch (data.type) {
      case 'SYNC_CATEGORIES':
        // Notify other services that sync is needed
        this.notifySyncNeeded();
        break;

      case 'CACHE_UPDATED':
        console.log('Category cache updated by service worker');
        break;

      case 'PONG':
        console.log('Category service worker communication established');
        break;

      default:
        console.log('Unknown message from category service worker:', data);
    }
  }

  /**
   * Notify that sync is needed
   */
  private notifySyncNeeded(): void {
    // This could emit an event or call a sync service
    window.dispatchEvent(new CustomEvent('category-sync-needed', {
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Post message to service worker
   */
  postMessage(message: any): void {
    if (this.registration?.active) {
      this.registration.active.postMessage(message);
    } else {
      console.warn('Category service worker not active, cannot send message:', message);
    }
  }

  /**
   * Update service worker (skip waiting)
   */
  updateServiceWorker(): void {
    if (this.registration?.waiting) {
      this.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * Cache category data in service worker
   */
  cacheCategoryData(estabelecimentoId: number, categories: any[]): void {
    this.postMessage({
      type: 'CACHE_CATEGORY_DATA',
      data: {
        estabelecimentoId,
        categories,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Clear category cache in service worker
   */
  clearCategoryCache(): void {
    this.postMessage({
      type: 'CLEAR_CATEGORY_CACHE',
      timestamp: Date.now()
    });
  }

  /**
   * Register for background sync
   */
  async registerBackgroundSync(tag: string = 'category-sync'): Promise<void> {
    if (!this.registration) {
      console.warn('Cannot register background sync: service worker not registered');
      return;
    }

    try {
      // Check if sync is supported
      if ('sync' in this.registration) {
        await (this.registration as any).sync.register(tag);
        console.log('Background sync registered:', tag);
      } else {
        console.warn('Background sync not supported');
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  /**
   * Get current service worker status
   */
  getCurrentStatus(): ServiceWorkerStatus {
    return this.statusSubject.value;
  }

  /**
   * Check if service worker is ready
   */
  isReady(): boolean {
    const status = this.getCurrentStatus();
    return status.isSupported && status.isRegistered && status.isActive;
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Category service worker unregistered:', result);
      
      this.updateStatus({
        isRegistered: false,
        isActive: false,
        updateAvailable: false,
        error: null
      });

      return result;
    } catch (error) {
      console.error('Failed to unregister category service worker:', error);
      return false;
    }
  }

  /**
   * Update service worker status
   */
  private updateStatus(updates: Partial<ServiceWorkerStatus>): void {
    const currentStatus = this.statusSubject.value;
    this.statusSubject.next({ ...currentStatus, ...updates });
  }

  /**
   * Get observable for online/offline status
   */
  getOnlineStatus(): Observable<boolean> {
    return merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    );
  }

  /**
   * Get observable for service worker updates
   */
  getUpdateAvailable(): Observable<boolean> {
    return this.status$.pipe(
      map(status => status.updateAvailable),
      filter(updateAvailable => updateAvailable)
    );
  }
}
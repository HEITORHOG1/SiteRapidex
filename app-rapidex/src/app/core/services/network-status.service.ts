import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

/**
 * Network Status Service for Always-Online Application
 * 
 * This service monitors network connectivity and provides a simple way
 * to check if the application is online. Since this is an always-online app,
 * when offline, the app should show clear messages that it requires internet.
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkStatusService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  
  /**
   * Observable that emits the current online status
   */
  public readonly isOnline$: Observable<boolean> = merge(
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false))
  ).pipe(
    startWith(navigator.onLine)
  );

  constructor() {
    // Subscribe to network status changes
    this.isOnline$.subscribe(isOnline => {
      this.isOnlineSubject.next(isOnline);
      
      if (!isOnline) {
        console.warn('Application is offline. This app requires internet connection to function.');
      } else {
        console.info('Application is back online.');
      }
    });
  }

  /**
   * Get current online status
   */
  isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  /**
   * Get current offline status
   */
  isOffline(): boolean {
    return !this.isOnlineSubject.value;
  }

  /**
   * Get appropriate error message for network issues
   */
  getNetworkErrorMessage(): string {
    return this.isOffline() 
      ? 'Sem conexão com a internet. Esta aplicação requer conexão para funcionar.'
      : 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  /**
   * Check if an error is network-related
   */
  isNetworkError(error: any): boolean {
    return error?.status === 0 || 
           error?.message?.includes('conexão') ||
           error?.message?.includes('internet') ||
           error?.message?.includes('network');
  }
}
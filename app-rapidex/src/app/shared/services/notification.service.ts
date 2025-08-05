import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { take } from 'rxjs/operators';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private idCounter = 0;

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  private addNotification(notification: Omit<Notification, 'id'>): string {
    const id = `notification-${++this.idCounter}`;
    const newNotification: Notification = {
      id,
      dismissible: true,
      duration: 5000,
      ...notification
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, newNotification]);

    // Auto-dismiss after duration
    if (newNotification.duration && newNotification.duration > 0) {
      timer(newNotification.duration)
        .pipe(take(1))
        .subscribe(() => {
          this.dismiss(id);
        });
    }

    return id;
  }

  success(message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>): string {
    return this.addNotification({
      type: 'success',
      message,
      ...options
    });
  }

  error(message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>): string {
    return this.addNotification({
      type: 'error',
      message,
      duration: 0, // Errors don't auto-dismiss by default
      ...options
    });
  }

  warning(message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>): string {
    return this.addNotification({
      type: 'warning',
      message,
      ...options
    });
  }

  info(message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>): string {
    return this.addNotification({
      type: 'info',
      message,
      ...options
    });
  }

  dismiss(id: string): void {
    const currentNotifications = this.notifications$.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notifications$.next(filteredNotifications);
  }

  dismissAll(): void {
    this.notifications$.next([]);
  }

  // Convenience methods for common scenarios
  showApiError(error: any): string {
    const message = error?.message || error?.error?.message || 'Ocorreu um erro inesperado';
    return this.error(message, {
      action: {
        label: 'Tentar novamente',
        handler: () => {
          // This can be overridden by the caller
        }
      }
    });
  }

  showNetworkError(): string {
    return this.error('Erro de conexão. Verifique sua internet e tente novamente.', {
      action: {
        label: 'Tentar novamente',
        handler: () => {
          // This can be overridden by the caller
        }
      }
    });
  }

  showValidationError(message: string): string {
    return this.warning(message, {
      duration: 4000
    });
  }

  showSuccessMessage(message: string): string {
    return this.success(message, {
      duration: 3000
    });
  }
}
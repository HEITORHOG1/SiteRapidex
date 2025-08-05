import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService, Notification } from '../../services/notification.service';
import { ToastComponent } from '../toast/toast';

@Component({
  selector: 'rx-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss'
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  notifications$: Observable<Notification[]>;
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.getNotifications();
  }

  ngOnInit(): void {
    // Component is ready to receive notifications
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  onActionClick(handler: () => void): void {
    handler();
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }
}
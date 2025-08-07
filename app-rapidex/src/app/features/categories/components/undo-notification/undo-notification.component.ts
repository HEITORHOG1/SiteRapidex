import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, timer } from 'rxjs';

import { CategoryDeletionService, PendingUndo } from '../../services/category-deletion.service';

@Component({
  selector: 'app-undo-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './undo-notification.component.html',
  styleUrls: ['./undo-notification.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UndoNotificationComponent implements OnInit, OnDestroy {
  private categoryDeletionService = inject(CategoryDeletionService);
  private destroy$ = new Subject<void>();

  @Input() pendingUndo!: PendingUndo;
  @Input() autoHide: boolean = true;
  @Input() position: 'top' | 'bottom' = 'bottom';

  @Output() undo = new EventEmitter<string>();
  @Output() dismiss = new EventEmitter<string>();
  @Output() expired = new EventEmitter<string>();

  // Component state
  isVisible = signal(true);
  timeRemaining = signal(0);
  isUndoing = signal(false);

  // Computed properties
  timeRemainingText = computed(() => {
    const seconds = this.timeRemaining();
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${remainingSeconds}s`;
    }
  });

  progressPercentage = computed(() => {
    const totalTime = 5 * 60; // 5 minutes in seconds
    const remaining = this.timeRemaining();
    return ((totalTime - remaining) / totalTime) * 100;
  });

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startCountdown(): void {
    if (!this.pendingUndo) return;

    // Update countdown every second
    timer(0, 1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const now = new Date();
      const expiresAt = new Date(this.pendingUndo.expiresAt);
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      
      this.timeRemaining.set(remaining);
      
      if (remaining <= 0) {
        this.onExpired();
      }
    });
  }

  onUndo(): void {
    if (this.isUndoing() || !this.pendingUndo) return;

    this.isUndoing.set(true);
    this.undo.emit(this.pendingUndo.undoToken);
  }

  onDismiss(): void {
    if (!this.pendingUndo) return;

    this.isVisible.set(false);
    this.dismiss.emit(this.pendingUndo.undoToken);
  }

  private onExpired(): void {
    if (!this.pendingUndo) return;

    this.isVisible.set(false);
    this.expired.emit(this.pendingUndo.undoToken);
  }

  // Template helper methods
  getDeletionTypeText(): string {
    if (!this.pendingUndo) return '';
    
    return this.pendingUndo.deletionType === 'hard' ? 'excluída' : 'desativada';
  }

  getUndoActionText(): string {
    if (!this.pendingUndo) return '';
    
    return this.pendingUndo.deletionType === 'hard' ? 'Restaurar' : 'Reativar';
  }

  getNotificationClass(): string {
    const classes = ['undo-notification'];
    
    if (this.pendingUndo?.deletionType === 'hard') {
      classes.push('undo-notification--danger');
    } else {
      classes.push('undo-notification--warning');
    }
    
    if (!this.isVisible()) {
      classes.push('undo-notification--hidden');
    }
    
    if (this.timeRemaining() <= 30) {
      classes.push('undo-notification--urgent');
    }
    
    return classes.join(' ');
  }

  getProgressBarClass(): string {
    const remaining = this.timeRemaining();
    
    if (remaining <= 30) {
      return 'progress-bar--urgent';
    } else if (remaining <= 60) {
      return 'progress-bar--warning';
    } else {
      return 'progress-bar--normal';
    }
  }

  // Accessibility helpers
  getAriaLabel(): string {
    if (!this.pendingUndo) return '';
    
    const action = this.getDeletionTypeText();
    const timeText = this.timeRemainingText();
    
    return `Categoria ${this.pendingUndo.category.nome} foi ${action}. Você pode desfazer esta ação nos próximos ${timeText}.`;
  }

  getUndoButtonAriaLabel(): string {
    if (!this.pendingUndo) return '';
    
    return `${this.getUndoActionText()} categoria ${this.pendingUndo.category.nome}`;
  }

  // Keyboard navigation
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onUndo();
        break;
      case 'Escape':
        event.preventDefault();
        this.onDismiss();
        break;
    }
  }
}
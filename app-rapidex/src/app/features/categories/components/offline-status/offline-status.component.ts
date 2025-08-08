import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { CategoryOfflineSyncService, SyncStatus } from '../../services/category-offline-sync.service';

@Component({
  selector: 'app-offline-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-status" [class]="getStatusClass()">
      <div class="status-indicator">
        <span class="status-icon" [innerHTML]="getStatusIcon()"></span>
        <span class="status-text">{{ getStatusText() }}</span>
      </div>
      
      @if (syncStatus().pendingOperations > 0) {
        <div class="pending-operations">
          <span class="pending-count">{{ syncStatus().pendingOperations }}</span>
          <span class="pending-text">operações pendentes</span>
        </div>
      }
      
      @if (syncStatus().isSyncing) {
        <div class="sync-progress">
          <div class="sync-spinner"></div>
          <span>Sincronizando...</span>
        </div>
      }
      
      @if (syncStatus().syncError) {
        <div class="sync-error" [title]="syncStatus().syncError">
          <span class="error-icon">⚠️</span>
          <span>Erro na sincronização</span>
        </div>
      }
      
      @if (syncStatus().lastSyncTime > 0) {
        <div class="last-sync">
          Última sincronização: {{ getLastSyncText() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .offline-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.3s ease;
    }

    .offline-status.online {
      background-color: #e8f5e8;
      border: 1px solid #4caf50;
      color: #2e7d32;
    }

    .offline-status.offline {
      background-color: #fff3e0;
      border: 1px solid #ff9800;
      color: #f57c00;
    }

    .offline-status.syncing {
      background-color: #e3f2fd;
      border: 1px solid #2196f3;
      color: #1976d2;
    }

    .offline-status.error {
      background-color: #ffebee;
      border: 1px solid #f44336;
      color: #c62828;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-icon {
      font-size: 16px;
    }

    .pending-operations {
      display: flex;
      align-items: center;
      gap: 4px;
      background-color: rgba(0, 0, 0, 0.1);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .pending-count {
      font-weight: bold;
      background-color: #ff9800;
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }

    .sync-progress {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .sync-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .sync-error {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      cursor: help;
    }

    .error-icon {
      font-size: 14px;
    }

    .last-sync {
      font-size: 11px;
      opacity: 0.8;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .offline-status {
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .last-sync {
        width: 100%;
        text-align: center;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfflineStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  syncStatus = signal<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingOperations: 0,
    lastSyncTime: 0,
    syncError: null
  });

  constructor(private syncService: CategoryOfflineSyncService) {}

  ngOnInit(): void {
    this.syncService.syncStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.syncStatus.set(status);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusClass(): string {
    const status = this.syncStatus();
    
    if (status.syncError) {
      return 'error';
    }
    
    if (status.isSyncing) {
      return 'syncing';
    }
    
    if (!status.isOnline) {
      return 'offline';
    }
    
    return 'online';
  }

  getStatusIcon(): string {
    const status = this.syncStatus();
    
    if (status.syncError) {
      return '❌';
    }
    
    if (status.isSyncing) {
      return '🔄';
    }
    
    if (!status.isOnline) {
      return '📱';
    }
    
    return '🌐';
  }

  getStatusText(): string {
    const status = this.syncStatus();
    
    if (status.syncError) {
      return 'Erro de sincronização';
    }
    
    if (status.isSyncing) {
      return 'Sincronizando';
    }
    
    if (!status.isOnline) {
      return 'Modo offline';
    }
    
    return 'Online';
  }

  getLastSyncText(): string {
    const lastSync = this.syncStatus().lastSyncTime;
    if (!lastSync) return 'Nunca';
    
    const now = Date.now();
    const diff = now - lastSync;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Agora mesmo';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} min atrás`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h atrás`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days}d atrás`;
    }
  }
}
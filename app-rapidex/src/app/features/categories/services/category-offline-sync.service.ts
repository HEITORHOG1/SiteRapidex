import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, EMPTY, timer } from 'rxjs';
import { switchMap, catchError, tap, filter, mergeMap, delay } from 'rxjs/operators';
import { CategoryHttpService } from './category-http.service';
import { CategoryOfflineStorageService, OfflineCategoryOperation } from './category-offline-storage.service';
import { Category } from '../models/category.models';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: number;
  syncError: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryOfflineSyncService {
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingOperations: 0,
    lastSyncTime: 0,
    syncError: null
  });

  public syncStatus$ = this.syncStatusSubject.asObservable();
  private syncInProgress = false;

  constructor(
    private categoryHttpService: CategoryHttpService,
    private offlineStorage: CategoryOfflineStorageService
  ) {
    this.initializeOnlineStatusListener();
    this.initializePeriodicSync();
  }

  /**
   * Initialize online/offline status listener
   */
  private initializeOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      this.updateSyncStatus({ isOnline: true, syncError: null });
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.updateSyncStatus({ isOnline: false });
    });
  }

  /**
   * Initialize periodic sync when online
   */
  private initializePeriodicSync(): void {
    // Sync every 30 seconds when online and there are pending operations
    timer(0, 30000).pipe(
      filter(() => navigator.onLine && !this.syncInProgress),
      switchMap(() => this.syncAllEstablishments())
    ).subscribe();
  }

  /**
   * Sync pending operations for all establishments
   */
  private syncAllEstablishments(): Observable<void> {
    // This would typically get establishments from a service
    // For now, we'll sync based on stored offline data
    const establishments = this.getEstablishmentsWithOfflineData();
    
    if (establishments.length === 0) {
      return of(void 0);
    }

    return from(establishments).pipe(
      mergeMap(estabelecimentoId => this.syncEstablishment(estabelecimentoId)),
      catchError(error => {
        console.error('Error during periodic sync:', error);
        return of(void 0);
      })
    );
  }

  /**
   * Sync pending operations for a specific establishment
   */
  syncEstablishment(estabelecimentoId: number): Observable<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return of(void 0);
    }

    const pendingOperations = this.offlineStorage.getPendingOperations(estabelecimentoId);
    
    if (pendingOperations.length === 0) {
      return of(void 0);
    }

    this.syncInProgress = true;
    this.updateSyncStatus({ 
      isSyncing: true, 
      pendingOperations: pendingOperations.length 
    });

    return from(pendingOperations).pipe(
      mergeMap(operation => this.syncOperation(operation).pipe(
        delay(100) // Small delay between operations to avoid overwhelming the server
      )),
      tap(() => {
        this.syncInProgress = false;
        this.updateSyncStatus({ 
          isSyncing: false, 
          pendingOperations: this.offlineStorage.getPendingOperations(estabelecimentoId).length,
          lastSyncTime: Date.now(),
          syncError: null
        });
      }),
      catchError(error => {
        this.syncInProgress = false;
        this.updateSyncStatus({ 
          isSyncing: false, 
          syncError: error.message || 'Sync failed' 
        });
        return of(void 0);
      })
    );
  }

  /**
   * Sync a single operation
   */
  private syncOperation(operation: OfflineCategoryOperation): Observable<void> {
    switch (operation.type) {
      case 'create':
        return this.syncCreateOperation(operation);
      case 'update':
        return this.syncUpdateOperation(operation);
      case 'delete':
        return this.syncDeleteOperation(operation);
      default:
        return of(void 0);
    }
  }

  /**
   * Sync create operation
   */
  private syncCreateOperation(operation: OfflineCategoryOperation): Observable<void> {
    if (!operation.data) {
      this.offlineStorage.removeOperation(operation.estabelecimentoId, operation.id);
      return of(void 0);
    }

    return this.categoryHttpService.createCategory(operation.estabelecimentoId, operation.data).pipe(
      tap((createdCategory: Category) => {
        // Update the cached category with the real ID from server
        this.updateCachedCategoryAfterCreate(operation, createdCategory);
        this.offlineStorage.removeOperation(operation.estabelecimentoId, operation.id);
      }),
      switchMap(() => of(void 0)),
      catchError(error => this.handleSyncError(operation, error))
    );
  }

  /**
   * Sync update operation
   */
  private syncUpdateOperation(operation: OfflineCategoryOperation): Observable<void> {
    if (!operation.categoryId || !operation.data) {
      this.offlineStorage.removeOperation(operation.estabelecimentoId, operation.id);
      return of(void 0);
    }

    return this.categoryHttpService.updateCategory(
      operation.estabelecimentoId, 
      operation.categoryId, 
      operation.data
    ).pipe(
      tap(() => {
        this.offlineStorage.removeOperation(operation.estabelecimentoId, operation.id);
      }),
      switchMap(() => of(void 0)),
      catchError(error => this.handleSyncError(operation, error))
    );
  }

  /**
   * Sync delete operation
   */
  private syncDeleteOperation(operation: OfflineCategoryOperation): Observable<void> {
    if (!operation.categoryId) {
      this.offlineStorage.removeOperation(operation.estabelecimentoId, operation.id);
      return of(void 0);
    }

    return this.categoryHttpService.deleteCategory(operation.estabelecimentoId, operation.categoryId).pipe(
      tap(() => {
        this.offlineStorage.removeOperation(operation.estabelecimentoId, operation.id);
      }),
      switchMap(() => of(void 0)),
      catchError(error => this.handleSyncError(operation, error))
    );
  }

  /**
   * Handle sync errors
   */
  private handleSyncError(operation: OfflineCategoryOperation, error: any): Observable<void> {
    console.error('Sync operation failed:', operation, error);
    
    // If it's a 404 or 409 (conflict), remove the operation
    if (error.status === 404 || error.status === 409) {
      this.offlineStorage.removeOperation(operation.estabelecimentoId, operation.id);
      return of(void 0);
    }

    // Otherwise, increment retry count
    this.offlineStorage.incrementRetryCount(operation.estabelecimentoId, operation.id);
    return of(void 0);
  }

  /**
   * Update cached category after successful create operation
   */
  private updateCachedCategoryAfterCreate(operation: OfflineCategoryOperation, createdCategory: Category): void {
    const data = this.offlineStorage.getOfflineData(operation.estabelecimentoId);
    if (data) {
      // Find the temporary category (with negative ID) and replace it with the real one
      const tempCategoryIndex = data.categories.findIndex(c => 
        c.id < 0 && c.nome === createdCategory.nome
      );
      
      if (tempCategoryIndex !== -1) {
        data.categories[tempCategoryIndex] = createdCategory;
        this.offlineStorage.saveOfflineData(operation.estabelecimentoId, data);
      }
    }
  }

  /**
   * Force sync for a specific establishment
   */
  forceSyncEstablishment(estabelecimentoId: number): Observable<void> {
    return this.syncEstablishment(estabelecimentoId);
  }

  /**
   * Sync all pending operations immediately
   */
  syncPendingOperations(): void {
    if (navigator.onLine && !this.syncInProgress) {
      this.syncAllEstablishments().subscribe();
    }
  }

  /**
   * Get current sync status
   */
  getCurrentSyncStatus(): SyncStatus {
    return this.syncStatusSubject.value;
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get establishments that have offline data
   */
  private getEstablishmentsWithOfflineData(): number[] {
    const establishments: number[] = [];
    
    // Scan localStorage for offline data keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('rapidex_categories_offline_')) {
        const estabelecimentoId = parseInt(key.split('_').pop() || '0');
        if (estabelecimentoId > 0) {
          establishments.push(estabelecimentoId);
        }
      }
    }
    
    return establishments;
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    const currentStatus = this.syncStatusSubject.value;
    this.syncStatusSubject.next({ ...currentStatus, ...updates });
  }

  /**
   * Clear all sync data for an establishment
   */
  clearSyncData(estabelecimentoId: number): void {
    this.offlineStorage.clearOfflineData(estabelecimentoId);
    this.updateSyncStatus({ 
      pendingOperations: 0, 
      lastSyncTime: 0, 
      syncError: null 
    });
  }
}
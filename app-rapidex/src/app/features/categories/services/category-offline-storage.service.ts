import { Injectable } from '@angular/core';
import { Category } from '../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../models/category-dto.models';

export interface OfflineCategoryOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  categoryId?: number;
  estabelecimentoId: number;
  data?: CreateCategoryRequest | UpdateCategoryRequest;
  timestamp: number;
  retryCount: number;
}

export interface OfflineCategoryData {
  categories: Category[];
  operations: OfflineCategoryOperation[];
  lastSync: number;
  estabelecimentoId: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryOfflineStorageService {
  private readonly STORAGE_KEY = 'rapidex_categories_offline';
  private readonly MAX_RETRY_COUNT = 3;

  /**
   * Get offline data for a specific establishment
   */
  getOfflineData(estabelecimentoId: number): OfflineCategoryData | null {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEY}_${estabelecimentoId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading offline data:', error);
      return null;
    }
  }

  /**
   * Save offline data for a specific establishment
   */
  saveOfflineData(estabelecimentoId: number, data: OfflineCategoryData): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_${estabelecimentoId}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  /**
   * Get cached categories for an establishment
   */
  getCachedCategories(estabelecimentoId: number): Category[] {
    const data = this.getOfflineData(estabelecimentoId);
    return data?.categories || [];
  }

  /**
   * Cache categories for an establishment
   */
  cacheCategories(estabelecimentoId: number, categories: Category[]): void {
    const existingData = this.getOfflineData(estabelecimentoId);
    const data: OfflineCategoryData = {
      categories,
      operations: existingData?.operations || [],
      lastSync: Date.now(),
      estabelecimentoId
    };
    this.saveOfflineData(estabelecimentoId, data);
  }

  /**
   * Add an offline operation to the queue
   */
  addOfflineOperation(operation: Omit<OfflineCategoryOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    const data = this.getOfflineData(operation.estabelecimentoId) || {
      categories: [],
      operations: [],
      lastSync: 0,
      estabelecimentoId: operation.estabelecimentoId
    };

    const newOperation: OfflineCategoryOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0
    };

    data.operations.push(newOperation);
    this.saveOfflineData(operation.estabelecimentoId, data);
  }

  /**
   * Get pending offline operations for an establishment
   */
  getPendingOperations(estabelecimentoId: number): OfflineCategoryOperation[] {
    const data = this.getOfflineData(estabelecimentoId);
    return data?.operations.filter(op => op.retryCount < this.MAX_RETRY_COUNT) || [];
  }

  /**
   * Remove an operation from the queue
   */
  removeOperation(estabelecimentoId: number, operationId: string): void {
    const data = this.getOfflineData(estabelecimentoId);
    if (data) {
      data.operations = data.operations.filter(op => op.id !== operationId);
      this.saveOfflineData(estabelecimentoId, data);
    }
  }

  /**
   * Increment retry count for an operation
   */
  incrementRetryCount(estabelecimentoId: number, operationId: string): void {
    const data = this.getOfflineData(estabelecimentoId);
    if (data) {
      const operation = data.operations.find(op => op.id === operationId);
      if (operation) {
        operation.retryCount++;
        this.saveOfflineData(estabelecimentoId, data);
      }
    }
  }

  /**
   * Apply offline operation to cached data (optimistic update)
   */
  applyOfflineOperation(operation: OfflineCategoryOperation): void {
    const data = this.getOfflineData(operation.estabelecimentoId);
    if (!data) return;

    switch (operation.type) {
      case 'create':
        if (operation.data) {
          const tempCategory: Category = {
            id: -Date.now(), // Temporary negative ID
            nome: (operation.data as CreateCategoryRequest).nome,
            descricao: (operation.data as CreateCategoryRequest).descricao,
            estabelecimentoId: operation.estabelecimentoId,
            ativo: true,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
            produtosCount: 0
          };
          data.categories.push(tempCategory);
        }
        break;

      case 'update':
        if (operation.categoryId && operation.data) {
          const categoryIndex = data.categories.findIndex(c => c.id === operation.categoryId);
          if (categoryIndex !== -1) {
            data.categories[categoryIndex] = {
              ...data.categories[categoryIndex],
              ...(operation.data as UpdateCategoryRequest),
              dataAtualizacao: new Date()
            };
          }
        }
        break;

      case 'delete':
        if (operation.categoryId) {
          data.categories = data.categories.filter(c => c.id !== operation.categoryId);
        }
        break;
    }

    this.saveOfflineData(operation.estabelecimentoId, data);
  }

  /**
   * Clear all offline data for an establishment
   */
  clearOfflineData(estabelecimentoId: number): void {
    localStorage.removeItem(`${this.STORAGE_KEY}_${estabelecimentoId}`);
  }

  /**
   * Get the last sync timestamp for an establishment
   */
  getLastSyncTime(estabelecimentoId: number): number {
    const data = this.getOfflineData(estabelecimentoId);
    return data?.lastSync || 0;
  }

  /**
   * Check if there are pending operations
   */
  hasPendingOperations(estabelecimentoId: number): boolean {
    return this.getPendingOperations(estabelecimentoId).length > 0;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
import { Injectable, inject } from '@angular/core';
import { Observable, throwError, of, BehaviorSubject, timer } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { CategoryHttpService } from './category-http.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { Category } from '../models/category.models';
import {
  CategoryDeletionValidationResponse,
  CategoryDeletionRequest,
  CategoryDeletionResponse,
  BulkCategoryDeletionRequest,
  BulkCategoryDeletionResponse,
  UndoCategoryDeletionRequest,
  UndoCategoryDeletionResponse,
  CategoryDeletionAuditEntry
} from '../models/category-dto.models';

export interface DeletionImpactAnalysis {
  category: Category;
  canDelete: boolean;
  hasProducts: boolean;
  activeProductsCount: number;
  inactiveProductsCount: number;
  totalProductsCount: number;
  suggestSoftDelete: boolean;
  alternativeCategories: Category[];
  risks: string[];
  recommendations: string[];
}

export interface PendingUndo {
  undoToken: string;
  category: Category;
  deletionType: 'hard' | 'soft';
  expiresAt: Date;
  affectedProductsCount: number;
}

/**
 * Service for handling category deletion with dependency checking,
 * impact analysis, soft delete, bulk operations, and undo functionality
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryDeletionService {
  private categoryHttpService = inject(CategoryHttpService);
  private notificationService = inject(NotificationService);

  // Undo functionality state
  private pendingUndos$ = new BehaviorSubject<PendingUndo[]>([]);
  private readonly UNDO_TIMEOUT_MINUTES = 5;

  constructor() {
    this.startUndoCleanupTimer();
  }

  /**
   * Gets observable of pending undo operations
   */
  getPendingUndos(): Observable<PendingUndo[]> {
    return this.pendingUndos$.asObservable();
  }

  /**
   * Validates if a category can be deleted and provides impact analysis
   */
  validateDeletion(estabelecimentoId: number, categoryId: number): Observable<DeletionImpactAnalysis> {
    return this.categoryHttpService.validateCategoryDeletion(estabelecimentoId, categoryId).pipe(
      switchMap(validation => 
        this.categoryHttpService.getCategoryById(estabelecimentoId, categoryId).pipe(
          map(category => this.buildImpactAnalysis(category, validation))
        )
      ),
      catchError(error => {
        console.error('Error validating category deletion:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Validates bulk deletion and provides impact analysis for multiple categories
   */
  validateBulkDeletion(estabelecimentoId: number, categoryIds: number[]): Observable<DeletionImpactAnalysis[]> {
    const validations = categoryIds.map(id => 
      this.validateDeletion(estabelecimentoId, id)
    );

    return new Observable(observer => {
      Promise.all(validations.map(obs => obs.toPromise()))
        .then(results => {
          observer.next(results.filter(result => result !== undefined) as DeletionImpactAnalysis[]);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Deletes a single category with the specified deletion type
   */
  deleteCategory(
    estabelecimentoId: number, 
    request: CategoryDeletionRequest
  ): Observable<CategoryDeletionResponse> {
    // First validate the deletion
    return this.validateDeletion(estabelecimentoId, request.categoryId).pipe(
      switchMap(analysis => {
        if (!analysis.canDelete && request.deletionType === 'hard') {
          return throwError(() => new Error(
            `Não é possível excluir permanentemente a categoria "${analysis.category.nome}" pois ela possui ${analysis.totalProductsCount} produto(s) associado(s).`
          ));
        }

        // Perform the deletion via HTTP service
        return this.performDeletion(estabelecimentoId, request).pipe(
          tap(response => {
            if (response.canUndo && response.undoToken) {
              this.addPendingUndo({
                undoToken: response.undoToken,
                category: analysis.category,
                deletionType: response.deletionType,
                expiresAt: response.undoExpiresAt || new Date(Date.now() + this.UNDO_TIMEOUT_MINUTES * 60 * 1000),
                affectedProductsCount: response.affectedProductsCount
              });
            }

            // Show success notification
            this.showDeletionSuccessNotification(analysis.category, response);
          })
        );
      }),
      catchError(error => {
        console.error('Error deleting category:', error);
        this.notificationService.showApiError(error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Deletes multiple categories with bulk operation
   */
  deleteBulkCategories(
    estabelecimentoId: number,
    request: BulkCategoryDeletionRequest
  ): Observable<BulkCategoryDeletionResponse> {
    // First validate all deletions
    return this.validateBulkDeletion(estabelecimentoId, request.categoryIds).pipe(
      switchMap(analyses => {
        // Check if any hard deletions are not allowed
        const hardDeletionBlocked = analyses.filter(analysis => 
          !analysis.canDelete && request.deletionType === 'hard'
        );

        if (hardDeletionBlocked.length > 0) {
          const blockedNames = hardDeletionBlocked.map(a => a.category.nome).join(', ');
          return throwError(() => new Error(
            `Não é possível excluir permanentemente as seguintes categorias pois possuem produtos associados: ${blockedNames}`
          ));
        }

        // Perform bulk deletion via HTTP service
        return this.performBulkDeletion(estabelecimentoId, request).pipe(
          tap(response => {
            // Add successful deletions to undo queue
            response.deletionResults.forEach((result, index) => {
              if (result.canUndo && result.undoToken) {
                const analysis = analyses[index];
                if (analysis) {
                  this.addPendingUndo({
                    undoToken: result.undoToken,
                    category: analysis.category,
                    deletionType: result.deletionType,
                    expiresAt: result.undoExpiresAt || new Date(Date.now() + this.UNDO_TIMEOUT_MINUTES * 60 * 1000),
                    affectedProductsCount: result.affectedProductsCount
                  });
                }
              }
            });

            // Show bulk success notification
            this.showBulkDeletionSuccessNotification(response);
          })
        );
      }),
      catchError(error => {
        console.error('Error bulk deleting categories:', error);
        this.notificationService.showApiError(error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Undoes a category deletion using the undo token
   */
  undoDeletion(undoToken: string): Observable<UndoCategoryDeletionResponse> {
    const request: UndoCategoryDeletionRequest = { undoToken };

    return this.performUndo(request).pipe(
      tap(response => {
        if (response.success) {
          // Remove from pending undos
          this.removePendingUndo(undoToken);
          
          // Show success notification
          this.notificationService.showSuccess(
            `Categoria "${response.restoredCategory.nome}" foi restaurada com sucesso. ${response.restoredProductsCount} produto(s) foram restaurados.`
          );
        }
      }),
      catchError(error => {
        console.error('Error undoing category deletion:', error);
        this.notificationService.showApiError(error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Gets the deletion audit trail for an establishment
   */
  getDeletionAuditTrail(estabelecimentoId: number, limit: number = 50): Observable<CategoryDeletionAuditEntry[]> {
    // This would typically call an API endpoint
    // For now, return empty array as placeholder
    return of([]);
  }

  /**
   * Checks if a category has pending undo operation
   */
  hasPendingUndo(categoryId: number): boolean {
    return this.pendingUndos$.value.some(undo => undo.category.id === categoryId);
  }

  /**
   * Gets pending undo for a specific category
   */
  getPendingUndoForCategory(categoryId: number): PendingUndo | null {
    return this.pendingUndos$.value.find(undo => undo.category.id === categoryId) || null;
  }

  // Private methods

  private buildImpactAnalysis(
    category: Category, 
    validation: CategoryDeletionValidationResponse
  ): DeletionImpactAnalysis {
    const activeProductsCount = validation.hasActiveProducts ? (validation.affectedProductsCount || 0) : 0;
    const inactiveProductsCount = validation.hasInactiveProducts ? (validation.affectedProductsCount || 0) - activeProductsCount : 0;
    const totalProductsCount = validation.affectedProductsCount || 0;

    const risks: string[] = [];
    const recommendations: string[] = [];

    if (totalProductsCount > 0) {
      risks.push(`${totalProductsCount} produto(s) serão afetados`);
      
      if (activeProductsCount > 0) {
        risks.push(`${activeProductsCount} produto(s) ativo(s) ficarão sem categoria`);
        recommendations.push('Considere mover os produtos para outra categoria antes da exclusão');
      }

      if (validation.suggestSoftDelete) {
        recommendations.push('Recomendamos desativar a categoria em vez de excluí-la permanentemente');
      }
    }

    if (!validation.canDelete) {
      recommendations.push('Exclusão permanente não é possível. Use exclusão suave ou mova os produtos primeiro');
    }

    return {
      category,
      canDelete: validation.canDelete,
      hasProducts: totalProductsCount > 0,
      activeProductsCount,
      inactiveProductsCount,
      totalProductsCount,
      suggestSoftDelete: validation.suggestSoftDelete || false,
      alternativeCategories: validation.alternativeCategories || [],
      risks,
      recommendations
    };
  }

  private performDeletion(
    estabelecimentoId: number,
    request: CategoryDeletionRequest
  ): Observable<CategoryDeletionResponse> {
    // This would call the actual API endpoint for deletion
    // For now, simulate the response
    return timer(1000).pipe(
      map(() => ({
        success: true,
        deletionType: request.deletionType,
        affectedProductsCount: 0, // Would come from API
        canUndo: true,
        undoToken: `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undoExpiresAt: new Date(Date.now() + this.UNDO_TIMEOUT_MINUTES * 60 * 1000)
      }))
    );
  }

  private performBulkDeletion(
    estabelecimentoId: number,
    request: BulkCategoryDeletionRequest
  ): Observable<BulkCategoryDeletionResponse> {
    // This would call the actual API endpoint for bulk deletion
    // For now, simulate the response
    return timer(2000).pipe(
      map(() => ({
        totalRequested: request.categoryIds.length,
        successfulDeletions: request.categoryIds.length,
        failedDeletions: 0,
        deletionResults: request.categoryIds.map(id => ({
          success: true,
          deletionType: request.deletionType,
          affectedProductsCount: 0,
          canUndo: true,
          undoToken: `undo_${Date.now()}_${id}_${Math.random().toString(36).substr(2, 9)}`,
          undoExpiresAt: new Date(Date.now() + this.UNDO_TIMEOUT_MINUTES * 60 * 1000)
        })),
        errors: []
      }))
    );
  }

  private performUndo(request: UndoCategoryDeletionRequest): Observable<UndoCategoryDeletionResponse> {
    // This would call the actual API endpoint for undo
    // For now, simulate the response
    const pendingUndo = this.pendingUndos$.value.find(undo => undo.undoToken === request.undoToken);
    
    if (!pendingUndo) {
      return throwError(() => new Error('Token de desfazer inválido ou expirado'));
    }

    return timer(1000).pipe(
      map(() => ({
        success: true,
        restoredCategory: pendingUndo.category,
        restoredProductsCount: pendingUndo.affectedProductsCount
      }))
    );
  }

  private addPendingUndo(undo: PendingUndo): void {
    const current = this.pendingUndos$.value;
    this.pendingUndos$.next([...current, undo]);
  }

  private removePendingUndo(undoToken: string): void {
    const current = this.pendingUndos$.value;
    const filtered = current.filter(undo => undo.undoToken !== undoToken);
    this.pendingUndos$.next(filtered);
  }

  private startUndoCleanupTimer(): void {
    // Clean up expired undo operations every minute
    timer(0, 60000).subscribe(() => {
      const now = new Date();
      const current = this.pendingUndos$.value;
      const active = current.filter(undo => undo.expiresAt > now);
      
      if (active.length !== current.length) {
        this.pendingUndos$.next(active);
      }
    });
  }

  private showDeletionSuccessNotification(category: Category, response: CategoryDeletionResponse): void {
    const deletionTypeText = response.deletionType === 'hard' ? 'excluída permanentemente' : 'desativada';
    let message = `Categoria "${category.nome}" foi ${deletionTypeText} com sucesso.`;
    
    if (response.affectedProductsCount > 0) {
      message += ` ${response.affectedProductsCount} produto(s) foram afetados.`;
    }

    if (response.canUndo) {
      message += ' Você pode desfazer esta ação nos próximos 5 minutos.';
    }

    this.notificationService.showSuccess(message);
  }

  private showBulkDeletionSuccessNotification(response: BulkCategoryDeletionResponse): void {
    let message = `${response.successfulDeletions} categoria(s) foram processadas com sucesso.`;
    
    if (response.failedDeletions > 0) {
      message += ` ${response.failedDeletions} falharam.`;
    }

    const totalAffectedProducts = response.deletionResults.reduce(
      (sum, result) => sum + result.affectedProductsCount, 0
    );

    if (totalAffectedProducts > 0) {
      message += ` ${totalAffectedProducts} produto(s) foram afetados.`;
    }

    this.notificationService.showSuccess(message);
  }
}
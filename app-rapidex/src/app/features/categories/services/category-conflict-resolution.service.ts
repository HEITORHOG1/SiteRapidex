import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Category } from '../models/category.models';
import { UpdateCategoryRequest } from '../models/category-dto.models';

export interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'merge' | 'manual';
  resolvedCategory?: Category;
  requiresUserInput?: boolean;
}

export interface CategoryConflict {
  localCategory: Category;
  serverCategory: Category;
  conflictFields: string[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryConflictResolutionService {

  /**
   * Detect conflicts between local and server versions
   */
  detectConflict(localCategory: Category, serverCategory: Category): CategoryConflict | null {
    const conflictFields: string[] = [];

    // Check for conflicts in editable fields
    if (localCategory.nome !== serverCategory.nome) {
      conflictFields.push('nome');
    }

    if (localCategory.descricao !== serverCategory.descricao) {
      conflictFields.push('descricao');
    }

    if (localCategory.ativo !== serverCategory.ativo) {
      conflictFields.push('ativo');
    }

    // Check if local version was modified after server version
    const localModified = new Date(localCategory.dataAtualizacao).getTime();
    const serverModified = new Date(serverCategory.dataAtualizacao).getTime();

    if (conflictFields.length > 0 && localModified !== serverModified) {
      return {
        localCategory,
        serverCategory,
        conflictFields,
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Resolve conflict automatically based on strategy
   */
  resolveConflictAutomatically(
    conflict: CategoryConflict, 
    strategy: 'server-wins' | 'client-wins' | 'merge'
  ): Observable<ConflictResolution> {
    switch (strategy) {
      case 'server-wins':
        return of({
          strategy: 'server-wins',
          resolvedCategory: conflict.serverCategory,
          requiresUserInput: false
        });

      case 'client-wins':
        return of({
          strategy: 'client-wins',
          resolvedCategory: conflict.localCategory,
          requiresUserInput: false
        });

      case 'merge':
        return this.mergeCategories(conflict);

      default:
        return throwError(() => new Error('Invalid conflict resolution strategy'));
    }
  }

  /**
   * Merge categories using intelligent merge strategy
   */
  private mergeCategories(conflict: CategoryConflict): Observable<ConflictResolution> {
    const { localCategory, serverCategory } = conflict;
    
    // Create merged category
    const mergedCategory: Category = {
      ...serverCategory, // Start with server version (has latest ID, timestamps, etc.)
      
      // Apply merge rules for each field
      nome: this.mergeField(
        localCategory.nome, 
        serverCategory.nome, 
        'nome',
        conflict.conflictFields
      ),
      
      descricao: this.mergeField(
        localCategory.descricao, 
        serverCategory.descricao, 
        'descricao',
        conflict.conflictFields
      ),
      
      ativo: this.mergeField(
        localCategory.ativo, 
        serverCategory.ativo, 
        'ativo',
        conflict.conflictFields
      )
    };

    // Check if merge was successful (no remaining conflicts)
    const remainingConflicts = this.detectConflict(mergedCategory, serverCategory);
    
    if (remainingConflicts && remainingConflicts.conflictFields.length > 0) {
      // Merge failed, require manual resolution
      return of({
        strategy: 'manual',
        requiresUserInput: true
      });
    }

    return of({
      strategy: 'merge',
      resolvedCategory: mergedCategory,
      requiresUserInput: false
    });
  }

  /**
   * Merge individual field based on conflict resolution rules
   */
  private mergeField<T>(localValue: T, serverValue: T, fieldName: string, conflictFields: string[]): T {
    // If field is not in conflict, use server value
    if (!conflictFields.includes(fieldName)) {
      return serverValue;
    }

    // Apply field-specific merge rules
    switch (fieldName) {
      case 'nome':
        // For name conflicts, prefer the longer, more descriptive name
        if (typeof localValue === 'string' && typeof serverValue === 'string') {
          return localValue.length > serverValue.length ? localValue : serverValue;
        }
        break;

      case 'descricao':
        // For description conflicts, prefer the longer description
        if (typeof localValue === 'string' && typeof serverValue === 'string') {
          return localValue.length > serverValue.length ? localValue : serverValue;
        }
        break;

      case 'ativo':
        // For active status, prefer active (true) over inactive
        if (typeof localValue === 'boolean' && typeof serverValue === 'boolean') {
          return (localValue || serverValue) as T;
        }
        break;
    }

    // Default: prefer server value for safety
    return serverValue;
  }

  /**
   * Create manual resolution options for user
   */
  createManualResolutionOptions(conflict: CategoryConflict): {
    options: Array<{ label: string; value: Category; description: string }>;
    conflictSummary: string;
  } {
    const options = [
      {
        label: 'Manter versão local',
        value: conflict.localCategory,
        description: 'Usar as alterações feitas offline'
      },
      {
        label: 'Usar versão do servidor',
        value: conflict.serverCategory,
        description: 'Descartar alterações locais e usar a versão mais recente do servidor'
      }
    ];

    // Try to create a merged version
    const mergeResult = this.mergeCategories(conflict);
    mergeResult.subscribe(result => {
      if (result.resolvedCategory && result.strategy === 'merge') {
        options.push({
          label: 'Mesclar alterações',
          value: result.resolvedCategory,
          description: 'Combinar alterações locais e do servidor automaticamente'
        });
      }
    });

    const conflictSummary = this.generateConflictSummary(conflict);

    return { options, conflictSummary };
  }

  /**
   * Generate human-readable conflict summary
   */
  private generateConflictSummary(conflict: CategoryConflict): string {
    const fieldNames: Record<string, string> = {
      nome: 'Nome',
      descricao: 'Descrição',
      ativo: 'Status'
    };

    const conflictedFields = conflict.conflictFields
      .map(field => fieldNames[field] || field)
      .join(', ');

    return `Conflito detectado nos campos: ${conflictedFields}. ` +
           `A categoria foi modificada tanto localmente quanto no servidor.`;
  }

  /**
   * Apply resolution to category
   */
  applyResolution(
    conflict: CategoryConflict, 
    resolution: ConflictResolution
  ): Observable<Category> {
    if (!resolution.resolvedCategory) {
      return throwError(() => new Error('No resolved category provided'));
    }

    // Log resolution for audit purposes
    console.log('Conflict resolved:', {
      categoryId: conflict.localCategory.id,
      strategy: resolution.strategy,
      conflictFields: conflict.conflictFields,
      timestamp: Date.now()
    });

    return of(resolution.resolvedCategory);
  }

  /**
   * Check if automatic resolution is possible
   */
  canResolveAutomatically(conflict: CategoryConflict): boolean {
    // Simple conflicts (single field, non-critical) can be resolved automatically
    if (conflict.conflictFields.length === 1) {
      const field = conflict.conflictFields[0];
      // Description conflicts can usually be merged automatically
      return field === 'descricao' || field === 'ativo';
    }

    return false;
  }

  /**
   * Get recommended resolution strategy
   */
  getRecommendedStrategy(conflict: CategoryConflict): 'server-wins' | 'client-wins' | 'merge' | 'manual' {
    // If only description changed, try merge
    if (conflict.conflictFields.length === 1 && conflict.conflictFields[0] === 'descricao') {
      return 'merge';
    }

    // If only status changed, prefer active status
    if (conflict.conflictFields.length === 1 && conflict.conflictFields[0] === 'ativo') {
      return 'merge';
    }

    // If name changed, require manual resolution
    if (conflict.conflictFields.includes('nome')) {
      return 'manual';
    }

    // For multiple field conflicts, try merge first
    if (conflict.conflictFields.length > 1) {
      return 'merge';
    }

    // Default to server wins for safety
    return 'server-wins';
  }
}
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category } from '../../models/category.models';
import { CategoryConflict } from '../../services/category-conflict-resolution.service';

export interface ConflictResolutionChoice {
  selectedCategory: Category;
  strategy: 'local' | 'server' | 'merge';
}

@Component({
  selector: 'app-conflict-resolution-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Conflito de Sincronização Detectado</h3>
          <button class="close-btn" (click)="onCancel()" aria-label="Fechar">×</button>
        </div>

        <div class="modal-body">
          <div class="conflict-summary">
            <p>{{ conflictSummary() }}</p>
            <p class="conflict-details">
              A categoria <strong>"{{ conflict().localCategory.nome }}"</strong> 
              foi modificada tanto localmente quanto no servidor.
            </p>
          </div>

          <div class="resolution-options">
            <h4>Escolha como resolver o conflito:</h4>
            
            <div class="option-group">
              <label class="option-card" [class.selected]="selectedOption() === 'local'">
                <input 
                  type="radio" 
                  name="resolution" 
                  value="local"
                  [ngModel]="selectedOption()"
                  (ngModelChange)="selectedOption.set($event)"
                >
                <div class="option-content">
                  <div class="option-header">
                    <span class="option-title">Manter Versão Local</span>
                    <span class="option-badge local">Local</span>
                  </div>
                  <div class="option-description">
                    Usar as alterações feitas offline no seu dispositivo
                  </div>
                  <div class="category-preview">
                    <div class="field-comparison">
                      <strong>Nome:</strong> {{ conflict().localCategory.nome }}
                    </div>
                    <div class="field-comparison">
                      <strong>Descrição:</strong> {{ conflict().localCategory.descricao }}
                    </div>
                    <div class="field-comparison">
                      <strong>Status:</strong> 
                      <span [class]="conflict().localCategory.ativo ? 'status-active' : 'status-inactive'">
                        {{ conflict().localCategory.ativo ? 'Ativo' : 'Inativo' }}
                      </span>
                    </div>
                  </div>
                </div>
              </label>

              <label class="option-card" [class.selected]="selectedOption() === 'server'">
                <input 
                  type="radio" 
                  name="resolution" 
                  value="server"
                  [ngModel]="selectedOption()"
                  (ngModelChange)="selectedOption.set($event)"
                >
                <div class="option-content">
                  <div class="option-header">
                    <span class="option-title">Usar Versão do Servidor</span>
                    <span class="option-badge server">Servidor</span>
                  </div>
                  <div class="option-description">
                    Descartar alterações locais e usar a versão mais recente do servidor
                  </div>
                  <div class="category-preview">
                    <div class="field-comparison">
                      <strong>Nome:</strong> {{ conflict().serverCategory.nome }}
                    </div>
                    <div class="field-comparison">
                      <strong>Descrição:</strong> {{ conflict().serverCategory.descricao }}
                    </div>
                    <div class="field-comparison">
                      <strong>Status:</strong> 
                      <span [class]="conflict().serverCategory.ativo ? 'status-active' : 'status-inactive'">
                        {{ conflict().serverCategory.ativo ? 'Ativo' : 'Inativo' }}
                      </span>
                    </div>
                  </div>
                </div>
              </label>

              @if (canMerge()) {
                <label class="option-card" [class.selected]="selectedOption() === 'merge'">
                  <input 
                    type="radio" 
                    name="resolution" 
                    value="merge"
                    [ngModel]="selectedOption()"
                    (ngModelChange)="selectedOption.set($event)"
                  >
                  <div class="option-content">
                    <div class="option-header">
                      <span class="option-title">Mesclar Automaticamente</span>
                      <span class="option-badge merge">Mesclado</span>
                    </div>
                    <div class="option-description">
                      Combinar alterações locais e do servidor automaticamente
                    </div>
                    <div class="category-preview">
                      <div class="field-comparison">
                        <strong>Nome:</strong> {{ getMergedCategory().nome }}
                      </div>
                      <div class="field-comparison">
                        <strong>Descrição:</strong> {{ getMergedCategory().descricao }}
                      </div>
                      <div class="field-comparison">
                        <strong>Status:</strong> 
                        <span [class]="getMergedCategory().ativo ? 'status-active' : 'status-inactive'">
                          {{ getMergedCategory().ativo ? 'Ativo' : 'Inativo' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </label>
              }
            </div>
          </div>

          <div class="conflict-details-section">
            <h4>Campos em Conflito:</h4>
            <div class="conflict-fields">
              @for (field of getConflictFields(); track field.name) {
                <div class="conflict-field">
                  <div class="field-name">{{ field.label }}</div>
                  <div class="field-values">
                    <div class="field-value local">
                      <span class="value-label">Local:</span>
                      <span class="value-content">{{ field.localValue }}</span>
                    </div>
                    <div class="field-value server">
                      <span class="value-label">Servidor:</span>
                      <span class="value-content">{{ field.serverValue }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onCancel()">
            Cancelar
          </button>
          <button 
            class="btn btn-primary" 
            (click)="onResolve()"
            [disabled]="!selectedOption()"
          >
            Resolver Conflito
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 800px;
      width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: #333;
    }

    .modal-body {
      padding: 20px;
    }

    .conflict-summary {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .conflict-summary p {
      margin: 0 0 8px 0;
      color: #856404;
    }

    .conflict-details {
      font-weight: 500;
    }

    .resolution-options h4 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .option-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .option-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: block;
    }

    .option-card:hover {
      border-color: #2196f3;
      background-color: #f8f9fa;
    }

    .option-card.selected {
      border-color: #2196f3;
      background-color: #e3f2fd;
    }

    .option-card input[type="radio"] {
      display: none;
    }

    .option-content {
      width: 100%;
    }

    .option-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .option-title {
      font-weight: 600;
      color: #333;
    }

    .option-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .option-badge.local {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .option-badge.server {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .option-badge.merge {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .option-description {
      color: #666;
      font-size: 14px;
      margin-bottom: 12px;
    }

    .category-preview {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 12px;
      font-size: 14px;
    }

    .field-comparison {
      margin-bottom: 6px;
    }

    .field-comparison:last-child {
      margin-bottom: 0;
    }

    .status-active {
      color: #4caf50;
      font-weight: 500;
    }

    .status-inactive {
      color: #f44336;
      font-weight: 500;
    }

    .conflict-details-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .conflict-details-section h4 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .conflict-fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .conflict-field {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 16px;
    }

    .field-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .field-values {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .field-value {
      padding: 8px;
      border-radius: 4px;
    }

    .field-value.local {
      background-color: #e8f5e8;
      border-left: 3px solid #4caf50;
    }

    .field-value.server {
      background-color: #fff3e0;
      border-left: 3px solid #ff9800;
    }

    .value-label {
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }

    .value-content {
      font-size: 14px;
      word-break: break-word;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e0e0e0;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary {
      background-color: #f5f5f5;
      color: #333;
    }

    .btn-secondary:hover {
      background-color: #e0e0e0;
    }

    .btn-primary {
      background-color: #2196f3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #1976d2;
    }

    .btn-primary:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .modal-content {
        width: 95vw;
        margin: 10px;
      }

      .field-values {
        grid-template-columns: 1fr;
      }

      .option-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConflictResolutionModalComponent {
  @Input() conflict = signal<CategoryConflict>({} as CategoryConflict);
  @Input() conflictSummary = signal<string>('');
  
  @Output() resolved = new EventEmitter<ConflictResolutionChoice>();
  @Output() cancelled = new EventEmitter<void>();

  selectedOption = signal<'local' | 'server' | 'merge' | null>(null);

  canMerge(): boolean {
    const conflictFields = this.conflict().conflictFields || [];
    // Allow merge if conflicts are in non-critical fields
    return conflictFields.every(field => 
      field === 'descricao' || field === 'ativo'
    );
  }

  getMergedCategory(): Category {
    const local = this.conflict().localCategory;
    const server = this.conflict().serverCategory;
    
    return {
      ...server, // Use server as base (has correct ID, timestamps)
      nome: local.nome.length > server.nome.length ? local.nome : server.nome,
      descricao: local.descricao.length > server.descricao.length ? local.descricao : server.descricao,
      ativo: local.ativo || server.ativo // Prefer active status
    };
  }

  getConflictFields(): Array<{name: string, label: string, localValue: any, serverValue: any}> {
    const local = this.conflict().localCategory;
    const server = this.conflict().serverCategory;
    const conflictFields = this.conflict().conflictFields || [];

    const fieldLabels: Record<string, string> = {
      nome: 'Nome',
      descricao: 'Descrição',
      ativo: 'Status'
    };

    return conflictFields.map(field => ({
      name: field,
      label: fieldLabels[field] || field,
      localValue: field === 'ativo' 
        ? ((local as any)[field] ? 'Ativo' : 'Inativo')
        : (local as any)[field],
      serverValue: field === 'ativo' 
        ? ((server as any)[field] ? 'Ativo' : 'Inativo')
        : (server as any)[field]
    }));
  }

  onResolve(): void {
    const option = this.selectedOption();
    if (!option) return;

    let selectedCategory: Category;
    
    switch (option) {
      case 'local':
        selectedCategory = this.conflict().localCategory;
        break;
      case 'server':
        selectedCategory = this.conflict().serverCategory;
        break;
      case 'merge':
        selectedCategory = this.getMergedCategory();
        break;
      default:
        return;
    }

    this.resolved.emit({
      selectedCategory,
      strategy: option
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
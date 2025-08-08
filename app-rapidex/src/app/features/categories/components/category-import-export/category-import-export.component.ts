import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import {
  CategoryImportRequest,
  CategoryImportResult,
  CategoryImportProgress,
  CategoryImportValidationResult,
  CategoryExportRequest,
  CategoryExportResult,
  CategoryTemplateOptions,
  ImportExportFormat,
  CategoryImportRollbackRequest
} from '../../models/category-import-export.models';
import { CategoryImportService } from '../../services/category-import.service';
import { CategoryExportService } from '../../services/category-export.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-category-import-export',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="import-export-container">
      <div class="tabs">
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'import'"
          (click)="setActiveTab('import')"
          type="button">
          Importar Categorias
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'export'"
          (click)="setActiveTab('export')"
          type="button">
          Exportar Categorias
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'template'"
          (click)="setActiveTab('template')"
          type="button">
          Gerar Template
        </button>
      </div>

      <!-- Import Tab -->
      <div class="tab-content" *ngIf="activeTab() === 'import'">
        <div class="import-section">
          <h3>Importar Categorias</h3>
          
          <form [formGroup]="importForm" (ngSubmit)="onImport()">
            <div class="form-group">
              <label for="importFile">Arquivo:</label>
              <input 
                type="file" 
                id="importFile"
                accept=".csv,.xlsx,.json"
                (change)="onFileSelected($event)"
                [disabled]="importing()">
              <small class="help-text">
                Formatos suportados: CSV, Excel (.xlsx), JSON
              </small>
            </div>

            <div class="form-group">
              <label for="format">Formato:</label>
              <select id="format" formControlName="format" [disabled]="importing()">
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="skipDuplicates"
                  [disabled]="importing()">
                Pular duplicatas
              </label>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="updateExisting"
                  [disabled]="importing()">
                Atualizar existentes
              </label>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="continueOnError"
                  [disabled]="importing()">
                Continuar em caso de erro
              </label>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="validateOnly"
                  [disabled]="importing()">
                Apenas validar (não importar)
              </label>
            </div>

            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="!selectedFile() || importing() || !importForm.valid">
                <span *ngIf="importing()">Importando...</span>
                <span *ngIf="!importing()">Importar</span>
              </button>
              
              <button 
                type="button" 
                class="btn btn-secondary"
                (click)="onValidateFile()"
                [disabled]="!selectedFile() || importing()">
                Validar Arquivo
              </button>
            </div>
          </form>

          <!-- Import Progress -->
          <div class="progress-section" *ngIf="importProgress()">
            <h4>Progresso da Importação</h4>
            <div class="progress-bar">
              <div 
                class="progress-fill"
                [style.width.%]="progressPercentage()">
              </div>
            </div>
            <div class="progress-info">
              <p>Status: {{ getStatusText(importProgress()!.status) }}</p>
              <p>Processadas: {{ importProgress()!.processedRows }} / {{ importProgress()!.totalRows }}</p>
              <p>Sucesso: {{ importProgress()!.successfulRows }}</p>
              <p>Falhas: {{ importProgress()!.failedRows }}</p>
            </div>
          </div>

          <!-- Import Result -->
          <div class="result-section" *ngIf="importResult()">
            <h4>Resultado da Importação</h4>
            <div class="result-summary">
              <p><strong>Total de linhas:</strong> {{ importResult()!.totalRows }}</p>
              <p><strong>Importadas:</strong> {{ importResult()!.importedRows }}</p>
              <p><strong>Puladas:</strong> {{ importResult()!.skippedRows }}</p>
              <p><strong>Falhas:</strong> {{ importResult()!.failedRows }}</p>
            </div>

            <div class="rollback-section" *ngIf="importResult()!.canRollback">
              <button 
                type="button" 
                class="btn btn-warning"
                (click)="onRollback()"
                [disabled]="rollingBack()">
                <span *ngIf="rollingBack()">Desfazendo...</span>
                <span *ngIf="!rollingBack()">Desfazer Importação</span>
              </button>
            </div>

            <!-- Import Errors -->
            <div class="errors-section" *ngIf="importResult()!.errors.length > 0">
              <h5>Erros de Importação</h5>
              <div class="error-list">
                <div 
                  class="error-item" 
                  *ngFor="let error of importResult()!.errors">
                  <strong>Linha {{ error.rowIndex + 1 }}:</strong>
                  {{ error.categoryName }} - {{ error.error }}
                </div>
              </div>
            </div>
          </div>

          <!-- Validation Result -->
          <div class="validation-section" *ngIf="validationResult()">
            <h4>Resultado da Validação</h4>
            <div class="validation-summary">
              <p><strong>Total de linhas:</strong> {{ validationResult()!.totalRows }}</p>
              <p><strong>Válidas:</strong> {{ validationResult()!.validRows }}</p>
              <p><strong>Inválidas:</strong> {{ validationResult()!.invalidRows }}</p>
              <p><strong>Status:</strong> 
                <span [class]="validationResult()!.isValid ? 'success' : 'error'">
                  {{ validationResult()!.isValid ? 'Válido' : 'Inválido' }}
                </span>
              </p>
            </div>

            <!-- Validation Errors -->
            <div class="validation-errors" *ngIf="validationResult()!.rowValidations.length > 0">
              <h5>Detalhes da Validação</h5>
              <div class="validation-list">
                <div 
                  class="validation-item"
                  *ngFor="let validation of getInvalidRows()"
                  [class.error]="!validation.isValid">
                  <strong>Linha {{ validation.rowIndex + 1 }}:</strong>
                  <ul>
                    <li *ngFor="let error of validation.errors" class="error">{{ error }}</li>
                    <li *ngFor="let warning of validation.warnings" class="warning">{{ warning }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Export Tab -->
      <div class="tab-content" *ngIf="activeTab() === 'export'">
        <div class="export-section">
          <h3>Exportar Categorias</h3>
          
          <form [formGroup]="exportForm" (ngSubmit)="onExport()">
            <div class="form-group">
              <label for="exportFormat">Formato:</label>
              <select id="exportFormat" formControlName="format" [disabled]="exporting()">
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="includeInactive"
                  [disabled]="exporting()">
                Incluir categorias inativas
              </label>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="includeProductCount"
                  [disabled]="exporting()">
                Incluir contagem de produtos
              </label>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="includeTimestamps"
                  [disabled]="exporting()">
                Incluir datas de criação/atualização
              </label>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="includeMetadata"
                  [disabled]="exporting()">
                Incluir metadados (ID, estabelecimento)
              </label>
            </div>

            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="exporting() || !exportForm.valid">
                <span *ngIf="exporting()">Exportando...</span>
                <span *ngIf="!exporting()">Exportar</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Template Tab -->
      <div class="tab-content" *ngIf="activeTab() === 'template'">
        <div class="template-section">
          <h3>Gerar Template de Importação</h3>
          
          <form [formGroup]="templateForm" (ngSubmit)="onGenerateTemplate()">
            <div class="form-group">
              <label for="templateFormat">Formato:</label>
              <select id="templateFormat" formControlName="format" [disabled]="generatingTemplate()">
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="includeExamples"
                  [disabled]="generatingTemplate()">
                Incluir exemplos
              </label>
            </div>

            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  formControlName="includeInstructions"
                  [disabled]="generatingTemplate()">
                Incluir instruções
              </label>
            </div>

            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="generatingTemplate() || !templateForm.valid">
                <span *ngIf="generatingTemplate()">Gerando...</span>
                <span *ngIf="!generatingTemplate()">Gerar Template</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./category-import-export.component.scss']
})
export class CategoryImportExportComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // Signals
  activeTab = signal<'import' | 'export' | 'template'>('import');
  selectedFile = signal<File | null>(null);
  importing = signal(false);
  exporting = signal(false);
  generatingTemplate = signal(false);
  rollingBack = signal(false);
  importProgress = signal<CategoryImportProgress | null>(null);
  importResult = signal<CategoryImportResult | null>(null);
  validationResult = signal<CategoryImportValidationResult | null>(null);

  // Computed
  progressPercentage = computed(() => {
    const progress = this.importProgress();
    if (!progress || progress.totalRows === 0) return 0;
    return Math.round((progress.processedRows / progress.totalRows) * 100);
  });

  // Forms
  importForm: FormGroup;
  exportForm: FormGroup;
  templateForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private importService: CategoryImportService,
    private exportService: CategoryExportService,
    private estabelecimentoService: EstabelecimentoService,
    private notificationService: NotificationService
  ) {
    this.importForm = this.createImportForm();
    this.exportForm = this.createExportForm();
    this.templateForm = this.createTemplateForm();
  }

  ngOnInit(): void {
    this.subscribeToImportProgress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: 'import' | 'export' | 'template'): void {
    this.activeTab.set(tab);
    this.clearResults();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedFile.set(file);

    if (file) {
      // Auto-detect format based on file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      let format: ImportExportFormat = 'csv';
      
      switch (extension) {
        case 'xlsx':
        case 'xls':
          format = 'excel';
          break;
        case 'json':
          format = 'json';
          break;
        default:
          format = 'csv';
      }
      
      this.importForm.patchValue({ format });
    }
  }

  onValidateFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    const estabelecimento = this.estabelecimentoService.getSelectedEstabelecimento();
    if (!estabelecimento) {
      this.notificationService.error('Selecione um estabelecimento');
      return;
    }
    const estabelecimentoId = estabelecimento.id;

    const request: CategoryImportRequest = {
      estabelecimentoId,
      file,
      format: this.importForm.value.format,
      options: {
        ...this.importForm.value,
        validateOnly: true,
        batchSize: 10
      }
    };

    this.importing.set(true);
    this.validationResult.set(null);

    this.importService.validateImportFile(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.importing.set(false))
      )
      .subscribe({
        next: (result) => {
          this.validationResult.set(result);
          if (result.isValid) {
            this.notificationService.success('Arquivo válido para importação');
          } else {
            this.notificationService.warning(`Arquivo contém ${result.invalidRows} linha(s) inválida(s)`);
          }
        },
        error: (error) => {
          this.notificationService.error(`Erro na validação: ${error.message}`);
        }
      });
  }

  onImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    const estabelecimento = this.estabelecimentoService.getSelectedEstabelecimento();
    if (!estabelecimento) {
      this.notificationService.error('Selecione um estabelecimento');
      return;
    }
    const estabelecimentoId = estabelecimento.id;

    const request: CategoryImportRequest = {
      estabelecimentoId,
      file,
      format: this.importForm.value.format,
      options: {
        ...this.importForm.value,
        batchSize: 10
      }
    };

    this.importing.set(true);
    this.importResult.set(null);

    this.importService.importCategories(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.importing.set(false))
      )
      .subscribe({
        next: (result) => {
          this.importResult.set(result);
          if (result.success) {
            this.notificationService.success(
              `Importação concluída: ${result.importedRows} categoria(s) importada(s)`
            );
          } else {
            this.notificationService.warning(
              `Importação concluída com erros: ${result.failedRows} falha(s)`
            );
          }
        },
        error: (error) => {
          this.notificationService.error(`Erro na importação: ${error.message}`);
        }
      });
  }

  onExport(): void {
    const estabelecimento = this.estabelecimentoService.getSelectedEstabelecimento();
    if (!estabelecimento) {
      this.notificationService.error('Selecione um estabelecimento');
      return;
    }
    const estabelecimentoId = estabelecimento.id;

    const request: CategoryExportRequest = {
      estabelecimentoId,
      format: this.exportForm.value.format,
      options: this.exportForm.value
    };

    this.exporting.set(true);

    this.exportService.exportCategories(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.exporting.set(false))
      )
      .subscribe({
        next: (result) => {
          this.exportService.downloadFile(result.blob, result.filename);
          this.notificationService.success(
            `Exportação concluída: ${result.exportedCategories} categoria(s) exportada(s)`
          );
        },
        error: (error) => {
          this.notificationService.error(`Erro na exportação: ${error.message}`);
        }
      });
  }

  onGenerateTemplate(): void {
    const options: CategoryTemplateOptions = {
      ...this.templateForm.value,
      language: 'pt-BR' as const
    };

    this.generatingTemplate.set(true);

    this.importService.generateTemplate(options)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.generatingTemplate.set(false))
      )
      .subscribe({
        next: (result) => {
          this.exportService.downloadFile(result.blob, result.filename);
          this.notificationService.success('Template gerado com sucesso');
        },
        error: (error) => {
          this.notificationService.error(`Erro ao gerar template: ${error.message}`);
        }
      });
  }

  onRollback(): void {
    const result = this.importResult();
    if (!result?.rollbackToken) return;

    const request: CategoryImportRollbackRequest = {
      rollbackToken: result.rollbackToken,
      reason: 'Rollback solicitado pelo usuário'
    };

    this.rollingBack.set(true);

    this.importService.rollbackImport(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.rollingBack.set(false))
      )
      .subscribe({
        next: (rollbackResult) => {
          if (rollbackResult.success) {
            this.notificationService.success(
              `Rollback concluído: ${rollbackResult.rolledBackCategories} categoria(s) removida(s)`
            );
            this.importResult.set(null);
          } else {
            this.notificationService.error('Erro no rollback');
          }
        },
        error: (error) => {
          this.notificationService.error(`Erro no rollback: ${error.message}`);
        }
      });
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'validating': 'Validando',
      'importing': 'Importando',
      'completed': 'Concluído',
      'failed': 'Falhou',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  getInvalidRows(): any[] {
    return this.validationResult()?.rowValidations.filter(r => !r.isValid) || [];
  }

  private createImportForm(): FormGroup {
    return this.fb.group({
      format: ['csv', Validators.required],
      skipDuplicates: [true],
      updateExisting: [false],
      continueOnError: [true],
      validateOnly: [false]
    });
  }

  private createExportForm(): FormGroup {
    return this.fb.group({
      format: ['csv', Validators.required],
      includeInactive: [false],
      includeProductCount: [true],
      includeTimestamps: [false],
      includeMetadata: [false]
    });
  }

  private createTemplateForm(): FormGroup {
    return this.fb.group({
      format: ['csv', Validators.required],
      includeExamples: [true],
      includeInstructions: [true]
    });
  }

  private subscribeToImportProgress(): void {
    this.importService.importProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.importProgress.set(progress);
      });
  }

  private clearResults(): void {
    this.importResult.set(null);
    this.validationResult.set(null);
    this.importProgress.set(null);
    this.selectedFile.set(null);
    this.importService.clearProgress();
  }
}
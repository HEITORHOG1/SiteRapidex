import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, throwError, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import {
  CategoryImportRequest,
  CategoryImportResult,
  CategoryImportProgress,
  CategoryImportValidationResult,
  CategoryImportTemplate,
  CategoryImportRowValidation,
  CategoryImportError,
  CategoryImportRollbackRequest,
  CategoryImportRollbackResult,
  CategoryImportHistoryEntry,
  CategoryTemplateOptions,
  CategoryTemplateResult,
  ImportExportFormat
} from '../models/category-import-export.models';
import { Category } from '../models/category.models';
import { CreateCategoryRequest } from '../models/category-dto.models';
import { CategoryHttpService } from './category-http.service';

/**
 * Service for importing categories from various file formats
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryImportService {
  private readonly importProgressSubject = new BehaviorSubject<CategoryImportProgress | null>(null);
  public readonly importProgress$ = this.importProgressSubject.asObservable();

  private readonly API_BASE = '/api/categorias';

  constructor(
    private http: HttpClient,
    private categoryHttpService: CategoryHttpService
  ) {}

  /**
   * Validate import file before processing
   */
  validateImportFile(request: CategoryImportRequest): Observable<CategoryImportValidationResult> {
    return from(this.parseImportFile(request.file, request.format)).pipe(
      map(data => this.validateImportData(data, request.estabelecimentoId)),
      catchError(error => {
        return of({
          isValid: false,
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          rowValidations: [],
          globalErrors: [`Erro ao processar arquivo: ${error.message}`],
          duplicateNames: []
        });
      })
    );
  }

  /**
   * Import categories from file
   */
  importCategories(request: CategoryImportRequest): Observable<CategoryImportResult> {
    if (request.options.validateOnly) {
      return this.validateImportFile(request).pipe(
        map(validation => ({
          success: validation.isValid,
          totalRows: validation.totalRows,
          importedRows: 0,
          skippedRows: validation.invalidRows,
          failedRows: validation.invalidRows,
          importedCategories: [],
          skippedCategories: [],
          errors: validation.rowValidations
            .filter(row => !row.isValid)
            .map(row => ({
              rowIndex: row.rowIndex,
              categoryName: row.data?.nome || 'Desconhecido',
              error: row.errors.join(', '),
              errorCode: 'VALIDATION_ERROR',
              canRetry: false
            })),
          canRollback: false
        }))
      );
    }

    return this.validateImportFile(request).pipe(
      switchMap(validation => {
        if (!validation.isValid && !request.options.continueOnError) {
          return throwError(() => new Error('Arquivo contém erros de validação'));
        }

        return this.processImport(request, validation);
      })
    );
  }

  /**
   * Get import history for establishment
   */
  getImportHistory(estabelecimentoId: number): Observable<CategoryImportHistoryEntry[]> {
    return this.http.get<CategoryImportHistoryEntry[]>(
      `${this.API_BASE}/estabelecimentos/${estabelecimentoId}/import-history`
    );
  }

  /**
   * Rollback import operation
   */
  rollbackImport(request: CategoryImportRollbackRequest): Observable<CategoryImportRollbackResult> {
    return this.http.post<CategoryImportRollbackResult>(
      `${this.API_BASE}/import/rollback`,
      request
    );
  }

  /**
   * Generate import template
   */
  generateTemplate(options: CategoryTemplateOptions): Observable<CategoryTemplateResult> {
    return from(this.createImportTemplate(options));
  }

  /**
   * Parse import file based on format
   */
  private async parseImportFile(file: File, format: ImportExportFormat): Promise<CategoryImportTemplate[]> {
    switch (format) {
      case 'csv':
        return this.parseCSVFile(file);
      case 'excel':
        return this.parseExcelFile(file);
      case 'json':
        return this.parseJSONFile(file);
      default:
        throw new Error(`Formato não suportado: ${format}`);
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSVFile(file: File): Promise<CategoryImportTemplate[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('Arquivo CSV está vazio');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const expectedHeaders = ['nome', 'descricao', 'ativo'];
    
    if (!header.includes('nome') || !header.includes('descricao')) {
      throw new Error('Arquivo CSV deve conter pelo menos as colunas "nome" e "descricao"');
    }

    // Parse data rows
    const data: CategoryImportTemplate[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: CategoryImportTemplate = {
        nome: '',
        descricao: '',
        ativo: true
      };

      header.forEach((col, index) => {
        const value = values[index]?.trim().replace(/"/g, '') || '';
        switch (col.toLowerCase()) {
          case 'nome':
            row.nome = value;
            break;
          case 'descricao':
            row.descricao = value;
            break;
          case 'ativo':
            row.ativo = this.parseBoolean(value);
            break;
        }
      });

      data.push(row);
    }

    return data;
  }

  /**
   * Parse Excel file (simplified implementation)
   */
  private async parseExcelFile(file: File): Promise<CategoryImportTemplate[]> {
    // In a real implementation, you would use a library like SheetJS
    // For now, we'll treat it as CSV
    return this.parseCSVFile(file);
  }

  /**
   * Parse JSON file
   */
  private async parseJSONFile(file: File): Promise<CategoryImportTemplate[]> {
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('Arquivo JSON deve conter um array de categorias');
      }

      return data.map((item: any) => ({
        nome: item.nome || '',
        descricao: item.descricao || '',
        ativo: item.ativo !== undefined ? Boolean(item.ativo) : true
      }));
    } catch (error: any) {
      throw new Error(`Erro ao processar JSON: ${error.message}`);
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Parse boolean value from string
   */
  private parseBoolean(value: string): boolean {
    const lowerValue = value.toLowerCase().trim();
    return ['true', '1', 'sim', 'ativo', 'yes'].includes(lowerValue);
  }

  /**
   * Validate import data
   */
  private validateImportData(
    data: CategoryImportTemplate[],
    estabelecimentoId: number
  ): CategoryImportValidationResult {
    const rowValidations: CategoryImportRowValidation[] = [];
    const duplicateNames: string[] = [];
    const nameSet = new Set<string>();

    data.forEach((row, index) => {
      const validation = this.validateImportRow(row, index);
      rowValidations.push(validation);

      // Check for duplicates within the file
      if (row.nome && nameSet.has(row.nome.toLowerCase())) {
        duplicateNames.push(row.nome);
        validation.errors.push('Nome duplicado no arquivo');
        validation.isValid = false;
      } else if (row.nome) {
        nameSet.add(row.nome.toLowerCase());
      }
    });

    const validRows = rowValidations.filter(r => r.isValid).length;
    const invalidRows = rowValidations.length - validRows;

    return {
      isValid: invalidRows === 0,
      totalRows: data.length,
      validRows,
      invalidRows,
      rowValidations,
      globalErrors: [],
      duplicateNames: [...new Set(duplicateNames)]
    };
  }

  /**
   * Validate single import row
   */
  private validateImportRow(row: CategoryImportTemplate, index: number): CategoryImportRowValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!row.nome || row.nome.trim().length === 0) {
      errors.push('Nome é obrigatório');
    } else if (row.nome.length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    } else if (row.nome.length > 100) {
      errors.push('Nome deve ter no máximo 100 caracteres');
    }

    if (!row.descricao || row.descricao.trim().length === 0) {
      warnings.push('Descrição está vazia');
    } else if (row.descricao.length > 500) {
      errors.push('Descrição deve ter no máximo 500 caracteres');
    }

    // Validate special characters
    const invalidChars = /[<>]/g;
    if (invalidChars.test(row.nome)) {
      errors.push('Nome contém caracteres inválidos');
    }
    if (invalidChars.test(row.descricao)) {
      errors.push('Descrição contém caracteres inválidos');
    }

    return {
      rowIndex: index,
      isValid: errors.length === 0,
      errors,
      warnings,
      data: row
    };
  }

  /**
   * Process import operation
   */
  private processImport(
    request: CategoryImportRequest,
    validation: CategoryImportValidationResult
  ): Observable<CategoryImportResult> {
    const validRows = validation.rowValidations.filter(r => r.isValid);
    const progress: CategoryImportProgress = {
      totalRows: validRows.length,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      currentRow: 0,
      status: 'importing',
      startTime: new Date(),
      errors: []
    };

    this.importProgressSubject.next(progress);

    return from(this.importCategoriesBatch(request, validRows, progress));
  }

  /**
   * Import categories in batches
   */
  private async importCategoriesBatch(
    request: CategoryImportRequest,
    validRows: CategoryImportRowValidation[],
    progress: CategoryImportProgress
  ): Promise<CategoryImportResult> {
    const importedCategories: Category[] = [];
    const skippedCategories: CategoryImportTemplate[] = [];
    const errors: CategoryImportError[] = [];
    const batchSize = request.options.batchSize || 10;

    try {
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        
        for (const rowValidation of batch) {
          progress.currentRow = rowValidation.rowIndex;
          progress.processedRows++;
          this.importProgressSubject.next({ ...progress });

          try {
            const categoryRequest: CreateCategoryRequest = {
              nome: rowValidation.data!.nome.trim(),
              descricao: rowValidation.data!.descricao.trim()
            };

            const category = await this.categoryHttpService
              .createCategory(request.estabelecimentoId, categoryRequest)
              .toPromise();

            if (category) {
              importedCategories.push(category);
              progress.successfulRows++;
            }
          } catch (error: any) {
            const importError: CategoryImportError = {
              rowIndex: rowValidation.rowIndex,
              categoryName: rowValidation.data!.nome,
              error: error.message || 'Erro desconhecido',
              errorCode: error.status?.toString() || 'UNKNOWN_ERROR',
              canRetry: error.status !== 400
            };

            errors.push(importError);
            progress.failedRows++;

            if (!request.options.continueOnError) {
              throw error;
            }
          }
        }

        // Small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      progress.status = 'completed';
      progress.endTime = new Date();
      this.importProgressSubject.next({ ...progress });

      return {
        success: errors.length === 0 || request.options.continueOnError,
        totalRows: validRows.length,
        importedRows: importedCategories.length,
        skippedRows: skippedCategories.length,
        failedRows: errors.length,
        importedCategories,
        skippedCategories,
        errors,
        canRollback: importedCategories.length > 0,
        rollbackToken: importedCategories.length > 0 ? this.generateRollbackToken() : undefined,
        rollbackExpiresAt: importedCategories.length > 0 ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined
      };
    } catch (error: any) {
      progress.status = 'failed';
      progress.endTime = new Date();
      progress.errors.push({
        rowIndex: progress.currentRow,
        categoryName: 'Processo de importação',
        error: error.message || 'Erro desconhecido',
        errorCode: 'IMPORT_FAILED',
        canRetry: true
      });
      this.importProgressSubject.next({ ...progress });

      throw error;
    }
  }

  /**
   * Generate rollback token
   */
  private generateRollbackToken(): string {
    return `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create import template
   */
  private async createImportTemplate(options: CategoryTemplateOptions): Promise<CategoryTemplateResult> {
    const examples: CategoryImportTemplate[] = options.includeExamples ? [
      {
        nome: 'Bebidas',
        descricao: 'Categoria para bebidas em geral',
        ativo: true
      },
      {
        nome: 'Pratos Principais',
        descricao: 'Pratos principais do cardápio',
        ativo: true
      },
      {
        nome: 'Sobremesas',
        descricao: 'Doces e sobremesas',
        ativo: true
      }
    ] : [];

    let blob: Blob;
    let filename: string;

    switch (options.format) {
      case 'csv':
        blob = this.createCSVTemplate(examples, options);
        filename = `template-categorias.csv`;
        break;
      case 'excel':
        blob = this.createExcelTemplate(examples, options);
        filename = `template-categorias.xlsx`;
        break;
      case 'json':
        blob = this.createJSONTemplate(examples, options);
        filename = `template-categorias.json`;
        break;
      default:
        throw new Error(`Formato não suportado: ${options.format}`);
    }

    return {
      success: true,
      filename,
      blob,
      format: options.format,
      generatedAt: new Date()
    };
  }

  /**
   * Create CSV template
   */
  private createCSVTemplate(examples: CategoryImportTemplate[], options: CategoryTemplateOptions): Blob {
    const headers = ['nome', 'descricao', 'ativo'];
    const instructions = options.includeInstructions ? [
      '# Instruções para importação de categorias',
      '# - nome: Nome da categoria (obrigatório, 2-100 caracteres)',
      '# - descricao: Descrição da categoria (opcional, máximo 500 caracteres)',
      '# - ativo: true/false, 1/0, sim/não (opcional, padrão: true)',
      '# - Não use caracteres especiais como < >',
      '# - Nomes duplicados serão ignorados',
      '#'
    ] : [];

    const rows = [
      ...instructions,
      headers.join(','),
      ...examples.map(example => 
        `"${example.nome}","${example.descricao}",${example.ativo}`
      )
    ];

    const csvContent = '\ufeff' + rows.join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Create Excel template (simplified)
   */
  private createExcelTemplate(examples: CategoryImportTemplate[], options: CategoryTemplateOptions): Blob {
    // For simplicity, create as CSV
    // In production, use proper Excel library
    return this.createCSVTemplate(examples, options);
  }

  /**
   * Create JSON template
   */
  private createJSONTemplate(examples: CategoryImportTemplate[], options: CategoryTemplateOptions): Blob {
    const template = {
      _instructions: options.includeInstructions ? {
        format: 'Array de objetos com as propriedades: nome, descricao, ativo',
        rules: [
          'nome: obrigatório, 2-100 caracteres',
          'descricao: opcional, máximo 500 caracteres',
          'ativo: opcional, boolean (padrão: true)'
        ],
        example: 'Veja os exemplos abaixo'
      } : undefined,
      categories: examples
    };

    const jsonContent = JSON.stringify(template, null, 2);
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  }

  /**
   * Clear import progress
   */
  clearProgress(): void {
    this.importProgressSubject.next(null);
  }
}
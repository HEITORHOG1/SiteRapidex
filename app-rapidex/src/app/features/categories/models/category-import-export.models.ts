import { Category } from './category.models';

/**
 * Import/Export format types
 */
export type ImportExportFormat = 'csv' | 'excel' | 'json';

/**
 * Import template data structure
 */
export interface CategoryImportTemplate {
  nome: string;
  descricao: string;
  ativo?: boolean;
}

/**
 * Import validation result for a single row
 */
export interface CategoryImportRowValidation {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: CategoryImportTemplate;
}

/**
 * Import validation result for entire file
 */
export interface CategoryImportValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rowValidations: CategoryImportRowValidation[];
  globalErrors: string[];
  duplicateNames: string[];
}

/**
 * Import progress tracking
 */
export interface CategoryImportProgress {
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  currentRow: number;
  status: 'validating' | 'importing' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  errors: CategoryImportError[];
}

/**
 * Import error details
 */
export interface CategoryImportError {
  rowIndex: number;
  categoryName: string;
  error: string;
  errorCode: string;
  canRetry: boolean;
}

/**
 * Import request configuration
 */
export interface CategoryImportRequest {
  estabelecimentoId: number;
  file: File;
  format: ImportExportFormat;
  options: CategoryImportOptions;
}

/**
 * Import options
 */
export interface CategoryImportOptions {
  skipDuplicates: boolean;
  updateExisting: boolean;
  validateOnly: boolean;
  batchSize: number;
  continueOnError: boolean;
  createBackup: boolean;
}

/**
 * Import result
 */
export interface CategoryImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  failedRows: number;
  importedCategories: Category[];
  skippedCategories: CategoryImportTemplate[];
  errors: CategoryImportError[];
  backupId?: string;
  canRollback: boolean;
  rollbackToken?: string;
  rollbackExpiresAt?: Date;
}

/**
 * Export request configuration
 */
export interface CategoryExportRequest {
  estabelecimentoId: number;
  format: ImportExportFormat;
  options: CategoryExportOptions;
  filters?: CategoryExportFilters;
}

/**
 * Export options
 */
export interface CategoryExportOptions {
  includeInactive: boolean;
  includeProductCount: boolean;
  includeTimestamps: boolean;
  includeMetadata: boolean;
  customFields: string[];
}

/**
 * Export filters
 */
export interface CategoryExportFilters {
  search?: string;
  ativo?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  categoryIds?: number[];
}

/**
 * Export result
 */
export interface CategoryExportResult {
  success: boolean;
  filename: string;
  blob: Blob;
  totalCategories: number;
  exportedCategories: number;
  format: ImportExportFormat;
  generatedAt: Date;
}

/**
 * Rollback request
 */
export interface CategoryImportRollbackRequest {
  rollbackToken: string;
  reason?: string;
}

/**
 * Rollback result
 */
export interface CategoryImportRollbackResult {
  success: boolean;
  rolledBackCategories: number;
  restoredCategories: number;
  errors: string[];
}

/**
 * Import history entry
 */
export interface CategoryImportHistoryEntry {
  id: string;
  estabelecimentoId: number;
  filename: string;
  format: ImportExportFormat;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  importedBy: number;
  importedByName: string;
  importedAt: Date;
  status: 'completed' | 'failed' | 'rolled_back';
  canRollback: boolean;
  rollbackToken?: string;
  rollbackExpiresAt?: Date;
  rolledBackAt?: Date;
  rolledBackBy?: number;
  rolledBackByName?: string;
  rollbackReason?: string;
}

/**
 * Template generation options
 */
export interface CategoryTemplateOptions {
  format: ImportExportFormat;
  includeExamples: boolean;
  includeInstructions: boolean;
  language: 'pt-BR' | 'en-US';
}

/**
 * Template generation result
 */
export interface CategoryTemplateResult {
  success: boolean;
  filename: string;
  blob: Blob;
  format: ImportExportFormat;
  generatedAt: Date;
}
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CategoryImportExportComponent } from './category-import-export.component';
import { CategoryImportService } from '../../services/category-import.service';
import { CategoryExportService } from '../../services/category-export.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { of, throwError, BehaviorSubject } from 'rxjs';
import {
  CategoryImportValidationResult,
  CategoryImportResult,
  CategoryExportResult,
  CategoryTemplateResult,
  CategoryImportProgress
} from '../../models/category-import-export.models';

describe('CategoryImportExportComponent', () => {
  let component: CategoryImportExportComponent;
  let fixture: ComponentFixture<CategoryImportExportComponent>;
  let importService: jasmine.SpyObj<CategoryImportService>;
  let exportService: jasmine.SpyObj<CategoryExportService>;
  let estabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockValidationResult: CategoryImportValidationResult = {
    isValid: true,
    totalRows: 2,
    validRows: 2,
    invalidRows: 0,
    rowValidations: [
      {
        rowIndex: 0,
        isValid: true,
        errors: [],
        warnings: [],
        data: { nome: 'Bebidas', descricao: 'Categoria de bebidas', ativo: true }
      },
      {
        rowIndex: 1,
        isValid: true,
        errors: [],
        warnings: [],
        data: { nome: 'Comidas', descricao: 'Categoria de comidas', ativo: true }
      }
    ],
    globalErrors: [],
    duplicateNames: []
  };

  const mockImportResult: CategoryImportResult = {
    success: true,
    totalRows: 2,
    importedRows: 2,
    skippedRows: 0,
    failedRows: 0,
    importedCategories: [
      { id: 1, nome: 'Bebidas', descricao: 'Categoria de bebidas', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() },
      { id: 2, nome: 'Comidas', descricao: 'Categoria de comidas', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() }
    ],
    skippedCategories: [],
    errors: [],
    canRollback: true,
    rollbackToken: 'test-token',
    rollbackExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };

  const mockExportResult: CategoryExportResult = {
    success: true,
    filename: 'categorias-1-2024-01-01.csv',
    blob: new Blob(['test content'], { type: 'text/csv' }),
    totalCategories: 2,
    exportedCategories: 2,
    format: 'csv',
    generatedAt: new Date()
  };

  const mockTemplateResult: CategoryTemplateResult = {
    success: true,
    filename: 'template-categorias.csv',
    blob: new Blob(['template content'], { type: 'text/csv' }),
    format: 'csv',
    generatedAt: new Date()
  };

  beforeEach(async () => {
    const importSpy = jasmine.createSpyObj('CategoryImportService', [
      'validateImportFile',
      'importCategories',
      'rollbackImport',
      'generateTemplate',
      'clearProgress'
    ], {
      importProgress$: new BehaviorSubject<CategoryImportProgress | null>(null)
    });

    const exportSpy = jasmine.createSpyObj('CategoryExportService', [
      'exportCategories',
      'downloadFile'
    ]);

    const estabelecimentoSpy = jasmine.createSpyObj('EstabelecimentoService', [
      'getSelectedEstablishmentId'
    ]);

    const notificationSpy = jasmine.createSpyObj('NotificationService', [
      'showSuccess',
      'showError',
      'showWarning'
    ]);

    await TestBed.configureTestingModule({
      imports: [CategoryImportExportComponent, ReactiveFormsModule],
      providers: [
        { provide: CategoryImportService, useValue: importSpy },
        { provide: CategoryExportService, useValue: exportSpy },
        { provide: EstabelecimentoService, useValue: estabelecimentoSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryImportExportComponent);
    component = fixture.componentInstance;
    importService = TestBed.inject(CategoryImportService) as jasmine.SpyObj<CategoryImportService>;
    exportService = TestBed.inject(CategoryExportService) as jasmine.SpyObj<CategoryExportService>;
    estabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

    estabelecimentoService.getSelectedEstablishmentId.and.returnValue(1);
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with import tab active', () => {
      expect(component.activeTab()).toBe('import');
    });

    it('should initialize forms with default values', () => {
      expect(component.importForm.get('format')?.value).toBe('csv');
      expect(component.exportForm.get('format')?.value).toBe('csv');
      expect(component.templateForm.get('format')?.value).toBe('csv');
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to export tab', () => {
      component.setActiveTab('export');
      expect(component.activeTab()).toBe('export');
    });

    it('should switch to template tab', () => {
      component.setActiveTab('template');
      expect(component.activeTab()).toBe('template');
    });

    it('should clear results when switching tabs', () => {
      component.importResult.set(mockImportResult);
      component.validationResult.set(mockValidationResult);
      
      component.setActiveTab('export');
      
      expect(component.importResult()).toBeNull();
      expect(component.validationResult()).toBeNull();
      expect(importService.clearProgress).toHaveBeenCalled();
    });
  });

  describe('File Selection', () => {
    it('should handle file selection', () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const event = { target: { files: [file] } } as any;

      component.onFileSelected(event);

      expect(component.selectedFile()).toBe(file);
      expect(component.importForm.get('format')?.value).toBe('csv');
    });

    it('should auto-detect Excel format', () => {
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const event = { target: { files: [file] } } as any;

      component.onFileSelected(event);

      expect(component.selectedFile()).toBe(file);
      expect(component.importForm.get('format')?.value).toBe('excel');
    });

    it('should auto-detect JSON format', () => {
      const file = new File(['test'], 'test.json', { type: 'application/json' });
      const event = { target: { files: [file] } } as any;

      component.onFileSelected(event);

      expect(component.selectedFile()).toBe(file);
      expect(component.importForm.get('format')?.value).toBe('json');
    });

    it('should handle no file selected', () => {
      const event = { target: { files: [] } } as any;

      component.onFileSelected(event);

      expect(component.selectedFile()).toBeNull();
    });
  });

  describe('File Validation', () => {
    beforeEach(() => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      component.selectedFile.set(file);
    });

    it('should validate file successfully', () => {
      importService.validateImportFile.and.returnValue(of(mockValidationResult));

      component.onValidateFile();

      expect(importService.validateImportFile).toHaveBeenCalled();
      expect(component.validationResult()).toEqual(mockValidationResult);
      expect(notificationService.showSuccess).toHaveBeenCalledWith('Arquivo válido para importação');
    });

    it('should handle validation with warnings', () => {
      const invalidResult = {
        ...mockValidationResult,
        isValid: false,
        invalidRows: 1
      };
      importService.validateImportFile.and.returnValue(of(invalidResult));

      component.onValidateFile();

      expect(component.validationResult()).toEqual(invalidResult);
      expect(notificationService.showWarning).toHaveBeenCalledWith('Arquivo contém 1 linha(s) inválida(s)');
    });

    it('should handle validation errors', () => {
      importService.validateImportFile.and.returnValue(throwError(() => new Error('Validation error')));

      component.onValidateFile();

      expect(notificationService.showError).toHaveBeenCalledWith('Erro na validação: Validation error');
    });

    it('should not validate without file', () => {
      component.selectedFile.set(null);

      component.onValidateFile();

      expect(importService.validateImportFile).not.toHaveBeenCalled();
    });

    it('should not validate without establishment', () => {
      estabelecimentoService.getSelectedEstablishmentId.and.returnValue(null);

      component.onValidateFile();

      expect(importService.validateImportFile).not.toHaveBeenCalled();
      expect(notificationService.showError).toHaveBeenCalledWith('Selecione um estabelecimento');
    });
  });

  describe('Import Functionality', () => {
    beforeEach(() => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      component.selectedFile.set(file);
    });

    it('should import categories successfully', () => {
      importService.importCategories.and.returnValue(of(mockImportResult));

      component.onImport();

      expect(importService.importCategories).toHaveBeenCalled();
      expect(component.importResult()).toEqual(mockImportResult);
      expect(notificationService.showSuccess).toHaveBeenCalledWith('Importação concluída: 2 categoria(s) importada(s)');
    });

    it('should handle import with errors', () => {
      const resultWithErrors = {
        ...mockImportResult,
        success: false,
        failedRows: 1
      };
      importService.importCategories.and.returnValue(of(resultWithErrors));

      component.onImport();

      expect(component.importResult()).toEqual(resultWithErrors);
      expect(notificationService.showWarning).toHaveBeenCalledWith('Importação concluída com erros: 1 falha(s)');
    });

    it('should handle import errors', () => {
      importService.importCategories.and.returnValue(throwError(() => new Error('Import error')));

      component.onImport();

      expect(notificationService.showError).toHaveBeenCalledWith('Erro na importação: Import error');
    });

    it('should not import without file', () => {
      component.selectedFile.set(null);

      component.onImport();

      expect(importService.importCategories).not.toHaveBeenCalled();
    });

    it('should not import without establishment', () => {
      estabelecimentoService.getSelectedEstablishmentId.and.returnValue(null);

      component.onImport();

      expect(importService.importCategories).not.toHaveBeenCalled();
      expect(notificationService.showError).toHaveBeenCalledWith('Selecione um estabelecimento');
    });
  });

  describe('Export Functionality', () => {
    it('should export categories successfully', () => {
      exportService.exportCategories.and.returnValue(of(mockExportResult));

      component.onExport();

      expect(exportService.exportCategories).toHaveBeenCalled();
      expect(exportService.downloadFile).toHaveBeenCalledWith(mockExportResult.blob, mockExportResult.filename);
      expect(notificationService.showSuccess).toHaveBeenCalledWith('Exportação concluída: 2 categoria(s) exportada(s)');
    });

    it('should handle export errors', () => {
      exportService.exportCategories.and.returnValue(throwError(() => new Error('Export error')));

      component.onExport();

      expect(notificationService.showError).toHaveBeenCalledWith('Erro na exportação: Export error');
    });

    it('should not export without establishment', () => {
      estabelecimentoService.getSelectedEstablishmentId.and.returnValue(null);

      component.onExport();

      expect(exportService.exportCategories).not.toHaveBeenCalled();
      expect(notificationService.showError).toHaveBeenCalledWith('Selecione um estabelecimento');
    });
  });

  describe('Template Generation', () => {
    it('should generate template successfully', () => {
      importService.generateTemplate.and.returnValue(of(mockTemplateResult));

      component.onGenerateTemplate();

      expect(importService.generateTemplate).toHaveBeenCalled();
      expect(exportService.downloadFile).toHaveBeenCalledWith(mockTemplateResult.blob, mockTemplateResult.filename);
      expect(notificationService.showSuccess).toHaveBeenCalledWith('Template gerado com sucesso');
    });

    it('should handle template generation errors', () => {
      importService.generateTemplate.and.returnValue(throwError(() => new Error('Template error')));

      component.onGenerateTemplate();

      expect(notificationService.showError).toHaveBeenCalledWith('Erro ao gerar template: Template error');
    });
  });

  describe('Rollback Functionality', () => {
    beforeEach(() => {
      component.importResult.set(mockImportResult);
    });

    it('should rollback import successfully', () => {
      const rollbackResult = {
        success: true,
        rolledBackCategories: 2,
        restoredCategories: 0,
        errors: []
      };
      importService.rollbackImport.and.returnValue(of(rollbackResult));

      component.onRollback();

      expect(importService.rollbackImport).toHaveBeenCalledWith({
        rollbackToken: 'test-token',
        reason: 'Rollback solicitado pelo usuário'
      });
      expect(notificationService.showSuccess).toHaveBeenCalledWith('Rollback concluído: 2 categoria(s) removida(s)');
      expect(component.importResult()).toBeNull();
    });

    it('should handle rollback errors', () => {
      const rollbackResult = {
        success: false,
        rolledBackCategories: 0,
        restoredCategories: 0,
        errors: ['Error']
      };
      importService.rollbackImport.and.returnValue(of(rollbackResult));

      component.onRollback();

      expect(notificationService.showError).toHaveBeenCalledWith('Erro no rollback');
    });

    it('should handle rollback service errors', () => {
      importService.rollbackImport.and.returnValue(throwError(() => new Error('Rollback error')));

      component.onRollback();

      expect(notificationService.showError).toHaveBeenCalledWith('Erro no rollback: Rollback error');
    });

    it('should not rollback without token', () => {
      component.importResult.set({ ...mockImportResult, rollbackToken: undefined });

      component.onRollback();

      expect(importService.rollbackImport).not.toHaveBeenCalled();
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress percentage correctly', () => {
      const progress: CategoryImportProgress = {
        totalRows: 10,
        processedRows: 5,
        successfulRows: 4,
        failedRows: 1,
        currentRow: 5,
        status: 'importing',
        startTime: new Date(),
        errors: []
      };

      component.importProgress.set(progress);

      expect(component.progressPercentage()).toBe(50);
    });

    it('should return 0 progress for null progress', () => {
      component.importProgress.set(null);

      expect(component.progressPercentage()).toBe(0);
    });

    it('should return 0 progress for zero total rows', () => {
      const progress: CategoryImportProgress = {
        totalRows: 0,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentRow: 0,
        status: 'importing',
        startTime: new Date(),
        errors: []
      };

      component.importProgress.set(progress);

      expect(component.progressPercentage()).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    it('should translate status text correctly', () => {
      expect(component.getStatusText('validating')).toBe('Validando');
      expect(component.getStatusText('importing')).toBe('Importando');
      expect(component.getStatusText('completed')).toBe('Concluído');
      expect(component.getStatusText('failed')).toBe('Falhou');
      expect(component.getStatusText('cancelled')).toBe('Cancelado');
      expect(component.getStatusText('unknown')).toBe('unknown');
    });

    it('should filter invalid rows correctly', () => {
      const validationResult: CategoryImportValidationResult = {
        isValid: false,
        totalRows: 3,
        validRows: 2,
        invalidRows: 1,
        rowValidations: [
          { rowIndex: 0, isValid: true, errors: [], warnings: [], data: { nome: 'Valid1', descricao: 'Desc1' } },
          { rowIndex: 1, isValid: false, errors: ['Error'], warnings: [], data: { nome: 'Invalid', descricao: 'Desc2' } },
          { rowIndex: 2, isValid: true, errors: [], warnings: [], data: { nome: 'Valid2', descricao: 'Desc3' } }
        ],
        globalErrors: [],
        duplicateNames: []
      };

      component.validationResult.set(validationResult);

      const invalidRows = component.getInvalidRows();
      expect(invalidRows).toHaveLength(1);
      expect(invalidRows[0].rowIndex).toBe(1);
    });
  });
});
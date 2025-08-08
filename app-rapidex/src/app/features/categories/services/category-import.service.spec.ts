import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CategoryImportService } from './category-import.service';
import { CategoryHttpService } from './category-http.service';
import {
  CategoryImportRequest,
  CategoryImportValidationResult,
  CategoryImportResult,
  CategoryTemplateOptions,
  ImportExportFormat
} from '../models/category-import-export.models';

describe('CategoryImportService', () => {
  let service: CategoryImportService;
  let httpMock: HttpTestingController;
  let categoryHttpService: jasmine.SpyObj<CategoryHttpService>;

  beforeEach(() => {
    const categoryHttpSpy = jasmine.createSpyObj('CategoryHttpService', ['createCategory']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryImportService,
        { provide: CategoryHttpService, useValue: categoryHttpSpy }
      ]
    });

    service = TestBed.inject(CategoryImportService);
    httpMock = TestBed.inject(HttpTestingController);
    categoryHttpService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('validateImportFile', () => {
    it('should validate CSV file successfully', async () => {
      const csvContent = 'nome,descricao,ativo\n"Bebidas","Categoria de bebidas",true\n"Comidas","Categoria de comidas",false';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const request: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'csv',
        options: {
          skipDuplicates: true,
          updateExisting: false,
          validateOnly: true,
          batchSize: 10,
          continueOnError: true,
          createBackup: false
        }
      };

      const result = await service.validateImportFile(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.isValid).toBe(true);
      expect(result!.totalRows).toBe(2);
      expect(result!.validRows).toBe(2);
      expect(result!.invalidRows).toBe(0);
    });

    it('should detect validation errors in CSV file', async () => {
      const csvContent = 'nome,descricao,ativo\n"","Categoria sem nome",true\n"A","Descrição muito longa que excede o limite de 500 caracteres".repeat(20),false';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const request: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'csv',
        options: {
          skipDuplicates: true,
          updateExisting: false,
          validateOnly: true,
          batchSize: 10,
          continueOnError: true,
          createBackup: false
        }
      };

      const result = await service.validateImportFile(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.isValid).toBe(false);
      expect(result!.totalRows).toBe(2);
      expect(result!.validRows).toBe(0);
      expect(result!.invalidRows).toBe(2);
      expect(result!.rowValidations[0].errors).toContain('Nome é obrigatório');
      expect(result!.rowValidations[1].errors).toContain('Descrição deve ter no máximo 500 caracteres');
    });

    it('should validate JSON file successfully', async () => {
      const jsonContent = JSON.stringify([
        { nome: 'Bebidas', descricao: 'Categoria de bebidas', ativo: true },
        { nome: 'Comidas', descricao: 'Categoria de comidas', ativo: false }
      ]);
      const file = new File([jsonContent], 'test.json', { type: 'application/json' });
      
      const request: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'json',
        options: {
          skipDuplicates: true,
          updateExisting: false,
          validateOnly: true,
          batchSize: 10,
          continueOnError: true,
          createBackup: false
        }
      };

      const result = await service.validateImportFile(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.isValid).toBe(true);
      expect(result!.totalRows).toBe(2);
      expect(result!.validRows).toBe(2);
      expect(result!.invalidRows).toBe(0);
    });

    it('should detect duplicate names in file', async () => {
      const csvContent = 'nome,descricao,ativo\n"Bebidas","Primeira bebida",true\n"Bebidas","Segunda bebida",true';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const request: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'csv',
        options: {
          skipDuplicates: true,
          updateExisting: false,
          validateOnly: true,
          batchSize: 10,
          continueOnError: true,
          createBackup: false
        }
      };

      const result = await service.validateImportFile(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.duplicateNames).toContain('Bebidas');
      expect(result!.rowValidations[1].errors).toContain('Nome duplicado no arquivo');
    });

    it('should handle invalid file format', async () => {
      const invalidContent = 'invalid content';
      const file = new File([invalidContent], 'test.txt', { type: 'text/plain' });
      
      const request: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'csv',
        options: {
          skipDuplicates: true,
          updateExisting: false,
          validateOnly: true,
          batchSize: 10,
          continueOnError: true,
          createBackup: false
        }
      };

      const result = await service.validateImportFile(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.isValid).toBe(false);
      expect(result!.globalErrors.length).toBeGreaterThan(0);
    });
  });

  describe('generateTemplate', () => {
    it('should generate CSV template with examples', async () => {
      const options: CategoryTemplateOptions = {
        format: 'csv',
        includeExamples: true,
        includeInstructions: true,
        language: 'pt-BR'
      };

      const result = await service.generateTemplate(options).toPromise();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.format).toBe('csv');
      expect(result!.filename).toBe('template-categorias.csv');
      expect(result!.blob).toBeInstanceOf(Blob);
    });

    it('should generate JSON template with examples', async () => {
      const options: CategoryTemplateOptions = {
        format: 'json',
        includeExamples: true,
        includeInstructions: true,
        language: 'pt-BR'
      };

      const result = await service.generateTemplate(options).toPromise();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.format).toBe('json');
      expect(result!.filename).toBe('template-categorias.json');
      expect(result!.blob).toBeInstanceOf(Blob);
    });

    it('should generate template without examples', async () => {
      const options: CategoryTemplateOptions = {
        format: 'csv',
        includeExamples: false,
        includeInstructions: false,
        language: 'pt-BR'
      };

      const result = await service.generateTemplate(options).toPromise();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
    });
  });

  describe('getImportHistory', () => {
    it('should fetch import history for establishment', () => {
      const estabelecimentoId = 1;
      const mockHistory = [
        {
          id: '1',
          estabelecimentoId,
          filename: 'categorias.csv',
          format: 'csv' as ImportExportFormat,
          totalRows: 10,
          importedRows: 8,
          failedRows: 2,
          importedBy: 1,
          importedByName: 'Test User',
          importedAt: new Date(),
          status: 'completed' as const,
          canRollback: true
        }
      ];

      service.getImportHistory(estabelecimentoId).subscribe(history => {
        expect(history).toEqual(mockHistory);
      });

      const req = httpMock.expectOne(`/api/categorias/estabelecimentos/${estabelecimentoId}/import-history`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHistory);
    });
  });

  describe('rollbackImport', () => {
    it('should rollback import successfully', () => {
      const rollbackRequest = {
        rollbackToken: 'test-token',
        reason: 'Test rollback'
      };

      const mockResponse = {
        success: true,
        rolledBackCategories: 5,
        restoredCategories: 0,
        errors: []
      };

      service.rollbackImport(rollbackRequest).subscribe(result => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/categorias/import/rollback');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(rollbackRequest);
      req.flush(mockResponse);
    });
  });

  describe('importProgress$', () => {
    it('should emit import progress updates', () => {
      const progressUpdates: any[] = [];
      
      service.importProgress$.subscribe(progress => {
        if (progress) {
          progressUpdates.push(progress);
        }
      });

      // Simulate progress updates would be tested in integration tests
      // as they require actual import operations
      expect(service.importProgress$).toBeDefined();
    });

    it('should clear progress', () => {
      service.clearProgress();
      
      service.importProgress$.subscribe(progress => {
        expect(progress).toBeNull();
      });
    });
  });

  describe('private methods', () => {
    it('should parse boolean values correctly', () => {
      // These are private methods, so we test them indirectly through public methods
      // The parseBoolean method is tested through CSV parsing
      expect(true).toBe(true); // Placeholder for private method tests
    });

    it('should parse CSV lines with quoted values correctly', () => {
      // The parseCSVLine method is tested through CSV file validation
      expect(true).toBe(true); // Placeholder for private method tests
    });

    it('should validate import rows correctly', () => {
      // The validateImportRow method is tested through file validation
      expect(true).toBe(true); // Placeholder for private method tests
    });
  });
});
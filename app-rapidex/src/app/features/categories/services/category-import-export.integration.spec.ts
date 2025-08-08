import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CategoryImportService } from './category-import.service';
import { CategoryExportService } from './category-export.service';
import { CategoryHttpService } from './category-http.service';
import { CategoryChartService } from './category-chart.service';
import {
  CategoryImportRequest,
  CategoryExportRequest,
  CategoryImportResult,
  CategoryExportResult
} from '../models/category-import-export.models';
import { Category } from '../models/category.models';
import { of } from 'rxjs';

describe('Category Import/Export Integration', () => {
  let importService: CategoryImportService;
  let exportService: CategoryExportService;
  let categoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let httpMock: HttpTestingController;

  const mockCategories: Category[] = [
    {
      id: 1,
      nome: 'Bebidas',
      descricao: 'Categoria de bebidas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-01'),
      dataAtualizacao: new Date('2024-01-02'),
      produtosCount: 5
    },
    {
      id: 2,
      nome: 'Comidas',
      descricao: 'Categoria de comidas',
      estabelecimentoId: 1,
      ativo: true,
      dataCriacao: new Date('2024-01-03'),
      dataAtualizacao: new Date('2024-01-04'),
      produtosCount: 10
    }
  ];

  beforeEach(() => {
    const categoryHttpSpy = jasmine.createSpyObj('CategoryHttpService', [
      'getCategories',
      'createCategory'
    ]);
    const chartSpy = jasmine.createSpyObj('CategoryChartService', ['generateChart']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryImportService,
        CategoryExportService,
        { provide: CategoryHttpService, useValue: categoryHttpSpy },
        { provide: CategoryChartService, useValue: chartSpy }
      ]
    });

    importService = TestBed.inject(CategoryImportService);
    exportService = TestBed.inject(CategoryExportService);
    categoryHttpService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Export-Import Round Trip', () => {
    it('should export categories and then import them back successfully', async () => {
      // Setup export
      categoryHttpService.getCategories.and.returnValue(of({
        categorias: mockCategories,
        total: mockCategories.length,
        pagina: 1,
        totalPaginas: 1
      }));

      // Export categories
      const exportRequest: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: true,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      const exportResult = await exportService.exportCategories(exportRequest).toPromise();
      expect(exportResult!.success).toBe(true);

      // Convert blob back to file for import
      const csvText = await exportResult!.blob.text();
      const importFile = new File([csvText], 'exported-categories.csv', { type: 'text/csv' });

      // Setup import
      categoryHttpService.createCategory.and.returnValues(
        of({ ...mockCategories[0], id: 3, nome: 'Bebidas' }),
        of({ ...mockCategories[1], id: 4, nome: 'Comidas' })
      );

      // Import categories
      const importRequest: CategoryImportRequest = {
        estabelecimentoId: 2, // Different establishment
        file: importFile,
        format: 'csv',
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 10,
          continueOnError: false,
          createBackup: true
        }
      };

      const importResult = await importService.importCategories(importRequest).toPromise();
      
      expect(importResult!.success).toBe(true);
      expect(importResult!.importedRows).toBe(2);
      expect(importResult!.failedRows).toBe(0);
      expect(categoryHttpService.createCategory).toHaveBeenCalledTimes(2);
    });

    it('should handle export-import with JSON format', async () => {
      // Setup export
      categoryHttpService.getCategories.and.returnValue(of({
        categorias: mockCategories,
        total: mockCategories.length,
        pagina: 1,
        totalPaginas: 1
      }));

      // Export categories as JSON
      const exportRequest: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'json',
        options: {
          includeInactive: true,
          includeProductCount: true,
          includeTimestamps: true,
          includeMetadata: false,
          customFields: []
        }
      };

      const exportResult = await exportService.exportCategories(exportRequest).toPromise();
      expect(exportResult!.success).toBe(true);

      // Convert blob back to file for import
      const jsonText = await exportResult!.blob.text();
      const jsonData = JSON.parse(jsonText);
      const importFile = new File([JSON.stringify(jsonData.categories)], 'exported-categories.json', { 
        type: 'application/json' 
      });

      // Setup import
      categoryHttpService.createCategory.and.returnValues(
        of({ ...mockCategories[0], id: 5 }),
        of({ ...mockCategories[1], id: 6 })
      );

      // Import categories
      const importRequest: CategoryImportRequest = {
        estabelecimentoId: 2,
        file: importFile,
        format: 'json',
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 10,
          continueOnError: false,
          createBackup: true
        }
      };

      const importResult = await importService.importCategories(importRequest).toPromise();
      
      expect(importResult!.success).toBe(true);
      expect(importResult!.importedRows).toBe(2);
      expect(categoryHttpService.createCategory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Import Progress Tracking', () => {
    it('should track import progress correctly', async () => {
      const csvContent = 'nome,descricao\n"Cat1","Desc1"\n"Cat2","Desc2"\n"Cat3","Desc3"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      categoryHttpService.createCategory.and.returnValues(
        of({ id: 1, nome: 'Cat1', descricao: 'Desc1', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() }),
        of({ id: 2, nome: 'Cat2', descricao: 'Desc2', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() }),
        of({ id: 3, nome: 'Cat3', descricao: 'Desc3', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() })
      );

      const request: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'csv',
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 2, // Small batch size to test progress
          continueOnError: false,
          createBackup: true
        }
      };

      const progressUpdates: any[] = [];
      importService.importProgress$.subscribe(progress => {
        if (progress) {
          progressUpdates.push({ ...progress });
        }
      });

      const result = await importService.importCategories(request).toPromise();

      expect(result!.success).toBe(true);
      expect(result!.importedRows).toBe(3);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed');
    });

    it('should handle import errors and continue when configured', async () => {
      const csvContent = 'nome,descricao\n"Valid1","Desc1"\n"","Invalid"\n"Valid2","Desc2"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      categoryHttpService.createCategory.and.returnValues(
        of({ id: 1, nome: 'Valid1', descricao: 'Desc1', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() }),
        of({ id: 2, nome: 'Valid2', descricao: 'Desc2', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() })
      );

      const request: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'csv',
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 10,
          continueOnError: true,
          createBackup: true
        }
      };

      const result = await importService.importCategories(request).toPromise();

      expect(result!.success).toBe(true); // Should succeed with continueOnError
      expect(result!.importedRows).toBe(2); // Only valid rows imported
      expect(result!.failedRows).toBe(0); // Invalid row filtered out during validation
    });
  });

  describe('Template Generation and Usage', () => {
    it('should generate template and use it for successful import', async () => {
      // Generate template
      const templateResult = await importService.generateTemplate({
        format: 'csv',
        includeExamples: true,
        includeInstructions: true,
        language: 'pt-BR'
      }).toPromise();

      expect(templateResult!.success).toBe(true);
      expect(templateResult!.format).toBe('csv');

      // Use template content for import
      const templateText = await templateResult!.blob.text();
      const templateFile = new File([templateText], 'template.csv', { type: 'text/csv' });

      categoryHttpService.createCategory.and.returnValues(
        of({ id: 1, nome: 'Bebidas', descricao: 'Categoria para bebidas em geral', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() }),
        of({ id: 2, nome: 'Pratos Principais', descricao: 'Pratos principais do cardápio', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() }),
        of({ id: 3, nome: 'Sobremesas', descricao: 'Doces e sobremesas', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() })
      );

      const importRequest: CategoryImportRequest = {
        estabelecimentoId: 1,
        file: templateFile,
        format: 'csv',
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 10,
          continueOnError: false,
          createBackup: true
        }
      };

      const importResult = await importService.importCategories(importRequest).toPromise();

      expect(importResult!.success).toBe(true);
      expect(importResult!.importedRows).toBe(3); // Template examples
      expect(categoryHttpService.createCategory).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rollback Functionality', () => {
    it('should support rollback after successful import', async () => {
      const csvContent = 'nome,descricao\n"Test1","Desc1"\n"Test2","Desc2"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      categoryHttpService.createCategory.and.returnValues(
        of({ id: 1, nome: 'Test1', descricao: 'Desc1', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() }),
        of({ id: 2, nome: 'Test2', descricao: 'Desc2', estabelecimentoId: 1, ativo: true, dataCriacao: new Date(), dataAtualizacao: new Date() })
      );

      const importRequest: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'csv',
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 10,
          continueOnError: false,
          createBackup: true
        }
      };

      const importResult = await importService.importCategories(importRequest).toPromise();

      expect(importResult!.success).toBe(true);
      expect(importResult!.canRollback).toBe(true);
      expect(importResult!.rollbackToken).toBeDefined();

      // Test rollback
      const rollbackRequest = {
        rollbackToken: importResult!.rollbackToken!,
        reason: 'Test rollback'
      };

      const mockRollbackResponse = {
        success: true,
        rolledBackCategories: 2,
        restoredCategories: 0,
        errors: []
      };

      importService.rollbackImport(rollbackRequest).subscribe(result => {
        expect(result).toEqual(mockRollbackResponse);
      });

      const req = httpMock.expectOne('/api/categorias/import/rollback');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(rollbackRequest);
      req.flush(mockRollbackResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors during import gracefully', async () => {
      const csvContent = 'nome,descricao\n"Test1","Desc1"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      categoryHttpService.createCategory.and.throwError('Server error');

      const request: CategoryImportRequest = {
        estabelecimentoId: 1,
        file,
        format: 'csv',
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 10,
          continueOnError: false,
          createBackup: true
        }
      };

      try {
        await importService.importCategories(request).toPromise();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle HTTP errors during export gracefully', async () => {
      categoryHttpService.getCategories.and.throwError('Server error');

      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: true,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      try {
        await exportService.exportCategories(request).toPromise();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Erro ao exportar categorias');
      }
    });
  });
});
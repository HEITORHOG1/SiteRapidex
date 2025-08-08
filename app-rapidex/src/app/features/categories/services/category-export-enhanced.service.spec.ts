import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CategoryExportService } from './category-export.service';
import { CategoryHttpService } from './category-http.service';
import { CategoryChartService } from './category-chart.service';
import {
  CategoryExportRequest,
  CategoryExportResult,
  ImportExportFormat
} from '../models/category-import-export.models';
import { Category } from '../models/category.models';
import { of } from 'rxjs';

describe('CategoryExportService - Enhanced Features', () => {
  let service: CategoryExportService;
  let categoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let chartService: jasmine.SpyObj<CategoryChartService>;

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
      ativo: false,
      dataCriacao: new Date('2024-01-03'),
      dataAtualizacao: new Date('2024-01-04'),
      produtosCount: 10
    }
  ];

  beforeEach(() => {
    const categoryHttpSpy = jasmine.createSpyObj('CategoryHttpService', ['getCategories']);
    const chartSpy = jasmine.createSpyObj('CategoryChartService', ['generateChart']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryExportService,
        { provide: CategoryHttpService, useValue: categoryHttpSpy },
        { provide: CategoryChartService, useValue: chartSpy }
      ]
    });

    service = TestBed.inject(CategoryExportService);
    categoryHttpService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    chartService = TestBed.inject(CategoryChartService) as jasmine.SpyObj<CategoryChartService>;
  });

  describe('exportCategories', () => {
    beforeEach(() => {
      categoryHttpService.getCategories.and.returnValue(of({
        categorias: mockCategories,
        total: mockCategories.length,
        pagina: 1,
        totalPaginas: 1
      }));
    });

    it('should export categories to CSV format', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: true,
          includeProductCount: true,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      const result = await service.exportCategories(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.format).toBe('csv');
      expect(result!.totalCategories).toBe(2);
      expect(result!.exportedCategories).toBe(2);
      expect(result!.blob).toBeInstanceOf(Blob);
      expect(result!.filename).toContain('categorias-1-');
    });

    it('should export categories to JSON format', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'json',
        options: {
          includeInactive: true,
          includeProductCount: true,
          includeTimestamps: true,
          includeMetadata: true,
          customFields: []
        }
      };

      const result = await service.exportCategories(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.format).toBe('json');
      expect(result!.blob).toBeInstanceOf(Blob);
    });

    it('should export categories to Excel format', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'excel',
        options: {
          includeInactive: false,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      const result = await service.exportCategories(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.format).toBe('excel');
      expect(result!.filename).toContain('.xlsx');
    });

    it('should filter out inactive categories when includeInactive is false', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: false,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      await service.exportCategories(request).toPromise();

      expect(categoryHttpService.getCategories).toHaveBeenCalledWith(1, jasmine.objectContaining({
        ativo: true,
        limit: 1000
      }));
    });

    it('should apply search filter when provided', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: true,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        },
        filters: {
          search: 'Bebidas'
        }
      };

      await service.exportCategories(request).toPromise();

      expect(categoryHttpService.getCategories).toHaveBeenCalledWith(1, jasmine.objectContaining({
        search: 'Bebidas',
        limit: 1000
      }));
    });

    it('should apply category IDs filter when provided', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: true,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        },
        filters: {
          categoryIds: [1, 2]
        }
      };

      await service.exportCategories(request).toPromise();

      expect(categoryHttpService.getCategories).toHaveBeenCalledWith(1, jasmine.objectContaining({
        ids: '1,2',
        limit: 1000
      }));
    });

    it('should handle export errors gracefully', async () => {
      categoryHttpService.getCategories.and.returnValue(
        of({ categorias: [], total: 0, pagina: 1, totalPaginas: 1 })
      );

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

      const result = await service.exportCategories(request).toPromise();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.totalCategories).toBe(0);
      expect(result!.exportedCategories).toBe(0);
    });

    it('should throw error for unsupported format', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'xml' as ImportExportFormat,
        options: {
          includeInactive: true,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      try {
        await service.exportCategories(request).toPromise();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Formato não suportado');
      }
    });
  });

  describe('CSV generation', () => {
    it('should generate CSV with basic fields only', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: false,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      const result = await service.exportCategories(request).toPromise();
      const csvText = await result!.blob.text();

      expect(csvText).toContain('nome,descricao');
      expect(csvText).toContain('"Bebidas","Categoria de bebidas"');
      expect(csvText).not.toContain('ativo');
      expect(csvText).not.toContain('produtosCount');
    });

    it('should generate CSV with all optional fields', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: true,
          includeProductCount: true,
          includeTimestamps: true,
          includeMetadata: true,
          customFields: []
        }
      };

      const result = await service.exportCategories(request).toPromise();
      const csvText = await result!.blob.text();

      expect(csvText).toContain('nome,descricao,ativo,produtosCount,dataCriacao,dataAtualizacao,id,estabelecimentoId');
      expect(csvText).toContain('true');
      expect(csvText).toContain('5');
      expect(csvText).toContain('01/01/2024');
    });

    it('should include BOM for proper UTF-8 encoding', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'csv',
        options: {
          includeInactive: false,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      const result = await service.exportCategories(request).toPromise();
      const arrayBuffer = await result!.blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check for UTF-8 BOM (0xEF, 0xBB, 0xBF)
      expect(uint8Array[0]).toBe(0xEF);
      expect(uint8Array[1]).toBe(0xBB);
      expect(uint8Array[2]).toBe(0xBF);
    });
  });

  describe('JSON generation', () => {
    it('should generate JSON with proper structure', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'json',
        options: {
          includeInactive: true,
          includeProductCount: true,
          includeTimestamps: true,
          includeMetadata: true,
          customFields: []
        }
      };

      const result = await service.exportCategories(request).toPromise();
      const jsonText = await result!.blob.text();
      const jsonData = JSON.parse(jsonText);

      expect(jsonData).toHaveProperty('exportedAt');
      expect(jsonData).toHaveProperty('totalCategories', 2);
      expect(jsonData).toHaveProperty('categories');
      expect(jsonData.categories).toHaveLength(2);
      expect(jsonData.categories[0]).toHaveProperty('nome', 'Bebidas');
      expect(jsonData.categories[0]).toHaveProperty('produtosCount', 5);
      expect(jsonData.categories[0]).toHaveProperty('id', 1);
    });

    it('should generate JSON with minimal fields', async () => {
      const request: CategoryExportRequest = {
        estabelecimentoId: 1,
        format: 'json',
        options: {
          includeInactive: false,
          includeProductCount: false,
          includeTimestamps: false,
          includeMetadata: false,
          customFields: []
        }
      };

      const result = await service.exportCategories(request).toPromise();
      const jsonText = await result!.blob.text();
      const jsonData = JSON.parse(jsonText);

      expect(jsonData.categories[0]).toHaveProperty('nome');
      expect(jsonData.categories[0]).toHaveProperty('descricao');
      expect(jsonData.categories[0]).not.toHaveProperty('ativo');
      expect(jsonData.categories[0]).not.toHaveProperty('produtosCount');
      expect(jsonData.categories[0]).not.toHaveProperty('id');
    });
  });

  describe('filename generation', () => {
    it('should generate filename with correct format and date', () => {
      const filename = service['generateCategoryExportFilename'](1, 'csv');
      const today = new Date().toISOString().split('T')[0];
      
      expect(filename).toBe(`categorias-1-${today}.csv`);
    });

    it('should generate filename with xlsx extension for excel format', () => {
      const filename = service['generateCategoryExportFilename'](1, 'excel');
      const today = new Date().toISOString().split('T')[0];
      
      expect(filename).toBe(`categorias-1-${today}.xlsx`);
    });

    it('should generate filename with json extension', () => {
      const filename = service['generateCategoryExportFilename'](1, 'json');
      const today = new Date().toISOString().split('T')[0];
      
      expect(filename).toBe(`categorias-1-${today}.json`);
    });
  });
});
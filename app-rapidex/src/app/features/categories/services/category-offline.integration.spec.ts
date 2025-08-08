import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { CategoryOfflineService } from './category-offline.service';
import { CategoryHttpService } from './category-http.service';
import { CategoryOfflineStorageService } from './category-offline-storage.service';
import { CategoryOfflineSyncService } from './category-offline-sync.service';
import { ApiConfigService } from '../../../core/services/api-config.service';
import { Category } from '../models/category.models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../models/category-dto.models';

describe('CategoryOfflineService Integration', () => {
  let service: CategoryOfflineService;
  let httpMock: HttpTestingController;
  let offlineStorage: CategoryOfflineStorageService;
  let syncService: CategoryOfflineSyncService;

  const mockEstablishmentId = 1;
  const mockCategory: Category = {
    id: 1,
    nome: 'Test Category',
    descricao: 'Test Description',
    estabelecimentoId: mockEstablishmentId,
    ativo: true,
    dataCriacao: new Date(),
    dataAtualizacao: new Date(),
    produtosCount: 0
  };

  const mockApiConfig = {
    getConfiguredEndpoint: jasmine.createSpy('getConfiguredEndpoint').and.returnValue('/api/test')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryOfflineService,
        CategoryHttpService,
        CategoryOfflineStorageService,
        CategoryOfflineSyncService,
        { provide: ApiConfigService, useValue: mockApiConfig }
      ]
    });

    service = TestBed.inject(CategoryOfflineService);
    httpMock = TestBed.inject(HttpTestingController);
    offlineStorage = TestBed.inject(CategoryOfflineStorageService);
    syncService = TestBed.inject(CategoryOfflineSyncService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Online Operations', () => {
    beforeEach(() => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    });

    it('should fetch categories online and cache them', (done) => {
      const mockResponse = {
        categorias: [mockCategory],
        total: 1,
        pagina: 1,
        totalPaginas: 1
      };

      service.getCategories(mockEstablishmentId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        
        // Verify categories were cached
        const cachedCategories = offlineStorage.getCachedCategories(mockEstablishmentId);
        expect(cachedCategories).toEqual([mockCategory]);
        done();
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should create category online and update cache', (done) => {
      const createRequest: CreateCategoryRequest = {
        nome: 'New Category',
        descricao: 'New Description'
      };

      service.createCategory(mockEstablishmentId, createRequest).subscribe(category => {
        expect(category).toEqual(mockCategory);
        
        // Verify category was added to cache
        const cachedCategories = offlineStorage.getCachedCategories(mockEstablishmentId);
        expect(cachedCategories).toContain(mockCategory);
        done();
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush(mockCategory);
    });

    it('should update category online and update cache', (done) => {
      // Pre-populate cache
      offlineStorage.cacheCategories(mockEstablishmentId, [mockCategory]);

      const updateRequest: UpdateCategoryRequest = {
        nome: 'Updated Category',
        descricao: 'Updated Description',
        ativo: true
      };

      const updatedCategory = { ...mockCategory, ...updateRequest };

      service.updateCategory(mockEstablishmentId, mockCategory.id, updateRequest).subscribe(category => {
        expect(category).toEqual(updatedCategory);
        
        // Verify cache was updated
        const cachedCategories = offlineStorage.getCachedCategories(mockEstablishmentId);
        const cachedCategory = cachedCategories.find(c => c.id === mockCategory.id);
        expect(cachedCategory?.nome).toBe('Updated Category');
        done();
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('PUT');
      req.flush(updatedCategory);
    });

    it('should delete category online and remove from cache', (done) => {
      // Pre-populate cache
      offlineStorage.cacheCategories(mockEstablishmentId, [mockCategory]);

      service.deleteCategory(mockEstablishmentId, mockCategory.id).subscribe(() => {
        // Verify category was removed from cache
        const cachedCategories = offlineStorage.getCachedCategories(mockEstablishmentId);
        expect(cachedCategories.find(c => c.id === mockCategory.id)).toBeUndefined();
        done();
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('Offline Operations', () => {
    beforeEach(() => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);
    });

    it('should return cached categories when offline', (done) => {
      // Pre-populate cache
      offlineStorage.cacheCategories(mockEstablishmentId, [mockCategory]);

      service.getCategories(mockEstablishmentId).subscribe(response => {
        expect(response.categorias).toEqual([mockCategory]);
        expect(response.total).toBe(1);
        done();
      });

      // No HTTP request should be made
      httpMock.expectNone('/api/test');
    });

    it('should queue create operation when offline', (done) => {
      const createRequest: CreateCategoryRequest = {
        nome: 'Offline Category',
        descricao: 'Created offline'
      };

      service.createCategory(mockEstablishmentId, createRequest).subscribe(category => {
        expect(category.id).toBeLessThan(0); // Temporary negative ID
        expect(category.nome).toBe(createRequest.nome);
        
        // Verify operation was queued
        const pendingOps = offlineStorage.getPendingOperations(mockEstablishmentId);
        expect(pendingOps.length).toBe(1);
        expect(pendingOps[0].type).toBe('create');
        done();
      });

      // No HTTP request should be made
      httpMock.expectNone('/api/test');
    });

    it('should queue update operation when offline', (done) => {
      // Pre-populate cache
      offlineStorage.cacheCategories(mockEstablishmentId, [mockCategory]);

      const updateRequest: UpdateCategoryRequest = {
        nome: 'Offline Updated',
        descricao: 'Updated offline',
        ativo: false
      };

      service.updateCategory(mockEstablishmentId, mockCategory.id, updateRequest).subscribe(category => {
        expect(category.nome).toBe('Offline Updated');
        expect(category.ativo).toBe(false);
        
        // Verify operation was queued
        const pendingOps = offlineStorage.getPendingOperations(mockEstablishmentId);
        expect(pendingOps.length).toBe(1);
        expect(pendingOps[0].type).toBe('update');
        done();
      });

      // No HTTP request should be made
      httpMock.expectNone('/api/test');
    });

    it('should queue delete operation when offline', (done) => {
      // Pre-populate cache
      offlineStorage.cacheCategories(mockEstablishmentId, [mockCategory]);

      service.deleteCategory(mockEstablishmentId, mockCategory.id).subscribe(() => {
        // Verify category was removed from cache optimistically
        const cachedCategories = offlineStorage.getCachedCategories(mockEstablishmentId);
        expect(cachedCategories.find(c => c.id === mockCategory.id)).toBeUndefined();
        
        // Verify operation was queued
        const pendingOps = offlineStorage.getPendingOperations(mockEstablishmentId);
        expect(pendingOps.length).toBe(1);
        expect(pendingOps[0].type).toBe('delete');
        done();
      });

      // No HTTP request should be made
      httpMock.expectNone('/api/test');
    });

    it('should search in cached categories when offline', (done) => {
      const categories = [
        { ...mockCategory, nome: 'Bebidas' },
        { ...mockCategory, id: 2, nome: 'Comidas' }
      ];
      
      offlineStorage.cacheCategories(mockEstablishmentId, categories);

      service.searchCategories(mockEstablishmentId, 'beb').subscribe(results => {
        expect(results.length).toBe(1);
        expect(results[0].nome).toBe('Bebidas');
        done();
      });

      // No HTTP request should be made
      httpMock.expectNone('/api/test');
    });
  });

  describe('Online/Offline Fallback', () => {
    it('should fallback to cache when online request fails', (done) => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      
      // Pre-populate cache
      offlineStorage.cacheCategories(mockEstablishmentId, [mockCategory]);

      service.getCategories(mockEstablishmentId).subscribe(response => {
        expect(response.categorias).toEqual([mockCategory]);
        done();
      });

      const req = httpMock.expectOne('/api/test');
      req.error(new ErrorEvent('Network error'));
    });

    it('should queue operation when online request fails', (done) => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);

      const createRequest: CreateCategoryRequest = {
        nome: 'Failed Online',
        descricao: 'Should be queued'
      };

      service.createCategory(mockEstablishmentId, createRequest).subscribe({
        error: (error) => {
          // Verify operation was queued despite being online
          const pendingOps = offlineStorage.getPendingOperations(mockEstablishmentId);
          expect(pendingOps.length).toBe(1);
          expect(pendingOps[0].type).toBe('create');
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.error(new ErrorEvent('Server error'));
    });
  });

  describe('Sync Status Integration', () => {
    it('should provide sync status', (done) => {
      service.getSyncStatus().subscribe(status => {
        expect(status).toBeDefined();
        expect(typeof status.isOnline).toBe('boolean');
        expect(typeof status.isSyncing).toBe('boolean');
        expect(typeof status.pendingOperations).toBe('number');
        done();
      });
    });

    it('should detect pending operations', () => {
      // Add a pending operation
      offlineStorage.addOfflineOperation({
        type: 'create',
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Test', descricao: 'Test' }
      });

      expect(service.hasPendingOperations(mockEstablishmentId)).toBe(true);
    });

    it('should get last sync time', () => {
      // Cache some data (which sets last sync time)
      offlineStorage.cacheCategories(mockEstablishmentId, [mockCategory]);
      
      const lastSync = service.getLastSyncTime(mockEstablishmentId);
      expect(lastSync).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    beforeEach(() => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);
    });

    it('should validate category name locally when offline', (done) => {
      const existingCategories = [
        { ...mockCategory, nome: 'Existing Category' }
      ];
      
      offlineStorage.cacheCategories(mockEstablishmentId, existingCategories);

      // Test duplicate name
      service.validateCategoryName(mockEstablishmentId, 'Existing Category').subscribe(isValid => {
        expect(isValid).toBe(false);
        done();
      });
    });

    it('should validate unique category name locally when offline', (done) => {
      const existingCategories = [
        { ...mockCategory, nome: 'Existing Category' }
      ];
      
      offlineStorage.cacheCategories(mockEstablishmentId, existingCategories);

      // Test unique name
      service.validateCategoryName(mockEstablishmentId, 'New Unique Category').subscribe(isValid => {
        expect(isValid).toBe(true);
        done();
      });
    });
  });
});
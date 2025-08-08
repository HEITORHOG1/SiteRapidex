import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CategoryOfflineSyncService, SyncStatus } from './category-offline-sync.service';
import { CategoryHttpService } from './category-http.service';
import { CategoryOfflineStorageService, OfflineCategoryOperation } from './category-offline-storage.service';

describe('CategoryOfflineSyncService', () => {
  let service: CategoryOfflineSyncService;
  let mockCategoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let mockOfflineStorage: jasmine.SpyObj<CategoryOfflineStorageService>;

  const mockEstablishmentId = 1;
  const mockCategory = {
    id: 1,
    nome: 'Test Category',
    descricao: 'Test Description',
    estabelecimentoId: mockEstablishmentId,
    ativo: true,
    dataCriacao: new Date(),
    dataAtualizacao: new Date(),
    produtosCount: 0
  };

  beforeEach(() => {
    const httpServiceSpy = jasmine.createSpyObj('CategoryHttpService', [
      'createCategory',
      'updateCategory',
      'deleteCategory'
    ]);
    const offlineStorageSpy = jasmine.createSpyObj('CategoryOfflineStorageService', [
      'getPendingOperations',
      'removeOperation',
      'incrementRetryCount',
      'getOfflineData',
      'saveOfflineData'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CategoryOfflineSyncService,
        { provide: CategoryHttpService, useValue: httpServiceSpy },
        { provide: CategoryOfflineStorageService, useValue: offlineStorageSpy }
      ]
    });

    service = TestBed.inject(CategoryOfflineSyncService);
    mockCategoryHttpService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    mockOfflineStorage = TestBed.inject(CategoryOfflineStorageService) as jasmine.SpyObj<CategoryOfflineStorageService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('syncStatus$', () => {
    it('should emit initial sync status', (done) => {
      service.syncStatus$.subscribe(status => {
        expect(status.isOnline).toBe(navigator.onLine);
        expect(status.isSyncing).toBe(false);
        expect(status.pendingOperations).toBe(0);
        expect(status.syncError).toBeNull();
        done();
      });
    });
  });

  describe('syncEstablishment', () => {
    it('should not sync when offline', (done) => {
      // Mock offline state
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);
      mockOfflineStorage.getPendingOperations.and.returnValue([]);

      service.syncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockOfflineStorage.getPendingOperations).not.toHaveBeenCalled();
        done();
      });
    });

    it('should not sync when no pending operations', (done) => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      mockOfflineStorage.getPendingOperations.and.returnValue([]);

      service.syncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockOfflineStorage.getPendingOperations).toHaveBeenCalledWith(mockEstablishmentId);
        done();
      });
    });

    it('should sync create operations successfully', (done) => {
      const createOperation: OfflineCategoryOperation = {
        id: 'op-1',
        type: 'create',
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'New Category', descricao: 'New Description' },
        timestamp: Date.now(),
        retryCount: 0
      };

      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      mockOfflineStorage.getPendingOperations.and.returnValue([createOperation]);
      mockCategoryHttpService.createCategory.and.returnValue(of(mockCategory));
      mockOfflineStorage.getOfflineData.and.returnValue({
        categories: [],
        operations: [],
        lastSync: 0,
        estabelecimentoId: mockEstablishmentId
      });

      service.syncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockCategoryHttpService.createCategory).toHaveBeenCalledWith(
          mockEstablishmentId,
          createOperation.data
        );
        expect(mockOfflineStorage.removeOperation).toHaveBeenCalledWith(
          mockEstablishmentId,
          createOperation.id
        );
        done();
      });
    });

    it('should sync update operations successfully', (done) => {
      const updateOperation: OfflineCategoryOperation = {
        id: 'op-2',
        type: 'update',
        categoryId: 1,
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Updated Category', descricao: 'Updated Description', ativo: true },
        timestamp: Date.now(),
        retryCount: 0
      };

      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      mockOfflineStorage.getPendingOperations.and.returnValue([updateOperation]);
      mockCategoryHttpService.updateCategory.and.returnValue(of(mockCategory));

      service.syncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockCategoryHttpService.updateCategory).toHaveBeenCalledWith(
          mockEstablishmentId,
          updateOperation.categoryId!,
          updateOperation.data
        );
        expect(mockOfflineStorage.removeOperation).toHaveBeenCalledWith(
          mockEstablishmentId,
          updateOperation.id
        );
        done();
      });
    });

    it('should sync delete operations successfully', (done) => {
      const deleteOperation: OfflineCategoryOperation = {
        id: 'op-3',
        type: 'delete',
        categoryId: 1,
        estabelecimentoId: mockEstablishmentId,
        timestamp: Date.now(),
        retryCount: 0
      };

      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      mockOfflineStorage.getPendingOperations.and.returnValue([deleteOperation]);
      mockCategoryHttpService.deleteCategory.and.returnValue(of(void 0));

      service.syncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockCategoryHttpService.deleteCategory).toHaveBeenCalledWith(
          mockEstablishmentId,
          deleteOperation.categoryId!
        );
        expect(mockOfflineStorage.removeOperation).toHaveBeenCalledWith(
          mockEstablishmentId,
          deleteOperation.id
        );
        done();
      });
    });

    it('should handle sync errors by incrementing retry count', (done) => {
      const createOperation: OfflineCategoryOperation = {
        id: 'op-1',
        type: 'create',
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'New Category', descricao: 'New Description' },
        timestamp: Date.now(),
        retryCount: 0
      };

      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      mockOfflineStorage.getPendingOperations.and.returnValue([createOperation]);
      mockCategoryHttpService.createCategory.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      service.syncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockOfflineStorage.incrementRetryCount).toHaveBeenCalledWith(
          mockEstablishmentId,
          createOperation.id
        );
        done();
      });
    });

    it('should remove operations on 404 errors', (done) => {
      const updateOperation: OfflineCategoryOperation = {
        id: 'op-2',
        type: 'update',
        categoryId: 999,
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Updated Category', descricao: 'Updated Description', ativo: true },
        timestamp: Date.now(),
        retryCount: 0
      };

      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      mockOfflineStorage.getPendingOperations.and.returnValue([updateOperation]);
      mockCategoryHttpService.updateCategory.and.returnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      service.syncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockOfflineStorage.removeOperation).toHaveBeenCalledWith(
          mockEstablishmentId,
          updateOperation.id
        );
        expect(mockOfflineStorage.incrementRetryCount).not.toHaveBeenCalled();
        done();
      });
    });

    it('should remove operations on 409 conflict errors', (done) => {
      const createOperation: OfflineCategoryOperation = {
        id: 'op-1',
        type: 'create',
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Duplicate Category', descricao: 'Description' },
        timestamp: Date.now(),
        retryCount: 0
      };

      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      mockOfflineStorage.getPendingOperations.and.returnValue([createOperation]);
      mockCategoryHttpService.createCategory.and.returnValue(
        throwError(() => ({ status: 409, message: 'Conflict' }))
      );

      service.syncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockOfflineStorage.removeOperation).toHaveBeenCalledWith(
          mockEstablishmentId,
          createOperation.id
        );
        expect(mockOfflineStorage.incrementRetryCount).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('forceSyncEstablishment', () => {
    it('should force sync for specific establishment', (done) => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      mockOfflineStorage.getPendingOperations.and.returnValue([]);

      service.forceSyncEstablishment(mockEstablishmentId).subscribe(() => {
        expect(mockOfflineStorage.getPendingOperations).toHaveBeenCalledWith(mockEstablishmentId);
        done();
      });
    });
  });

  describe('getCurrentSyncStatus', () => {
    it('should return current sync status', () => {
      const status = service.getCurrentSyncStatus();
      expect(status).toBeDefined();
      expect(typeof status.isOnline).toBe('boolean');
      expect(typeof status.isSyncing).toBe('boolean');
      expect(typeof status.pendingOperations).toBe('number');
    });
  });

  describe('isOnline', () => {
    it('should return navigator online status', () => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
      expect(service.isOnline()).toBe(true);

      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);
      expect(service.isOnline()).toBe(false);
    });
  });
});
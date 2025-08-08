import { TestBed } from '@angular/core/testing';
import { CategoryOfflineStorageService, OfflineCategoryOperation } from './category-offline-storage.service';
import { Category } from '../models/category.models';

// Extend jasmine matchers
declare global {
  namespace jasmine {
    interface Matchers<T> {
      toHaveLength(expected: number): boolean;
    }
  }
}

describe('CategoryOfflineStorageService', () => {
  let service: CategoryOfflineStorageService;
  const mockEstablishmentId = 1;
  const mockCategories: Category[] = [
    {
      id: 1,
      nome: 'Bebidas',
      descricao: 'Categoria de bebidas',
      estabelecimentoId: mockEstablishmentId,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
      produtosCount: 5
    },
    {
      id: 2,
      nome: 'Comidas',
      descricao: 'Categoria de comidas',
      estabelecimentoId: mockEstablishmentId,
      ativo: true,
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
      produtosCount: 10
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryOfflineStorageService);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('cacheCategories', () => {
    it('should cache categories for an establishment', () => {
      service.cacheCategories(mockEstablishmentId, mockCategories);
      
      const cachedCategories = service.getCachedCategories(mockEstablishmentId);
      expect(cachedCategories).toEqual(mockCategories);
    });

    it('should update last sync time when caching', () => {
      const beforeTime = Date.now();
      service.cacheCategories(mockEstablishmentId, mockCategories);
      const afterTime = Date.now();
      
      const lastSync = service.getLastSyncTime(mockEstablishmentId);
      expect(lastSync).toBeGreaterThanOrEqual(beforeTime);
      expect(lastSync).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getCachedCategories', () => {
    it('should return empty array when no categories are cached', () => {
      const cachedCategories = service.getCachedCategories(mockEstablishmentId);
      expect(cachedCategories).toEqual([]);
    });

    it('should return cached categories', () => {
      service.cacheCategories(mockEstablishmentId, mockCategories);
      const cachedCategories = service.getCachedCategories(mockEstablishmentId);
      expect(cachedCategories).toEqual(mockCategories);
    });
  });

  describe('addOfflineOperation', () => {
    it('should add create operation to queue', () => {
      const operation = {
        type: 'create' as const,
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Nova Categoria', descricao: 'Descrição' }
      };

      service.addOfflineOperation(operation);
      
      const pendingOps = service.getPendingOperations(mockEstablishmentId);
      expect(pendingOps.length).toBe(1);
      expect(pendingOps[0].type).toBe('create');
      expect(pendingOps[0].estabelecimentoId).toBe(mockEstablishmentId);
      expect(pendingOps[0].data).toEqual(operation.data);
    });

    it('should add update operation to queue', () => {
      const operation = {
        type: 'update' as const,
        categoryId: 1,
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Categoria Atualizada', descricao: 'Nova descrição', ativo: true }
      };

      service.addOfflineOperation(operation);
      
      const pendingOps = service.getPendingOperations(mockEstablishmentId);
      expect(pendingOps.length).toBe(1);
      expect(pendingOps[0].type).toBe('update');
      expect(pendingOps[0].categoryId).toBe(1);
    });

    it('should add delete operation to queue', () => {
      const operation = {
        type: 'delete' as const,
        categoryId: 1,
        estabelecimentoId: mockEstablishmentId
      };

      service.addOfflineOperation(operation);
      
      const pendingOps = service.getPendingOperations(mockEstablishmentId);
      expect(pendingOps.length).toBe(1);
      expect(pendingOps[0].type).toBe('delete');
      expect(pendingOps[0].categoryId).toBe(1);
    });
  });

  describe('applyOfflineOperation', () => {
    beforeEach(() => {
      service.cacheCategories(mockEstablishmentId, mockCategories);
    });

    it('should apply create operation optimistically', () => {
      const operation: OfflineCategoryOperation = {
        id: 'test-op-1',
        type: 'create',
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Nova Categoria', descricao: 'Nova descrição' },
        timestamp: Date.now(),
        retryCount: 0
      };

      service.applyOfflineOperation(operation);
      
      const cachedCategories = service.getCachedCategories(mockEstablishmentId);
      expect(cachedCategories.length).toBe(3);
      
      const newCategory = cachedCategories.find(c => c.nome === 'Nova Categoria');
      expect(newCategory).toBeTruthy();
      expect(newCategory?.id).toBeLessThan(0); // Temporary negative ID
    });

    it('should apply update operation optimistically', () => {
      const operation: OfflineCategoryOperation = {
        id: 'test-op-2',
        type: 'update',
        categoryId: 1,
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Bebidas Atualizadas', descricao: 'Nova descrição', ativo: false },
        timestamp: Date.now(),
        retryCount: 0
      };

      service.applyOfflineOperation(operation);
      
      const cachedCategories = service.getCachedCategories(mockEstablishmentId);
      const updatedCategory = cachedCategories.find(c => c.id === 1);
      
      expect(updatedCategory?.nome).toBe('Bebidas Atualizadas');
      expect(updatedCategory?.descricao).toBe('Nova descrição');
      expect(updatedCategory?.ativo).toBe(false);
    });

    it('should apply delete operation optimistically', () => {
      const operation: OfflineCategoryOperation = {
        id: 'test-op-3',
        type: 'delete',
        categoryId: 1,
        estabelecimentoId: mockEstablishmentId,
        timestamp: Date.now(),
        retryCount: 0
      };

      service.applyOfflineOperation(operation);
      
      const cachedCategories = service.getCachedCategories(mockEstablishmentId);
      expect(cachedCategories.length).toBe(1);
      expect(cachedCategories.find(c => c.id === 1)).toBeUndefined();
    });
  });

  describe('removeOperation', () => {
    it('should remove operation from queue', () => {
      const operation = {
        type: 'create' as const,
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Test', descricao: 'Test' }
      };

      service.addOfflineOperation(operation);
      let pendingOps = service.getPendingOperations(mockEstablishmentId);
      expect(pendingOps.length).toBe(1);

      const operationId = pendingOps[0].id;
      service.removeOperation(mockEstablishmentId, operationId);
      
      pendingOps = service.getPendingOperations(mockEstablishmentId);
      expect(pendingOps.length).toBe(0);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count for operation', () => {
      const operation = {
        type: 'create' as const,
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Test', descricao: 'Test' }
      };

      service.addOfflineOperation(operation);
      let pendingOps = service.getPendingOperations(mockEstablishmentId);
      const operationId = pendingOps[0].id;
      
      expect(pendingOps[0].retryCount).toBe(0);
      
      service.incrementRetryCount(mockEstablishmentId, operationId);
      
      pendingOps = service.getPendingOperations(mockEstablishmentId);
      expect(pendingOps[0].retryCount).toBe(1);
    });

    it('should exclude operations with max retry count from pending operations', () => {
      const operation = {
        type: 'create' as const,
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Test', descricao: 'Test' }
      };

      service.addOfflineOperation(operation);
      let pendingOps = service.getPendingOperations(mockEstablishmentId);
      const operationId = pendingOps[0].id;
      
      // Increment retry count to max (3)
      for (let i = 0; i < 3; i++) {
        service.incrementRetryCount(mockEstablishmentId, operationId);
      }
      
      pendingOps = service.getPendingOperations(mockEstablishmentId);
      expect(pendingOps.length).toBe(0); // Should be excluded from pending
    });
  });

  describe('hasPendingOperations', () => {
    it('should return false when no operations are pending', () => {
      expect(service.hasPendingOperations(mockEstablishmentId)).toBe(false);
    });

    it('should return true when operations are pending', () => {
      service.addOfflineOperation({
        type: 'create',
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Test', descricao: 'Test' }
      });

      expect(service.hasPendingOperations(mockEstablishmentId)).toBe(true);
    });
  });

  describe('clearOfflineData', () => {
    it('should clear all offline data for establishment', () => {
      service.cacheCategories(mockEstablishmentId, mockCategories);
      service.addOfflineOperation({
        type: 'create',
        estabelecimentoId: mockEstablishmentId,
        data: { nome: 'Test', descricao: 'Test' }
      });

      expect(service.getCachedCategories(mockEstablishmentId).length).toBe(2);
      expect(service.hasPendingOperations(mockEstablishmentId)).toBe(true);

      service.clearOfflineData(mockEstablishmentId);

      expect(service.getCachedCategories(mockEstablishmentId).length).toBe(0);
      expect(service.hasPendingOperations(mockEstablishmentId)).toBe(false);
      expect(service.getLastSyncTime(mockEstablishmentId)).toBe(0);
    });
  });
});
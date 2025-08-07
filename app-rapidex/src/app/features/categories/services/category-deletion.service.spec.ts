import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { CategoryDeletionService, DeletionImpactAnalysis, PendingUndo } from './category-deletion.service';
import { CategoryHttpService } from './category-http.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { Category } from '../models/category.models';
import {
  CategoryDeletionValidationResponse,
  CategoryDeletionRequest,
  CategoryDeletionResponse,
  BulkCategoryDeletionRequest,
  BulkCategoryDeletionResponse,
  UndoCategoryDeletionRequest,
  UndoCategoryDeletionResponse
} from '../models/category-dto.models';

describe('CategoryDeletionService', () => {
  let service: CategoryDeletionService;
  let categoryHttpService: jasmine.SpyObj<CategoryHttpService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockCategory: Category = {
    id: 1,
    nome: 'Bebidas',
    descricao: 'Categoria de bebidas',
    estabelecimentoId: 1,
    ativo: true,
    dataCriacao: new Date('2024-01-01'),
    dataAtualizacao: new Date('2024-01-01'),
    produtosCount: 5
  };

  const mockValidationResponse: CategoryDeletionValidationResponse = {
    canDelete: false,
    reason: 'Category has associated products',
    affectedProductsCount: 5,
    affectedProducts: [],
    hasActiveProducts: true,
    hasInactiveProducts: false,
    suggestSoftDelete: true,
    alternativeCategories: []
  };

  beforeEach(() => {
    const categoryHttpSpy = jasmine.createSpyObj('CategoryHttpService', [
      'validateCategoryDeletion',
      'getCategoryById',
      'deleteCategoryEnhanced',
      'deleteBulkCategories',
      'undoCategoryDeletion'
    ]);

    const notificationSpy = jasmine.createSpyObj('NotificationService', [
      'showSuccess',
      'showApiError'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CategoryDeletionService,
        { provide: CategoryHttpService, useValue: categoryHttpSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(CategoryDeletionService);
    categoryHttpService = TestBed.inject(CategoryHttpService) as jasmine.SpyObj<CategoryHttpService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateDeletion', () => {
    it('should validate deletion and return impact analysis', (done) => {
      categoryHttpService.validateCategoryDeletion.and.returnValue(of(mockValidationResponse));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.validateDeletion(1, 1).subscribe(analysis => {
        expect(analysis).toBeDefined();
        expect(analysis.category).toEqual(mockCategory);
        expect(analysis.canDelete).toBe(false);
        expect(analysis.hasProducts).toBe(true);
        expect(analysis.totalProductsCount).toBe(5);
        expect(analysis.suggestSoftDelete).toBe(true);
        expect(analysis.risks.length).toBeGreaterThan(0);
        expect(analysis.recommendations.length).toBeGreaterThan(0);
        done();
      });

      expect(categoryHttpService.validateCategoryDeletion).toHaveBeenCalledWith(1, 1);
      expect(categoryHttpService.getCategoryById).toHaveBeenCalledWith(1, 1);
    });

    it('should handle validation errors', (done) => {
      const error = new Error('Validation failed');
      categoryHttpService.validateCategoryDeletion.and.returnValue(throwError(() => error));

      service.validateDeletion(1, 1).subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err).toBe(error);
          done();
        }
      });
    });
  });

  describe('validateBulkDeletion', () => {
    it('should validate multiple categories for bulk deletion', (done) => {
      categoryHttpService.validateCategoryDeletion.and.returnValue(of(mockValidationResponse));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.validateBulkDeletion(1, [1, 2]).subscribe(analyses => {
        expect(analyses).toBeDefined();
        expect(analyses.length).toBe(2);
        expect(analyses[0].category).toEqual(mockCategory);
        expect(analyses[1].category).toEqual(mockCategory);
        done();
      });

      expect(categoryHttpService.validateCategoryDeletion).toHaveBeenCalledTimes(2);
      expect(categoryHttpService.getCategoryById).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteCategory', () => {
    const mockDeletionRequest: CategoryDeletionRequest = {
      categoryId: 1,
      deletionType: 'soft',
      reason: 'Test deletion'
    };

    const mockDeletionResponse: CategoryDeletionResponse = {
      success: true,
      deletionType: 'soft',
      affectedProductsCount: 5,
      canUndo: true,
      undoToken: 'test-undo-token',
      undoExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
    };

    it('should delete category successfully', (done) => {
      categoryHttpService.validateCategoryDeletion.and.returnValue(of(mockValidationResponse));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.deleteCategory(1, mockDeletionRequest).subscribe(response => {
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        expect(response.deletionType).toBe('soft');
        expect(notificationService.showSuccess).toHaveBeenCalled();
        done();
      });
    });

    it('should prevent hard deletion when category has products', (done) => {
      const hardDeleteRequest: CategoryDeletionRequest = {
        ...mockDeletionRequest,
        deletionType: 'hard'
      };

      categoryHttpService.validateCategoryDeletion.and.returnValue(of(mockValidationResponse));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.deleteCategory(1, hardDeleteRequest).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Não é possível excluir permanentemente');
          done();
        }
      });
    });

    it('should add pending undo when deletion supports undo', (done) => {
      categoryHttpService.validateCategoryDeletion.and.returnValue(of({
        ...mockValidationResponse,
        canDelete: true
      }));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.deleteCategory(1, mockDeletionRequest).subscribe(() => {
        service.getPendingUndos().subscribe(undos => {
          expect(undos.length).toBe(1);
          expect(undos[0].undoToken).toBe('test-undo-token');
          expect(undos[0].category).toEqual(mockCategory);
          done();
        });
      });
    });
  });

  describe('deleteBulkCategories', () => {
    const mockBulkRequest: BulkCategoryDeletionRequest = {
      categoryIds: [1, 2],
      deletionType: 'soft',
      reason: 'Bulk test deletion'
    };

    const mockBulkResponse: BulkCategoryDeletionResponse = {
      totalRequested: 2,
      successfulDeletions: 2,
      failedDeletions: 0,
      deletionResults: [
        {
          success: true,
          deletionType: 'soft',
          affectedProductsCount: 5,
          canUndo: true,
          undoToken: 'test-undo-token-1',
          undoExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
        },
        {
          success: true,
          deletionType: 'soft',
          affectedProductsCount: 3,
          canUndo: true,
          undoToken: 'test-undo-token-2',
          undoExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
        }
      ],
      errors: []
    };

    it('should delete multiple categories successfully', (done) => {
      categoryHttpService.validateCategoryDeletion.and.returnValue(of({
        ...mockValidationResponse,
        canDelete: true
      }));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.deleteBulkCategories(1, mockBulkRequest).subscribe(response => {
        expect(response).toBeDefined();
        expect(response.successfulDeletions).toBe(2);
        expect(response.failedDeletions).toBe(0);
        expect(notificationService.showSuccess).toHaveBeenCalled();
        done();
      });
    });

    it('should prevent bulk hard deletion when categories have products', (done) => {
      const hardBulkRequest: BulkCategoryDeletionRequest = {
        ...mockBulkRequest,
        deletionType: 'hard'
      };

      categoryHttpService.validateCategoryDeletion.and.returnValue(of(mockValidationResponse));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.deleteBulkCategories(1, hardBulkRequest).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Não é possível excluir permanentemente');
          done();
        }
      });
    });
  });

  describe('undoDeletion', () => {
    const mockUndoResponse: UndoCategoryDeletionResponse = {
      success: true,
      restoredCategory: mockCategory,
      restoredProductsCount: 5
    };

    beforeEach(() => {
      // Add a pending undo to test with
      const pendingUndo: PendingUndo = {
        undoToken: 'test-undo-token',
        category: mockCategory,
        deletionType: 'soft',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        affectedProductsCount: 5
      };
      
      // Simulate having a pending undo
      service['addPendingUndo'](pendingUndo);
    });

    it('should undo deletion successfully', (done) => {
      service.undoDeletion('test-undo-token').subscribe(response => {
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        expect(response.restoredCategory).toEqual(mockCategory);
        expect(notificationService.showSuccess).toHaveBeenCalled();
        
        // Check that pending undo was removed
        service.getPendingUndos().subscribe(undos => {
          expect(undos.length).toBe(0);
          done();
        });
      });
    });

    it('should handle invalid undo token', (done) => {
      service.undoDeletion('invalid-token').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Token de desfazer inválido');
          done();
        }
      });
    });
  });

  describe('pending undo management', () => {
    it('should track pending undos', (done) => {
      const pendingUndo: PendingUndo = {
        undoToken: 'test-token',
        category: mockCategory,
        deletionType: 'soft',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        affectedProductsCount: 5
      };

      service['addPendingUndo'](pendingUndo);

      service.getPendingUndos().subscribe(undos => {
        expect(undos.length).toBe(1);
        expect(undos[0]).toEqual(pendingUndo);
        done();
      });
    });

    it('should check if category has pending undo', () => {
      const pendingUndo: PendingUndo = {
        undoToken: 'test-token',
        category: mockCategory,
        deletionType: 'soft',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        affectedProductsCount: 5
      };

      service['addPendingUndo'](pendingUndo);

      expect(service.hasPendingUndo(1)).toBe(true);
      expect(service.hasPendingUndo(999)).toBe(false);
    });

    it('should get pending undo for category', () => {
      const pendingUndo: PendingUndo = {
        undoToken: 'test-token',
        category: mockCategory,
        deletionType: 'soft',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        affectedProductsCount: 5
      };

      service['addPendingUndo'](pendingUndo);

      const found = service.getPendingUndoForCategory(1);
      expect(found).toEqual(pendingUndo);

      const notFound = service.getPendingUndoForCategory(999);
      expect(notFound).toBeNull();
    });

    it('should clean up expired undos', (done) => {
      const expiredUndo: PendingUndo = {
        undoToken: 'expired-token',
        category: mockCategory,
        deletionType: 'soft',
        expiresAt: new Date(Date.now() - 1000), // Already expired
        affectedProductsCount: 5
      };

      const validUndo: PendingUndo = {
        undoToken: 'valid-token',
        category: { ...mockCategory, id: 2 },
        deletionType: 'soft',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        affectedProductsCount: 3
      };

      service['addPendingUndo'](expiredUndo);
      service['addPendingUndo'](validUndo);

      // Wait for cleanup timer to run
      setTimeout(() => {
        service.getPendingUndos().subscribe(undos => {
          expect(undos.length).toBe(1);
          expect(undos[0].undoToken).toBe('valid-token');
          done();
        });
      }, 100);
    });
  });

  describe('impact analysis', () => {
    it('should build comprehensive impact analysis', (done) => {
      const validationResponse: CategoryDeletionValidationResponse = {
        canDelete: false,
        reason: 'Has products',
        affectedProductsCount: 10,
        hasActiveProducts: true,
        hasInactiveProducts: true,
        suggestSoftDelete: true,
        alternativeCategories: [
          { ...mockCategory, id: 2, nome: 'Alternative Category' }
        ]
      };

      categoryHttpService.validateCategoryDeletion.and.returnValue(of(validationResponse));
      categoryHttpService.getCategoryById.and.returnValue(of(mockCategory));

      service.validateDeletion(1, 1).subscribe(analysis => {
        expect(analysis.category).toEqual(mockCategory);
        expect(analysis.canDelete).toBe(false);
        expect(analysis.hasProducts).toBe(true);
        expect(analysis.totalProductsCount).toBe(10);
        expect(analysis.suggestSoftDelete).toBe(true);
        expect(analysis.alternativeCategories.length).toBe(1);
        expect(analysis.risks.length).toBeGreaterThan(0);
        expect(analysis.recommendations.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should handle categories without products', (done) => {
      const validationResponse: CategoryDeletionValidationResponse = {
        canDelete: true,
        affectedProductsCount: 0,
        hasActiveProducts: false,
        hasInactiveProducts: false,
        suggestSoftDelete: false,
        alternativeCategories: []
      };

      categoryHttpService.validateCategoryDeletion.and.returnValue(of(validationResponse));
      categoryHttpService.getCategoryById.and.returnValue(of({
        ...mockCategory,
        produtosCount: 0
      }));

      service.validateDeletion(1, 1).subscribe(analysis => {
        expect(analysis.canDelete).toBe(true);
        expect(analysis.hasProducts).toBe(false);
        expect(analysis.totalProductsCount).toBe(0);
        expect(analysis.risks.length).toBe(0);
        done();
      });
    });
  });
});
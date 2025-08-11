import { Category, ProductSummary } from './category.models';
import { ApiResponse } from '../../../data-access/models/api-response.models';

/**
 * Request DTO for creating a new category
 */
export interface CreateCategoryRequest {
  nome: string;
  descricao: string;
}

/**
 * Request DTO for updating an existing category
 */
export interface UpdateCategoryRequest {
  nome: string;
  descricao: string;
  ativo: boolean;
}

/**
 * Response DTO for category list endpoint
 */
export interface CategoryListResponse {
  categorias: Category[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/**
 * Response DTO for category detail endpoint
 */
export interface CategoryDetailResponse {
  categoria: Category;
  produtos: ProductSummary[];
}

/**
 * Response DTO for category validation
 */
export interface CategoryValidationResponse {
  valid: boolean;
  message?: string;
}

/**
 * Response DTO for category deletion validation
 */
export interface CategoryDeletionValidationResponse {
  canDelete: boolean;
  reason?: string;
  affectedProductsCount?: number;
  affectedProducts?: ProductSummary[];
  hasActiveProducts?: boolean;
  hasInactiveProducts?: boolean;
  suggestSoftDelete?: boolean;
  alternativeCategories?: Category[];
}

/**
 * Request DTO for category deletion
 */
export interface CategoryDeletionRequest {
  categoryId: number;
  deletionType: 'hard' | 'soft';
  moveProductsToCategory?: number;
  reason?: string;
}

/**
 * Response DTO for category deletion
 */
export interface CategoryDeletionResponse {
  success: boolean;
  deletionType: 'hard' | 'soft';
  affectedProductsCount: number;
  movedProductsCount?: number;
  targetCategoryId?: number;
  canUndo: boolean;
  undoToken?: string;
  undoExpiresAt?: Date;
}

/**
 * Request DTO for bulk category deletion
 */
export interface BulkCategoryDeletionRequest {
  categoryIds: number[];
  deletionType: 'hard' | 'soft';
  moveProductsToCategory?: number;
  reason?: string;
}

/**
 * Response DTO for bulk category deletion
 */
export interface BulkCategoryDeletionResponse {
  totalRequested: number;
  successfulDeletions: number;
  failedDeletions: number;
  deletionResults: CategoryDeletionResponse[];
  errors: Array<{
    categoryId: number;
    categoryName: string;
    error: string;
  }>;
}

/**
 * Request DTO for undoing category deletion
 */
export interface UndoCategoryDeletionRequest {
  undoToken: string;
}

/**
 * Response DTO for undoing category deletion
 */
export interface UndoCategoryDeletionResponse {
  success: boolean;
  restoredCategory: Category;
  restoredProductsCount: number;
}

/**
 * DTO for deletion audit trail entry
 */
export interface CategoryDeletionAuditEntry {
  id: number;
  categoryId: number;
  categoryName: string;
  estabelecimentoId: number;
  deletionType: 'hard' | 'soft';
  deletedBy: number;
  deletedByName: string;
  deletedAt: Date;
  reason?: string;
  affectedProductsCount: number;
  movedProductsCount?: number;
  targetCategoryId?: number;
  targetCategoryName?: string;
  canUndo: boolean;
  undoToken?: string;
  undoExpiresAt?: Date;
  undoneAt?: Date;
  undoneBy?: number;
  undoneByName?: string;
}

// API Response Wrappers for new API format
export type CategoryListApiResponse = ApiResponse<CategoryListResponse>;
export type CategoryDetailApiResponse = ApiResponse<CategoryDetailResponse>;
export type CategoryValidationApiResponse = ApiResponse<CategoryValidationResponse>;
export type CategoryDeletionValidationApiResponse = ApiResponse<CategoryDeletionValidationResponse>;
export type CategoryDeletionApiResponse = ApiResponse<CategoryDeletionResponse>;
export type BulkCategoryDeletionApiResponse = ApiResponse<BulkCategoryDeletionResponse>;
export type UndoCategoryDeletionApiResponse = ApiResponse<UndoCategoryDeletionResponse>;
export type CategoryCreateApiResponse = ApiResponse<Category>;
export type CategoryUpdateApiResponse = ApiResponse<Category>;
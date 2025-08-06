import { Category, ProductSummary } from './category.models';

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
}
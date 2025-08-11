import { ApiResponse } from '../../../data-access/models/api-response.models';

/**
 * Core Category model interface
 */
export interface Category {
  id: number;
  nome: string;
  descricao: string;
  estabelecimentoId: number;
  ativo: boolean;
  dataCriacao: Date;
  dataAtualizacao: Date;
  produtosCount?: number; // Para validar exclusão
}

/**
 * Product summary interface for category details
 */
export interface ProductSummary {
  id: number;
  nome: string;
  ativo: boolean;
}

/**
 * Category filters interface for search and filtering
 */
export interface CategoryFilters {
  search: string;
  ativo: boolean | null;
  sortBy: 'nome' | 'dataCriacao' | 'dataAtualizacao' | 'produtosCount';
  sortOrder: 'asc' | 'desc';
}

/**
 * Pagination state interface
 */
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Category state interface for state management
 */
export interface CategoryState {
  categories: Category[];
  selectedCategory: Category | null;
  loading: boolean;
  error: string | null;
  filters: CategoryFilters;
  pagination: PaginationState;
}

/**
 * Category list parameters for API requests
 */
export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Response Wrappers for new API format
export type CategoryApiResponse = ApiResponse<Category>;
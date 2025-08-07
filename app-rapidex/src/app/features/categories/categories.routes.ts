import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { establishmentContextGuard, categoryOwnershipGuard } from './guards';

/**
 * Route parameter validation function
 * Validates that route parameters are numeric and positive
 */
function validateNumericParam(paramName: string) {
  return (route: any) => {
    const param = route.params[paramName];
    if (param) {
      const numericValue = parseInt(param, 10);
      return !isNaN(numericValue) && numericValue > 0;
    }
    return true; // Allow if parameter is not present
  };
}

/**
 * Category feature routes configuration
 * All routes require authentication, establishment context, and proper ownership validation
 */
export const CATEGORY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard, establishmentContextGuard],
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        loadComponent: () => 
          import('./pages/category-list-page/category-list-page.component')
            .then(c => c.CategoryListPageComponent),
        title: 'Categorias',
        data: {
          breadcrumb: 'Categorias',
          description: 'Lista de categorias do estabelecimento'
        }
      },
      {
        path: 'create',
        loadComponent: () => 
          import('./pages/category-create-page/category-create-page.component')
            .then(c => c.CategoryCreatePageComponent),
        title: 'Nova Categoria',
        data: {
          breadcrumb: 'Nova Categoria',
          description: 'Criar nova categoria de produtos/serviços'
        }
      },
      {
        path: 'edit/:id',
        canActivate: [categoryOwnershipGuard],
        loadComponent: () => 
          import('./pages/category-edit-page/category-edit-page.component')
            .then(c => c.CategoryEditPageComponent),
        title: 'Editar Categoria',
        data: {
          breadcrumb: 'Editar',
          description: 'Editar informações da categoria'
        },
        // Route parameter validation
        canMatch: [
          (route) => validateNumericParam('id')(route)
        ]
      },
      {
        path: 'detail/:id',
        canActivate: [categoryOwnershipGuard],
        loadComponent: () => 
          import('./pages/category-detail-page/category-detail-page.component')
            .then(c => c.CategoryDetailPageComponent),
        title: 'Detalhes da Categoria',
        data: {
          breadcrumb: 'Detalhes',
          description: 'Visualizar detalhes da categoria'
        },
        // Route parameter validation
        canMatch: [
          (route) => validateNumericParam('id')(route)
        ]
      },
      // Catch-all route for invalid paths
      {
        path: '**',
        redirectTo: 'list'
      }
    ]
  }
];

/**
 * API endpoints configuration for categories
 * Used by services to construct API URLs with proper parameter replacement
 */
export const CATEGORY_ENDPOINTS = {
  LIST: '/api/categorias/estabelecimentos/{estabelecimentoId}/categorias',
  DETAIL: '/api/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}',
  CREATE: '/api/categorias/estabelecimentos/{estabelecimentoId}/categorias',
  UPDATE: '/api/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}',
  DELETE: '/api/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}',
  VALIDATE_NAME: '/api/categorias/estabelecimentos/{estabelecimentoId}/categorias/validate-name',
  CHECK_DELETION: '/api/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}/check-deletion'
} as const;

/**
 * Route configuration metadata
 * Provides additional information about routes for navigation and breadcrumbs
 */
export const CATEGORY_ROUTE_CONFIG = {
  list: {
    path: '/categories/list',
    title: 'Categorias',
    icon: '📂',
    description: 'Gerenciar categorias do estabelecimento'
  },
  create: {
    path: '/categories/create',
    title: 'Nova Categoria',
    icon: '➕',
    description: 'Criar nova categoria'
  },
  edit: {
    path: '/categories/edit',
    title: 'Editar Categoria',
    icon: '✏️',
    description: 'Editar categoria existente'
  },
  detail: {
    path: '/categories/detail',
    title: 'Detalhes da Categoria',
    icon: '👁️',
    description: 'Visualizar detalhes da categoria'
  }
} as const;

/**
 * Navigation helper functions
 */
export class CategoryRouteHelper {
  /**
   * Builds category list URL
   */
  static getListUrl(): string {
    return CATEGORY_ROUTE_CONFIG.list.path;
  }

  /**
   * Builds category create URL
   */
  static getCreateUrl(): string {
    return CATEGORY_ROUTE_CONFIG.create.path;
  }

  /**
   * Builds category edit URL
   */
  static getEditUrl(categoryId: number): string {
    return `${CATEGORY_ROUTE_CONFIG.edit.path}/${categoryId}`;
  }

  /**
   * Builds category detail URL
   */
  static getDetailUrl(categoryId: number): string {
    return `${CATEGORY_ROUTE_CONFIG.detail.path}/${categoryId}`;
  }

  /**
   * Validates category ID parameter
   */
  static isValidCategoryId(id: string | number): boolean {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    return !isNaN(numericId) && numericId > 0;
  }

  /**
   * Gets route configuration by path
   */
  static getRouteConfig(path: string): typeof CATEGORY_ROUTE_CONFIG[keyof typeof CATEGORY_ROUTE_CONFIG] | null {
    const routeKey = Object.keys(CATEGORY_ROUTE_CONFIG).find(key => 
      path.startsWith(CATEGORY_ROUTE_CONFIG[key as keyof typeof CATEGORY_ROUTE_CONFIG].path)
    );
    
    return routeKey ? CATEGORY_ROUTE_CONFIG[routeKey as keyof typeof CATEGORY_ROUTE_CONFIG] : null;
  }
}
import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

/**
 * Category feature routes configuration
 * All routes require authentication and establishment context
 */
export const CATEGORY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
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
        title: 'Categorias'
      },
      {
        path: 'create',
        loadComponent: () => 
          import('./pages/category-create-page/category-create-page.component')
            .then(c => c.CategoryCreatePageComponent),
        title: 'Nova Categoria'
      },
      {
        path: 'edit/:id',
        loadComponent: () => 
          import('./pages/category-edit-page/category-edit-page.component')
            .then(c => c.CategoryEditPageComponent),
        title: 'Editar Categoria'
      },
      {
        path: 'detail/:id',
        loadComponent: () => 
          import('./pages/category-detail-page/category-detail-page.component')
            .then(c => c.CategoryDetailPageComponent),
        title: 'Detalhes da Categoria'
      }
    ]
  }
];

/**
 * API endpoints configuration for categories
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
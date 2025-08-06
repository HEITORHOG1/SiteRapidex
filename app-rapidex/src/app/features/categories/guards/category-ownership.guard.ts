import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { Observable, of, catchError, map, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CategoryHttpService } from '../services/category-http.service';
import { CategorySecurityError, CategorySecurityErrorCode } from '../models/category-security-errors';

/**
 * Guard to verify category ownership before allowing access
 * Ensures that users can only access categories they own through their establishments
 */
export const categoryOwnershipGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const authService = inject(AuthService);
  const estabelecimentoService = inject(EstabelecimentoService);
  const categoryHttpService = inject(CategoryHttpService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    console.warn('CategoryOwnershipGuard: User not authenticated');
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return of(false);
  }

  // Check if user is proprietario
  if (!authService.isProprietario()) {
    console.warn('CategoryOwnershipGuard: User is not a proprietario');
    router.navigate(['/access-denied']);
    return of(false);
  }

  // Get route parameters
  const categoryId = route.params['id'];
  const estabelecimentoId = route.params['estabelecimentoId'];

  // If no category ID in route, allow access (for list routes)
  if (!categoryId) {
    return validateEstablishmentAccess(estabelecimentoService, router, estabelecimentoId);
  }

  // Validate both establishment and category ownership
  return validateEstablishmentAccess(estabelecimentoService, router, estabelecimentoId).pipe(
    switchMap(hasEstablishmentAccess => {
      if (!hasEstablishmentAccess) {
        return of(false);
      }

      return validateCategoryOwnership(
        categoryHttpService,
        router,
        estabelecimentoId,
        categoryId,
        state.url
      );
    })
  );
};

/**
 * Validates establishment access for the current user
 */
function validateEstablishmentAccess(
  estabelecimentoService: EstabelecimentoService,
  router: Router,
  estabelecimentoId?: string
): Observable<boolean> {
  const selectedEstabelecimento = estabelecimentoService.getSelectedEstabelecimento();

  // If no establishment selected, redirect to establishment selection
  if (!selectedEstabelecimento) {
    console.warn('CategoryOwnershipGuard: No establishment selected');
    router.navigate(['/establishments/select']);
    return of(false);
  }

  // If estabelecimentoId is provided in route, validate it matches selected establishment
  if (estabelecimentoId && selectedEstabelecimento.id.toString() !== estabelecimentoId) {
    console.warn('CategoryOwnershipGuard: Establishment ID mismatch', {
      routeEstablishmentId: estabelecimentoId,
      selectedEstablishmentId: selectedEstabelecimento.id
    });
    
    handleSecurityViolation(
      router,
      new CategorySecurityError(
        'Acesso negado ao estabelecimento',
        CategorySecurityErrorCode.ESTABLISHMENT_ACCESS_DENIED,
        { 
          requestedEstablishmentId: estabelecimentoId,
          selectedEstablishmentId: selectedEstabelecimento.id 
        }
      )
    );
    return of(false);
  }

  return of(true);
}

/**
 * Validates category ownership by checking if category belongs to user's establishment
 */
function validateCategoryOwnership(
  categoryHttpService: CategoryHttpService,
  router: Router,
  estabelecimentoId: string,
  categoryId: string,
  returnUrl: string
): Observable<boolean> {
  const numericEstablishmentId = parseInt(estabelecimentoId, 10);
  const numericCategoryId = parseInt(categoryId, 10);

  if (isNaN(numericEstablishmentId) || isNaN(numericCategoryId)) {
    console.error('CategoryOwnershipGuard: Invalid ID parameters', {
      estabelecimentoId,
      categoryId
    });
    router.navigate(['/not-found']);
    return of(false);
  }

  return categoryHttpService.getCategoryById(numericEstablishmentId, numericCategoryId).pipe(
    map(category => {
      // Verify category belongs to the establishment
      if (category.estabelecimentoId !== numericEstablishmentId) {
        console.warn('CategoryOwnershipGuard: Category does not belong to establishment', {
          categoryEstablishmentId: category.estabelecimentoId,
          requestedEstablishmentId: numericEstablishmentId
        });

        handleSecurityViolation(
          router,
          new CategorySecurityError(
            'Categoria não pertence ao estabelecimento',
            CategorySecurityErrorCode.CATEGORY_ACCESS_DENIED,
            {
              categoryId: numericCategoryId,
              categoryEstablishmentId: category.estabelecimentoId,
              requestedEstablishmentId: numericEstablishmentId
            }
          )
        );
        return false;
      }

      return true;
    }),
    catchError(error => {
      console.error('CategoryOwnershipGuard: Error validating category ownership', error);

      // Handle different error types
      if (error.status === 404) {
        router.navigate(['/not-found']);
      } else if (error.status === 403) {
        handleSecurityViolation(
          router,
          new CategorySecurityError(
            'Acesso negado à categoria',
            CategorySecurityErrorCode.CATEGORY_ACCESS_DENIED,
            { categoryId: numericCategoryId }
          )
        );
      } else {
        // For other errors, redirect to error page with return URL
        router.navigate(['/error'], { queryParams: { returnUrl } });
      }

      return of(false);
    })
  );
}

/**
 * Handles security violations with proper logging and user notification
 */
function handleSecurityViolation(router: Router, securityError: CategorySecurityError): void {
  // Log security violation for monitoring
  console.error('Security violation detected:', {
    error: securityError,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });

  // Navigate to access denied page with error details
  router.navigate(['/access-denied'], {
    state: { 
      error: securityError.message,
      code: securityError.code,
      details: securityError.details
    }
  });
}

/**
 * Validates route parameters for category operations
 */
export function validateCategoryRouteParams(route: ActivatedRouteSnapshot): {
  isValid: boolean;
  estabelecimentoId?: number;
  categoryId?: number;
  errors: string[];
} {
  const errors: string[] = [];
  let estabelecimentoId: number | undefined;
  let categoryId: number | undefined;

  // Validate establishment ID
  if (route.params['estabelecimentoId']) {
    const parsedEstablishmentId = parseInt(route.params['estabelecimentoId'], 10);
    if (isNaN(parsedEstablishmentId)) {
      errors.push('ID do estabelecimento inválido');
    } else {
      estabelecimentoId = parsedEstablishmentId;
    }
  } else {
    errors.push('ID do estabelecimento não fornecido');
  }

  // Validate category ID if present
  if (route.params['id']) {
    const parsedCategoryId = parseInt(route.params['id'], 10);
    if (isNaN(parsedCategoryId)) {
      errors.push('ID da categoria inválido');
    } else {
      categoryId = parsedCategoryId;
    }
  }

  return {
    isValid: errors.length === 0,
    estabelecimentoId,
    categoryId,
    errors
  };
}

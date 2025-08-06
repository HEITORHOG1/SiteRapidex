import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CategorySecurityError, CategorySecurityErrorCode } from '../models/category-security-errors';

/**
 * Guard to ensure valid establishment context for category routes
 * Validates that user has selected an establishment and has proper access
 */
export const establishmentContextGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const authService = inject(AuthService);
  const estabelecimentoService = inject(EstabelecimentoService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    console.warn('EstablishmentContextGuard: User not authenticated');
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return of(false);
  }

  // Check if user is proprietario (required for category access)
  if (!authService.isProprietario()) {
    console.warn('EstablishmentContextGuard: User is not a proprietario');
    handleSecurityViolation(
      router,
      CategorySecurityError.userNotProprietario(authService.getUserId() || undefined),
      state.url
    );
    return of(false);
  }

  // Check if an establishment is selected
  const selectedEstablishment = estabelecimentoService.getSelectedEstabelecimento();
  if (!selectedEstablishment) {
    console.warn('EstablishmentContextGuard: No establishment selected');
    
    // Try to redirect to establishment selection with return URL
    router.navigate(['/establishments/select'], { 
      queryParams: { returnUrl: state.url }
    });
    return of(false);
  }

  // Validate establishment ID from route parameters if present
  const routeEstablishmentId = route.params['estabelecimentoId'];
  if (routeEstablishmentId) {
    const numericRouteId = parseInt(routeEstablishmentId, 10);
    
    if (isNaN(numericRouteId)) {
      console.error('EstablishmentContextGuard: Invalid establishment ID in route:', routeEstablishmentId);
      router.navigate(['/not-found']);
      return of(false);
    }

    if (selectedEstablishment.id !== numericRouteId) {
      console.warn('EstablishmentContextGuard: Establishment ID mismatch', {
        routeId: numericRouteId,
        selectedId: selectedEstablishment.id,
        route: state.url
      });

      handleSecurityViolation(
        router,
        CategorySecurityError.establishmentMismatch(numericRouteId, selectedEstablishment.id),
        state.url
      );
      return of(false);
    }
  }

  // Validate establishment ownership (user's establishments)
  const userEstablishments = estabelecimentoService.getEstabelecimentos();
  if (userEstablishments.length > 0) {
    const ownsEstablishment = userEstablishments.some(est => est.id === selectedEstablishment.id);
    
    if (!ownsEstablishment) {
      console.warn('EstablishmentContextGuard: User does not own selected establishment', {
        selectedEstablishmentId: selectedEstablishment.id,
        userEstablishmentIds: userEstablishments.map(e => e.id)
      });

      handleSecurityViolation(
        router,
        CategorySecurityError.establishmentAccessDenied(
          selectedEstablishment.id,
          userEstablishments.map(e => e.id).join(', ')
        ),
        state.url
      );
      return of(false);
    }
  }

  // Log successful access for monitoring
  console.log('✅ EstablishmentContextGuard: Access granted', {
    userId: authService.getUserId(),
    establishmentId: selectedEstablishment.id,
    establishmentName: selectedEstablishment.nomeFantasia,
    route: state.url,
    timestamp: new Date().toISOString()
  });

  return of(true);
};

/**
 * Guard specifically for category routes that require establishment context
 * More specific than the general establishment context guard
 */
export const categoryEstablishmentContextGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  // Just use the general establishment context validation for now
  // Future enhancements could add category-specific permissions here
  return establishmentContextGuard(route, state) as Observable<boolean>;
};

/**
 * Validates establishment context for API requests (used by interceptors)
 */
export function validateEstablishmentContext(
  authService: AuthService,
  estabelecimentoService: EstabelecimentoService,
  requestedEstablishmentId?: string | number
): {
  isValid: boolean;
  error?: CategorySecurityError;
  establishmentId?: number;
} {
  // Check authentication
  if (!authService.isAuthenticated()) {
    return {
      isValid: false,
      error: new CategorySecurityError(
        'Usuário não autenticado',
        CategorySecurityErrorCode.SECURITY_VIOLATION
      )
    };
  }

  // Check if user is proprietario
  if (!authService.isProprietario()) {
    return {
      isValid: false,
      error: CategorySecurityError.userNotProprietario(authService.getUserId() || undefined)
    };
  }

  // Check if establishment is selected
  const selectedEstablishment = estabelecimentoService.getSelectedEstabelecimento();
  if (!selectedEstablishment) {
    return {
      isValid: false,
      error: CategorySecurityError.invalidEstablishmentContext({
        reason: 'No establishment selected'
      })
    };
  }

  // Validate establishment ID if provided
  if (requestedEstablishmentId !== undefined) {
    const numericRequestedId = typeof requestedEstablishmentId === 'string' 
      ? parseInt(requestedEstablishmentId, 10) 
      : requestedEstablishmentId;

    if (isNaN(numericRequestedId)) {
      return {
        isValid: false,
        error: CategorySecurityError.invalidEstablishmentContext({
          reason: 'Invalid establishment ID format',
          requestedId: requestedEstablishmentId
        })
      };
    }

    if (selectedEstablishment.id !== numericRequestedId) {
      return {
        isValid: false,
        error: CategorySecurityError.establishmentMismatch(
          numericRequestedId,
          selectedEstablishment.id
        )
      };
    }
  }

  return {
    isValid: true,
    establishmentId: selectedEstablishment.id
  };
}

/**
 * Checks if user owns the specified establishment
 */
export function validateEstablishmentOwnership(
  estabelecimentoService: EstabelecimentoService,
  establishmentId: number
): boolean {
  const userEstablishments = estabelecimentoService.getEstabelecimentos();
  return userEstablishments.some(est => est.id === establishmentId);
}

/**
 * Handles security violations with proper logging and redirection
 */
function handleSecurityViolation(
  router: Router,
  securityError: CategorySecurityError,
  returnUrl: string
): void {
  // Log security violation for monitoring
  console.error('🚨 Establishment Context Security Violation:', {
    error: securityError.toJSON(),
    returnUrl,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    currentUrl: window.location.href
  });

  // Navigate to appropriate error page based on error type
  switch (securityError.code) {
    case CategorySecurityErrorCode.USER_NOT_PROPRIETARIO:
      router.navigate(['/access-denied'], {
        state: { 
          error: 'Acesso restrito a proprietários de estabelecimentos',
          code: securityError.code
        }
      });
      break;

    case CategorySecurityErrorCode.ESTABLISHMENT_MISMATCH:
    case CategorySecurityErrorCode.ESTABLISHMENT_ACCESS_DENIED:
      router.navigate(['/access-denied'], {
        state: { 
          error: securityError.message,
          code: securityError.code,
          details: securityError.details
        }
      });
      break;

    case CategorySecurityErrorCode.INVALID_ESTABLISHMENT_CONTEXT:
      router.navigate(['/establishments/select'], { 
        queryParams: { 
          returnUrl,
          error: 'establishment_required'
        }
      });
      break;

    default:
      router.navigate(['/error'], { 
        queryParams: { returnUrl },
        state: { error: securityError.message }
      });
  }
}

/**
 * Helper function to extract establishment ID from various sources
 */
export function extractEstablishmentId(route: ActivatedRouteSnapshot): number | null {
  // Try route parameters first
  if (route.params['estabelecimentoId']) {
    const id = parseInt(route.params['estabelecimentoId'], 10);
    return isNaN(id) ? null : id;
  }

  // Try query parameters
  if (route.queryParams['estabelecimentoId']) {
    const id = parseInt(route.queryParams['estabelecimentoId'], 10);
    return isNaN(id) ? null : id;
  }

  // Try parent route parameters
  let currentRoute = route.parent;
  while (currentRoute) {
    if (currentRoute.params['estabelecimentoId']) {
      const id = parseInt(currentRoute.params['estabelecimentoId'], 10);
      return isNaN(id) ? null : id;
    }
    currentRoute = currentRoute.parent;
  }

  return null;
}

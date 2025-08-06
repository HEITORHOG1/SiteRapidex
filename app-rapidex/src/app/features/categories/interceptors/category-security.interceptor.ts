import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { CategorySecurityError, CategorySecurityErrorCode } from '../models/category-security-errors';
import { validateEstablishmentContext } from '../guards/establishment-context.guard';

/**
 * HTTP Interceptor for category-specific API security
 * Validates category operations and establishment context
 */
export const categorySecurityInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const estabelecimentoService = inject(EstabelecimentoService);

  // Only apply to category-related API calls
  if (!isCategoryApiRequest(req)) {
    return next(req);
  }

  console.log('🛡️ CategorySecurityInterceptor: Validating request', {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Extract establishment ID from the request
  const establishmentId = extractEstablishmentIdFromRequest(req);
  
  // Validate establishment context
  const validation = validateEstablishmentContext(
    authService, 
    estabelecimentoService, 
    establishmentId
  );

  if (!validation.isValid && validation.error) {
    console.error('🚨 CategorySecurityInterceptor: Security violation', {
      error: validation.error.toJSON(),
      url: req.url,
      method: req.method,
      establishmentId,
      timestamp: new Date().toISOString()
    });

    return throwError(() => validation.error);
  }

  // Validate specific category operations
  const operationValidation = validateCategoryOperation(req, authService, estabelecimentoService);
  if (!operationValidation.isValid && operationValidation.error) {
    console.error('🚨 CategorySecurityInterceptor: Operation not allowed', {
      error: operationValidation.error.toJSON(),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    return throwError(() => operationValidation.error);
  }

  // Add security headers to the request
  const secureRequest = addSecurityHeaders(req, validation.establishmentId);

  // Proceed with the request and handle potential security-related errors
  return next(secureRequest).pipe(
    catchError(error => {
      // Transform HTTP errors into category security errors if relevant
      const securityError = transformHttpSecurityError(error, req);
      if (securityError) {
        console.error('🚨 CategorySecurityInterceptor: HTTP security error transformed', {
          originalError: error,
          securityError: securityError.toJSON(),
          url: req.url,
          timestamp: new Date().toISOString()
        });
        return throwError(() => securityError);
      }

      return throwError(() => error);
    })
  );
};

/**
 * Checks if the request is for category-related APIs
 */
function isCategoryApiRequest(req: HttpRequest<unknown>): boolean {
  const categoryApiPatterns = [
    '/api/categories',
    '/api/estabelecimentos/\\d+/categories',
    '/api/establishments/\\d+/categories'
  ];

  return categoryApiPatterns.some(pattern => {
    const regex = new RegExp(pattern);
    return regex.test(req.url);
  });
}

/**
 * Extracts establishment ID from request URL or body
 */
function extractEstablishmentIdFromRequest(req: HttpRequest<unknown>): string | number | undefined {
  // Pattern 1: /api/estabelecimentos/{id}/categories
  let match = req.url.match(/\/api\/estabelecimentos\/(\d+)\/categories/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Pattern 2: /api/establishments/{id}/categories
  match = req.url.match(/\/api\/establishments\/(\d+)\/categories/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Pattern 3: Query parameter
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const establishmentParam = urlParams.get('estabelecimentoId') || urlParams.get('establishmentId');
  if (establishmentParam) {
    return parseInt(establishmentParam, 10);
  }

  // Pattern 4: Request body (for POST/PUT requests)
  if (req.body && typeof req.body === 'object') {
    const body = req.body as any;
    if (body.estabelecimentoId) {
      return body.estabelecimentoId;
    }
    if (body.establishmentId) {
      return body.establishmentId;
    }
  }

  return undefined;
}

/**
 * Validates specific category operations based on request method and context
 */
function validateCategoryOperation(
  req: HttpRequest<unknown>,
  authService: AuthService,
  estabelecimentoService: EstabelecimentoService
): { isValid: boolean; error?: CategorySecurityError } {
  
  const userId = authService.getUserId();
  const selectedEstablishment = estabelecimentoService.getSelectedEstabelecimento();

  // Validate DELETE operations
  if (req.method === 'DELETE') {
    // Extract category ID from URL for delete operations
    const categoryId = extractCategoryIdFromUrl(req.url);
    
    if (categoryId) {
      console.log('🔍 CategorySecurityInterceptor: Validating DELETE operation', {
        categoryId,
        userId,
        establishmentId: selectedEstablishment?.id,
        url: req.url
      });

      // Additional validation could be added here to check if the category
      // belongs to the establishment and user has permission to delete
      // For now, we rely on the backend validation
    }
  }

  // Validate POST/PUT operations (create/update)
  if (req.method === 'POST' || req.method === 'PUT') {
    if (req.body && typeof req.body === 'object') {
      const body = req.body as any;
      
      // Ensure establishment ID in body matches selected establishment
      if (body.estabelecimentoId && selectedEstablishment) {
        if (body.estabelecimentoId !== selectedEstablishment.id) {
          return {
            isValid: false,
            error: CategorySecurityError.establishmentMismatch(
              body.estabelecimentoId,
              selectedEstablishment.id
            )
          };
        }
      }

      // Validate category data structure (basic validation)
      if (req.method === 'POST' && !body.nome) {
        return {
          isValid: false,
          error: new CategorySecurityError(
            'Nome da categoria é obrigatório',
            CategorySecurityErrorCode.INVALID_CATEGORY_OPERATION,
            { field: 'nome', operation: 'create' }
          )
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Adds security-related headers to the request
 */
function addSecurityHeaders(
  req: HttpRequest<unknown>, 
  establishmentId?: number
): HttpRequest<unknown> {
  let headers = req.headers;

  // Add establishment context header if available
  if (establishmentId) {
    headers = headers.set('X-Establishment-Context', establishmentId.toString());
  }

  // Add operation timestamp for audit trails
  headers = headers.set('X-Operation-Timestamp', new Date().toISOString());

  // Add request source identifier
  headers = headers.set('X-Request-Source', 'category-management-client');

  return req.clone({ headers });
}

/**
 * Transforms HTTP errors into category-specific security errors
 */
function transformHttpSecurityError(
  error: any,
  req: HttpRequest<unknown>
): CategorySecurityError | null {
  
  if (!error.status) {
    return null;
  }

  switch (error.status) {
    case 401:
      return new CategorySecurityError(
        'Sessão expirada ou credenciais inválidas',
        CategorySecurityErrorCode.SECURITY_VIOLATION,
        { 
          originalError: error.message,
          url: req.url,
          method: req.method
        }
      );

    case 403:
      // Check if it's an establishment-related forbidden error
      if (error.error?.code === 'ESTABLISHMENT_ACCESS_DENIED' || 
          error.error?.message?.includes('establishment')) {
        return CategorySecurityError.establishmentAccessDenied(
          extractEstablishmentIdFromRequest(req)?.toString() || 'unknown',
          error.error?.message || 'Acesso negado ao estabelecimento'
        );
      }

      return new CategorySecurityError(
        'Acesso negado para esta operação de categoria',
        CategorySecurityErrorCode.CATEGORY_ACCESS_DENIED,
        {
          originalError: error.message,
          url: req.url,
          method: req.method,
          establishmentId: extractEstablishmentIdFromRequest(req)
        }
      );

    case 422:
      if (error.error?.validationErrors) {
        return new CategorySecurityError(
          'Dados inválidos para operação de categoria',
          CategorySecurityErrorCode.INVALID_CATEGORY_OPERATION,
          {
            validationErrors: error.error.validationErrors,
            url: req.url,
            method: req.method
          }
        );
      }
      break;

    case 404:
      // Check if it's a category not found error
      if (req.url.includes('/categories/') && req.method === 'GET') {
        const categoryId = extractCategoryIdFromUrl(req.url);
        return new CategorySecurityError(
          `Categoria não encontrada ou acesso negado`,
          CategorySecurityErrorCode.CATEGORY_ACCESS_DENIED,
          {
            categoryId,
            establishmentId: extractEstablishmentIdFromRequest(req),
            url: req.url
          }
        );
      }
      break;

    case 409:
      if (error.error?.message?.includes('already exists') || 
          error.error?.message?.includes('duplicate')) {
        return new CategorySecurityError(
          'Categoria já existe no estabelecimento',
          CategorySecurityErrorCode.INVALID_CATEGORY_OPERATION,
          {
            originalError: error.error.message,
            establishmentId: extractEstablishmentIdFromRequest(req)
          }
        );
      }
      break;
  }

  return null;
}

/**
 * Extracts category ID from URL
 */
function extractCategoryIdFromUrl(url: string): number | null {
  // Pattern: .../categories/{id} or .../categories/{id}/...
  const match = url.match(/\/categories\/(\d+)(?:\/|$)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Security logging utility for category operations
 */
export class CategorySecurityLogger {
  static logSecurityEvent(
    event: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'SECURITY_VIOLATION',
    details: {
      userId?: string;
      establishmentId?: number;
      categoryId?: number;
      operation?: string;
      url?: string;
      error?: CategorySecurityError;
      additionalData?: any;
    }
  ): void {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      sessionId: crypto.randomUUID(),
      userAgent: navigator.userAgent,
      ...details
    };

    switch (event) {
      case 'ACCESS_GRANTED':
        console.log('✅ Category Security: Access granted', logData);
        break;
      case 'ACCESS_DENIED':
        console.warn('❌ Category Security: Access denied', logData);
        break;
      case 'SECURITY_VIOLATION':
        console.error('🚨 Category Security: Security violation detected', logData);
        // In production, you might want to send this to a security monitoring service
        break;
    }
  }
}

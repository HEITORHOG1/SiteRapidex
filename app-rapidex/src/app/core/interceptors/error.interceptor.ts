import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError, switchMap, retry, timer, of } from "rxjs";
import { AuthService } from "../services/auth.service";
import { ErrorCodes, ApiError } from "../../data-access/models/auth.models";
import { Router } from "@angular/router";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    retry({
      count: shouldRetryRequest(req.url) ? 2 : 0,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Only retry on network errors or 5xx server errors
        if (shouldRetryError(error)) {
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, retryCount - 1) * 1000;
          return timer(delay);
        }
        throw error;
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const apiError = mapHttpErrorToApiError(error);
      
      // Handle unauthorized errors
      if (apiError.code === ErrorCodes.UNAUTHORIZED) {
        // Don't try to refresh token for auth endpoints
        if (!isAuthEndpoint(req.url) && authService.hasRefreshToken() && !authService.isLoading()) {
          return authService.refreshToken().pipe(
            switchMap(() => {
              // Retry the original request with new token
              const newToken = authService.token();
              if (newToken) {
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next(retryReq);
              } else {
                // No new token available, logout
                authService.logout();
                router.navigate(['/auth/login']);
                return throwError(() => apiError);
              }
            }),
            catchError((refreshError) => {
              // If refresh fails, logout and redirect
              console.error('Token refresh failed:', refreshError);
              authService.logout();
              router.navigate(['/auth/login']);
              return throwError(() => apiError);
            })
          );
        } else {
          // No refresh token available or auth endpoint, logout
          authService.logout();
          router.navigate(['/auth/login']);
          return throwError(() => apiError);
        }
      }
      
      // Handle token expired errors
      if (apiError.code === ErrorCodes.TOKEN_EXPIRED) {
        authService.logout();
        router.navigate(['/auth/login']);
        return throwError(() => apiError);
      }
      
      return throwError(() => apiError);
    })
  );
};

/**
 * Determines if a request should be retried based on URL
 */
function shouldRetryRequest(url: string): boolean {
  // Don't retry auth endpoints
  if (isAuthEndpoint(url)) {
    return false;
  }
  
  // Retry other endpoints
  return true;
}

/**
 * Determines if an error should trigger a retry
 */
function shouldRetryError(error: HttpErrorResponse): boolean {
  // Retry on network errors (status 0)
  if (error.status === 0) {
    return true;
  }
  
  // Retry on server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Retry on specific client errors that might be temporary
  if (error.status === 408 || error.status === 429) { // Request timeout or too many requests
    return true;
  }
  
  return false;
}



/**
 * Checks if the request URL is an authentication endpoint
 */
function isAuthEndpoint(url: string): boolean {
  const authEndpoints = [
    '/api/Auth/login',
    '/api/Auth/refresh-token',
    '/api/Auth/register'
  ];
  
  return authEndpoints.some(endpoint => url.includes(endpoint));
}

function mapHttpErrorToApiError(error: HttpErrorResponse): ApiError {
  let code: ErrorCodes;
  let message: string;
  
  switch (error.status) {
    case 0:
      code = ErrorCodes.NETWORK_ERROR;
      message = 'Erro de conexão. Verifique sua internet.';
      break;
    case 401:
      code = ErrorCodes.UNAUTHORIZED;
      message = 'Não autorizado. Faça login novamente.';
      break;
    case 403:
      code = ErrorCodes.UNAUTHORIZED;
      message = 'Acesso negado.';
      break;
    case 400:
      code = ErrorCodes.VALIDATION_ERROR;
      message = error.error?.message || 'Dados inválidos.';
      break;
    case 422:
      code = ErrorCodes.VALIDATION_ERROR;
      message = 'Erro de validação.';
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      code = ErrorCodes.SERVER_ERROR;
      message = 'Erro interno do servidor. Tente novamente.';
      break;
    default:
      code = ErrorCodes.SERVER_ERROR;
      message = error.error?.message || 'Erro inesperado.';
  }
  
  return {
    code,
    message,
    details: error.error,
    timestamp: new Date()
  };
}
import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError, switchMap, retry } from "rxjs";
import { AuthService } from "../services/auth.service";
import { ErrorCodes, ApiError } from "@data-access/models/auth.models";
import { Router } from "@angular/router";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    retry({
      count: 2,
      delay: (error: HttpErrorResponse) => {
        // Only retry on network errors or 5xx server errors
        if (error.status === 0 || (error.status >= 500 && error.status < 600)) {
          return throwError(() => error);
        }
        throw error;
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const apiError = mapHttpErrorToApiError(error);
      
      // Handle specific error cases
      switch (apiError.code) {
        case ErrorCodes.UNAUTHORIZED:
          // Try to refresh token if we have one
          const currentState = authService.authState();
          if (authService.token() && !req.url.includes('/refresh-token')) {
            return authService.refreshToken().pipe(
              switchMap(() => {
                // Retry the original request with new token
                const newToken = authService.token();
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next(retryReq);
              }),
              catchError(() => {
                // If refresh fails, logout and redirect
                authService.logout();
                router.navigate(['/auth/login']);
                return throwError(() => apiError);
              })
            );
          } else {
            // No refresh token available, logout
            authService.logout();
            router.navigate(['/auth/login']);
          }
          break;
          
        case ErrorCodes.TOKEN_EXPIRED:
          authService.logout();
          router.navigate(['/auth/login']);
          break;
      }
      
      return throwError(() => apiError);
    })
  );
};

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
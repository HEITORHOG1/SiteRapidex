import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";
import { NetworkStatusService } from "../services/network-status.service";
import { Router } from "@angular/router";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const networkStatusService = inject(NetworkStatusService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle unauthorized errors - simple logout and redirect
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/auth/login']);
        return throwError(() => new Error('Sessão expirada. Faça login novamente.'));
      }
      
      // Handle other HTTP errors with clear messages for always-online app
      let errorMessage = 'Erro desconhecido';
      
      if (error.status === 0) {
        errorMessage = networkStatusService.getNetworkErrorMessage();
      } else if (error.status === 403) {
        errorMessage = 'Acesso negado.';
      } else if (error.status === 400) {
        errorMessage = error.error?.message || 'Dados inválidos.';
      } else if (error.status >= 500) {
        errorMessage = 'Erro no servidor. Tente novamente em alguns instantes.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      return throwError(() => new Error(errorMessage));
    })
  );
};






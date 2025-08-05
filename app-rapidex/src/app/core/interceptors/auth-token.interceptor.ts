import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";
import { switchMap, catchError, throwError } from "rxjs";

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip auth for login and refresh token endpoints
  if (req.url.includes('/api/Auth/login') || req.url.includes('/api/Auth/refresh-token')) {
    return next(req);
  }
  
  const token = authService.token();
  
  if (token) {
    // Check if token needs refresh before making the request
    if (authService.shouldRefreshToken() && !authService.isLoading()) {
      return authService.refreshToken().pipe(
        switchMap(() => {
          const newToken = authService.token();
          const authReq = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` }
          });
          return next(authReq);
        }),
        catchError(error => {
          // If refresh fails, proceed with original token
          const authReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
          });
          return next(authReq);
        })
      );
    } else {
      // Add token to request
      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next(authReq);
    }
  }
  
  return next(req);
};

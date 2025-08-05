import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";
import { switchMap, catchError, throwError, of } from "rxjs";

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip auth for login and refresh token endpoints
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }
  
  const token = authService.token();
  
  if (token) {
    // Check if token needs refresh before making the request
    if (authService.shouldRefreshToken() && !authService.isLoading()) {
      return authService.refreshToken().pipe(
        switchMap(() => {
          const newToken = authService.token();
          if (newToken) {
            const authReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` }
            });
            return next(authReq);
          } else {
            // If no new token after refresh, proceed without auth
            return next(req);
          }
        }),
        catchError(error => {
          // If refresh fails, proceed with original token
          // The error interceptor will handle token expiration errors
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
  
  // No token available, proceed without auth
  return next(req);
};

/**
 * Checks if the request URL is an authentication endpoint that should not have auth headers
 */
function isAuthEndpoint(url: string): boolean {
  const authEndpoints = [
    '/api/Auth/login',
    '/api/Auth/refresh-token',
    '/api/Auth/register'
  ];
  
  return authEndpoints.some(endpoint => url.includes(endpoint));
}

import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { categorySecurityInterceptor } from './features/categories/interceptors/category-security.interceptor';
import { categoryEstablishmentInterceptor } from './features/categories/interceptors/category-establishment.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authTokenInterceptor, 
        categoryEstablishmentInterceptor,
        categorySecurityInterceptor,
        errorInterceptor
      ])
    )
  ]
};

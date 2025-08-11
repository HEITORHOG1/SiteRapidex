# Design Document - Limpeza e Otimização do Projeto Angular

## Overview

Este documento descreve a arquitetura e abordagem técnica para limpar e otimizar o projeto Angular Rapidex. O foco principal é adaptar o frontend para o novo formato de resposta padronizado da API, corrigir warnings de SCSS, remover código desnecessário e garantir que o projeto seja simples, leve e sempre online.

## Architecture

### API Response Standardization

A API agora retorna respostas padronizadas no formato:
```typescript
{
  "success": boolean,
  "message": string,
  "data": T,
  "errors": string[],
  "timestamp": string
}
```

### Component Structure

```
src/app/
├── core/
│   ├── interceptors/
│   │   ├── api-response.interceptor.ts (NEW)
│   │   ├── auth-token.interceptor.ts (UPDATED)
│   │   └── error.interceptor.ts (UPDATED)
│   ├── models/
│   │   ├── api-response.models.ts (NEW)
│   │   └── auth.models.ts (UPDATED)
│   └── services/
│       └── auth.service.ts (UPDATED)
├── data-access/
│   └── api/
│       └── *.api.ts (ALL UPDATED)
├── features/
│   ├── auth/
│   └── dashboard/
├── shared/
│   └── ui/ (CLEANED UP)
└── styles/ (MODERNIZED SCSS)
```

## Components and Interfaces

### New API Response Models

```typescript
// api-response.models.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
  timestamp: string;
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}
```

### Updated Auth Models

```typescript
// auth.models.ts - Updated to work with new API format
export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  roles: string[];
  user: UserInfo;
}

// The API now returns this wrapped in ApiResponse<LoginResponse>
```

### API Response Interceptor

```typescript
// api-response.interceptor.ts
export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse) {
        const body = event.body;
        
        // Check if response follows the new API format
        if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
          if (body.success) {
            // Return only the data for successful responses
            return event.clone({ body: body.data });
          } else {
            // Throw error for unsuccessful responses
            throw new Error(body.message || 'API Error');
          }
        }
      }
      return event;
    }),
    catchError((error: HttpErrorResponse) => {
      // Handle API error format
      if (error.error && typeof error.error === 'object' && 'errors' in error.error) {
        const apiError = error.error;
        const errorMessage = apiError.errors?.length > 0 
          ? apiError.errors.join(', ')
          : apiError.message || 'Erro desconhecido';
        
        return throwError(() => new Error(errorMessage));
      }
      return throwError(() => error);
    })
  );
};
```

## Data Models

### Environment Configuration

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5283/api',
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
};
```

### SCSS Modernization

#### Color Functions Migration

```scss
// OLD (deprecated)
background: lighten($primary-color, 45%);
border: 1px solid darken($primary-color, 10%);

// NEW (modern)
@use 'sass:color';
background: color.adjust($primary-color, $lightness: 45%);
border: 1px solid color.adjust($primary-color, $lightness: -10%);
```

#### Import Modernization

```scss
// OLD (deprecated)
@import 'styles/tokens';
@import 'styles/mixins';

// NEW (modern)
@use 'styles/tokens';
@use 'styles/mixins';
```

## Error Handling

### Centralized Error Processing

```typescript
// error.interceptor.ts - Updated
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Erro desconhecido';
      
      if (error.status === 401) {
        // Handle unauthorized - redirect to login
        const router = inject(Router);
        router.navigateByUrl('/auth/login');
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.status === 0) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      return throwError(() => new Error(errorMessage));
    })
  );
};
```

## Testing Strategy

### Unit Tests Updates

1. **Auth Service Tests**: Update to handle new API response format
2. **Component Tests**: Remove tests for unused components/directives
3. **Interceptor Tests**: Add tests for new API response interceptor

### Integration Tests

1. **Login Flow**: Test complete login → dashboard flow with new API format
2. **Error Handling**: Test error scenarios with new error format
3. **Token Refresh**: Test automatic token refresh with new format

## Performance Optimizations

### Bundle Size Reduction

1. **Remove Unused Dependencies**:
   - Remove Playwright if not used for E2E
   - Remove unused Angular Material components
   - Remove unused accessibility directives

2. **Code Splitting**:
   - Ensure proper lazy loading for feature modules
   - Remove unused imports and dead code

3. **SCSS Optimization**:
   - Remove duplicate styles
   - Use modern SCSS functions
   - Optimize CSS output

### Runtime Performance

1. **Simplified Main.ts**:
   ```typescript
   // Simplified version without complex monitoring
   import { bootstrapApplication } from '@angular/platform-browser';
   import { appConfig } from './app/app.config';
   import { App } from './app/app';

   bootstrapApplication(App, appConfig)
     .catch((err) => console.error(err));
   ```

2. **Optimized Change Detection**:
   - Use OnPush strategy where possible
   - Remove unnecessary subscriptions

## Migration Plan

### Phase 1: API Response Format
1. Create new API response models
2. Implement API response interceptor
3. Update auth service to handle new format
4. Test login flow

### Phase 2: SCSS Modernization
1. Update all SCSS files to use modern functions
2. Replace @import with @use
3. Test visual consistency

### Phase 3: Code Cleanup
1. Remove unused components and directives
2. Clean up imports
3. Remove offline functionality
4. Simplify main.ts

### Phase 4: Optimization
1. Analyze and remove unused dependencies
2. Optimize bundle size
3. Performance testing

## Security Considerations

1. **Token Handling**: Maintain secure token storage and refresh
2. **API Communication**: Ensure all API calls use HTTPS in production
3. **Error Messages**: Don't expose sensitive information in error messages
4. **Input Validation**: Maintain client-side validation for better UX

## Monitoring and Logging

1. **Simplified Logging**: Use browser dev tools instead of custom monitoring
2. **Error Tracking**: Basic error logging for debugging
3. **Performance Metrics**: Use browser performance APIs when needed

## Deployment Considerations

1. **Environment Configuration**: Clear separation between dev and prod
2. **Build Optimization**: Ensure production builds are optimized
3. **API URL Configuration**: Flexible API URL configuration for different environments
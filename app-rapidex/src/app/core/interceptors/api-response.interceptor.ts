import { HttpInterceptorFn, HttpEvent, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { isApiResponse } from '../../data-access/models/api-response.models';

/**
 * API Response Interceptor
 * 
 * Transforms API responses to extract data from the standardized ApiResponse wrapper format.
 * For successful responses (success: true), it extracts and returns only the data field.
 * For failed responses (success: false), it throws an error with the error messages.
 */
export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse) {
        const body = event.body;
        
        // Check if response follows the new ApiResponse format
        if (isApiResponse(body)) {
          if (body.success) {
            // For successful responses, return only the data
            return event.clone({ body: body.data });
          } else {
            // For unsuccessful responses, throw error with messages
            const errorMessage = body.errors && body.errors.length > 0 
              ? body.errors.join(', ')
              : body.message || 'Erro da API';
            
            throw new Error(errorMessage);
          }
        }
        
        // If response doesn't follow ApiResponse format, return as-is
        return event;
      }
      return event;
    })
  );
};
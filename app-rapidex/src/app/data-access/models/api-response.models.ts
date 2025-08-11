/**
 * Standard API Response Models
 * 
 * These models define the standardized format for all API responses
 * following the new backend API structure.
 */

/**
 * Standard API response wrapper that all endpoints return
 * @template T The type of data contained in the response
 */
export interface ApiResponse<T = any> {
  /** Indicates if the request was successful */
  success: boolean;
  
  /** Human-readable message about the operation */
  message: string;
  
  /** The actual data payload (only present when success is true) */
  data: T;
  
  /** Array of error messages (only present when success is false) */
  errors: string[];
  
  /** ISO timestamp of when the response was generated */
  timestamp: string;
}

/**
 * Individual error information within the API response
 */
export interface ApiError {
  /** Optional field name that caused the error */
  field?: string;
  
  /** Error message describing what went wrong */
  message: string;
  
  /** Optional error code for programmatic handling */
  code?: string;
  
  /** Optional additional error details */
  details?: any;
  
  /** Optional timestamp when the error occurred */
  timestamp?: Date;
}

/**
 * Type guard to check if a response follows the ApiResponse format
 */
export function isApiResponse(obj: any): obj is ApiResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    typeof obj.message === 'string' &&
    'data' in obj &&
    Array.isArray(obj.errors) &&
    typeof obj.timestamp === 'string'
  );
}

/**
 * Helper type for successful API responses
 */
export type SuccessApiResponse<T> = ApiResponse<T> & {
  success: true;
  data: T;
  errors: [];
};

/**
 * Helper type for failed API responses
 */
export type ErrorApiResponse = ApiResponse<null> & {
  success: false;
  data: null;
  errors: string[];
};
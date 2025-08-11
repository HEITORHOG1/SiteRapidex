import { ApiResponse, ApiError, isApiResponse, SuccessApiResponse, ErrorApiResponse } from './api-response.models';

describe('ApiResponse Models', () => {
  describe('ApiResponse interface', () => {
    it('should define the correct structure', () => {
      const mockResponse: ApiResponse<string> = {
        success: true,
        message: 'Operation successful',
        data: 'test data',
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.message).toBe('Operation successful');
      expect(mockResponse.data).toBe('test data');
      expect(mockResponse.errors).toEqual([]);
      expect(mockResponse.timestamp).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('ApiError interface', () => {
    it('should define the correct structure', () => {
      const mockError: ApiError = {
        field: 'username',
        message: 'Username is required',
        code: 'REQUIRED_FIELD'
      };

      expect(mockError.field).toBe('username');
      expect(mockError.message).toBe('Username is required');
      expect(mockError.code).toBe('REQUIRED_FIELD');
    });

    it('should work with optional fields', () => {
      const mockError: ApiError = {
        message: 'General error'
      };

      expect(mockError.message).toBe('General error');
      expect(mockError.field).toBeUndefined();
      expect(mockError.code).toBeUndefined();
    });
  });

  describe('isApiResponse type guard', () => {
    it('should return true for valid ApiResponse', () => {
      const validResponse = {
        success: true,
        message: 'Success',
        data: { id: 1 },
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      expect(isApiResponse(validResponse)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isApiResponse(null)).toBe(false);
      expect(isApiResponse(undefined)).toBe(false);
      expect(isApiResponse({})).toBe(false);
      expect(isApiResponse({ success: true })).toBe(false);
      expect(isApiResponse({ success: 'true', message: 'test' })).toBe(false);
    });
  });

  describe('SuccessApiResponse type', () => {
    it('should enforce success: true', () => {
      const successResponse: SuccessApiResponse<{ id: number }> = {
        success: true,
        message: 'Success',
        data: { id: 1 },
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toEqual({ id: 1 });
      expect(successResponse.errors).toEqual([]);
    });
  });

  describe('ErrorApiResponse type', () => {
    it('should enforce success: false and data: null', () => {
      const errorResponse: ErrorApiResponse = {
        success: false,
        message: 'Error occurred',
        data: null,
        errors: ['Validation failed'],
        timestamp: '2024-01-01T00:00:00Z'
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.data).toBe(null);
      expect(errorResponse.errors).toEqual(['Validation failed']);
    });
  });
});
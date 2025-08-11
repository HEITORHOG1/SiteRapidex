import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiResponseInterceptor } from './api-response.interceptor';
import { ApiResponse } from '../../data-access/models/api-response.models';

describe('ApiResponseInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('Successful API Responses', () => {
    it('should extract data from successful ApiResponse', () => {
      const testData = { id: 1, name: 'Test' };
      const apiResponse: ApiResponse<typeof testData> = {
        success: true,
        message: 'Success',
        data: testData,
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      httpClient.get('/test').subscribe(response => {
        expect(response).toEqual(testData);
      });

      const req = httpTestingController.expectOne('/test');
      req.flush(apiResponse);
    });

    it('should handle successful response with null data', () => {
      const apiResponse: ApiResponse<null> = {
        success: true,
        message: 'Success',
        data: null,
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      httpClient.get('/test').subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpTestingController.expectOne('/test');
      req.flush(apiResponse);
    });
  });

  describe('Failed API Responses', () => {
    it('should throw error for unsuccessful ApiResponse with errors array', () => {
      const apiResponse: ApiResponse<null> = {
        success: false,
        message: 'Validation failed',
        data: null,
        errors: ['Field is required', 'Invalid format'],
        timestamp: '2024-01-01T00:00:00Z'
      };

      httpClient.get('/test').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error: Error) => {
          expect(error.message).toBe('Field is required, Invalid format');
        }
      });

      const req = httpTestingController.expectOne('/test');
      req.flush(apiResponse);
    });

    it('should throw error for unsuccessful ApiResponse with empty errors array', () => {
      const apiResponse: ApiResponse<null> = {
        success: false,
        message: 'Something went wrong',
        data: null,
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      httpClient.get('/test').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error: Error) => {
          expect(error.message).toBe('Something went wrong');
        }
      });

      const req = httpTestingController.expectOne('/test');
      req.flush(apiResponse);
    });

    it('should handle unsuccessful ApiResponse with no message', () => {
      const apiResponse: ApiResponse<null> = {
        success: false,
        message: '',
        data: null,
        errors: [],
        timestamp: '2024-01-01T00:00:00Z'
      };

      httpClient.get('/test').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error: Error) => {
          expect(error.message).toBe('Erro desconhecido da API');
        }
      });

      const req = httpTestingController.expectOne('/test');
      req.flush(apiResponse);
    });
  });

  describe('HTTP Error Responses', () => {
    it('should handle HTTP error with ApiResponse in error body', () => {
      const apiErrorResponse: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null,
        errors: ['Invalid token'],
        timestamp: '2024-01-01T00:00:00Z'
      };

      httpClient.get('/test').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error: Error) => {
          expect(error.message).toBe('Invalid token');
        }
      });

      const req = httpTestingController.expectOne('/test');
      req.flush(apiErrorResponse, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle network error (status 0)', () => {
      httpClient.get('/test').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error: Error) => {
          expect(error.message).toBe('Erro de conexão. Verifique sua internet.');
        }
      });

      const req = httpTestingController.expectOne('/test');
      req.error(new ProgressEvent('error'), { status: 0 });
    });

    it('should handle 4xx client errors', () => {
      httpClient.get('/test').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error: Error) => {
          expect(error.message).toBe('Erro do cliente (404)');
        }
      });

      const req = httpTestingController.expectOne('/test');
      req.error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });
    });

    it('should handle 5xx server errors', () => {
      httpClient.get('/test').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error: Error) => {
          expect(error.message).toBe('Erro interno do servidor. Tente novamente mais tarde.');
        }
      });

      const req = httpTestingController.expectOne('/test');
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Backward Compatibility', () => {
    it('should pass through non-ApiResponse responses unchanged', () => {
      const legacyResponse = { id: 1, name: 'Legacy' };

      httpClient.get('/test').subscribe(response => {
        expect(response).toEqual(legacyResponse);
      });

      const req = httpTestingController.expectOne('/test');
      req.flush(legacyResponse);
    });

    it('should handle responses that partially match ApiResponse format', () => {
      const partialResponse = { success: true, data: 'test' }; // Missing required fields

      httpClient.get('/test').subscribe(response => {
        expect(response).toEqual(partialResponse);
      });

      const req = httpTestingController.expectOne('/test');
      req.flush(partialResponse);
    });
  });
});
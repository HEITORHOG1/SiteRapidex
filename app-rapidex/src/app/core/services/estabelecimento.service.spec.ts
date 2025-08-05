import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, timer } from 'rxjs';
import { EstabelecimentoService } from './estabelecimento.service';
import { EstabelecimentoApi } from '../../data-access/api/estabelecimento.api';
import { Estabelecimento } from '../../data-access/models/estabelecimento.models';
import { ErrorCodes, ApiError } from '../../data-access/models/auth.models';

describe('EstabelecimentoService', () => {
  let service: EstabelecimentoService;
  let mockApi: jasmine.SpyObj<EstabelecimentoApi>;

  const mockEstabelecimento: Estabelecimento = {
    id: 1,
    usuarioId: 'user123',
    razaoSocial: 'Test Razão Social',
    nomeFantasia: 'Test Nome Fantasia',
    cnpj: '12345678901234',
    telefone: '11999999999',
    endereco: 'Test Address',
    status: true,
    cep: '12345678',
    numero: '123',
    dataCadastro: '2024-01-01',
    latitude: -23.5505,
    longitude: -46.6333,
    raioEntregaKm: 5,
    taxaEntregaFixa: 10.0,
    descricao: 'Test Description'
  };

  const mockEstabelecimentos: Estabelecimento[] = [
    mockEstabelecimento,
    { ...mockEstabelecimento, id: 2, nomeFantasia: 'Test Nome Fantasia 2' }
  ];

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('EstabelecimentoApi', [
      'getEstabelecimentosByProprietario',
      'getEstabelecimentoById'
    ]);

    TestBed.configureTestingModule({
      providers: [
        EstabelecimentoService,
        { provide: EstabelecimentoApi, useValue: apiSpy }
      ]
    });

    service = TestBed.inject(EstabelecimentoService);
    mockApi = TestBed.inject(EstabelecimentoApi) as jasmine.SpyObj<EstabelecimentoApi>;

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have initial empty states', () => {
      expect(service.getEstabelecimentos()).toEqual([]);
      expect(service.getSelectedEstabelecimento()).toBeNull();
      expect(service.isLoadingEstabelecimentos()).toBeFalse();
      expect(service.isLoadingEstabelecimentoById()).toBeFalse();
      expect(service.getLoadingState()).toEqual({ isLoading: false });
      expect(service.getErrorState()).toEqual({ hasError: false });
    });
  });

  describe('loadEstabelecimentosForProprietario', () => {
    it('should load estabelecimentos successfully', (done) => {
      mockApi.getEstabelecimentosByProprietario.and.returnValue(of(mockEstabelecimentos));

      service.loadEstabelecimentosForProprietario('user123').subscribe({
        next: (estabelecimentos) => {
          expect(estabelecimentos).toEqual(mockEstabelecimentos);
          expect(service.getEstabelecimentos()).toEqual(mockEstabelecimentos);
          expect(service.getSelectedEstabelecimento()).toEqual(mockEstabelecimentos[0]);
          expect(service.isLoadingEstabelecimentos()).toBeFalse();
          expect(service.getLoadingState().isLoading).toBeFalse();
          expect(service.getErrorState().hasError).toBeFalse();
          done();
        }
      });
    });

    it('should set loading states during request', () => {
      mockApi.getEstabelecimentosByProprietario.and.returnValue(timer(100).pipe(() => of(mockEstabelecimentos)));

      service.loadEstabelecimentosForProprietario('user123').subscribe();

      expect(service.isLoadingEstabelecimentos()).toBeTrue();
      expect(service.getLoadingState().isLoading).toBeTrue();
      expect(service.getLoadingState().message).toBe('Carregando estabelecimentos...');
    });

    it('should handle network errors with retry', (done) => {
      const networkError = new HttpErrorResponse({
        status: 0,
        statusText: 'Network Error'
      });

      let callCount = 0;
      mockApi.getEstabelecimentosByProprietario.and.callFake(() => {
        callCount++;
        if (callCount <= 2) {
          return throwError(() => networkError);
        }
        return of(mockEstabelecimentos);
      });

      service.loadEstabelecimentosForProprietario('user123').subscribe({
        next: (estabelecimentos) => {
          expect(estabelecimentos).toEqual(mockEstabelecimentos);
          expect(callCount).toBe(3); // Initial call + 2 retries
          done();
        }
      });
    });

    it('should handle server errors and set error state', (done) => {
      const serverError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      mockApi.getEstabelecimentosByProprietario.and.returnValue(throwError(() => serverError));

      service.loadEstabelecimentosForProprietario('user123', 0).subscribe({
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
          expect(error.message).toBe('Erro interno do servidor. Tente novamente.');
          expect(service.getErrorState().hasError).toBeTrue();
          expect(service.getErrorState().code).toBe(ErrorCodes.SERVER_ERROR);
          expect(service.isLoadingEstabelecimentos()).toBeFalse();
          expect(service.getLoadingState().isLoading).toBeFalse();
          done();
        }
      });
    });

    it('should handle unauthorized errors', (done) => {
      const unauthorizedError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });

      mockApi.getEstabelecimentosByProprietario.and.returnValue(throwError(() => unauthorizedError));

      service.loadEstabelecimentosForProprietario('user123', 0).subscribe({
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(error.message).toBe('Não autorizado. Faça login novamente.');
          expect(service.getErrorState().hasError).toBeTrue();
          done();
        }
      });
    });

    it('should handle validation errors', (done) => {
      const validationError = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid proprietario ID' }
      });

      mockApi.getEstabelecimentosByProprietario.and.returnValue(throwError(() => validationError));

      service.loadEstabelecimentosForProprietario('user123', 0).subscribe({
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
          expect(error.message).toBe('Invalid proprietario ID');
          expect(service.getErrorState().hasError).toBeTrue();
          done();
        }
      });
    });

    it('should not select first estabelecimento if one is already selected', (done) => {
      service.selectEstabelecimento(mockEstabelecimentos[1]);
      mockApi.getEstabelecimentosByProprietario.and.returnValue(of(mockEstabelecimentos));

      service.loadEstabelecimentosForProprietario('user123').subscribe({
        next: () => {
          expect(service.getSelectedEstabelecimento()).toEqual(mockEstabelecimentos[1]);
          done();
        }
      });
    });
  });

  describe('getEstabelecimentoById', () => {
    it('should get estabelecimento by ID successfully', (done) => {
      mockApi.getEstabelecimentoById.and.returnValue(of(mockEstabelecimento));

      service.getEstabelecimentoById('1').subscribe({
        next: (estabelecimento) => {
          expect(estabelecimento).toEqual(mockEstabelecimento);
          expect(service.isLoadingEstabelecimentoById()).toBeFalse();
          expect(service.getErrorState().hasError).toBeFalse();
          done();
        }
      });
    });

    it('should set loading state during request', () => {
      mockApi.getEstabelecimentoById.and.returnValue(timer(100).pipe(() => of(mockEstabelecimento)));

      service.getEstabelecimentoById('1').subscribe();

      expect(service.isLoadingEstabelecimentoById()).toBeTrue();
    });

    it('should handle errors with retry', (done) => {
      const networkError = new HttpErrorResponse({
        status: 0,
        statusText: 'Network Error'
      });

      let callCount = 0;
      mockApi.getEstabelecimentoById.and.callFake(() => {
        callCount++;
        if (callCount <= 2) {
          return throwError(() => networkError);
        }
        return of(mockEstabelecimento);
      });

      service.getEstabelecimentoById('1').subscribe({
        next: (estabelecimento) => {
          expect(estabelecimento).toEqual(mockEstabelecimento);
          expect(callCount).toBe(3); // Initial call + 2 retries
          done();
        }
      });
    });

    it('should handle errors and set error state', (done) => {
      const notFoundError = new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found'
      });

      mockApi.getEstabelecimentoById.and.returnValue(throwError(() => notFoundError));

      service.getEstabelecimentoById('1', 0).subscribe({
        error: (error: ApiError) => {
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
          expect(error.message).toBe('Erro ao carregar estabelecimento 1');
          expect(service.getErrorState().hasError).toBeTrue();
          expect(service.isLoadingEstabelecimentoById()).toBeFalse();
          done();
        }
      });
    });
  });

  describe('selectEstabelecimento', () => {
    it('should select estabelecimento and save to localStorage', () => {
      service.selectEstabelecimento(mockEstabelecimento);

      expect(service.getSelectedEstabelecimento()).toEqual(mockEstabelecimento);
      
      const stored = localStorage.getItem('selectedEstabelecimento');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockEstabelecimento);
    });

    it('should emit selected estabelecimento through observable', (done) => {
      service.selectedEstabelecimento$.subscribe(estabelecimento => {
        if (estabelecimento) {
          expect(estabelecimento).toEqual(mockEstabelecimento);
          done();
        }
      });

      service.selectEstabelecimento(mockEstabelecimento);
    });
  });

  describe('loadSelectedEstabelecimentoFromStorage', () => {
    it('should load estabelecimento from localStorage', () => {
      localStorage.setItem('selectedEstabelecimento', JSON.stringify(mockEstabelecimento));

      service.loadSelectedEstabelecimentoFromStorage();

      expect(service.getSelectedEstabelecimento()).toEqual(mockEstabelecimento);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('selectedEstabelecimento', 'invalid-json');
      spyOn(console, 'error');

      service.loadSelectedEstabelecimentoFromStorage();

      expect(service.getSelectedEstabelecimento()).toBeNull();
      expect(console.error).toHaveBeenCalled();
      expect(localStorage.getItem('selectedEstabelecimento')).toBeNull();
    });

    it('should handle missing localStorage item', () => {
      service.loadSelectedEstabelecimentoFromStorage();

      expect(service.getSelectedEstabelecimento()).toBeNull();
    });
  });

  describe('clearEstabelecimentos', () => {
    it('should clear all states and localStorage', () => {
      // Set up some state
      service.selectEstabelecimento(mockEstabelecimento);
      localStorage.setItem('selectedEstabelecimento', JSON.stringify(mockEstabelecimento));

      service.clearEstabelecimentos();

      expect(service.getEstabelecimentos()).toEqual([]);
      expect(service.getSelectedEstabelecimento()).toBeNull();
      expect(service.isLoadingEstabelecimentos()).toBeFalse();
      expect(service.isLoadingEstabelecimentoById()).toBeFalse();
      expect(service.getLoadingState().isLoading).toBeFalse();
      expect(service.getErrorState().hasError).toBeFalse();
      expect(localStorage.getItem('selectedEstabelecimento')).toBeNull();
    });
  });

  describe('retry methods', () => {
    it('should retry loading estabelecimentos', (done) => {
      mockApi.getEstabelecimentosByProprietario.and.returnValue(of(mockEstabelecimentos));

      service.retryLoadEstabelecimentos('user123').subscribe({
        next: (estabelecimentos) => {
          expect(estabelecimentos).toEqual(mockEstabelecimentos);
          expect(mockApi.getEstabelecimentosByProprietario).toHaveBeenCalledWith('user123');
          done();
        }
      });
    });

    it('should retry getting estabelecimento by ID', (done) => {
      mockApi.getEstabelecimentoById.and.returnValue(of(mockEstabelecimento));

      service.retryGetEstabelecimentoById('1').subscribe({
        next: (estabelecimento) => {
          expect(estabelecimento).toEqual(mockEstabelecimento);
          expect(mockApi.getEstabelecimentoById).toHaveBeenCalledWith('1');
          done();
        }
      });
    });
  });

  describe('observables', () => {
    it('should emit estabelecimentos through observable', (done) => {
      mockApi.getEstabelecimentosByProprietario.and.returnValue(of(mockEstabelecimentos));

      service.estabelecimentos$.subscribe(estabelecimentos => {
        if (estabelecimentos.length > 0) {
          expect(estabelecimentos).toEqual(mockEstabelecimentos);
          done();
        }
      });

      service.loadEstabelecimentosForProprietario('user123').subscribe();
    });

    it('should emit loading state through observable', (done) => {
      mockApi.getEstabelecimentosByProprietario.and.returnValue(timer(50).pipe(() => of(mockEstabelecimentos)));

      let loadingStates: boolean[] = [];
      service.loadingEstabelecimentos$.subscribe(loading => {
        loadingStates.push(loading);
        if (loadingStates.length === 2) {
          expect(loadingStates).toEqual([true, false]);
          done();
        }
      });

      service.loadEstabelecimentosForProprietario('user123').subscribe();
    });

    it('should emit error state through observable', (done) => {
      const serverError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      mockApi.getEstabelecimentosByProprietario.and.returnValue(throwError(() => serverError));

      service.errorState$.subscribe(errorState => {
        if (errorState.hasError) {
          expect(errorState.hasError).toBeTrue();
          expect(errorState.code).toBe(ErrorCodes.SERVER_ERROR);
          expect(errorState.message).toBe('Erro interno do servidor. Tente novamente.');
          done();
        }
      });

      service.loadEstabelecimentosForProprietario('user123', 0).subscribe({
        error: () => {} // Handle error to prevent test failure
      });
    });
  });

  describe('error mapping', () => {
    it('should map ApiError correctly when already an ApiError', (done) => {
      const apiError: ApiError = {
        code: ErrorCodes.NETWORK_ERROR,
        message: 'Custom network error',
        timestamp: new Date()
      };

      mockApi.getEstabelecimentosByProprietario.and.returnValue(throwError(() => apiError));

      service.loadEstabelecimentosForProprietario('user123', 0).subscribe({
        error: (error: ApiError) => {
          expect(error).toEqual(apiError);
          done();
        }
      });
    });

    it('should map different HTTP status codes correctly', (done) => {
      const testCases = [
        { status: 0, expectedCode: ErrorCodes.NETWORK_ERROR },
        { status: 401, expectedCode: ErrorCodes.UNAUTHORIZED },
        { status: 403, expectedCode: ErrorCodes.UNAUTHORIZED },
        { status: 400, expectedCode: ErrorCodes.VALIDATION_ERROR },
        { status: 422, expectedCode: ErrorCodes.VALIDATION_ERROR },
        { status: 500, expectedCode: ErrorCodes.SERVER_ERROR },
        { status: 502, expectedCode: ErrorCodes.SERVER_ERROR },
        { status: 999, expectedCode: ErrorCodes.SERVER_ERROR }
      ];

      let completedTests = 0;
      
      testCases.forEach((testCase, index) => {
        const error = new HttpErrorResponse({
          status: testCase.status,
          statusText: 'Test Error'
        });

        mockApi.getEstabelecimentoById.and.returnValue(throwError(() => error));

        service.getEstabelecimentoById(`${index}`, 0).subscribe({
          error: (apiError: ApiError) => {
            expect(apiError.code).toBe(testCase.expectedCode);
            completedTests++;
            if (completedTests === testCases.length) {
              done();
            }
          }
        });
      });
    });
  });
});
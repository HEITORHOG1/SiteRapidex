import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EstabelecimentoService } from './estabelecimento.service';
import { EstabelecimentoApi } from '../../data-access/api/estabelecimento.api';
import { ApiConfigService } from './api-config.service';
import { Estabelecimento } from '../../data-access/models/estabelecimento.models';
import { ErrorCodes } from '../../data-access/models/auth.models';

describe('EstabelecimentoService Integration', () => {
  let service: EstabelecimentoService;
  let httpMock: HttpTestingController;
  let apiConfigService: ApiConfigService;

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        EstabelecimentoService,
        EstabelecimentoApi,
        ApiConfigService
      ]
    });

    service = TestBed.inject(EstabelecimentoService);
    httpMock = TestBed.inject(HttpTestingController);
    apiConfigService = TestBed.inject(ApiConfigService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Real HTTP Integration', () => {
    it('should load estabelecimentos with proper HTTP request', (done) => {
      const mockEstabelecimentos = [mockEstabelecimento];
      const expectedUrl = apiConfigService.getConfiguredEndpoint('estabelecimento', 'byProprietario', { userId: 'user123' });

      service.loadEstabelecimentosForProprietario('user123').subscribe({
        next: (estabelecimentos) => {
          expect(estabelecimentos).toEqual(mockEstabelecimentos);
          expect(service.getEstabelecimentos()).toEqual(mockEstabelecimentos);
          expect(service.getSelectedEstabelecimento()).toEqual(mockEstabelecimentos[0]);
          done();
        }
      });

      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockEstabelecimentos);
    });

    it('should handle HTTP errors and set proper error state', (done) => {
      const expectedUrl = apiConfigService.getConfiguredEndpoint('estabelecimento', 'byProprietario', { userId: 'user123' });

      service.loadEstabelecimentosForProprietario('user123', 0).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
          expect(service.getErrorState().hasError).toBeTrue();
          expect(service.getErrorState().code).toBe(ErrorCodes.SERVER_ERROR);
          expect(service.isLoadingEstabelecimentos()).toBeFalse();
          done();
        }
      });

      const req = httpMock.expectOne(expectedUrl);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should get estabelecimento by ID with proper HTTP request', (done) => {
      const expectedUrl = apiConfigService.getConfiguredEndpoint('estabelecimento', 'byId', { id: '1' });

      service.getEstabelecimentoById('1').subscribe({
        next: (estabelecimento) => {
          expect(estabelecimento).toEqual(mockEstabelecimento);
          expect(service.isLoadingEstabelecimentoById()).toBeFalse();
          done();
        }
      });

      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockEstabelecimento);
    });

    it('should handle network errors with proper retry mechanism', (done) => {
      const expectedUrl = apiConfigService.getConfiguredEndpoint('estabelecimento', 'byProprietario', { userId: 'user123' });
      let requestCount = 0;

      service.loadEstabelecimentosForProprietario('user123', 2).subscribe({
        next: (estabelecimentos) => {
          expect(estabelecimentos).toEqual([mockEstabelecimento]);
          expect(requestCount).toBe(3); // Initial + 2 retries
          done();
        }
      });

      // Handle multiple requests due to retry mechanism
      httpMock.match(expectedUrl).forEach((req, index) => {
        requestCount++;
        if (index < 2) {
          // First two requests fail
          req.error(new ProgressEvent('Network error'), { status: 0 });
        } else {
          // Third request succeeds
          req.flush([mockEstabelecimento]);
        }
      });
    });
  });

  describe('State Management Integration', () => {
    it('should properly manage loading states throughout the request lifecycle', (done) => {
      const mockEstabelecimentos = [mockEstabelecimento];
      const expectedUrl = apiConfigService.getConfiguredEndpoint('estabelecimento', 'byProprietario', { userId: 'user123' });
      
      let loadingStates: boolean[] = [];
      let generalLoadingStates: boolean[] = [];

      // Subscribe to loading states
      service.loadingEstabelecimentos$.subscribe(loading => {
        loadingStates.push(loading);
      });

      service.loadingState$.subscribe(state => {
        generalLoadingStates.push(state.isLoading);
      });

      service.loadEstabelecimentosForProprietario('user123').subscribe({
        next: () => {
          // Check that loading states were properly managed
          expect(loadingStates).toContain(true);
          expect(loadingStates).toContain(false);
          expect(generalLoadingStates).toContain(true);
          expect(generalLoadingStates).toContain(false);
          
          // Final states should be false
          expect(service.isLoadingEstabelecimentos()).toBeFalse();
          expect(service.getLoadingState().isLoading).toBeFalse();
          done();
        }
      });

      const req = httpMock.expectOne(expectedUrl);
      req.flush(mockEstabelecimentos);
    });

    it('should properly manage error states throughout the request lifecycle', (done) => {
      const expectedUrl = apiConfigService.getConfiguredEndpoint('estabelecimento', 'byProprietario', { userId: 'user123' });
      
      let errorStates: boolean[] = [];

      // Subscribe to error states
      service.errorState$.subscribe(state => {
        errorStates.push(state.hasError);
      });

      service.loadEstabelecimentosForProprietario('user123', 0).subscribe({
        error: () => {
          // Check that error states were properly managed
          expect(errorStates).toContain(false); // Initial state
          expect(errorStates).toContain(true);  // Error state
          
          // Final state should be error
          expect(service.getErrorState().hasError).toBeTrue();
          expect(service.getErrorState().code).toBe(ErrorCodes.SERVER_ERROR);
          done();
        }
      });

      const req = httpMock.expectOne(expectedUrl);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('LocalStorage Integration', () => {
    it('should persist selected estabelecimento to localStorage', () => {
      service.selectEstabelecimento(mockEstabelecimento);

      const stored = localStorage.getItem('selectedEstabelecimento');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockEstabelecimento);
    });

    it('should load selected estabelecimento from localStorage', () => {
      localStorage.setItem('selectedEstabelecimento', JSON.stringify(mockEstabelecimento));

      service.loadSelectedEstabelecimentoFromStorage();

      expect(service.getSelectedEstabelecimento()).toEqual(mockEstabelecimento);
    });

    it('should clear localStorage when clearing estabelecimentos', () => {
      localStorage.setItem('selectedEstabelecimento', JSON.stringify(mockEstabelecimento));

      service.clearEstabelecimentos();

      expect(localStorage.getItem('selectedEstabelecimento')).toBeNull();
    });
  });
});
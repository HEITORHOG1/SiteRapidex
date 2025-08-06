import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { categoryEstablishmentInterceptor } from './category-establishment.interceptor';
import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';
import { Estabelecimento } from '../../../data-access/models/estabelecimento.models';
import { ErrorCodes } from '../../../data-access/models/auth.models';

describe('CategoryEstablishmentInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let estabelecimentoService: jasmine.SpyObj<EstabelecimentoService>;

  const mockEstabelecimento: Estabelecimento = {
    id: 1,
    usuarioId: 'user123',
    razaoSocial: 'Restaurante Teste Ltda',
    nomeFantasia: 'Restaurante Teste',
    cnpj: '12345678000199',
    telefone: '11999999999',
    endereco: 'Rua Teste, 123',
    status: true,
    cep: '01234567',
    numero: '123',
    dataCadastro: '2024-01-01',
    latitude: -23.5505,
    longitude: -46.6333,
    raioEntregaKm: 5,
    taxaEntregaFixa: 5.00,
    descricao: 'Restaurante de teste'
  };

  beforeEach(() => {
    const estabelecimentoSpy = jasmine.createSpyObj('EstabelecimentoService', ['getSelectedEstabelecimento']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: EstabelecimentoService, useValue: estabelecimentoSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useValue: categoryEstablishmentInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    estabelecimentoService = TestBed.inject(EstabelecimentoService) as jasmine.SpyObj<EstabelecimentoService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('category API requests', () => {
    it('should add establishment headers for valid category requests', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstabelecimento);

      const testUrl = '/api/categorias/estabelecimentos/1/categorias';
      
      httpClient.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('X-Establishment-Id')).toBe('1');
      expect(req.request.headers.get('X-Establishment-Name')).toBe('Restaurante Teste');
      req.flush({});
    });

    it('should allow requests when establishment ID matches selected establishment', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstabelecimento);

      const testUrl = '/api/categorias/estabelecimentos/1/categorias';
      
      httpClient.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.url).toBe(testUrl);
      req.flush({});
    });

    it('should reject requests when no establishment is selected', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(null);

      const testUrl = '/api/categorias/estabelecimentos/1/categorias';
      
      httpClient.get(testUrl).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(error.message).toBe('Nenhum estabelecimento selecionado');
        }
      });

      // No HTTP request should be made
      httpMock.expectNone(testUrl);
    });

    it('should reject requests when establishment ID does not match', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstabelecimento);

      const testUrl = '/api/categorias/estabelecimentos/2/categorias'; // Different ID
      
      httpClient.get(testUrl).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(error.message).toBe('Acesso negado: estabelecimento não autorizado');
        }
      });

      // No HTTP request should be made
      httpMock.expectNone(testUrl);
    });

    it('should reject requests when establishment ID is missing from URL', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstabelecimento);

      const testUrl = '/api/categorias/estabelecimentos//categorias'; // Missing ID
      
      httpClient.get(testUrl).subscribe({
        error: (error) => {
          expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
          expect(error.message).toBe('ID do estabelecimento não encontrado na URL');
        }
      });

      // No HTTP request should be made
      httpMock.expectNone(testUrl);
    });

    it('should handle different category API endpoints', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstabelecimento);

      const endpoints = [
        '/api/categorias/estabelecimentos/1/categorias',
        '/api/categorias/estabelecimentos/1/categorias/123',
        '/api/categorias/estabelecimentos/1/categorias/validate-name',
        '/api/categorias/estabelecimentos/1/categorias/123/validate-deletion'
      ];

      endpoints.forEach(endpoint => {
        httpClient.get(endpoint).subscribe();
        
        const req = httpMock.expectOne(endpoint);
        expect(req.request.headers.get('X-Establishment-Id')).toBe('1');
        expect(req.request.headers.get('X-Establishment-Name')).toBe('Restaurante Teste');
        req.flush({});
      });
    });
  });

  describe('non-category API requests', () => {
    it('should not intercept non-category requests', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstabelecimento);

      const nonCategoryUrls = [
        '/api/auth/login',
        '/api/estabelecimento/1',
        '/api/produtos/1',
        '/api/other-endpoint'
      ];

      nonCategoryUrls.forEach(url => {
        httpClient.get(url).subscribe();
        
        const req = httpMock.expectOne(url);
        expect(req.request.headers.has('X-Establishment-Id')).toBe(false);
        expect(req.request.headers.has('X-Establishment-Name')).toBe(false);
        req.flush({});
      });
    });
  });

  describe('URL parsing', () => {
    it('should correctly extract establishment ID from various URL formats', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(mockEstabelecimento);

      const urlsWithId1 = [
        '/api/categorias/estabelecimentos/1/categorias',
        '/api/categorias/estabelecimentos/1/categorias?page=1',
        '/api/categorias/estabelecimentos/1/categorias/123',
        '/api/categorias/estabelecimentos/1/categorias/validate-name?nome=test'
      ];

      urlsWithId1.forEach(url => {
        httpClient.get(url).subscribe();
        
        const req = httpMock.expectOne(url);
        expect(req.request.headers.get('X-Establishment-Id')).toBe('1');
        req.flush({});
      });
    });

    it('should handle different establishment IDs', () => {
      const estabelecimento2: Estabelecimento = {
        ...mockEstabelecimento,
        id: 999
      };
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(estabelecimento2);

      const testUrl = '/api/categorias/estabelecimentos/999/categorias';
      
      httpClient.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('X-Establishment-Id')).toBe('999');
      expect(req.request.headers.get('X-Establishment-Name')).toBe('Restaurante Teste');
      req.flush({});
    });
  });

  describe('error details', () => {
    it('should include proper error details for establishment validation errors', () => {
      estabelecimentoService.getSelectedEstabelecimento.and.returnValue(null);

      const testUrl = '/api/categorias/estabelecimentos/1/categorias';
      
      httpClient.get(testUrl).subscribe({
        error: (error) => {
          expect(error.details).toBeDefined();
          expect(error.details.type).toBe('ESTABLISHMENT_VALIDATION_ERROR');
          expect(error.details.timestamp).toBeDefined();
          expect(error.timestamp).toBeInstanceOf(Date);
        }
      });

      httpMock.expectNone(testUrl);
    });
  });
});
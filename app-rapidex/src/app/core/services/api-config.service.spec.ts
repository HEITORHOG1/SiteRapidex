import { TestBed } from '@angular/core/testing';
import { ApiConfigService } from './api-config.service';

describe('ApiConfigService', () => {
  let service: ApiConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get endpoint with base URL', () => {
    const endpoint = service.getEndpoint('/api/test');
    expect(endpoint).toBe('http://localhost:5283/api/test');
  });

  it('should replace parameters in endpoint', () => {
    const endpoint = service.getEndpoint('/api/user/{userId}', { userId: '123' });
    expect(endpoint).toBe('http://localhost:5283/api/user/123');
  });

  it('should get configured endpoint', () => {
    const endpoint = service.getConfiguredEndpoint('auth', 'login');
    expect(endpoint).toBe('http://localhost:5283/api/Auth/login');
  });

  it('should get configured endpoint with parameters', () => {
    const endpoint = service.getConfiguredEndpoint('estabelecimento', 'byProprietario', { userId: '123' });
    expect(endpoint).toBe('http://localhost:5283/api/Estabelecimento/proprietario/123');
  });

  it('should throw error for non-existent endpoint', () => {
    expect(() => {
      service.getConfiguredEndpoint('auth', 'nonexistent');
    }).toThrowError('Endpoint nonexistent not found in category auth');
  });
});
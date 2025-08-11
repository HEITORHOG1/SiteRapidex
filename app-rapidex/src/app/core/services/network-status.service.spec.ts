import { TestBed } from '@angular/core/testing';
import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NetworkStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return current online status', () => {
    const isOnline = service.isOnline();
    expect(typeof isOnline).toBe('boolean');
  });

  it('should return current offline status', () => {
    const isOffline = service.isOffline();
    expect(typeof isOffline).toBe('boolean');
    expect(isOffline).toBe(!service.isOnline());
  });

  it('should provide appropriate network error message', () => {
    const errorMessage = service.getNetworkErrorMessage();
    expect(errorMessage).toContain('conexão');
    expect(errorMessage).toContain('internet');
  });

  it('should identify network errors correctly', () => {
    const networkError = { status: 0 };
    const regularError = { status: 500 };
    const connectionError = { message: 'Erro de conexão' };

    expect(service.isNetworkError(networkError)).toBe(true);
    expect(service.isNetworkError(regularError)).toBe(false);
    expect(service.isNetworkError(connectionError)).toBe(true);
  });
});
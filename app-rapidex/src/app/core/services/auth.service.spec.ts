import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthApi } from '@data-access/api/auth.api';
import { of } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockAuthApi: jasmine.SpyObj<AuthApi>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthApi', ['login', 'refreshToken']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthApi, useValue: spy }
      ]
    });
    
    service = TestBed.inject(AuthService);
    mockAuthApi = TestBed.inject(AuthApi) as jasmine.SpyObj<AuthApi>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false for isAuthenticated when no token', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should return user ID when user exists', () => {
    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({
      id: '123',
      userName: 'test',
      email: 'test@test.com',
      nomeUsuario: 'Test User'
    }));
    
    // Create new service instance to read from mocked localStorage
    service = TestBed.inject(AuthService);
    
    expect(service.getUserId()).toBe('123');
  });

  it('should check if user is proprietario', () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'auth.roles') return JSON.stringify(['Proprietario']);
      return null;
    });
    
    // Create new service instance to read from mocked localStorage
    service = TestBed.inject(AuthService);
    
    expect(service.isProprietario()).toBeTrue();
  });
});
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@shared/services/notification.service';
import { ErrorMessageComponent } from '@shared/ui/error-message/error-message';
import { LoadingSpinnerComponent } from '@shared/ui/loading/loading';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'isAuthenticated']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'showValidationError',
      'showSuccessMessage'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        ErrorMessageComponent,
        LoadingSpinnerComponent
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockNotificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

    mockAuthService.isAuthenticated.and.returnValue(false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.loginForm.get('username')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should redirect to dashboard if user is already authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    component.ngOnInit();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  describe('Form Validation', () => {
    it('should mark username as invalid when empty', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();
      expect(usernameControl?.invalid).toBeTruthy();
      expect(component.getFieldError('username')).toBe('Usuário é obrigatório');
    });

    it('should mark username as invalid when too short', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('ab');
      usernameControl?.markAsTouched();
      expect(usernameControl?.invalid).toBeTruthy();
      expect(component.getFieldError('username')).toBe('Usuário deve ter pelo menos 3 caracteres');
    });

    it('should mark password as invalid when empty', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.markAsTouched();
      expect(passwordControl?.invalid).toBeTruthy();
      expect(component.getFieldError('password')).toBe('Senha é obrigatória');
    });

    it('should mark password as invalid when too short', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.setValue('12345');
      passwordControl?.markAsTouched();
      expect(passwordControl?.invalid).toBeTruthy();
      expect(component.getFieldError('password')).toBe('Senha deve ter pelo menos 6 caracteres');
    });

    it('should return null for valid fields', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('validuser');
      usernameControl?.markAsTouched();
      expect(component.getFieldError('username')).toBeNull();
    });
  });

  describe('Password Toggle', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword()).toBeFalse();
      component.togglePassword();
      expect(component.showPassword()).toBeTrue();
      component.togglePassword();
      expect(component.showPassword()).toBeFalse();
    });
  });

  describe('Form Submission', () => {
    it('should not submit when form is invalid', () => {
      component.onSubmit();
      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockNotificationService.showValidationError).toHaveBeenCalledWith(
        'Por favor, corrija os erros no formulário'
      );
    });

    it('should not submit when already loading', () => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });
      component.loading.set(true);
      
      component.onSubmit();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should submit valid form and navigate on success', fakeAsync(() => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });
      
      mockAuthService.login.and.returnValue(of({ 
        token: 'fake-token',
        refreshToken: 'fake-refresh-token',
        expiresAt: '2024-12-31T23:59:59Z',
        roles: ['proprietario'],
        user: {
          id: '1',
          userName: 'testuser',
          email: 'test@example.com',
          nomeUsuario: 'Test User'
        }
      }));

      component.onSubmit();
      expect(component.loading()).toBeTrue();
      
      tick();
      
      expect(mockAuthService.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123'
      });
      expect(component.loading()).toBeFalse();
      expect(mockNotificationService.showSuccessMessage).toHaveBeenCalledWith('Login realizado com sucesso!');
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    }));

    it('should handle login error with 401 status', fakeAsync(() => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'wrongpassword'
      });
      
      mockAuthService.login.and.returnValue(throwError(() => ({ status: 401 })));

      component.onSubmit();
      tick();
      
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Usuário ou senha incorretos');
    }));

    it('should handle network error', fakeAsync(() => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });
      
      mockAuthService.login.and.returnValue(throwError(() => ({ status: 0 })));

      component.onSubmit();
      tick();
      
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Erro de conexão. Verifique sua internet.');
    }));

    it('should handle server error', fakeAsync(() => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });
      
      mockAuthService.login.and.returnValue(throwError(() => ({ status: 500 })));

      component.onSubmit();
      tick();
      
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Erro interno do servidor. Tente novamente mais tarde.');
    }));

    it('should handle custom error message', fakeAsync(() => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });
      
      mockAuthService.login.and.returnValue(throwError(() => ({ 
        error: { message: 'Custom error message' }
      })));

      component.onSubmit();
      tick();
      
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBe('Custom error message');
    }));
  });

  describe('Error Handling', () => {
    it('should clear error when user starts typing', () => {
      component.error.set('Some error');
      
      component.loginForm.get('username')?.setValue('newvalue');
      
      expect(component.error()).toBeNull();
    });

    it('should retry login when retry button is clicked', () => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123'
      });
      component.error.set('Some error');
      
      mockAuthService.login.and.returnValue(of({
        token: 'fake-token',
        refreshToken: 'fake-refresh-token',
        expiresAt: '2024-12-31T23:59:59Z',
        roles: ['proprietario'],
        user: {
          id: '1',
          userName: 'testuser',
          email: 'test@example.com',
          nomeUsuario: 'Test User'
        }
      }));

      component.onRetryLogin();
      
      expect(component.error()).toBeNull();
      expect(mockAuthService.login).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should return correct aria-describedby for invalid field', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();
      
      expect(component.getAriaDescribedBy('username')).toBe('username-error');
    });

    it('should return null aria-describedby for valid field', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('validuser');
      usernameControl?.markAsTouched();
      
      expect(component.getAriaDescribedBy('username')).toBeNull();
    });

    it('should return correct aria-invalid for invalid field', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();
      
      expect(component.getAriaInvalid('username')).toBeTrue();
    });

    it('should return false aria-invalid for valid field', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('validuser');
      usernameControl?.markAsTouched();
      
      expect(component.getAriaInvalid('username')).toBeFalse();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
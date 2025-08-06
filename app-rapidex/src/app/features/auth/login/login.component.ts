import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AuthService } from "@core/services/auth.service";
import { NotificationService } from "@shared/services/notification.service";
import { ErrorMessageComponent } from "@shared/ui/error-message/error-message";
import { LoadingSpinnerComponent } from "@shared/ui/loading/loading";

@Component({
  selector: "rx-login",
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    ErrorMessageComponent, 
    LoadingSpinnerComponent
  ],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  loginForm!: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  formSubmitted = signal(false);

  ngOnInit(): void {
    this.initializeForm();
    
    // Check if user is already authenticated
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl("/dashboard");
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(100)
      ]]
    });

    // Clear error when user starts typing
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.error()) {
          this.error.set(null);
        }
      });
  }

  togglePassword(): void {
    this.showPassword.update(show => !show);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors || !field.touched) {
      return null;
    }

    if (field.errors['required']) {
      return fieldName === 'username' ? 'Usuário é obrigatório' : 'Senha é obrigatória';
    }
    
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return fieldName === 'username' 
        ? `Usuário deve ter pelo menos ${minLength} caracteres`
        : `Senha deve ter pelo menos ${minLength} caracteres`;
    }
    
    if (field.errors['maxlength']) {
      const maxLength = field.errors['maxlength'].requiredLength;
      return fieldName === 'username'
        ? `Usuário deve ter no máximo ${maxLength} caracteres`
        : `Senha deve ter no máximo ${maxLength} caracteres`;
    }

    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.formSubmitted()));
  }

  onSubmit(): void {
    this.formSubmitted.set(true);
    
    if (this.loginForm.invalid) {
      this.markAllFieldsAsTouched();
      this.notificationService.showValidationError('Por favor, corrija os erros no formulário');
      return;
    }

    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { username, password } = this.loginForm.value;

    this.auth.login({ username, password })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.notificationService.showSuccessMessage('Login realizado com sucesso!');
          this.router.navigateByUrl("/dashboard");
        },
        error: (error) => {
          this.loading.set(false);
          this.handleLoginError(error);
        }
      });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  private handleLoginError(error: any): void {
    let errorMessage = 'Falha no login. Tente novamente.';
    
    if (error?.status === 401) {
      errorMessage = 'Usuário ou senha incorretos';
    } else if (error?.status === 0) {
      errorMessage = 'Erro de conexão. Verifique sua internet.';
    } else if (error?.status >= 500) {
      errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (typeof error?.error === 'string') {
      errorMessage = error.error;
    }

    this.error.set(errorMessage);
  }

  onRetryLogin(): void {
    this.error.set(null);
    this.onSubmit();
  }

  // Accessibility helpers
  getAriaDescribedBy(fieldName: string): string | null {
    return this.isFieldInvalid(fieldName) ? `${fieldName}-error` : null;
  }

  getAriaInvalid(fieldName: string): boolean {
    return this.isFieldInvalid(fieldName);
  }
}

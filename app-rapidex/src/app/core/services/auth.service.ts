import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable, tap, throwError, timer, switchMap, catchError, of } from "rxjs";
import { LoginRequest, LoginResponse, UserInfo, AuthState, RefreshTokenRequest } from "@data-access/models/auth.models";
import { AuthApi } from "@data-access/api/auth.api";
import { environment } from "../../../environments/environment";

const STORAGE_KEYS = { token: "auth.token", refreshToken: "auth.refreshToken", expiresAt: "auth.expiresAt", roles: "auth.roles", user: "auth.user" } as const;

@Injectable({ providedIn: "root" })
export class AuthService {
  private api = inject(AuthApi);
  private state$ = new BehaviorSubject<AuthState>(this.readInitial());
  private refreshTokenInProgress = false;

  private readInitial(): AuthState {
    try {
      return {
        token: localStorage.getItem(STORAGE_KEYS.token),
        refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
        expiresAt: localStorage.getItem(STORAGE_KEYS.expiresAt),
        roles: JSON.parse(localStorage.getItem(STORAGE_KEYS.roles) || "[]"),
        user: JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null"),
        isLoading: false,
      };
    } catch { 
      return { 
        token: null, 
        refreshToken: null, 
        expiresAt: null, 
        roles: [], 
        user: null, 
        isLoading: false 
      }; 
    }
  }

  authState(): Observable<AuthState> { return this.state$.asObservable(); }
  token(): string | null { return this.state$.value.token; }
  user(): UserInfo | null { return this.state$.value.user; }
  roles(): string[] { return this.state$.value.roles; }
  isAuthenticated(): boolean { return !!this.state$.value.token && !this.isTokenExpired(); }
  isLoading(): boolean { return this.state$.value.isLoading; }

  /**
   * Obtém o ID do usuário autenticado
   */
  getUserId(): string | null {
    const user = this.user();
    return user?.id || null;
  }

  /**
   * Verifica se o usuário tem o papel de proprietário
   */
  isProprietario(): boolean {
    return this.roles().includes('Proprietario');
  }

  login(payload: LoginRequest) {
    this.setLoadingState(true);
    return this.api.login(payload).pipe(
      tap(res => {
        this.persistLogin(res);
        this.setLoadingState(false);
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        this.setLoadingState(false);
        return throwError(() => error);
      })
    );
  }

  logout() {
    // Limpa todos os dados de autenticação
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    
    // Limpa dados de estabelecimento também
    localStorage.removeItem('selectedEstabelecimento');
    
    this.state$.next({ 
      token: null, 
      refreshToken: null, 
      expiresAt: null, 
      roles: [], 
      user: null, 
      isLoading: false 
    });
  }

  /**
   * Refreshes the authentication token
   */
  refreshToken(): Observable<LoginResponse> {
    const currentState = this.state$.value;
    
    if (!currentState.token || !currentState.refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.refreshTokenInProgress) {
      // Return current state as observable if refresh is already in progress
      return of(null as any);
    }

    this.refreshTokenInProgress = true;
    this.setLoadingState(true);

    const refreshRequest: RefreshTokenRequest = {
      token: currentState.token,
      refreshToken: currentState.refreshToken
    };

    return this.api.refreshToken(refreshRequest).pipe(
      tap(res => {
        this.persistLogin(res);
        this.setLoadingState(false);
        this.refreshTokenInProgress = false;
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        this.setLoadingState(false);
        this.refreshTokenInProgress = false;
        this.logout(); // Auto logout on refresh failure
        return throwError(() => error);
      })
    );
  }

  /**
   * Checks if the current token is expired or about to expire
   */
  isTokenExpired(): boolean {
    const expiresAt = this.state$.value.expiresAt;
    if (!expiresAt) return true;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    
    return currentTime >= expirationTime;
  }

  /**
   * Checks if the token needs to be refreshed (within threshold)
   */
  shouldRefreshToken(): boolean {
    const expiresAt = this.state$.value.expiresAt;
    if (!expiresAt) return false;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const threshold = environment.tokenRefreshThreshold;
    
    return (expirationTime - currentTime) <= threshold;
  }

  /**
   * Schedules automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    const expiresAt = this.state$.value.expiresAt;
    if (!expiresAt) return;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const threshold = environment.tokenRefreshThreshold;
    const refreshTime = expirationTime - currentTime - threshold;
    
    if (refreshTime > 0) {
      timer(refreshTime).pipe(
        switchMap(() => this.refreshToken()),
        catchError(() => of(null)) // Ignore errors in scheduled refresh
      ).subscribe();
    }
  }

  /**
   * Sets the loading state
   */
  private setLoadingState(isLoading: boolean): void {
    const currentState = this.state$.value;
    this.state$.next({ ...currentState, isLoading });
  }

  private persistLogin(res: LoginResponse) {
    localStorage.setItem(STORAGE_KEYS.token, res.token);
    localStorage.setItem(STORAGE_KEYS.refreshToken, res.refreshToken);
    localStorage.setItem(STORAGE_KEYS.expiresAt, res.expiresAt);
    localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(res.roles || []));
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(res.user || null));
    this.state$.next({ 
      token: res.token, 
      refreshToken: res.refreshToken, 
      expiresAt: res.expiresAt, 
      roles: res.roles || [], 
      user: res.user || null,
      isLoading: false
    });
  }
}

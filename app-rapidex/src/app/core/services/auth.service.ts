import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable, tap, throwError, switchMap, catchError, of, Subject, share } from "rxjs";
import { LoginRequest, LoginResponse, UserInfo, AuthState, RefreshTokenRequest } from "../../data-access/models/auth.models";
import { AuthApi } from "../../data-access/api/auth.api";
import { environment } from "../../../environments/environment";



@Injectable({ providedIn: "root" })
export class AuthService {
  private api = inject(AuthApi);
  private state$ = new BehaviorSubject<AuthState>(this.readInitial());
  private refreshTokenInProgress = false;
  private refreshTokenSubject$ = new Subject<LoginResponse>();
  private refreshTimer?: any;

  constructor() {
    // Initialize automatic refresh if user is already authenticated
    this.initializeAutoRefresh();
  }

  private readInitial(): AuthState {
    // Always-online app: no localStorage persistence, start fresh each session
    return { 
      token: null, 
      refreshToken: null, 
      expiresAt: null, 
      roles: [], 
      user: null, 
      isLoading: false 
    };
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
    // Clear any scheduled refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    // Reset refresh state
    this.refreshTokenInProgress = false;
    
    // Always-online app: clear session state only (no localStorage cleanup)
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
   * Handles concurrent requests by sharing the same refresh observable
   */
  refreshToken(): Observable<LoginResponse> {
    const currentState = this.state$.value;
    
    if (!currentState.token || !currentState.refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    // If refresh is already in progress, return the shared observable
    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject$.asObservable();
    }

    this.refreshTokenInProgress = true;
    this.setLoadingState(true);

    const refreshRequest: RefreshTokenRequest = {
      token: currentState.token,
      refreshToken: currentState.refreshToken
    };

    const refreshObservable = this.api.refreshToken(refreshRequest).pipe(
      tap(res => {
        this.persistLogin(res);
        this.setLoadingState(false);
        this.refreshTokenInProgress = false;
        this.scheduleTokenRefresh();
        this.refreshTokenSubject$.next(res);
      }),
      catchError(error => {
        this.setLoadingState(false);
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject$.error(error);
        this.logout(); // Auto logout on refresh failure
        return throwError(() => error);
      }),
      share() // Share the observable to prevent multiple HTTP calls
    );

    // Subscribe to trigger the refresh and handle the shared observable
    refreshObservable.subscribe({
      next: () => {}, // Handled in tap
      error: () => {} // Handled in catchError
    });

    return refreshObservable;
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
   * Schedules automatic token refresh before expiration
   * Clears any existing refresh timer before scheduling a new one
   */
  private scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    const expiresAt = this.state$.value.expiresAt;
    if (!expiresAt) return;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const threshold = environment.tokenRefreshThreshold;
    const refreshTime = expirationTime - currentTime - threshold;
    
    // Only schedule if we have enough time before expiration
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.performAutomaticRefresh();
      }, refreshTime);
    } else if (this.shouldRefreshToken()) {
      // If token should be refreshed immediately
      this.performAutomaticRefresh();
    }
  }

  /**
   * Performs automatic token refresh with error handling
   */
  private performAutomaticRefresh(): void {
    if (!this.isAuthenticated() || this.refreshTokenInProgress) {
      return;
    }

    this.refreshToken().pipe(
      catchError(error => {
        console.error('Automatic token refresh failed:', error);
        // Don't logout on automatic refresh failure, let the user continue
        // The next API call will handle the expired token
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Sets the loading state
   */
  private setLoadingState(isLoading: boolean): void {
    const currentState = this.state$.value;
    this.state$.next({ ...currentState, isLoading });
  }

  /**
   * Initializes automatic token refresh if user is already authenticated
   */
  private initializeAutoRefresh(): void {
    if (this.isAuthenticated()) {
      this.scheduleTokenRefresh();
    }
  }

  /**
   * Gets the time remaining until token expiration in milliseconds
   */
  getTokenTimeRemaining(): number {
    const expiresAt = this.state$.value.expiresAt;
    if (!expiresAt) return 0;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    
    return Math.max(0, expirationTime - currentTime);
  }

  /**
   * Checks if refresh token is available
   */
  hasRefreshToken(): boolean {
    return !!this.state$.value.refreshToken;
  }

  private persistLogin(res: LoginResponse) {
    // Always-online app: store in memory only, no localStorage persistence
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

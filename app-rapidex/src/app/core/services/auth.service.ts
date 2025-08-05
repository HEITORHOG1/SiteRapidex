import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { LoginRequest, LoginResponse, UserInfo } from "@data-access/models/auth.models";
import { AuthApi } from "@data-access/api/auth.api";

interface AuthState { token: string | null; refreshToken: string | null; expiresAt: string | null; roles: string[]; user: UserInfo | null; }

const STORAGE_KEYS = { token: "auth.token", refreshToken: "auth.refreshToken", expiresAt: "auth.expiresAt", roles: "auth.roles", user: "auth.user" } as const;

@Injectable({ providedIn: "root" })
export class AuthService {
  private api = inject(AuthApi);
  private state$ = new BehaviorSubject<AuthState>(this.readInitial());

  private readInitial(): AuthState {
    try {
      return {
        token: localStorage.getItem(STORAGE_KEYS.token),
        refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
        expiresAt: localStorage.getItem(STORAGE_KEYS.expiresAt),
        roles: JSON.parse(localStorage.getItem(STORAGE_KEYS.roles) || "[]"),
        user: JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null"),
      };
    } catch { return { token: null, refreshToken: null, expiresAt: null, roles: [], user: null }; }
  }

  authState(): Observable<AuthState> { return this.state$.asObservable(); }
  token(): string | null { return this.state$.value.token; }
  user(): UserInfo | null { return this.state$.value.user; }
  roles(): string[] { return this.state$.value.roles; }
  isAuthenticated(): boolean { return !!this.state$.value.token; }

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
    return this.api.login(payload).pipe(tap(res => this.persistLogin(res)));
  }

  logout() {
    // Limpa todos os dados de autenticação
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    
    // Limpa dados de estabelecimento também
    localStorage.removeItem('selectedEstabelecimento');
    
    this.state$.next({ token: null, refreshToken: null, expiresAt: null, roles: [], user: null });
  }

  private persistLogin(res: LoginResponse) {
    localStorage.setItem(STORAGE_KEYS.token, res.token);
    localStorage.setItem(STORAGE_KEYS.refreshToken, res.refreshToken);
    localStorage.setItem(STORAGE_KEYS.expiresAt, res.expiresAt);
    localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(res.roles || []));
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(res.user || null));
    this.state$.next({ token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt, roles: res.roles || [], user: res.user || null });
  }
}

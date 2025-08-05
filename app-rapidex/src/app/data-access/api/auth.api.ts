import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { LoginRequest, LoginResponse, RefreshTokenRequest } from "@data-access/models/auth.models";
import { ApiConfigService } from "../../core/services/api-config.service";

@Injectable({ providedIn: "root" })
export class AuthApi {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfigService);

  login(payload: LoginRequest) {
    const endpoint = this.apiConfig.getConfiguredEndpoint('auth', 'login');
    return this.http.post<LoginResponse>(endpoint, payload);
  }

  refreshToken(payload: RefreshTokenRequest) {
    const endpoint = this.apiConfig.getConfiguredEndpoint('auth', 'refreshToken');
    return this.http.post<LoginResponse>(endpoint, payload);
  }
}

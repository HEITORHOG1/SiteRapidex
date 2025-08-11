import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { LoginRequest, LoginResponse, RefreshTokenRequest, LoginApiResponse, RefreshTokenApiResponse } from "@data-access/models/auth.models";
import { ApiConfigService } from "../../core/services/api-config.service";

@Injectable({ providedIn: "root" })
export class AuthApi {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfigService);

  login(payload: LoginRequest) {
    const endpoint = this.apiConfig.getConfiguredEndpoint('auth', 'login');
    // The API returns ApiResponse<LoginResponse>, but the interceptor extracts the data field
    // so this service receives LoginResponse directly
    return this.http.post<LoginResponse>(endpoint, payload);
  }

  refreshToken(payload: RefreshTokenRequest) {
    const endpoint = this.apiConfig.getConfiguredEndpoint('auth', 'refreshToken');
    // The API returns ApiResponse<LoginResponse>, but the interceptor extracts the data field
    // so this service receives LoginResponse directly
    return this.http.post<LoginResponse>(endpoint, payload);
  }
}

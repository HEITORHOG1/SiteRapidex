import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { LoginRequest, LoginResponse } from "@data-access/models/auth.models";

@Injectable({ providedIn: "root" })
export class AuthApi {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  login(payload: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.base}/api/Auth/login`, payload);
  }
}

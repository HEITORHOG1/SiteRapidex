import { ApiResponse, ApiError } from './api-response.models';

export interface LoginRequest { 
  username: string; 
  password: string; 
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}

export interface UserInfo { 
  id: string; 
  userName: string; 
  email: string; 
  nomeUsuario: string; 
}

export interface LoginResponse { 
  token: string; 
  refreshToken: string; 
  expiresAt: string; 
  roles: string[]; 
  user: UserInfo; 
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  roles: string[];
  user: UserInfo | null;
  isLoading: boolean;
}

// Legacy ApiError - kept for backward compatibility
// Use ApiError from api-response.models.ts for new API format
export interface LegacyApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export enum ErrorCodes {
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

// UI State Models for enhanced user experience
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// API Response Wrappers for new API format
export type LoginApiResponse = ApiResponse<LoginResponse>;
export type RefreshTokenApiResponse = ApiResponse<LoginResponse>;
export type UserInfoApiResponse = ApiResponse<UserInfo>;

// Re-export ApiError for backward compatibility
export type { ApiError };

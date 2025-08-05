export interface LoginRequest { username: string; password: string; }
export interface UserInfo { id: string; userName: string; email: string; nomeUsuario: string; }
export interface LoginResponse { token: string; refreshToken: string; expiresAt: string; roles: string[]; user: UserInfo; }

import { httpClient } from './client';

// 认证相关接口
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

// 认证API服务
export const authService = {
  // 用户登录
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await httpClient.post('/auth/login', data);
    return response.data;
  },

  // 用户注册
  register: async (data: RegisterRequest): Promise<UserInfo> => {
    const response = await httpClient.post('/auth/register', data);
    return response.data;
  },

  // 刷新令牌
  refreshToken: async (data: RefreshTokenRequest): Promise<AuthResponse> => {
    const response = await httpClient.post('/auth/refresh', data);
    return response.data;
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<UserInfo> => {
    const response = await httpClient.get('/auth/me');
    return response.data;
  },

  // 用户登出
  logout: async (): Promise<{ message: string }> => {
    const response = await httpClient.post('/auth/logout');
    return response.data;
  },
};
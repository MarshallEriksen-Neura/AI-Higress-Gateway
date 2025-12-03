import { httpClient } from './client';

// 系统管理相关接口
export interface GenerateSecretKeyRequest {
  length?: number;
}

export interface GenerateSecretKeyResponse {
  secret_key: string;
}

export interface InitAdminRequest {
  username: string;
  email: string;
  display_name?: string;
}

export interface InitAdminResponse {
  username: string;
  email: string;
  password: string;
  api_key: string;
}

export interface ValidateKeyRequest {
  key: string;
}

export interface ValidateKeyResponse {
  is_valid: boolean;
  message: string;
}

export interface SystemStatusResponse {
  status: string;
  message: string;
}

// 系统管理服务
export const systemService = {
  // 生成系统主密钥
  generateSecretKey: async (
    data?: GenerateSecretKeyRequest
  ): Promise<GenerateSecretKeyResponse> => {
    const response = await httpClient.post('/system/secret-key/generate', data || {});
    return response.data;
  },

  // 初始化系统管理员
  initAdmin: async (data: InitAdminRequest): Promise<InitAdminResponse> => {
    const response = await httpClient.post('/system/admin/init', data);
    return response.data;
  },

  // 轮换系统主密钥
  rotateSecretKey: async (): Promise<GenerateSecretKeyResponse> => {
    const response = await httpClient.post('/system/secret-key/rotate');
    return response.data;
  },

  // 验证密钥强度
  validateKey: async (data: ValidateKeyRequest): Promise<ValidateKeyResponse> => {
    const response = await httpClient.post('/system/key/validate', data);
    return response.data;
  },

  // 获取系统状态
  getSystemStatus: async (): Promise<SystemStatusResponse> => {
    const response = await httpClient.get('/system/status');
    return response.data;
  },
};
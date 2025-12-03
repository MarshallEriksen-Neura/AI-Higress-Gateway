import { httpClient } from './client';

// API密钥相关接口
export interface CreateApiKeyRequest {
  name: string;
  expiry?: 'week' | 'month' | 'year' | 'never';
  allowed_provider_ids?: string[];
}

export interface UpdateApiKeyRequest {
  name?: string;
  expiry?: 'week' | 'month' | 'year' | 'never';
  allowed_provider_ids?: string[];
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  expiry_type: 'week' | 'month' | 'year' | 'never';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  has_provider_restrictions: boolean;
  allowed_provider_ids: string[];
  token?: string; // 仅在创建时返回
}

export interface AllowedProviders {
  has_provider_restrictions: boolean;
  allowed_provider_ids: string[];
}

// API密钥服务
export const apiKeyService = {
  // 获取API密钥列表
  getApiKeys: async (userId: string): Promise<ApiKey[]> => {
    const response = await httpClient.get(`/users/${userId}/api-keys`);
    return response.data;
  },

  // 创建API密钥
  createApiKey: async (userId: string, data: CreateApiKeyRequest): Promise<ApiKey> => {
    const response = await httpClient.post(`/users/${userId}/api-keys`, data);
    return response.data;
  },

  // 更新API密钥
  updateApiKey: async (
    userId: string,
    keyId: string,
    data: UpdateApiKeyRequest
  ): Promise<ApiKey> => {
    const response = await httpClient.put(`/users/${userId}/api-keys/${keyId}`, data);
    return response.data;
  },

  // 获取API密钥允许的提供商
  getAllowedProviders: async (
    userId: string,
    keyId: string
  ): Promise<AllowedProviders> => {
    const response = await httpClient.get(`/users/${userId}/api-keys/${keyId}/allowed-providers`);
    return response.data;
  },

  // 设置API密钥允许的提供商
  setAllowedProviders: async (
    userId: string,
    keyId: string,
    data: { allowed_provider_ids: string[] }
  ): Promise<AllowedProviders> => {
    const response = await httpClient.put(`/users/${userId}/api-keys/${keyId}/allowed-providers`, data);
    return response.data;
  },

  // 删除API密钥允许的提供商
  deleteAllowedProvider: async (
    userId: string,
    keyId: string,
    providerId: string
  ): Promise<void> => {
    await httpClient.delete(`/users/${userId}/api-keys/${keyId}/allowed-providers/${providerId}`);
  },

  // 删除API密钥
  deleteApiKey: async (userId: string, keyId: string): Promise<void> => {
    await httpClient.delete(`/users/${userId}/api-keys/${keyId}`);
  },
};
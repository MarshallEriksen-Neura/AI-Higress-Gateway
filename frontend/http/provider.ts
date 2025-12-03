import { httpClient } from './client';

// 提供商相关接口
export interface Provider {
  id: string;
  name: string;
  base_url: string;
  api_key: string | null;
  api_keys: ProviderKey[];
  models_path: string;
  messages_path: string;
  weight: number;
  region: string | null;
  cost_input: number;
  cost_output: number;
  max_qps: number;
  custom_headers: Record<string, string>;
  retryable_status_codes: number[];
  static_models: string[];
  transport: 'http' | 'sdk';
  provider_type: 'native' | 'aggregator';
}

export interface ProviderKey {
  key: string;
  weight: number;
  max_qps: number;
  label: string;
}

export interface CreateProviderKeyRequest {
  key: string;
  label: string;
  weight?: number;
  max_qps?: number;
  status?: 'active' | 'inactive';
}

export interface UpdateProviderKeyRequest {
  key?: string;
  label?: string;
  weight?: number;
  max_qps?: number;
  status?: 'active' | 'inactive';
}

export interface ProviderKeyDetail {
  id: string;
  provider_id: string;
  label: string;
  weight: number;
  max_qps: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string | null;
}

export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  last_check: number;
  metadata: Record<string, any>;
}

export interface ProviderMetrics {
  logical_model: string;
  provider_id: string;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  last_success: number;
  last_failure: number;
  consecutive_failures: number;
  total_requests: number;
  total_failures: number;
  window_start: number;
  window_duration: number;
}

export interface MetricsResponse {
  metrics: ProviderMetrics[];
}

// 提供商服务
export const providerService = {
  // 获取提供商列表
  getProviders: async (): Promise<{ providers: Provider[]; total: number }> => {
    const response = await httpClient.get('/providers');
    return response.data;
  },

  // 获取指定提供商信息
  getProvider: async (providerId: string): Promise<Provider> => {
    const response = await httpClient.get(`/providers/${providerId}`);
    return response.data;
  },

  // 获取提供商模型列表
  getProviderModels: async (providerId: string): Promise<{ models: Model[]; total: number }> => {
    const response = await httpClient.get(`/providers/${providerId}/models`);
    return response.data;
  },

  // 检查提供商健康状态
  checkProviderHealth: async (providerId: string): Promise<HealthStatus> => {
    const response = await httpClient.get(`/providers/${providerId}/health`);
    return response.data;
  },

  // 获取提供商路由指标
  getProviderMetrics: async (
    providerId: string,
    logicalModel?: string
  ): Promise<MetricsResponse> => {
    const url = `/providers/${providerId}/metrics${logicalModel ? `?logical_model=${logicalModel}` : ''}`;
    const response = await httpClient.get(url);
    return response.data;
  },

  // 以下接口需要超级用户权限

  // 获取厂商API密钥列表
  getProviderKeys: async (providerId: string): Promise<ProviderKeyDetail[]> => {
    const response = await httpClient.get(`/providers/${providerId}/keys`);
    return response.data;
  },

  // 创建厂商API密钥
  createProviderKey: async (
    providerId: string,
    data: CreateProviderKeyRequest
  ): Promise<ProviderKeyDetail> => {
    const response = await httpClient.post(`/providers/${providerId}/keys`, data);
    return response.data;
  },

  // 获取厂商API密钥详情
  getProviderKey: async (
    providerId: string,
    keyId: string
  ): Promise<ProviderKeyDetail> => {
    const response = await httpClient.get(`/providers/${providerId}/keys/${keyId}`);
    return response.data;
  },

  // 更新厂商API密钥
  updateProviderKey: async (
    providerId: string,
    keyId: string,
    data: UpdateProviderKeyRequest
  ): Promise<ProviderKeyDetail> => {
    const response = await httpClient.put(`/providers/${providerId}/keys/${keyId}`, data);
    return response.data;
  },

  // 删除厂商API密钥
  deleteProviderKey: async (providerId: string, keyId: string): Promise<void> => {
    await httpClient.delete(`/providers/${providerId}/keys/${keyId}`);
  },
};
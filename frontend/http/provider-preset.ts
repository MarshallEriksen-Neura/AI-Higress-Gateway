import { httpClient } from './client';

// 提供商预设接口
export interface ProviderPreset {
  id: string;
  preset_id: string;
  display_name: string;
  description: string | null;
  provider_type: 'native' | 'aggregator';
  transport: 'http' | 'sdk';
  base_url: string;
  models_path: string;
  messages_path: string | null;
  chat_completions_path: string;
  responses_path: string | null;
  supported_api_styles: ('openai' | 'responses' | 'claude')[] | null;
  retryable_status_codes: number[] | null;
  custom_headers: Record<string, string> | null;
  static_models: any[] | null;
  created_at: string;
  updated_at: string;
}

// 创建请求
export interface CreateProviderPresetRequest {
  preset_id: string;
  display_name: string;
  description?: string;
  provider_type?: 'native' | 'aggregator';
  transport?: 'http' | 'sdk';
  base_url: string;
  models_path?: string;
  messages_path?: string;
  chat_completions_path?: string;
  responses_path?: string;
  supported_api_styles?: ('openai' | 'responses' | 'claude')[];
  retryable_status_codes?: number[];
  custom_headers?: Record<string, string>;
  static_models?: any[];
}

// 更新请求
export interface UpdateProviderPresetRequest {
  display_name?: string;
  description?: string;
  provider_type?: 'native' | 'aggregator';
  transport?: 'http' | 'sdk';
  base_url?: string;
  models_path?: string;
  messages_path?: string;
  chat_completions_path?: string;
  responses_path?: string;
  supported_api_styles?: ('openai' | 'responses' | 'claude')[];
  retryable_status_codes?: number[];
  custom_headers?: Record<string, string>;
  static_models?: any[];
}

// 列表响应
export interface ProviderPresetListResponse {
  items: ProviderPreset[];
  total: number;
}

// 提供商预设服务
export const providerPresetService = {
  // 获取预设列表（所有用户可访问）
  getProviderPresets: async (): Promise<ProviderPresetListResponse> => {
    const response = await httpClient.get('/provider-presets');
    return response.data;
  },

  // 创建预设（仅管理员）
  createProviderPreset: async (
    data: CreateProviderPresetRequest
  ): Promise<ProviderPreset> => {
    const response = await httpClient.post('/admin/provider-presets', data);
    return response.data;
  },

  // 更新预设（仅管理员）
  updateProviderPreset: async (
    presetId: string,
    data: UpdateProviderPresetRequest
  ): Promise<ProviderPreset> => {
    const response = await httpClient.put(
      `/admin/provider-presets/${presetId}`,
      data
    );
    return response.data;
  },

  // 删除预设（仅管理员）
  deleteProviderPreset: async (presetId: string): Promise<void> => {
    await httpClient.delete(`/admin/provider-presets/${presetId}`);
  },
};
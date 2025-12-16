"use client";

import { useApiGet } from './hooks';

// CLI 配置信息类型
export interface CliConfigInfo {
  api_url: string;
  key_name: string;
  key_prefix: string;
}

/**
 * 获取 CLI 配置信息
 * @param apiKeyId - API Key ID
 * @returns CLI 配置信息
 */
export const useCliConfig = (apiKeyId: string | null) => {
  const { data, error, loading, refresh } = useApiGet<CliConfigInfo>(
    apiKeyId ? `/api/v1/cli/config/${apiKeyId}` : null,
    {
      strategy: 'default',
      requireAuth: true,
    }
  );

  return {
    config: data,
    error,
    loading,
    refresh,
  };
};

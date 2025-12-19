"use client";

import useSWR from 'swr';
import { evalConfigService } from '@/http/eval-config';
import { cacheStrategies } from './cache';
import type { EvalConfig, UpdateEvalConfigRequest } from '@/lib/api-types';

/**
 * 获取项目评测配置
 * 使用 static 缓存策略（管理员配置，变化不频繁）
 */
export function useEvalConfig(projectId: string | null) {
  const key = projectId ? `/v1/projects/${projectId}/eval-config` : null;

  const { data, error, isLoading, mutate } = useSWR<EvalConfig>(
    key,
    () => evalConfigService.getEvalConfig(projectId!),
    cacheStrategies.static
  );

  return {
    config: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * 更新评测配置的 mutation hook
 */
export function useUpdateEvalConfig() {
  return async (projectId: string, request: UpdateEvalConfigRequest) => {
    return await evalConfigService.updateEvalConfig(projectId, request);
  };
}

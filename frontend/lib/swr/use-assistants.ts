"use client";

import useSWR from 'swr';
import { useMemo } from 'react';
import { assistantService } from '@/http/assistant';
import { cacheStrategies } from './cache';
import type {
  Assistant,
  GetAssistantsParams,
  AssistantsResponse,
  CreateAssistantRequest,
  UpdateAssistantRequest,
} from '@/lib/api-types';

/**
 * 获取助手列表
 * 使用 static 缓存策略（助手列表变化不频繁）
 */
export function useAssistants(params: GetAssistantsParams) {
  // 使用字符串 key 确保序列化一致性
  const key = useMemo(() => {
    if (!params.project_id) return null;
    const queryParams = new URLSearchParams();
    queryParams.set('project_id', params.project_id);
    if (params.cursor) queryParams.set('cursor', params.cursor);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    return `/v1/assistants?${queryParams.toString()}`;
  }, [params.project_id, params.cursor, params.limit]);

  const { data, error, isLoading, mutate } = useSWR<AssistantsResponse>(
    key,
    () => assistantService.getAssistants(params),
    cacheStrategies.static
  );

  return {
    assistants: data?.items || [],
    nextCursor: data?.next_cursor,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * 获取单个助手详情
 * 使用 default 缓存策略
 */
export function useAssistant(assistantId: string | null) {
  const key = assistantId ? `/v1/assistants/${assistantId}` : null;

  const { data, error, isLoading, mutate } = useSWR<Assistant>(
    key,
    () => assistantService.getAssistant(assistantId!),
    cacheStrategies.default
  );

  return {
    assistant: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * 创建助手的 mutation hook
 */
export function useCreateAssistant() {
  return async (request: CreateAssistantRequest) => {
    return await assistantService.createAssistant(request);
  };
}

/**
 * 更新助手的 mutation hook
 */
export function useUpdateAssistant() {
  return async (assistantId: string, request: UpdateAssistantRequest) => {
    return await assistantService.updateAssistant(assistantId, request);
  };
}

/**
 * 删除助手的 mutation hook
 */
export function useDeleteAssistant() {
  return async (assistantId: string) => {
    return await assistantService.deleteAssistant(assistantId);
  };
}

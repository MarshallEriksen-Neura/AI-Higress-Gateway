"use client";

import useSWR from 'swr';
import { useMemo } from 'react';
import { conversationService } from '@/http/conversation';
import { cacheStrategies } from './cache';
import type {
  Conversation,
  GetConversationsParams,
  ConversationsResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
} from '@/lib/api-types';

/**
 * 获取会话列表
 * 使用 frequent 缓存策略（会话列表会因新消息而更新 last_activity_at）
 */
export function useConversations(params: GetConversationsParams) {
  const key = useMemo(
    () => ({
      url: '/v1/conversations',
      params,
    }),
    [params.assistant_id, params.cursor, params.limit]
  );

  const { data, error, isLoading, mutate } = useSWR<ConversationsResponse>(
    key,
    () => conversationService.getConversations(params),
    cacheStrategies.frequent
  );

  return {
    conversations: data?.items || [],
    nextCursor: data?.next_cursor,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * 获取单个会话详情
 * 使用 default 缓存策略
 */
export function useConversation(conversationId: string | null) {
  const key = conversationId ? `/v1/conversations/${conversationId}` : null;

  const { data, error, isLoading, mutate } = useSWR<Conversation>(
    key,
    () => conversationService.getConversation(conversationId!),
    cacheStrategies.default
  );

  return {
    conversation: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * 创建会话的 mutation hook
 */
export function useCreateConversation() {
  return async (request: CreateConversationRequest) => {
    return await conversationService.createConversation(request);
  };
}

/**
 * 更新会话的 mutation hook
 */
export function useUpdateConversation() {
  return async (conversationId: string, request: UpdateConversationRequest) => {
    return await conversationService.updateConversation(conversationId, request);
  };
}

/**
 * 删除会话的 mutation hook
 */
export function useDeleteConversation() {
  return async (conversationId: string) => {
    return await conversationService.deleteConversation(conversationId);
  };
}

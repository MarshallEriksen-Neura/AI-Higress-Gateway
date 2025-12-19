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
  // 使用字符串 key 确保序列化一致性
  const key = useMemo(() => {
    if (!params.assistant_id) return null;
    const queryParams = new URLSearchParams();
    queryParams.set('assistant_id', params.assistant_id);
    if (params.cursor) queryParams.set('cursor', params.cursor);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    return `/v1/conversations?${queryParams.toString()}`;
  }, [params.assistant_id, params.cursor, params.limit]);

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
 * 从会话列表中获取单个会话
 * 注意：后端不提供单独的会话详情接口，需要从列表数据中获取
 * 
 * @param conversationId - 会话 ID
 * @param assistantId - 助手 ID（用于获取会话列表）
 * @returns 会话数据或 undefined
 */
export function useConversationFromList(
  conversationId: string | null,
  assistantId: string
): Conversation | undefined {
  const { conversations } = useConversations({ assistant_id: assistantId });
  
  if (!conversationId) {
    return undefined;
  }
  
  return conversations.find((c) => c.conversation_id === conversationId);
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

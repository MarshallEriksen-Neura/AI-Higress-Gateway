"use client";

import useSWR, { useSWRConfig } from 'swr';
import { useMemo } from 'react';
import { messageService } from '@/http/message';
import { cacheStrategies } from './cache';
import type {
  GetMessagesParams,
  MessagesResponse,
  RunDetail,
  SendMessageRequest,
} from '@/lib/api-types';

/**
 * 获取消息列表
 * 使用 frequent 缓存策略（实时对话场景）
 */
export function useMessages(conversationId: string | null, params?: GetMessagesParams) {
  // 使用字符串 key 确保序列化一致性
  const key = useMemo(() => {
    if (!conversationId) return null;
    
    const queryParams = new URLSearchParams();
    if (params?.cursor) queryParams.set('cursor', params.cursor);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return `/v1/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
  }, [conversationId, params?.cursor, params?.limit]);

  const { data, error, isLoading, mutate } = useSWR<MessagesResponse>(
    key,
    () => messageService.getMessages(conversationId!, params),
    cacheStrategies.frequent
  );

  return {
    messages: data?.items || [],
    nextCursor: data?.next_cursor,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * 获取 Run 详情（惰性加载）
 * 使用 default 缓存策略
 */
export function useRun(runId: string | null) {
  const key = runId ? `/v1/runs/${runId}` : null;

  const { data, error, isLoading, mutate } = useSWR<RunDetail>(
    key,
    () => messageService.getRun(runId!),
    cacheStrategies.default
  );

  return {
    run: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * 发送消息的 mutation hook
 * 支持乐观更新和回滚逻辑
 * 
 * 注意：后端返回的消息列表是倒序（新消息在前），所以：
 * - 新消息应该插入到列表开头（因为后端是倒序）
 * - 分页加载的旧消息应该插入到列表末尾（因为后端是倒序）
 */
export function useSendMessage(conversationId: string | null) {
  const { mutate: globalMutate } = useSWRConfig();

  return async (request: SendMessageRequest) => {
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    // 使用字符串 key 确保与 MessageList/useMessages 默认第一页一致（limit=50）
    const messagesKey = `/v1/conversations/${conversationId}/messages?limit=50`;

    // 创建乐观更新的用户消息
    const optimisticMessage = {
      message: {
        message_id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user' as const,
        content: request.content,
        created_at: new Date().toISOString(),
      },
      run: undefined,
    };

    try {
      // 乐观更新：立即显示用户消息
      // 因为后端返回倒序，新消息插入到列表开头
      await globalMutate(
        messagesKey,
        async (currentData?: MessagesResponse) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            items: [optimisticMessage, ...currentData.items],
          };
        },
        { revalidate: false }
      );

      // 发送消息到服务器
      const response = await messageService.sendMessage(conversationId, request);

      // 更新为真实数据（包含 baseline run 结果）
      await globalMutate(messagesKey);

      return response;
    } catch (error) {
      // 回滚乐观更新
      await globalMutate(messagesKey);
      throw error;
    }
  };
}

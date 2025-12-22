"use client";

import useSWR, { useSWRConfig } from 'swr';
import { useMemo } from 'react';
import { messageService } from '@/http/message';
import { streamSSERequest } from '@/lib/bridge/sse';
import { SWRCacheManager, cacheStrategies } from './cache';
import { ErrorHandler } from '@/lib/errors';
import type {
  GetMessagesParams,
  MessagesResponse,
  RunDetail,
  SendMessageRequest,
  RunSummary,
} from '@/lib/api-types';

type SendMessageOptions = {
  streaming?: boolean;
};

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
export function useSendMessage(
  conversationId: string | null,
  assistantId?: string | null,
  overrideLogicalModel?: string | null
) {
  const sendMessageToConversation = useSendMessageToConversation(
    assistantId,
    overrideLogicalModel
  );

  return async (request: SendMessageRequest, options?: SendMessageOptions) => {
    if (!conversationId) throw new Error('Conversation ID is required');
    return await sendMessageToConversation(conversationId, request, options);
  };
}

/**
 * 发送消息（通用版本）：由调用方传入 conversationId，适合「先创建会话再发送」等场景。
 *
 * - 支持乐观更新与回滚
 * - 刷新会话列表（用于更新 last_activity_at / title）
 */
export function useSendMessageToConversation(
  assistantId?: string | null,
  overrideLogicalModel?: string | null
) {
  const { mutate: globalMutate } = useSWRConfig();

  return async (
    conversationId: string,
    request: SendMessageRequest,
    options?: SendMessageOptions
  ) => {
    const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();
    // 使用字符串 key 确保与 MessageList/useMessages 默认第一页一致（limit=50）
    const messagesKey = `/v1/conversations/${conversationId}/messages?limit=50`;
    const wantsStreaming = !!options?.streaming;

    try {
      const payload: SendMessageRequest = { ...request };
      if (overrideLogicalModel) {
        payload.override_logical_model = overrideLogicalModel;
      }
      const hasBridgeTools =
        !!payload.bridge_agent_id ||
        (Array.isArray(payload.bridge_agent_ids) && payload.bridge_agent_ids.length > 0);
      const requestedLogicalModel =
        payload.override_logical_model && payload.override_logical_model.trim()
          ? payload.override_logical_model
          : 'auto';

      if (wantsStreaming && !hasBridgeTools) {
        const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const tempUserMessageId = `temp-${nonce}`;
        const tempAssistantMessageId = `temp-assistant-${nonce}`;
        const createdAt = new Date().toISOString();

        let userMessageId: string = tempUserMessageId;
        let assistantMessageId: string = tempAssistantMessageId;
        let assistantText = '';
        let baselineRun: RunSummary | null = null;

        await globalMutate(
          messagesKey,
          async (currentData?: MessagesResponse) => {
            const assistantPlaceholder = {
              message: {
                message_id: tempAssistantMessageId,
                conversation_id: conversationId,
                role: 'assistant' as const,
                content: '',
                created_at: createdAt,
              },
              run: undefined,
            };
            const userPlaceholder = {
              message: {
                message_id: tempUserMessageId,
                conversation_id: conversationId,
                role: 'user' as const,
                content: request.content,
                created_at: createdAt,
              },
              run: undefined,
            };
            if (!currentData) {
              return { items: [assistantPlaceholder, userPlaceholder] } satisfies MessagesResponse;
            }
            return { ...currentData, items: [assistantPlaceholder, userPlaceholder, ...currentData.items] };
          },
          { revalidate: false }
        );

        const toRecord = (value: unknown): Record<string, unknown> | null => {
          if (!value || typeof value !== 'object') return null;
          return value as Record<string, unknown>;
        };

        const getString = (record: Record<string, unknown>, key: string) => {
          const v = record[key];
          return typeof v === 'string' ? v : '';
        };

        const parseRunSummary = (value: unknown): RunSummary | null => {
          const record = toRecord(value);
          if (!record) return null;
          const runId = getString(record, 'run_id');
          const requestedLogicalModel = getString(record, 'requested_logical_model');
          const status = getString(record, 'status');
          if (!runId || !requestedLogicalModel || !status) return null;
          const isRunStatus = (
            value: string
          ): value is RunSummary['status'] =>
            value === 'queued' ||
            value === 'running' ||
            value === 'succeeded' ||
            value === 'failed';
          if (!isRunStatus(status)) return null;

          const outputPreview =
            typeof record['output_preview'] === 'string'
              ? (record['output_preview'] as string)
              : undefined;
          const latencyMs =
            typeof record['latency_ms'] === 'number'
              ? (record['latency_ms'] as number)
              : undefined;
          const errorCode =
            typeof record['error_code'] === 'string'
              ? (record['error_code'] as string)
              : undefined;
          const toolInvocations = Array.isArray(record['tool_invocations'])
            ? (record['tool_invocations'] as RunSummary['tool_invocations'])
            : undefined;
          return {
            run_id: runId,
            requested_logical_model: requestedLogicalModel,
            status,
            output_preview: outputPreview,
            latency: latencyMs,
            error_code: errorCode,
            tool_invocations: toolInvocations,
          };
        };

        const streamUrl = `/v1/conversations/${conversationId}/messages`;

        await streamSSERequest(
          streamUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
            body: JSON.stringify({ ...payload, streaming: true }),
          },
          (msg) => {
            if (!msg.data || msg.data === '[DONE]') return;
            let parsed: unknown;
            try {
              parsed = JSON.parse(msg.data);
            } catch {
              return;
            }
            const rec = toRecord(parsed);
            if (!rec) return;
            const type = getString(rec, 'type') || msg.event || '';
            if (!type) return;

            if (type === 'message.created') {
              const newUserId = getString(rec, 'user_message_id');
              const newAssistantId = getString(rec, 'assistant_message_id');
              if (newUserId) userMessageId = newUserId;
              if (newAssistantId) assistantMessageId = newAssistantId;

              baselineRun = parseRunSummary(rec['baseline_run']);

              void globalMutate(
                messagesKey,
                (current?: MessagesResponse) => {
                  if (!current) return current;
                  const nextItems = current.items.map((it) => {
                    if (it.message.message_id === tempUserMessageId) {
                      return {
                        ...it,
                        message: { ...it.message, message_id: userMessageId },
                        run: baselineRun ?? it.run,
                      };
                    }
                    if (it.message.message_id === tempAssistantMessageId) {
                      return {
                        ...it,
                        message: { ...it.message, message_id: assistantMessageId },
                      };
                    }
                    return it;
                  });
                  return { ...current, items: nextItems };
                },
                { revalidate: false }
              );
              return;
            }

            if (type === 'message.delta') {
              const delta = getString(rec, 'delta');
              if (!delta) return;
              assistantText += delta;
              void globalMutate(
                messagesKey,
                (current?: MessagesResponse) => {
                  if (!current) return current;
                  const nextItems = current.items.map((it) => {
                    if (it.message.message_id !== assistantMessageId) return it;
                    return {
                      ...it,
                      message: { ...it.message, content: assistantText },
                    };
                  });
                  return { ...current, items: nextItems };
                },
                { revalidate: false }
              );
              return;
            }

            if (type === 'message.completed' || type === 'message.failed') {
              const finalRun = parseRunSummary(rec['baseline_run']);
              if (finalRun) baselineRun = finalRun;

              const outputText = getString(rec, 'output_text');
              if (!assistantText && outputText) {
                assistantText = outputText;
              }

              void globalMutate(
                messagesKey,
                (current?: MessagesResponse) => {
                  if (!current) return current;
                  const nextItems = current.items.map((it) => {
                    if (it.message.message_id === assistantMessageId) {
                      return {
                        ...it,
                        message: { ...it.message, content: assistantText },
                      };
                    }
                    if (it.message.message_id === userMessageId) {
                      return { ...it, run: baselineRun ?? it.run };
                    }
                    return it;
                  });
                  return { ...current, items: nextItems };
                },
                { revalidate: false }
              );
            }
          },
          new AbortController().signal
        );

        await globalMutate(messagesKey);
        if (assistantId) {
          const queryParams = new URLSearchParams();
          queryParams.set('assistant_id', assistantId);
          queryParams.set('limit', '50');
          await globalMutate(`/v1/conversations?${queryParams.toString()}`);
        }

        if (!baselineRun) {
          throw new Error('No baseline run received from stream');
        }

        return { message_id: userMessageId, baseline_run: baselineRun };
      }

      const optimisticMessage = {
        message: {
          message_id: `temp-${nonce}`,
          conversation_id: conversationId,
          role: 'user' as const,
          content: request.content,
          created_at: createdAt,
        },
        run: undefined,
      };
      const assistantPlaceholder: MessagesResponse['items'][number] = {
        message: {
          message_id: `temp-assistant-${nonce}`,
          conversation_id: conversationId,
          role: 'assistant',
          content: '',
          created_at: createdAt,
        },
        run: {
          run_id: `temp-run-${nonce}`,
          requested_logical_model: requestedLogicalModel,
          status: 'running',
        },
      };

      await globalMutate(
        messagesKey,
        async (currentData?: MessagesResponse) => {
          const baseItems = currentData?.items ?? [];
          return {
            ...currentData,
            items: [assistantPlaceholder, optimisticMessage, ...baseItems],
          };
        },
        { revalidate: false }
      );

      const response = await messageService.sendMessage(conversationId, payload);

      await globalMutate(messagesKey);

      if (assistantId) {
        const queryParams = new URLSearchParams();
        queryParams.set('assistant_id', assistantId);
        queryParams.set('limit', '50');
        await globalMutate(`/v1/conversations?${queryParams.toString()}`);
      }

      return response;
    } catch (error) {
      const standardError = ErrorHandler.normalize(error);
      const errorText = standardError.message || 'Send failed';
      const errorMessage = {
        message: {
          message_id: `error-${nonce}`,
          conversation_id: conversationId,
          role: 'assistant' as const,
          content: `[Error] ${errorText}`,
          created_at: new Date().toISOString(),
        },
        run: undefined,
      };

      await globalMutate(
        messagesKey,
        (currentData?: MessagesResponse) => {
          const baseItems =
            currentData?.items.filter(
              (it) => it.message.message_id !== `temp-assistant-${nonce}`
            ) ?? [];
          const hasUser = baseItems.some(
            (it) => it.message.message_id === `temp-${nonce}`
          );
          const itemsWithUser = hasUser
            ? baseItems
            : [optimisticMessage, ...baseItems];

          return {
            ...currentData,
            items: [errorMessage, ...itemsWithUser],
          };
        },
        { revalidate: false }
      );

      throw standardError;
    }
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 清空会话消息历史（保留会话本身）
 *
 * - 删除该会话下所有分页缓存
 * - 重新验证当前会话消息与会话列表
 */
export function useClearConversationMessages(assistantId?: string | null) {
  const { mutate: globalMutate, cache } = useSWRConfig();
  const cacheManager = useMemo(() => new SWRCacheManager(cache), [cache]);

  return async (conversationId: string) => {
    if (!conversationId) throw new Error('Conversation ID is required');

    const pattern = new RegExp(`^/v1/conversations/${escapeRegExp(conversationId)}/messages`);
    const messageKeys = cacheManager.getKeysByPattern(pattern);
    await Promise.all(
      messageKeys.map((key) =>
        globalMutate(
          key,
          {
            items: [],
            next_cursor: undefined,
          } satisfies MessagesResponse,
          { revalidate: false }
        )
      )
    );

    try {
      await messageService.clearConversationMessages(conversationId);
    } finally {
      await globalMutate(`/v1/conversations/${conversationId}/messages?limit=50`);
      if (assistantId) {
        const queryParams = new URLSearchParams();
        queryParams.set('assistant_id', assistantId);
        queryParams.set('limit', '50');
        await globalMutate(`/v1/conversations?${queryParams.toString()}`);
      }
    }
  };
}

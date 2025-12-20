import { httpClient } from './client';
import type {
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesParams,
  MessagesResponse,
  RunDetail,
} from '@/lib/api-types';
import {
  normalizeMessagesResponse,
  normalizeRunDetail,
  type MessagesResponseBackend,
  type RunDetailBackend,
} from '@/lib/normalizers/chat-normalizers';

/**
 * 消息和 Run 管理服务
 */
export const messageService = {
  /**
   * 获取会话的消息列表（分页）
   */
  getMessages: async (
    conversationId: string,
    params?: GetMessagesParams
  ): Promise<MessagesResponse> => {
    const { data } = await httpClient.get<MessagesResponseBackend>(`/v1/conversations/${conversationId}/messages`, {
      params,
    });
    return normalizeMessagesResponse(data, conversationId);
  },

  /**
   * 发送消息（同步执行 baseline run）
   */
  sendMessage: async (
    conversationId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> => {
    const { data } = await httpClient.post(
      `/v1/conversations/${conversationId}/messages`,
      request
    );
    return data;
  },

  /**
   * 获取 Run 详情（惰性加载完整数据）
   */
  getRun: async (runId: string): Promise<RunDetail> => {
    const { data } = await httpClient.get<RunDetailBackend>(`/v1/runs/${runId}`);
    return normalizeRunDetail(data);
  },
};

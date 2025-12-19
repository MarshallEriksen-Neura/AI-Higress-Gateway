import { httpClient } from './client';
import type {
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest,
  GetConversationsParams,
  ConversationsResponse,
} from '@/lib/api-types';

/**
 * 会话管理服务
 */
export const conversationService = {
  /**
   * 获取会话列表（按 last_activity_at 倒序）
   */
  getConversations: async (params: GetConversationsParams): Promise<ConversationsResponse> => {
    const { data } = await httpClient.get('/v1/conversations', { params });
    return data;
  },

  /**
   * 创建会话
   */
  createConversation: async (request: CreateConversationRequest): Promise<Conversation> => {
    const { data } = await httpClient.post('/v1/conversations', request);
    return data;
  },

  /**
   * 获取单个会话详情
   */
  getConversation: async (conversationId: string): Promise<Conversation> => {
    const { data } = await httpClient.get(`/v1/conversations/${conversationId}`);
    return data;
  },

  /**
   * 更新会话（修改 title 或 archived 状态）
   */
  updateConversation: async (
    conversationId: string,
    request: UpdateConversationRequest
  ): Promise<Conversation> => {
    const { data } = await httpClient.patch(`/v1/conversations/${conversationId}`, request);
    return data;
  },

  /**
   * 删除会话（硬删除，级联删除所有消息、runs 和 evals）
   */
  deleteConversation: async (conversationId: string): Promise<void> => {
    await httpClient.delete(`/v1/conversations/${conversationId}`);
  },
};

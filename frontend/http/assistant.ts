import { httpClient } from './client';
import type {
  Assistant,
  CreateAssistantRequest,
  UpdateAssistantRequest,
  GetAssistantsParams,
  AssistantsResponse,
} from '@/lib/api-types';

/**
 * 助手管理服务
 */
export const assistantService = {
  /**
   * 获取助手列表
   */
  getAssistants: async (params: GetAssistantsParams): Promise<AssistantsResponse> => {
    const { data } = await httpClient.get('/v1/assistants', { params });
    return data;
  },

  /**
   * 创建助手
   */
  createAssistant: async (request: CreateAssistantRequest): Promise<Assistant> => {
    const { data } = await httpClient.post('/v1/assistants', request);
    return data;
  },

  /**
   * 获取单个助手详情
   */
  getAssistant: async (assistantId: string): Promise<Assistant> => {
    const { data } = await httpClient.get(`/v1/assistants/${assistantId}`);
    return data;
  },

  /**
   * 更新助手
   */
  updateAssistant: async (
    assistantId: string,
    request: UpdateAssistantRequest
  ): Promise<Assistant> => {
    const { data } = await httpClient.patch(`/v1/assistants/${assistantId}`, request);
    return data;
  },

  /**
   * 删除助手（硬删除，级联删除所有会话和消息）
   */
  deleteAssistant: async (assistantId: string): Promise<void> => {
    await httpClient.delete(`/v1/assistants/${assistantId}`);
  },
};

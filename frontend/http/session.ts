import { httpClient } from './client';
import type { SessionResponse } from '@/lib/api-types';

/**
 * 会话管理 API 服务
 */
export const sessionService = {
  /**
   * 获取当前用户的所有活跃会话
   */
  getSessions: async (): Promise<SessionResponse[]> => {
    const response = await httpClient.get('/v1/sessions');
    return response.data;
  },

  /**
   * 撤销指定会话
   * @param sessionId 会话ID
   */
  revokeSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await httpClient.delete(`/v1/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * 撤销所有其他会话（除当前会话外）
   */
  revokeOtherSessions: async (): Promise<{ message: string }> => {
    const response = await httpClient.delete('/v1/sessions/others');
    return response.data;
  },
};
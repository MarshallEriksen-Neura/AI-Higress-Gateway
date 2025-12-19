import { httpClient } from './client';
import type { EvalConfig, UpdateEvalConfigRequest } from '@/lib/api-types';

/**
 * 评测配置管理服务
 */
export const evalConfigService = {
  /**
   * 获取项目评测配置
   */
  getEvalConfig: async (projectId: string): Promise<EvalConfig> => {
    const { data } = await httpClient.get(`/v1/projects/${projectId}/eval-config`);
    return data;
  },

  /**
   * 更新项目评测配置
   */
  updateEvalConfig: async (
    projectId: string,
    request: UpdateEvalConfigRequest
  ): Promise<EvalConfig> => {
    const { data } = await httpClient.patch(`/v1/projects/${projectId}/eval-config`, request);
    return data;
  },
};

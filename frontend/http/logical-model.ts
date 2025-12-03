import { httpClient } from './client';

// 逻辑模型相关接口
export interface LogicalModel {
  logical_id: string;
  name: string;
  description: string;
  enabled: boolean;
  capabilities: string[];
  default_strategy: string;
  upstreams: UpstreamModel[];
  metadata: Record<string, any>;
}

export interface UpstreamModel {
  provider_id: string;
  model_id: string;
  region: string | null;
  cost_input: number;
  cost_output: number;
  enabled: boolean;
  weight: number;
}

export interface UpstreamsResponse {
  upstreams: UpstreamModel[];
}

// 逻辑模型服务
export const logicalModelService = {
  // 获取逻辑模型列表
  getLogicalModels: async (): Promise<{ models: LogicalModel[]; total: number }> => {
    const response = await httpClient.get('/logical-models');
    return response.data;
  },

  // 获取逻辑模型详情
  getLogicalModel: async (logicalModelId: string): Promise<LogicalModel> => {
    const response = await httpClient.get(`/logical-models/${logicalModelId}`);
    return response.data;
  },

  // 获取逻辑模型上游
  getLogicalModelUpstreams: async (
    logicalModelId: string
  ): Promise<UpstreamsResponse> => {
    const response = await httpClient.get(`/logical-models/${logicalModelId}/upstreams`);
    return response.data;
  },
};
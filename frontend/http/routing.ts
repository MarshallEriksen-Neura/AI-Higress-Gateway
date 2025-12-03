import { httpClient } from './client';
import { UpstreamModel } from './logical-model';
import { ProviderMetrics } from './provider';

// 路由相关接口
export interface RoutingDecisionRequest {
  logical_model: string;
  conversation_id?: string;
  user_id?: string;
  preferred_region?: string;
  strategy?: 'latency_first' | 'cost_first' | 'reliability_first' | 'balanced';
  exclude_providers?: string[];
}

export interface CandidateInfo {
  upstream: UpstreamModel;
  score: number;
  metrics: ProviderMetrics;
}

export interface RoutingDecisionResponse {
  logical_model: string;
  selected_upstream: UpstreamModel;
  decision_time: number;
  reasoning: string;
  alternative_upstreams: UpstreamModel[];
  strategy_used: string;
  all_candidates: CandidateInfo[];
}

export interface SessionInfo {
  conversation_id: string;
  logical_model: string;
  provider_id: string;
  model_id: string;
  created_at: number;
  last_used_at: number;
}

// 路由服务
export const routingService = {
  // 路由决策
  makeRoutingDecision: async (
    data: RoutingDecisionRequest
  ): Promise<RoutingDecisionResponse> => {
    const response = await httpClient.post('/routing/decide', data);
    return response.data;
  },

  // 获取会话信息
  getSession: async (conversationId: string): Promise<SessionInfo> => {
    const response = await httpClient.get(`/routing/sessions/${conversationId}`);
    return response.data;
  },

  // 删除会话
  deleteSession: async (conversationId: string): Promise<void> => {
    await httpClient.delete(`/routing/sessions/${conversationId}`);
  },
};
import { httpClient } from './client';
import { UpstreamModel } from './logical-model';
import { ProviderMetrics } from './provider';

// 路由相关接口
export interface RoutingDecisionRequest {
  logical_model: string;
  user_id?: string;
  preferred_region?: string;
  strategy?: 'latency_first' | 'cost_first' | 'reliability_first' | 'balanced';
  exclude_providers?: string[];
}

export interface CandidateInfo {
  upstream: UpstreamModel;
  score: number;
  metrics?: ProviderMetrics | null;
}

export interface RoutingDecisionResponse {
  logical_model: string;
  selected_upstream: UpstreamModel;
  decision_time: number;
  reasoning: string;
  alternative_upstreams?: UpstreamModel[] | null;
  strategy_used?: string | null;
  all_candidates?: CandidateInfo[] | null;
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
};

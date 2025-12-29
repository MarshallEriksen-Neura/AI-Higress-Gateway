"use client";

import { useApiPost } from './hooks';
import type { 
  RoutingDecisionRequest, 
  RoutingDecisionResponse
} from '@/http/routing';

/**
 * 路由决策 Hook
 * 用于执行路由决策，选择最优的上游提供商
 */
export const useRoutingDecision = () => {
  const { trigger, data, error, submitting } = useApiPost<
    RoutingDecisionResponse,
    RoutingDecisionRequest
  >('/routing/decide');
  
  return {
    makeDecision: trigger,
    decision: data,
    error,
    loading: submitting,
  };
};

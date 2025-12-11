"use client";

import { useApiGet, useApiPost, useApiDelete } from './hooks';
import type { 
  RoutingDecisionRequest, 
  RoutingDecisionResponse,
  SessionInfo 
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

/**
 * 会话信息 Hook
 * 用于查询指定会话的详细信息
 * @param conversationId - 会话ID，为null时不发起请求
 */
export const useSession = (conversationId: string | null) => {
  const { data, error, loading, refresh } = useApiGet<SessionInfo>(
    conversationId ? `/routing/sessions/${conversationId}` : null,
    { 
      strategy: 'default',
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5秒内不重复请求
    }
  );
  
  return {
    session: data,
    error,
    loading,
    refresh,
  };
};

/**
 * 删除会话 Hook
 * 用于删除指定的会话（取消粘性路由）
 */
export const useDeleteSession = () => {
  const { trigger, submitting } = useApiDelete('/routing/sessions');
  
  const deleteSession = async (conversationId: string) => {
    await trigger(`/routing/sessions/${conversationId}`);
  };
  
  return {
    deleteSession,
    deleting: submitting,
  };
};

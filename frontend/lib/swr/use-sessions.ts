"use client";

import { useCallback } from 'react';
import { useApiGet } from './hooks';
import { sessionService } from '@/http/session';
import type { SessionResponse } from '@/lib/api-types';

/**
 * 获取当前用户的所有活跃会话
 */
export const useSessions = () => {
  const {
    data,
    error,
    loading,
    refresh
  } = useApiGet<SessionResponse[]>(
    '/v1/sessions',
    { strategy: 'frequent' }
  );

  return {
    sessions: data || [],
    loading,
    error,
    refresh
  };
};

/**
 * 撤销会话操作
 */
export const useRevokeSession = () => {
  const revokeSession = useCallback(async (sessionId: string) => {
    return await sessionService.revokeSession(sessionId);
  }, []);

  const revokeOtherSessions = useCallback(async () => {
    return await sessionService.revokeOtherSessions();
  }, []);

  return {
    revokeSession,
    revokeOtherSessions,
  };
};
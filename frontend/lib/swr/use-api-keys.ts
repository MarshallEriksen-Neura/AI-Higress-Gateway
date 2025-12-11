"use client";

import { useCallback } from 'react';
import { useApiGet, useApiPost, useApiPut, useApiDelete } from './hooks';
import { apiKeyService } from '@/http/api-key';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { ApiKey, CreateApiKeyRequest, UpdateApiKeyRequest } from '@/lib/api-types';

export const useApiKeys = () => {
  const user = useAuthStore(state => state.user);
  const userId = user?.id;

  const {
    data: apiKeys,
    error,
    loading,
    refresh
  } = useApiGet<ApiKey[]>(
    userId ? `/users/${userId}/api-keys` : null,
    { strategy: 'frequent' }
  );

  const createMutation = useApiPost<ApiKey, CreateApiKeyRequest>(
    userId ? `/users/${userId}/api-keys` : ''
  );

  const updateMutation = useApiPut<ApiKey, UpdateApiKeyRequest>(
    ''
  );

  const deleteMutation = useApiDelete(
    ''
  );

  const createApiKey = useCallback(async (data: CreateApiKeyRequest) => {
    if (!userId) throw new Error('用户未登录');
    const result = await createMutation.trigger(data);
    await refresh();
    return result;
  }, [userId, createMutation, refresh]);

  const updateApiKey = useCallback(async (keyId: string, data: UpdateApiKeyRequest) => {
    if (!userId) throw new Error('用户未登录');
    const result = await apiKeyService.updateApiKey(userId, keyId, data);
    await refresh();
    return result;
  }, [userId, refresh]);

  const deleteApiKey = useCallback(async (keyId: string) => {
    if (!userId) throw new Error('用户未登录');
    await apiKeyService.deleteApiKey(userId, keyId);
    await refresh();
  }, [userId, refresh]);

  return {
    apiKeys: apiKeys || [],
    loading,
    error,
    refresh,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    creating: createMutation.submitting,
    updating: updateMutation.submitting,
    deleting: deleteMutation.submitting,
  };
};

export const useProviders = () => {
  const {
    data,
    error,
    loading,
    refresh
  } = useApiGet<{ providers: any[]; total: number }>(
    '/providers',
    { strategy: 'static' }
  );

  return {
    providers: data?.providers || [],
    total: data?.total || 0,
    loading,
    error,
    refresh,
  };
};

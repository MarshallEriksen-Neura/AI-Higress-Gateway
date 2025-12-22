"use client";

import { useApiGet, useApiPost, useApiPut, useApiDelete } from "./hooks";
import type {
  Provider,
  CreatePrivateProviderRequest,
  UpdatePrivateProviderRequest,
  UserAvailableProvidersResponse,
} from "@/http/provider";

interface UsePrivateProvidersOptions {
  userId: string | null;
}

/**
 * 使用 SWR 获取用户的私有提供商列表
 * 
 * @param options - 配置选项
 * @param options.userId - 用户 ID
 * 
 * @example
 * ```tsx
 * const { providers, loading, refresh, createProvider } = usePrivateProviders({
 *   userId: currentUser.id
 * });
 * ```
 */
export const usePrivateProviders = (options: UsePrivateProvidersOptions) => {
  const { userId } = options;

  // 获取私有提供商列表
  const {
    data,
    error,
    loading,
    validating,
    refresh,
  } = useApiGet<Provider[]>(
    userId ? `/users/${userId}/private-providers` : null,
    {
      strategy: "default",
    }
  );

  // 创建私有提供商
  const createMutation = useApiPost<Provider, CreatePrivateProviderRequest>(
    userId ? `/users/${userId}/private-providers` : ""
  );

  // 更新私有提供商
  const updateMutation = useApiPut<Provider, { id: string; data: UpdatePrivateProviderRequest }>(
    userId ? `/users/${userId}/private-providers` : ""
  );

  // 删除私有提供商
  const deleteMutation = useApiDelete<void>(
    userId ? `/users/${userId}/private-providers` : ""
  );

  // 创建提供商的包装函数
  const createProvider = async (data: CreatePrivateProviderRequest) => {
    const result = await createMutation.trigger(data);
    // 创建成功后刷新列表
    await refresh();
    return result;
  };

  // 更新提供商的包装函数
  const updateProvider = async (providerId: string, data: UpdatePrivateProviderRequest) => {
    if (!userId) throw new Error("User ID is required");
    const result = await updateMutation.trigger({ id: providerId, data });
    // 更新成功后刷新列表
    await refresh();
    return result;
  };

  // 删除提供商的包装函数
  const deleteProvider = async (providerId: string) => {
    if (!userId) throw new Error("User ID is required");
    const result = await deleteMutation.trigger(
      `/users/${userId}/private-providers/${providerId}`
    );
    // 删除成功后刷新列表
    await refresh();
    return result;
  };

  return {
    providers: data ?? [],
    total: data?.length ?? 0,
    loading,
    validating,
    error,
    refresh,
    createProvider,
    updateProvider,
    deleteProvider,
    creating: createMutation.submitting,
    updating: updateMutation.submitting,
    deleting: deleteMutation.submitting,
  };
};

interface UserQuotaApiResponse {
  private_provider_limit: number;
  private_provider_count: number;
  is_unlimited: boolean;
}

/**
 * 获取私有提供商配额信息
 *
 * @param userId - 用户 ID
 *
 * @example
 * ```tsx
 * const { current, limit, isUnlimited, loading } = usePrivateProviderQuota(userId);
 * ```
 */
export const usePrivateProviderQuota = (userId: string | null) => {
  const {
    data,
    error,
    loading,
    validating,
    refresh,
  } = useApiGet<UserQuotaApiResponse>(
    userId ? `/users/${userId}/quota` : null,
    { strategy: "default" }
  );

  const current = data?.private_provider_count ?? 0;
  const limit = data?.private_provider_limit ?? 0;
  const isUnlimited = data?.is_unlimited ?? false;

  return {
    current,
    limit,
    isUnlimited,
    loading,
    validating,
    error,
    refresh,
  };
};

/**
 * 获取用户可用的所有 Provider（私有 + 共享 + 公共）
 * 
 * @param options - 配置选项
 * @param options.userId - 用户 ID
 * @param options.visibility - 过滤可见性：'all' | 'private' | 'shared' | 'public'
 * 
 * @example
 * ```tsx
 * const { privateProviders, sharedProviders, publicProviders, loading } = useUserAvailableProviders({
 *   userId: currentUser.id,
 *   visibility: 'all'
 * });
 * ```
 */
export const useUserAvailableProviders = (options: {
  userId: string | null;
  visibility?: 'all' | 'private' | 'shared' | 'public';
}) => {
  const { userId, visibility = 'all' } = options;

  const {
    data,
    error,
    loading,
    validating,
    refresh,
  } = useApiGet<UserAvailableProvidersResponse>(
    userId ? `/users/${userId}/providers` : null,
    {
      strategy: "default",
      params: visibility !== 'all' ? { visibility } : undefined,
    }
  );

  return {
    privateProviders: data?.private_providers ?? [],
    sharedProviders: data?.shared_providers ?? [],
    publicProviders: data?.public_providers ?? [],
    total: data?.total ?? 0,
    loading,
    validating,
    error,
    refresh,
  };
};

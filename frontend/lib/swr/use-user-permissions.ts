"use client";

import { useApiGet } from './hooks';
import type { UserPermission } from '@/lib/api-types';

/**
 * 获取指定用户的权限列表
 */
export const useUserPermissions = (userId: string | null) => {
  const {
    data,
    error,
    loading,
    refresh
  } = useApiGet<UserPermission[]>(
    userId ? `/admin/users/${userId}/permissions` : null,
    { strategy: 'frequent' }
  );

  return {
    permissions: data || [],
    loading,
    error,
    refresh
  };
};
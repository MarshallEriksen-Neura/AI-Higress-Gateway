"use client";

import useSWR from "swr";
import { adminService, type Role } from "@/http/admin";

/**
 * 获取系统中定义的全部角色
 */
export function useAllRoles() {
  const { data, error, isLoading, mutate } = useSWR<Role[]>(
    "/admin/roles",
    () => adminService.getRoles(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    roles: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * 获取指定用户当前绑定的角色列表
 */
export function useUserRoles(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Role[]>(
    userId ? `/admin/users/${userId}/roles` : null,
    () => (userId ? adminService.getUserRoles(userId) : Promise.resolve([])),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    roles: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}


"use client";

import useSWR from "swr";
import { adminService, type Permission, type RolePermissionsResponse } from "@/http/admin";

/**
 * 获取系统中定义的全部权限列表
 */
export function usePermissions() {
  const { data, error, isLoading, mutate } = useSWR<Permission[]>(
    "/admin/permissions",
    () => adminService.getPermissions(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    permissions: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * 获取指定角色当前绑定的权限编码列表
 */
export function useRolePermissions(roleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RolePermissionsResponse | null>(
    roleId ? `/admin/roles/${roleId}/permissions` : null,
    () => (roleId ? adminService.getRolePermissions(roleId) : Promise.resolve(null)),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    permissionCodes: data?.permission_codes || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}


"use client";

import { isPermissionExpired } from "@/lib/constants/permission-types";
import { useI18n } from "@/lib/i18n-context";

interface PermissionStatusBadgeProps {
  expiresAt: string | null;
}

export function PermissionStatusBadge({ expiresAt }: PermissionStatusBadgeProps) {
  const { t } = useI18n();
  const expired = isPermissionExpired(expiresAt);

  if (expired) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {t("permissions.status_expired")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
      {t("permissions.status_active")}
    </span>
  );
}
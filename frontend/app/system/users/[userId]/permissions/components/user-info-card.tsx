"use client";

import { Card, CardContent } from "@/components/ui/card";
import { UserCircle } from "lucide-react";
import { UserInfo } from "@/lib/api-types";
import { useI18n } from "@/lib/i18n-context";

interface UserInfoCardProps {
  user: UserInfo;
}

export function UserInfoCard({ user }: UserInfoCardProps) {
  const { t } = useI18n();

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Inactive
      </span>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <UserCircle className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold truncate">
                {user.display_name || user.email}
              </h3>
              {getStatusBadge(user.is_active)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            {user.role_codes && user.role_codes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-muted-foreground mr-1">
                  {t("permissions.user_roles")}:
                </span>
                {user.role_codes.map((roleCode, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  >
                    {roleCode}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-context";
import { UserInfo, UserPermission, GrantPermissionRequest } from "@/lib/api-types";
import { useUserPermissions } from "@/lib/swr/use-user-permissions";
import { adminService } from "@/http/admin";
import { UserInfoCard } from "./user-info-card";
import { PermissionsTable } from "./permissions-table";
import { GrantPermissionDialog } from "./grant-permission-dialog";
import { EditPermissionDialog } from "./edit-permission-dialog";
import { RevokePermissionDialog } from "./revoke-permission-dialog";

interface PermissionsPageClientProps {
  user: UserInfo;
  userId: string;
}

export function PermissionsPageClient({ user, userId }: PermissionsPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { permissions, loading, error, refresh } = useUserPermissions(userId);

  // Dialog states
  const [grantOpen, setGrantOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<UserPermission | null>(null);

  const handleGrantPermission = async (data: GrantPermissionRequest) => {
    try {
      await adminService.grantUserPermission(userId, data);
      toast.success(t("permissions.success_granted"));
      refresh();
    } catch (error: any) {
      console.error("Failed to grant permission:", error);
      if (error.response?.status === 403) {
        toast.error(t("permissions.error_grant") + ": " + t("common.permission_denied"));
      } else {
        toast.error(t("permissions.error_grant"));
      }
      throw error;
    }
  };

  const handleEditPermission = async (data: GrantPermissionRequest) => {
    try {
      await adminService.grantUserPermission(userId, data);
      toast.success(t("permissions.success_updated"));
      refresh();
    } catch (error: any) {
      console.error("Failed to update permission:", error);
      toast.error(t("permissions.error_update"));
      throw error;
    }
  };

  const handleRevokePermission = async () => {
    if (!selectedPermission) return;
    
    try {
      await adminService.revokeUserPermission(userId, selectedPermission.id);
      toast.success(t("permissions.success_revoked"));
      refresh();
    } catch (error: any) {
      console.error("Failed to revoke permission:", error);
      toast.error(t("permissions.error_revoke"));
      throw error;
    }
  };

  const handleEdit = (permission: UserPermission) => {
    setSelectedPermission(permission);
    setEditOpen(true);
  };

  const handleDelete = (permission: UserPermission) => {
    setSelectedPermission(permission);
    setRevokeOpen(true);
  };

  if (error) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/system/users")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("permissions.back_to_users")}
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              {t("permissions.error_load")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/system/users")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("permissions.back_to_users")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("permissions.title")}</h1>
            <p className="text-muted-foreground">{t("permissions.subtitle")}</p>
          </div>
        </div>
        <Button onClick={() => setGrantOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("permissions.grant_permission")}
        </Button>
      </div>

      {/* User Info Card */}
      <UserInfoCard user={user} />

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("permissions.title")}</CardTitle>
          <CardDescription>{t("permissions.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : (
            <PermissionsTable
              permissions={permissions}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <GrantPermissionDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        onSubmit={handleGrantPermission}
      />

      <EditPermissionDialog
        open={editOpen}
        permission={selectedPermission}
        onOpenChange={setEditOpen}
        onSubmit={handleEditPermission}
      />

      <RevokePermissionDialog
        open={revokeOpen}
        permission={selectedPermission}
        userName={user.display_name || user.email}
        onOpenChange={setRevokeOpen}
        onConfirm={handleRevokePermission}
      />
    </div>
  );
}
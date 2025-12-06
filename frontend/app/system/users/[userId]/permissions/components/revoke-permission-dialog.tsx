"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { UserPermission } from "@/lib/api-types";
import { getPermissionTypeMetadata } from "@/lib/constants/permission-types";

interface RevokePermissionDialogProps {
  open: boolean;
  permission: UserPermission | null;
  userName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function RevokePermissionDialog({
  open,
  permission,
  userName,
  onOpenChange,
  onConfirm,
}: RevokePermissionDialogProps) {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to revoke permission:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission) return null;

  const metadata = getPermissionTypeMetadata(permission.permission_type);
  const permissionName = metadata
    ? t(metadata.nameKey)
    : permission.permission_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span>{t("permissions.revoke_confirm_title")}</span>
          </DialogTitle>
          <DialogDescription>
            {t("permissions.revoke_confirm_desc").replace("{user}", userName)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                {t("permissions.table_type")}:
              </span>
              <code className="text-sm bg-background px-2 py-0.5 rounded">
                {permissionName}
              </code>
            </div>
            {permission.permission_value && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">
                  {t("permissions.table_value")}:
                </span>
                <span className="text-sm">{permission.permission_value}</span>
              </div>
            )}
            {permission.notes && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">
                  {t("permissions.table_notes")}:
                </span>
                <span className="text-sm text-muted-foreground">
                  {permission.notes}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-destructive flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{t("permissions.revoke_warning")}</span>
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("providers.btn_cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {t("permissions.btn_revoke")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
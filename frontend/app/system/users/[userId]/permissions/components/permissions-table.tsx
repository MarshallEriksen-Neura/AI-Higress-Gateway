"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { UserPermission } from "@/lib/api-types";
import { useI18n } from "@/lib/i18n-context";
import { PermissionStatusBadge } from "./permission-status-badge";
import { getPermissionTypeMetadata } from "@/lib/constants/permission-types";
import { formatDateTime } from "@/lib/utils/time-formatter";

interface PermissionsTableProps {
  permissions: UserPermission[];
  onEdit: (permission: UserPermission) => void;
  onDelete: (permission: UserPermission) => void;
}

export function PermissionsTable({
  permissions,
  onEdit,
  onDelete,
}: PermissionsTableProps) {
  const { t } = useI18n();

  const getPermissionTypeName = (type: string) => {
    const metadata = getPermissionTypeMetadata(type);
    return metadata ? t(metadata.nameKey) : type;
  };

  const formatExpiresAt = (expiresAt: string | null) => {
    if (!expiresAt) {
      return t("permissions.never_expires");
    }
    return formatDateTime(expiresAt);
  };

  if (permissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("permissions.no_permissions")}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[25%]">{t("permissions.table_type")}</TableHead>
          <TableHead className="w-[15%]">{t("permissions.table_value")}</TableHead>
          <TableHead className="w-[20%]">{t("permissions.table_expires")}</TableHead>
          <TableHead className="w-[25%]">{t("permissions.table_notes")}</TableHead>
          <TableHead className="w-[10%]">{t("permissions.table_status")}</TableHead>
          <TableHead className="w-[5%] text-right">{t("permissions.table_actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions.map((permission) => (
          <TableRow key={permission.id}>
            <TableCell className="font-medium">
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                {getPermissionTypeName(permission.permission_type)}
              </code>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {permission.permission_value || "-"}
            </TableCell>
            <TableCell className="text-sm">
              {formatExpiresAt(permission.expires_at)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
              {permission.notes || "-"}
            </TableCell>
            <TableCell>
              <PermissionStatusBadge expiresAt={permission.expires_at} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(permission)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(permission)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
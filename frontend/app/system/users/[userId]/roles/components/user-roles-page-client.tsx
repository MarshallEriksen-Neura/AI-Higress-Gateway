"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-context";
import type { UserInfo } from "@/lib/api-types";
import { adminService, type Role } from "@/http/admin";
import { useAllRoles, useUserRoles } from "@/lib/swr/use-user-roles";
import { UserInfoCard } from "../../permissions/components/user-info-card";

interface UserRolesPageClientProps {
  user: UserInfo;
}

export function UserRolesPageClient({ user }: UserRolesPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    roles: allRoles,
    loading: loadingAllRoles,
    error: allRolesError,
  } = useAllRoles();

  const {
    roles: userRoles,
    loading: loadingUserRoles,
    error: userRolesError,
    refresh,
  } = useUserRoles(user.id);

  useEffect(() => {
    if (userRoles && userRoles.length > 0) {
      setSelectedRoleIds(userRoles.map((r) => r.id));
    } else {
      setSelectedRoleIds([]);
    }
  }, [userRoles]);

  const filteredRoles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return allRoles;

    return allRoles.filter((role) => {
      const name = role.name.toLowerCase();
      const code = role.code.toLowerCase();
      const description = (role.description || "").toLowerCase();
      return (
        name.includes(keyword) ||
        code.includes(keyword) ||
        description.includes(keyword)
      );
    });
  }, [allRoles, search]);

  const selectedRoleObjects: Role[] = useMemo(
    () => allRoles.filter((role) => selectedRoleIds.includes(role.id)),
    [allRoles, selectedRoleIds]
  );

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.setUserRoles(user.id, selectedRoleIds);
      toast.success(t("users.roles_save_success"));
      await refresh();
    } catch (error) {
      console.error("Failed to update user roles:", error);
      toast.error(t("users.roles_save_error"));
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingAllRoles || loadingUserRoles;

  if (allRolesError || userRolesError) {
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
              {t("users.roles_load_error")}
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
            <h1 className="text-3xl font-bold">
              {t("users.roles_dialog_title")}
            </h1>
            <p className="text-muted-foreground">
              {t("users.roles_dialog_desc")}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {t("providers.btn_save")}
        </Button>
      </div>

      {/* User Info */}
      <UserInfoCard user={user} />

      {/* Roles Selector */}
      <Card>
        <CardHeader>
          <CardTitle>{t("users.roles_dialog_title")}</CardTitle>
          <CardDescription>{t("users.roles_dialog_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Input
              placeholder={t("users.roles_search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground md:text-right">
              {t("users.select_roles")}
            </p>
          </div>

          {selectedRoleObjects.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("users.assigned_roles")}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedRoleObjects.map((role) => (
                  <Badge
                    key={role.id}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleRole(role.id)}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    <span>{role.name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border rounded-md p-3 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-start space-x-3 p-3 border rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      id={role.id}
                      checked={selectedRoleIds.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={role.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {role.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {role.description || role.code}
                      </p>
                    </div>
                  </div>
                ))}
                {!loading && filteredRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full text-center py-6">
                    {t("users.roles_empty")}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push("/system/users")}
              disabled={saving}
            >
              {t("providers.btn_cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {t("providers.btn_save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


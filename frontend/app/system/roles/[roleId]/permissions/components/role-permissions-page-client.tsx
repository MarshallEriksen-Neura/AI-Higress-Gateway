"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-context";
import { adminService, type Role } from "@/http/admin";
import { usePermissions, useRolePermissions } from "@/lib/swr/use-role-permissions";

interface RolePermissionsPageClientProps {
  role: Role;
}

export function RolePermissionsPageClient({ role }: RolePermissionsPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    permissions,
    loading: loadingPermissions,
    error: permissionsError,
  } = usePermissions();

  const {
    permissionCodes,
    loading: loadingRolePermissions,
    error: rolePermissionsError,
    refresh,
  } = useRolePermissions(role.id);

  useEffect(() => {
    setSelectedCodes(permissionCodes);
  }, [permissionCodes]);

  const filteredPermissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return permissions;

    return permissions.filter((perm) => {
      const code = perm.code.toLowerCase();
      const description = (perm.description || "").toLowerCase();
      return code.includes(keyword) || description.includes(keyword);
    });
  }, [permissions, search]);

  const togglePermission = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.setRolePermissions(role.id, {
        permission_codes: selectedCodes,
      });
      toast.success(t("roles.permissions_save_success"));
      await refresh();
    } catch (error) {
      console.error("Failed to update role permissions:", error);
      toast.error(t("roles.permissions_save_error"));
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingPermissions || loadingRolePermissions;

  if (permissionsError || rolePermissionsError) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/system/roles")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("roles.back_to_roles")}
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              {t("roles.permissions_load_error")}
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
            onClick={() => router.push("/system/roles")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("roles.back_to_roles")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("roles.permissions_page_title")}</h1>
            <p className="text-muted-foreground">
              {t("roles.permissions_page_subtitle").replace("{role}", role.name)}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {t("roles.permissions_save")}
        </Button>
      </div>

      {/* Role Info */}
      <Card>
        <CardContent className="pt-6 flex items-center space-x-4">
          <div className="flex-shrink-0">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold truncate">{role.name}</h2>
              <Badge variant="outline">
                <code className="text-xs">{role.code}</code>
              </Badge>
            </div>
            {role.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {role.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Selector */}
      <Card>
        <CardHeader>
          <CardTitle>{t("roles.permissions_dialog_title")}</CardTitle>
          <CardDescription>{t("roles.permissions_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Input
              placeholder={t("roles.permissions_search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground md:text-right">
              {t("roles.permissions_help")}
            </p>
          </div>

          {selectedCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("roles.selected_permissions")}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCodes.map((code) => (
                  <Badge
                    key={code}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => togglePermission(code)}
                  >
                    {code}
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
                {filteredPermissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-start space-x-3 p-3 border rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      id={perm.code}
                      checked={selectedCodes.includes(perm.code)}
                      onCheckedChange={() => togglePermission(perm.code)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={perm.code}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {perm.code}
                      </label>
                      {perm.description && (
                        <p className="text-xs text-muted-foreground">
                          {perm.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && filteredPermissions.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full text-center py-6">
                    {t("roles.no_permissions")}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push("/system/roles")}
              disabled={saving}
            >
              {t("providers.btn_cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {t("roles.permissions_save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { UserInfo } from "@/lib/api-types";
import { useActiveRegistrationWindow } from "@/lib/swr/use-registration-windows";
import { useAdminUsers } from "@/lib/swr/use-admin-users";
import { useAllRoles, useUserRoles } from "@/lib/swr/use-user-roles";
import { usePermissions } from "@/lib/swr/use-role-permissions";
import { useUserPermissions } from "@/lib/swr/use-user-permissions";
import { RegistrationWindowCard } from "@/components/system/users/registration-window-card";
import { UsersTable } from "@/components/system/users/users-table";
import { CreateUserDialog } from "@/components/system/users/create-user-dialog";
import { UserRolesDialog } from "@/components/system/users/user-roles-dialog";
import { UserPermissionsDialog } from "@/components/system/users/user-permissions-dialog";
import { UserStatusDialog } from "@/components/system/users/user-status-dialog";
import { AdminTopupDialog } from "@/components/dashboard/credits/admin-topup-dialog";
import { AutoTopupBatchDialog } from "@/components/dashboard/credits/auto-topup-batch-dialog";
import { AutoTopupDialog } from "@/components/dashboard/credits/auto-topup-dialog";

export function UsersPageClient() {
    const { t } = useI18n();
    const currentAuthUser = useAuthStore(state => state.user);
    const isSuperUser = currentAuthUser?.is_superuser === true;

    const {
        users,
        loading: usersLoading,
        refresh: mutateUsers,
    } = useAdminUsers();
    const { roles, loading: rolesLoading, refresh: refreshRoles } = useAllRoles();
    const {
        permissions,
        loading: permissionsLoading,
        refresh: refreshPermissions,
    } = usePermissions();

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [rolesOpen, setRolesOpen] = useState(false);
    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [topupOpen, setTopupOpen] = useState(false);
    const [autoTopupOpen, setAutoTopupOpen] = useState(false);
    const [autoTopupSingleOpen, setAutoTopupSingleOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);

    // Current user being edited
    const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
    const [topupUser, setTopupUser] = useState<UserInfo | null>(null);
    const [autoTopupUser, setAutoTopupUser] = useState<UserInfo | null>(null);
    const [statusTargetUser, setStatusTargetUser] = useState<UserInfo | null>(null);
    const [statusTargetActive, setStatusTargetActive] = useState<boolean | null>(null);
    
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [selectedPermCodes, setSelectedPermCodes] = useState<string[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const { refresh: refreshRegistrationWindow } = useActiveRegistrationWindow();
    const [refreshing, setRefreshing] = useState(false);

    const {
        roles: currentUserRoles,
        loading: currentUserRolesLoading,
    } = useUserRoles(currentUser?.id ?? null);
    const {
        permissions: currentUserPermissions,
        loading: currentUserPermissionsLoading,
    } = useUserPermissions(currentUser?.id ?? null);

    const loading = usersLoading || rolesLoading || permissionsLoading;

    const refreshAllData = useMemo(() => {
        return async () => {
            await Promise.allSettled([mutateUsers(), refreshRoles(), refreshPermissions()]);
        };
    }, [mutateUsers, refreshRoles, refreshPermissions]);

    const rolesDialogInitUserIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (!rolesOpen || !currentUser) {
            rolesDialogInitUserIdRef.current = null;
            return;
        }
        if (currentUserRolesLoading) return;
        if (rolesDialogInitUserIdRef.current === currentUser.id) return;
        setSelectedRoleIds(currentUserRoles.map((r) => r.id));
        rolesDialogInitUserIdRef.current = currentUser.id;
    }, [rolesOpen, currentUser, currentUserRolesLoading, currentUserRoles]);

    const permissionsDialogInitUserIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (!permissionsOpen || !currentUser) {
            permissionsDialogInitUserIdRef.current = null;
            return;
        }
        if (currentUserPermissionsLoading) return;
        if (permissionsDialogInitUserIdRef.current === currentUser.id) return;
        setSelectedPermCodes(currentUserPermissions.map((perm) => perm.permission_type));
        permissionsDialogInitUserIdRef.current = currentUser.id;
    }, [permissionsOpen, currentUser, currentUserPermissionsLoading, currentUserPermissions]);

    const openRolesDialog = (user: UserInfo) => {
        setCurrentUser(user);
        setSelectedRoleIds([]);
        setRolesOpen(true);
    };

    const openPermissionsDialog = (user: UserInfo) => {
        setCurrentUser(user);
        setSelectedPermCodes([]);
        setPermissionsOpen(true);
    };

    const openStatusDialog = (user: UserInfo, nextActive: boolean) => {
        setStatusTargetUser(user);
        setStatusTargetActive(nextActive);
        setStatusDialogOpen(true);
    };

    const handleRefreshAll = async () => {
        setRefreshing(true);
        try {
            await Promise.all([refreshAllData(), refreshRegistrationWindow()]);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{t("users.title")}</h1>
                    <p className="text-muted-foreground">{t("users.subtitle")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRefreshAll}
                        disabled={loading || refreshing}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t("users.refresh")}
                    </Button>
                    {isSuperUser && (
                        <Button
                            variant="outline"
                            disabled={selectedUserIds.length === 0}
                            onClick={() => setAutoTopupOpen(true)}
                        >
                            {t("credits.auto_topup_bulk")}
                        </Button>
                    )}
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("users.add_user")}
                    </Button>
                </div>
            </div>

            {isSuperUser && <RegistrationWindowCard />}

            <UsersTable
                users={users}
                loading={loading}
                isSuperUser={isSuperUser}
                selectedUserIds={selectedUserIds}
                onSelectedUserIdsChange={setSelectedUserIds}
                onOpenRoles={openRolesDialog}
                onOpenPermissions={openPermissionsDialog}
                onOpenStatus={openStatusDialog}
                onOpenTopup={(user) => {
                    setTopupUser(user);
                    setTopupOpen(true);
                }}
                onOpenAutoTopup={(user) => {
                    setAutoTopupUser(user);
                    setAutoTopupSingleOpen(true);
                }}
            />

            <CreateUserDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSuccess={() => void refreshAllData()}
            />

            <UserRolesDialog
                open={rolesOpen}
                onOpenChange={setRolesOpen}
                currentUser={currentUser}
                roles={roles}
                selectedRoleIds={selectedRoleIds}
                onSelectedRoleIdsChange={setSelectedRoleIds}
                onSuccess={() => void refreshAllData()}
            />

            <UserPermissionsDialog
                open={permissionsOpen}
                onOpenChange={setPermissionsOpen}
                currentUser={currentUser}
                permissions={permissions}
                selectedPermCodes={selectedPermCodes}
                onSelectedPermCodesChange={setSelectedPermCodes}
                currentUserPermissions={currentUserPermissions}
                onSuccess={() => void refreshAllData()}
            />

            <UserStatusDialog
                open={statusDialogOpen}
                onOpenChange={setStatusDialogOpen}
                targetUser={statusTargetUser}
                targetActive={statusTargetActive}
                onSuccess={(updatedUser) => {
                    void mutateUsers(
                        (prev) => prev?.map((u) => (u.id === updatedUser.id ? updatedUser : u)) ?? prev,
                        { revalidate: false }
                    );
                    setStatusTargetUser(null);
                    setStatusTargetActive(null);
                }}
            />

            {isSuperUser && topupUser && (
                <AdminTopupDialog
                    open={topupOpen}
                    onOpenChange={(open) => {
                        setTopupOpen(open);
                        if (!open) setTopupUser(null);
                    }}
                    userId={topupUser.id}
                    onSuccess={() => void refreshAllData()}
                />
            )}

            {isSuperUser && autoTopupUser && (
                <AutoTopupDialog
                    open={autoTopupSingleOpen}
                    onOpenChange={(open) => {
                        setAutoTopupSingleOpen(open);
                        if (!open) setAutoTopupUser(null);
                    }}
                    userId={autoTopupUser.id}
                    userLabel={autoTopupUser.display_name || autoTopupUser.email}
                    onSuccess={() => void refreshAllData()}
                />
            )}

            {isSuperUser && (
                <AutoTopupBatchDialog
                    open={autoTopupOpen}
                    onOpenChange={setAutoTopupOpen}
                    userIds={selectedUserIds}
                    onSuccess={() => void refreshAllData()}
                />
            )}
        </div>
    );
}

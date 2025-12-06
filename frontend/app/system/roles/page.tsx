"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Edit, Trash2, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { adminService, Role, Permission } from "@/http/admin";
import { toast } from "sonner";

export default function RolesPage() {
    const { t } = useI18n();
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [permOpen, setPermOpen] = useState(false);

    // Form states
    const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({ code: "", name: "", description: "" });
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rolesData, permsData] = await Promise.all([
                adminService.getRoles(),
                adminService.getPermissions()
            ]);
            setRoles(rolesData);
            setPermissions(permsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to load roles and permissions");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await adminService.createRole(formData);
            toast.success("Role created successfully");
            setCreateOpen(false);
            fetchData();
            setFormData({ code: "", name: "", description: "" });
        } catch (error) {
            toast.error("Failed to create role");
        }
    };

    const handleUpdate = async () => {
        if (!currentRole) return;
        try {
            await adminService.updateRole(currentRole.id, {
                name: formData.name,
                description: formData.description
            });
            toast.success("Role updated successfully");
            setEditOpen(false);
            fetchData();
        } catch (error) {
            toast.error("Failed to update role");
        }
    };

    const handleDelete = async (roleId: string) => {
        if (!confirm(t("roles.delete_confirm"))) return;
        try {
            await adminService.deleteRole(roleId);
            toast.success("Role deleted successfully");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete role");
        }
    };

    const openPermissionsDialog = async (role: Role) => {
        setCurrentRole(role);
        try {
            const data = await adminService.getRolePermissions(role.id);
            setSelectedPerms(data.permission_codes);
            setPermOpen(true);
        } catch (error) {
            toast.error("Failed to fetch role permissions");
        }
    };

    const savePermissions = async () => {
        if (!currentRole) return;
        try {
            await adminService.setRolePermissions(currentRole.id, {
                permission_codes: selectedPerms
            });
            toast.success("Permissions updated successfully");
            setPermOpen(false);
        } catch (error) {
            toast.error("Failed to update permissions");
        }
    };

    const togglePermission = (code: string) => {
        setSelectedPerms(prev =>
            prev.includes(code)
                ? prev.filter(p => p !== code)
                : [...prev, code]
        );
    };

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{t("roles.title")}</h1>
                    <p className="text-muted-foreground">{t("roles.subtitle")}</p>
                </div>
                <Button onClick={() => {
                    setFormData({ code: "", name: "", description: "" });
                    setCreateOpen(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("roles.add_role")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("roles.title")}</CardTitle>
                    <CardDescription>{t("roles.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("roles.table_column_name")}</TableHead>
                                <TableHead>{t("roles.table_column_code")}</TableHead>
                                <TableHead>{t("roles.table_column_description")}</TableHead>
                                <TableHead className="text-right">{t("providers.table_column_actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                                            {role.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="bg-muted px-1 py-0.5 rounded text-xs">{role.code}</code>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{role.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    window.location.href = `/system/roles/${role.id}/permissions`;
                                                }}
                                            >
                                                <Lock className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => {
                                                setCurrentRole(role);
                                                setFormData({ code: role.code, name: role.name, description: role.description || "" });
                                                setEditOpen(true);
                                            }}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(role.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && roles.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No roles found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Role Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("roles.create_dialog_title")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("roles.label_role_name")}</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("roles.label_role_code")}</label>
                            <Input
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="e.g. system_admin"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("roles.label_role_desc")}</label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("providers.btn_cancel")}</Button>
                        <Button onClick={handleCreate}>{t("providers.btn_create")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("roles.edit_dialog_title")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("roles.label_role_name")}</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("roles.label_role_code")}</label>
                            <Input
                                value={formData.code}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("roles.label_role_desc")}</label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>{t("providers.btn_cancel")}</Button>
                        <Button onClick={handleUpdate}>{t("providers.btn_save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Permissions Dialog */}
            <Dialog open={permOpen} onOpenChange={setPermOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("roles.permissions_dialog_title")}</DialogTitle>
                        <DialogDescription>{t("roles.permissions_desc")}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {permissions.map((perm) => (
                                <div key={perm.id} className="flex items-start space-x-3 p-3 border rounded hover:bg-muted/50">
                                    <Checkbox
                                        id={perm.code}
                                        checked={selectedPerms.includes(perm.code)}
                                        onCheckedChange={() => togglePermission(perm.code)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor={perm.code}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {perm.code}
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            {perm.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPermOpen(false)}>{t("providers.btn_cancel")}</Button>
                        <Button onClick={savePermissions}>{t("roles.permissions_save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCircle, Plus, Edit, Trash2, Shield, Key } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { adminService, Role } from "@/http/admin";
import { userService } from "@/http/user";
import { UserInfo } from "@/http/auth";
import { toast } from "sonner";

export default function UsersPage() {
    const { t } = useI18n();
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [rolesOpen, setRolesOpen] = useState(false);

    // Current user being edited
    const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

    // Form data
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        display_name: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, rolesData] = await Promise.all([
                adminService.getAllUsers(),
                adminService.getRoles()
            ]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to load users and roles");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async () => {
        try {
            await userService.createUser(formData);
            toast.success("User created successfully");
            setCreateOpen(false);
            fetchData();
            setFormData({ email: "", password: "", display_name: "" });
        } catch (error) {
            toast.error("Failed to create user");
        }
    };

    const openRolesDialog = async (user: UserInfo) => {
        setCurrentUser(user);
        try {
            const userRoles = await adminService.getUserRoles(user.id);
            setSelectedRoleIds(userRoles.map(r => r.id));
            setRolesOpen(true);
        } catch (error) {
            toast.error("Failed to fetch user roles");
        }
    };

    const saveUserRoles = async () => {
        if (!currentUser) return;
        try {
            await adminService.setUserRoles(currentUser.id, selectedRoleIds);
            toast.success("User roles updated successfully");
            setRolesOpen(false);
            fetchData();
        } catch (error) {
            toast.error("Failed to update user roles");
        }
    };

    const toggleRole = (roleId: string) => {
        setSelectedRoleIds(prev =>
            prev.includes(roleId)
                ? prev.filter(id => id !== roleId)
                : [...prev, roleId]
        );
    };

    const getRoleNames = (user: UserInfo): string => {
        if (!user.role_codes || user.role_codes.length === 0) return "No roles";
        return user.role_codes.join(", ");
    };

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
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{t("users.title")}</h1>
                    <p className="text-muted-foreground">{t("users.subtitle")}</p>
                </div>
                <Button onClick={() => {
                    setFormData({ email: "", password: "", display_name: "" });
                    setCreateOpen(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("users.add_user")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("users.title")}</CardTitle>
                    <CardDescription>{t("users.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("users.table_column_name")}</TableHead>
                                <TableHead>{t("users.table_column_email")}</TableHead>
                                <TableHead>{t("users.table_column_roles")}</TableHead>
                                <TableHead>{t("users.table_column_status")}</TableHead>
                                <TableHead className="text-right">{t("providers.table_column_actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            <UserCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                                            {user.display_name || user.email}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {user.role_codes && user.role_codes.length > 0 ? (
                                                user.role_codes.map((roleCode, index) => (
                                                    <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                        {roleCode}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No roles</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(user.is_active)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    window.location.href = `/system/users/${user.id}/roles`;
                                                }}
                                            >
                                                <Shield className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.location.href = `/system/users/${user.id}/permissions`}
                                            >
                                                <Key className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm">
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create User Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("users.add_user")}</DialogTitle>
                        <DialogDescription>Create a new user account</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Display Name</label>
                            <Input
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("providers.btn_cancel")}</Button>
                        <Button onClick={handleCreateUser}>{t("providers.btn_create")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Roles Dialog */}
            <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("users.roles_dialog_title")}</DialogTitle>
                        <DialogDescription>{t("users.roles_dialog_desc")}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                        <p className="text-sm text-muted-foreground mb-4">{t("users.select_roles")}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {roles.map((role) => (
                                <div key={role.id} className="flex items-start space-x-3 p-3 border rounded hover:bg-muted/50">
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
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRolesOpen(false)}>{t("providers.btn_cancel")}</Button>
                        <Button onClick={saveUserRoles}>{t("providers.btn_save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

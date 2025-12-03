"use client";

import React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Server, Settings, Plus, Minus, Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

type ProviderStatus = "Active" | "Inactive";

type Provider = {
    id: string;
    name: string;
    vendor: string;
    providerType: "Native" | "Aggregator";
    status: ProviderStatus;
    models: number;
    lastSync: string;
};

interface ProviderTableProps {
    providers: Provider[];
    onToggleStatus: (providerId: string) => void;
    onEdit: (providerId: string) => void;
    onDelete: (providerId: string) => void;
    onViewModels: (providerId: string) => void;
}

export function ProviderTable({ 
    providers, 
    onToggleStatus, 
    onEdit, 
    onDelete, 
    onViewModels 
}: ProviderTableProps) {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("providers.table_all_providers")}</CardTitle>
                <CardDescription>
                    {t("providers.table_all_providers_description")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("providers.table_column_id")}</TableHead>
                            <TableHead>{t("providers.table_column_name")}</TableHead>
                            <TableHead>{t("providers.table_column_vendor")}</TableHead>
                            <TableHead>{t("providers.table_column_type")}</TableHead>
                            <TableHead>{t("providers.table_column_status")}</TableHead>
                            <TableHead>{t("providers.table_column_models")}</TableHead>
                            <TableHead>{t("providers.table_column_last_sync")}</TableHead>
                            <TableHead className="text-right">
                                {t("providers.table_column_actions")}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {providers.map((provider) => (
                            <TableRow key={provider.id}>
                                <TableCell className="text-xs text-muted-foreground">
                                    {provider.id}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center">
                                        <Server className="w-4 h-4 mr-2 text-muted-foreground" />
                                        {provider.name}
                                    </div>
                                </TableCell>
                                <TableCell>{provider.vendor}</TableCell>
                                <TableCell>
                                    {provider.providerType === "Native"
                                        ? "直连（Native）"
                                        : "聚合（Aggregator）"}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                            provider.status === "Active"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {provider.status === "Active"
                                            ? t("providers.status_active")
                                            : t("providers.status_inactive")}
                                    </span>
                                </TableCell>
                                <TableCell>{provider.models}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {provider.lastSync}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                aria-label={t("providers.table_column_actions")}
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => onViewModels(provider.id)}
                                            >
                                                {/* <Eye className="mr-2 h-4 w-4" /> */}
                                                {t("providers.action_view_models")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onToggleStatus(provider.id)}
                                            >
                                                {provider.status === "Active" ? (
                                                    <>
                                                        <Minus className="mr-2 h-4 w-4" />
                                                        {t("providers.action_disable")}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        {t("providers.action_enable")}
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onEdit(provider.id)}
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                {t("providers.action_edit")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => onDelete(provider.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {t("providers.action_delete")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
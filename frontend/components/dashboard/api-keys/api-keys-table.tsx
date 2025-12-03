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
import { Key, Copy, Trash2 } from "lucide-react";

type ApiKeyStatus = "Active" | "Inactive";

type ApiKey = {
    id: number;
    name: string;
    key: string;
    created: string;
    lastUsed: string;
    status: ApiKeyStatus;
};

interface ApiKeysTableProps {
    apiKeys: ApiKey[];
    onCopy: (key: string) => void;
    onDelete: (id: number) => void;
}

export function ApiKeysTable({ apiKeys, onCopy, onDelete }: ApiKeysTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Your API Keys</CardTitle>
                <CardDescription>Keep your keys secure and never share them publicly</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Key</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {apiKeys.map((apiKey) => (
                            <TableRow key={apiKey.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center">
                                        <Key className="w-4 h-4 mr-2 text-muted-foreground" />
                                        {apiKey.name}
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{apiKey.key}</TableCell>
                                <TableCell className="text-muted-foreground">{apiKey.created}</TableCell>
                                <TableCell className="text-muted-foreground">{apiKey.lastUsed}</TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                            apiKey.status === "Active"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {apiKey.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => onCopy(apiKey.key)}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => onDelete(apiKey.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
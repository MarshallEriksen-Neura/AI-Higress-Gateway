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
import { Cpu, Settings } from "lucide-react";

type LogicalModelStatus = "Active" | "Inactive";

type LogicalModel = {
    id: number;
    name: string;
    provider: string;
    physicalModels: string[];
    status: LogicalModelStatus;
    requests: string;
};

interface LogicalModelsTableProps {
    logicalModels: LogicalModel[];
    onEdit: (id: number) => void;
}

export function LogicalModelsTable({ logicalModels, onEdit }: LogicalModelsTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>All Logical Models</CardTitle>
                <CardDescription>Logical models abstract physical model implementations</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Physical Models</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Requests (30d)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logicalModels.map((model) => (
                            <TableRow key={model.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center">
                                        <Cpu className="w-4 h-4 mr-2 text-muted-foreground" />
                                        {model.name}
                                    </div>
                                </TableCell>
                                <TableCell>{model.provider}</TableCell>
                                <TableCell className="font-mono text-xs">
                                    {model.physicalModels.join(", ")}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                            model.status === "Active"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {model.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{model.requests}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onEdit(model.id)}>
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
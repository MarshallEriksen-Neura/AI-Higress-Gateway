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
import { Network, Edit } from "lucide-react";

type RoutingStatus = "Active" | "Inactive";

type RoutingRule = {
    id: number;
    name: string;
    strategy: string;
    models: string[];
    weight: string;
    status: RoutingStatus;
};

interface RoutingTableProps {
    routingRules: RoutingRule[];
    onEdit: (id: number) => void;
}

export function RoutingTable({ routingRules, onEdit }: RoutingTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Routing Rules</CardTitle>
                <CardDescription>Rules are evaluated in order from top to bottom</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Strategy</TableHead>
                            <TableHead>Models</TableHead>
                            <TableHead>Weight/Config</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {routingRules.map((rule) => (
                            <TableRow key={rule.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center">
                                        <Network className="w-4 h-4 mr-2 text-muted-foreground" />
                                        {rule.name}
                                    </div>
                                </TableCell>
                                <TableCell>{rule.strategy}</TableCell>
                                <TableCell className="text-sm">
                                    {rule.models.join(" → ")}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{rule.weight}</TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                            rule.status === "Active"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {rule.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onEdit(rule.id)}>
                                        <Edit className="w-4 h-4" />
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
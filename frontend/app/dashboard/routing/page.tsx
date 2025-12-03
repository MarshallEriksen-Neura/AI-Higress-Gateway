"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RoutingForm } from "@/components/dashboard/routing/routing-form";
import { RoutingTable } from "@/components/dashboard/routing/routing-table";
import { Plus } from "lucide-react";

type RoutingStatus = "Active" | "Inactive";

type RoutingRule = {
    id: number;
    name: string;
    strategy: string;
    models: string[];
    weight: string;
    status: RoutingStatus;
};

const routingRules: RoutingRule[] = [
    { id: 1, name: "Load Balance GPT-4", strategy: "Round Robin", models: ["gpt-4-turbo", "gpt-4"], weight: "50/50", status: "Active" },
    { id: 2, name: "Fallback Chain", strategy: "Fallback", models: ["claude-3-opus", "gpt-4"], weight: "Primary/Backup", status: "Active" },
    { id: 3, name: "Cost Optimization", strategy: "Weighted", models: ["gpt-3.5-turbo", "claude-3-sonnet"], weight: "70/30", status: "Active" },
    { id: 4, name: "Regional Routing", strategy: "Geographic", models: ["azure-gpt-4", "openai-gpt-4"], weight: "Auto", status: "Inactive" },
];

export default function RoutingPage() {
    const [open, setOpen] = useState(false);

    const handleEdit = (id: number) => {
        console.log("Edit routing rule", id);
    };

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Routing Rules</h1>
                    <p className="text-muted-foreground">Configure intelligent request routing strategies</p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Rule
                </Button>
            </div>

            <RoutingTable 
                routingRules={routingRules}
                onEdit={handleEdit}
            />

            <RoutingForm 
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    );
}
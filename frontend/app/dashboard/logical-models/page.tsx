"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogicalModelsForm } from "@/components/dashboard/logical-models/logical-models-form";
import { LogicalModelsTable } from "@/components/dashboard/logical-models/logical-models-table";
import { Plus } from "lucide-react";

type LogicalModelStatus = "Active" | "Inactive";

type LogicalModel = {
    id: number;
    name: string;
    provider: string;
    physicalModels: string[];
    status: LogicalModelStatus;
    requests: string;
};

const logicalModels: LogicalModel[] = [
    { id: 1, name: "gpt-4-turbo", provider: "OpenAI", physicalModels: ["gpt-4-turbo-2024-04-09"], status: "Active", requests: "125K" },
    { id: 2, name: "claude-3-opus", provider: "Anthropic", physicalModels: ["claude-3-opus-20240229"], status: "Active", requests: "98K" },
    { id: 3, name: "gemini-pro", provider: "Google", physicalModels: ["gemini-1.5-pro"], status: "Active", requests: "76K" },
    { id: 4, name: "gpt-3.5-turbo", provider: "OpenAI", physicalModels: ["gpt-3.5-turbo-0125"], status: "Active", requests: "245K" },
    { id: 5, name: "claude-3-sonnet", provider: "Anthropic", physicalModels: ["claude-3-sonnet-20240229"], status: "Inactive", requests: "12K" },
];

export default function LogicalModelsPage() {
    const [open, setOpen] = useState(false);

    const handleEdit = (id: number) => {
        console.log("Edit logical model", id);
    };

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Logical Models</h1>
                    <p className="text-muted-foreground">Manage logical model mappings to physical models</p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Logical Model
                </Button>
            </div>

            <LogicalModelsTable 
                logicalModels={logicalModels}
                onEdit={handleEdit}
            />

            <LogicalModelsForm 
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    );
}

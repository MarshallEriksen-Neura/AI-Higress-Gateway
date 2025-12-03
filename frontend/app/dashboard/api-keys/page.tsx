"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiKeysForm } from "@/components/dashboard/api-keys/api-keys-form";
import { ApiKeysTable } from "@/components/dashboard/api-keys/api-keys-table";
import { Plus, Copy } from "lucide-react";

type ApiKeyStatus = "Active" | "Inactive";

type ApiKey = {
    id: number;
    name: string;
    key: string;
    created: string;
    lastUsed: string;
    status: ApiKeyStatus;
};

const apiKeys: ApiKey[] = [
    { id: 1, name: "Production Key", key: "sk-proj-***************", created: "2024-01-15", lastUsed: "2 hours ago", status: "Active" },
    { id: 2, name: "Development Key", key: "sk-dev-***************", created: "2024-01-10", lastUsed: "5 min ago", status: "Active" },
    { id: 3, name: "Testing Key", key: "sk-test-***************", created: "2024-01-05", lastUsed: "1 day ago", status: "Active" },
    { id: 4, name: "Legacy Key", key: "sk-old-***************", created: "2023-12-01", lastUsed: "30 days ago", status: "Inactive" },
];

export default function ApiKeysPage() {
    const [open, setOpen] = useState(false);

    const handleCopy = (key: string) => {
        navigator.clipboard.writeText(key);
    };

    const handleDelete = (id: number) => {
        console.log("Delete API key", id);
    };

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">API Keys</h1>
                    <p className="text-muted-foreground">Manage your API keys and access tokens</p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create API Key
                </Button>
            </div>

            <ApiKeysTable 
                apiKeys={apiKeys}
                onCopy={handleCopy}
                onDelete={handleDelete}
            />

            <ApiKeysForm 
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    );
}

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProviderForm } from "@/components/dashboard/providers/provider-form";
import { ProviderTable } from "@/components/dashboard/providers/provider-table";
import { ProviderModelsDialog } from "@/components/dashboard/providers/provider-models-dialog";
import { useI18n } from "@/lib/i18n-context";
import { Plus } from "lucide-react";

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

const providers: Provider[] = [
    {
        id: "openai",
        name: "OpenAI",
        vendor: "OpenAI",
        providerType: "Native",
        status: "Active",
        models: 12,
        lastSync: "2 min ago",
    },
    {
        id: "anthropic",
        name: "Anthropic",
        vendor: "Anthropic",
        providerType: "Native",
        status: "Active",
        models: 8,
        lastSync: "5 min ago",
    },
    {
        id: "google-gemini",
        name: "Google Gemini",
        vendor: "Google",
        providerType: "Native",
        status: "Active",
        models: 6,
        lastSync: "1 min ago",
    },
    {
        id: "azure-openai",
        name: "Azure OpenAI",
        vendor: "Azure",
        providerType: "Aggregator",
        status: "Inactive",
        models: 10,
        lastSync: "1 hour ago",
    },
    {
        id: "cohere",
        name: "Cohere",
        vendor: "Cohere",
        providerType: "Native",
        status: "Active",
        models: 4,
        lastSync: "3 min ago",
    },
];

const mockProviderModels: Record<string, string[]> = {
    openai: [
        "gpt-4.1-mini",
        "gpt-4.1",
        "o3-mini",
        "gpt-4o-mini",
        "gpt-4o",
    ],
    anthropic: ["claude-3.5-sonnet", "claude-3.5-haiku", "claude-3-opus"],
    "google-gemini": ["gemini-2.0-flash", "gemini-2.0-pro"],
    "azure-openai": ["gpt-4o-azure", "gpt-4.1-azure"],
    cohere: ["command-r-plus", "command-r"],
};

export default function ProvidersPage() {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [modelsDialogOpen, setModelsDialogOpen] = useState(false);
    const [modelsProviderId, setModelsProviderId] = useState<string | null>(null);
    const [modelsPathByProvider, setModelsPathByProvider] = useState<Record<string, string>>({});
    const [providerModels, setProviderModels] = useState<Record<string, string[]>>(mockProviderModels);
    const [selectedModelByProvider, setSelectedModelByProvider] = useState<Record<string, string | null>>({});
    const [newModelNameByProvider, setNewModelNameByProvider] = useState<Record<string, string>>({});
    const [providerList, setProviderList] = useState<Provider[]>(providers);

    const handleEdit = (providerId: string) => {
        // 预留：后续可在这里打开编辑表单并填充 Provider 详情
        setOpen(true);
        console.log("Edit provider", providerId);
    };

    const handleDelete = (providerId: string) => {
        if (window.confirm(t("providers.action_delete_confirm"))) {
            // 预留：后续接入实际删除接口
            console.log("Delete provider", providerId);
        }
    };

    const handleToggleStatus = (providerId: string) => {
        // 仅前端示例：切换 Provider 的启用 / 未启用状态
        setProviderList((prev) =>
            prev.map((provider) =>
                provider.id === providerId
                    ? {
                        ...provider,
                        status: provider.status === "Active" ? "Inactive" : "Active",
                    }
                    : provider,
            ),
        );
    };

    const handleViewModels = (providerId: string) => {
        setModelsProviderId(providerId);
        setModelsDialogOpen(true);
    };

    const handleAddModel = () => {
        if (!modelsProviderId) return;
        const name =
            newModelNameByProvider[modelsProviderId]?.trim() ?? "";
        if (!name) return;

        setProviderModels((prev) => {
            const current = prev[modelsProviderId] ?? [];
            if (current.includes(name)) {
                return prev;
            }
            return {
                ...prev,
                [modelsProviderId]: [...current, name],
            };
        });

        setNewModelNameByProvider((prev) => ({
            ...prev,
            [modelsProviderId]: "",
        }));

        setSelectedModelByProvider((prev) => ({
            ...prev,
            [modelsProviderId]: name,
        }));
    };

    const handleRemoveModel = () => {
        if (!modelsProviderId) return;
        const selected = selectedModelByProvider[modelsProviderId];
        if (!selected) return;

        setProviderModels((prev) => {
            const current = prev[modelsProviderId] ?? [];
            const next = current.filter((model) => model !== selected);
            return {
                ...prev,
                [modelsProviderId]: next,
            };
        });

        setSelectedModelByProvider((prev) => ({
            ...prev,
            [modelsProviderId]: null,
        }));
    };

    const handleModelsPathChange = (providerId: string, path: string) => {
        setModelsPathByProvider((prev) => ({
            ...prev,
            [providerId]: path,
        }));
    };

    const handleSelectModel = (model: string) => {
        if (!modelsProviderId) return;
        setSelectedModelByProvider((prev) => ({
            ...prev,
            [modelsProviderId]: prev[modelsProviderId] === model ? null : model,
        }));
    };

    const handleModelNameChange = (name: string) => {
        if (!modelsProviderId) return;
        setNewModelNameByProvider((prev) => ({
            ...prev,
            [modelsProviderId]: name,
        }));
    };

    const handleSaveModelsConfig = () => {
        if (!modelsProviderId) return;
        const models = providerModels[modelsProviderId] ?? [];
        const path = modelsPathByProvider[modelsProviderId] ?? "/v1/models";
        // 预留：后续接入实际保存接口
        console.log("Save provider models config", modelsProviderId, path, models);
        setModelsDialogOpen(false);
    };

return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        {t("providers.title")}
                    </h1>
                    <p className="text-muted-foreground">
                        {t("providers.subtitle")}
                    </p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("providers.add_provider")}
                </Button>
            </div>

            <ProviderTable 
                providers={providerList}
                onToggleStatus={handleToggleStatus}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewModels={handleViewModels}
            />

            <ProviderForm 
                open={open}
                onOpenChange={setOpen}
            />

            <ProviderModelsDialog
                open={modelsDialogOpen}
                onOpenChange={setModelsDialogOpen}
                providerId={modelsProviderId}
                modelsPathByProvider={modelsPathByProvider}
                providerModels={providerModels}
                selectedModelByProvider={selectedModelByProvider}
                newModelNameByProvider={newModelNameByProvider}
                onModelsPathChange={handleModelsPathChange}
                onAddModel={handleAddModel}
                onRemoveModel={handleRemoveModel}
                onSelectModel={handleSelectModel}
                onModelNameChange={handleModelNameChange}
                onSave={handleSaveModelsConfig}
            />
        </div>
    );
}

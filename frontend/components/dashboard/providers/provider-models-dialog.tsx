"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Plus, Minus } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface ProviderModelsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    providerId: string | null;
    modelsPathByProvider: Record<string, string>;
    providerModels: Record<string, string[]>;
    selectedModelByProvider: Record<string, string | null>;
    newModelNameByProvider: Record<string, string>;
    onModelsPathChange: (providerId: string, path: string) => void;
    onAddModel: () => void;
    onRemoveModel: () => void;
    onSelectModel: (model: string) => void;
    onModelNameChange: (name: string) => void;
    onSave: () => void;
}

export function ProviderModelsDialog({
    open,
    onOpenChange,
    providerId,
    modelsPathByProvider,
    providerModels,
    selectedModelByProvider,
    newModelNameByProvider,
    onModelsPathChange,
    onAddModel,
    onRemoveModel,
    onSelectModel,
    onModelNameChange,
    onSave,
}: ProviderModelsDialogProps) {
    const { t } = useI18n();

    const handleModelsPathUpdate = () => {
        if (!providerId) return;
        const path = modelsPathByProvider[providerId] ?? "/v1/models";
        onModelsPathChange(providerId, path);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("providers.models_dialog_title")}</DialogTitle>
                    <DialogDescription>
                        {t("providers.models_dialog_description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        {providerId && (
                            <span>
                                Provider ID:{" "}
                                <span className="font-mono">{providerId}</span>
                            </span>
                        )}
                    </div>

                    {providerId && (
                        <div className="space-y-2">
                            <label className="flex items-center gap-1 text-sm font-medium">
                                <span>Models Path</span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                                        >
                                            <Info
                                                className="h-3 w-3"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        用于拉取模型列表的接口路径，部分不兼容
                                        /v1/models 的厂商需要在这里调整。
                                    </TooltipContent>
                                </Tooltip>
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    className="flex-1"
                                    placeholder="/v1/models"
                                    value={
                                        modelsPathByProvider[providerId] ??
                                        "/v1/models"
                                    }
                                    onChange={(event) =>
                                        onModelsPathChange(providerId, event.target.value)
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleModelsPathUpdate}
                                >
                                    更新
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                目前仅用于前端展示示例，后续会接入网关接口并按照此路径拉取模型列表。
                            </p>
                        </div>
                    )}

                    {providerId && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>该提供商的模型列表</span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={onAddModel}
                                    aria-label="添加模型"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={onRemoveModel}
                                    aria-label="删除模型"
                                    disabled={
                                        !selectedModelByProvider[providerId]
                                    }
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border bg-muted/40 p-4 max-h-[40vh] overflow-y-auto">
                        <ul className="space-y-2 text-sm">
                            {providerId &&
                            providerModels[providerId] &&
                            providerModels[providerId].length > 0 ? (
                                providerModels[providerId].map((model) => (
                                    <li
                                        key={model}
                                        className={`flex items-center justify-between rounded border bg-background px-3 py-2 cursor-pointer ${
                                            selectedModelByProvider[providerId] ===
                                            model
                                                ? "border-primary bg-primary/10"
                                                : ""
                                        }`}
                                        onClick={() => onSelectModel(model)}
                                    >
                                        <span className="font-mono text-xs sm:text-sm">
                                            {model}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            模型示例
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-xs text-muted-foreground">
                                    暂无模型示例。后续会从后端接口实时拉取模型列表。
                                </li>
                            )}
                        </ul>
                    </div>
                    {providerId && (
                        <div className="mt-3 flex gap-2">
                            <Input
                                placeholder="输入模型名称后点击上方 + 按钮添加"
                                value={newModelNameByProvider[providerId] ?? ""}
                                onChange={(event) =>
                                    onModelNameChange(event.target.value)
                                }
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t("providers.btn_cancel")}
                    </Button>
                    <Button onClick={onSave}>
                        {t("providers.btn_save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
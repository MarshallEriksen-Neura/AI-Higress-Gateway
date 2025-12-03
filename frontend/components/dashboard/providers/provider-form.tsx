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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface ProviderFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProviderForm({ open, onOpenChange }: ProviderFormProps) {
    const { t } = useI18n();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [providerType, setProviderType] = useState<"native" | "aggregator">("native");
    const [transport, setTransport] = useState("http");
    const [vendorPreset, setVendorPreset] = useState("openai");

    const isSdkTransport = transport.trim().toLowerCase() === "sdk";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("providers.dialog_title")}</DialogTitle>
                    <DialogDescription>
                        {t("providers.dialog_description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Basic configuration */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="flex items-center gap-1 text-sm font-medium">
                                <span>Provider ID</span>
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
                                        用于路由和 API Key 授权的唯一短 ID，例如
                                        openai、openai-prod。
                                    </TooltipContent>
                                </Tooltip>
                            </label>
                            <Input
                                required
                                placeholder="例如：openai, anthropic"
                            />
                            <p className="text-xs text-muted-foreground">
                                参与路由和 API Key 授权的唯一短 ID。
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-1 text-sm font-medium">
                                <span>Provider Name</span>
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
                                        展示用名称，出现在控制台列表和报表中，例如
                                        OpenAI（生产）。
                                    </TooltipContent>
                                </Tooltip>
                            </label>
                            <Input required placeholder="例如：OpenAI" />
                        </div>
                        {/* Provider Type & Transport - 主控制区，从高级设置中提到基础配置区域 */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-1 text-sm font-medium">
                                    <span>Provider Type</span>
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
                                            标记是直连厂商（Native），还是通过聚合平台
                                            （Aggregator）转发。
                                        </TooltipContent>
                                    </Tooltip>
                                </label>
                                <Tabs
                                    value={providerType}
                                    onValueChange={(value) =>
                                        setProviderType(
                                            value as "native" | "aggregator"
                                        )
                                    }
                                >
                                    <TabsList>
                                        <TabsTrigger value="native">
                                            直连（Native）
                                        </TabsTrigger>
                                        <TabsTrigger value="aggregator">
                                            聚合（Aggregator）
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <p className="text-xs text-muted-foreground">
                                    当通过上游聚合平台转发时，请选择 Aggregator。
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-1 text-sm font-medium">
                                    <span>Transport</span>
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
                                            选择使用 HTTP 代理还是官方 SDK。大多数场景推荐保持
                                            HTTP。
                                        </TooltipContent>
                                    </Tooltip>
                                </label>
                                <Select
                                    required
                                    value={transport}
                                    onChange={(event) =>
                                        setTransport(event.target.value)
                                    }
                                >
                                    <option value="sdk">SDK</option>
                                    <option value="http">HTTP 代理</option>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    当选择 SDK 时，将使用内置厂商配置，无需填写 Base URL
                                    和路径；选择 HTTP 代理时，需要自行提供上游地址和路径。
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-1 text-sm font-medium">
                                <span>Vendor / Platform</span>
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
                                        底层厂商或平台名称，例如
                                        OpenAI、Anthropic、Google、Azure。
                                    </TooltipContent>
                                </Tooltip>
                            </label>
                            {providerType === "native" ? (
                                <div className="space-y-2">
                                    <Select
                                        required
                                        value={vendorPreset}
                                        onChange={(event) =>
                                            setVendorPreset(event.target.value)
                                        }
                                    >
                                        <option value="openai">OpenAI</option>
                                        <option value="anthropic">Anthropic</option>
                                        <option value="google-gemini">Google Gemini</option>
                                        <option value="azure-openai">Azure OpenAI</option>
                                        <option value="cohere">Cohere</option>
                                        <option value="custom">自定义 / 其他</option>
                                    </Select>
                                    {vendorPreset === "custom" && (
                                        <Input
                                            required
                                            placeholder="请输入厂商名称，例如：Ollama"
                                        />
                                    )}
                                </div>
                            ) : (
                                <Input
                                    required
                                    placeholder="例如：OneAPI, 自建聚合服务"
                                />
                            )}
                        </div>
                        {!isSdkTransport && (
                            <div className="space-y-2">
                                <label className="flex items-center gap-1 text-sm font-medium">
                                    <span>API Base URL</span>
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
                                            上游接口的基础地址，例如
                                            https://api.openai.com/v1。
                                        </TooltipContent>
                                    </Tooltip>
                                </label>
                                <Input
                                    required
                                    placeholder="例如：https://api.openai.com/v1"
                                />
                            </div>
                        )}
                    </div>

                    {/* Advanced settings (collapsible) */}
                    <div className="space-y-2">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-3 py-2 text-left text-sm"
                            onClick={() => setShowAdvanced((prev) => !prev)}
                        >
                            <span className="font-medium">
                                {t("providers.advanced_settings")}
                            </span>
                            {showAdvanced ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </button>
                        {showAdvanced && (
                            <div className="mt-3 space-y-4 rounded-md border bg-muted/40 p-4">
                                {!isSdkTransport && (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-1 text-sm font-medium">
                                                <span>Messages Path</span>
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
                                                        Claude / Chat 接口首选的消息路径，例如
                                                        /v1/messages 或 /v1/chat/completions。
                                                    </TooltipContent>
                                                </Tooltip>
                                            </label>
                                            <Input placeholder="/v1/messages" />
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-1 text-sm font-medium">
                                            <span>Routing Weight</span>
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
                                                    路由权重，数值越大，被选中的概率越高。默认
                                                    1.0。
                                                </TooltipContent>
                                            </Tooltip>
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            placeholder="例如：1.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-1 text-sm font-medium">
                                            <span>Max QPS</span>
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
                                                    可选的 Provider 级限流，达到该
                                                    QPS 后会暂时跳过该 Provider。
                                                </TooltipContent>
                                            </Tooltip>
                                        </label>
                                        <Input
                                            type="number"
                                            placeholder="例如：50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Region（可选）
                                        </label>
                                        <Input placeholder="例如：us-east-1" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        API Key 会在服务商详情页单独管理。创建服务商后，你可以在详情页中添加带权重的密钥。
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t("providers.btn_cancel")}
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                        {t("providers.btn_create")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
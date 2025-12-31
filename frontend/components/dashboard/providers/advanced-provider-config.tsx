"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { JsonEditor } from "./json-editor";
import { NumberArrayEditor } from "./array-editor";
import { ApiStylesConfig } from "./api-styles-config";
import { ChevronDown, ChevronUp, Settings, Route, DollarSign, Code2, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

// 类型安全的FormField包装器
const SafeFormField = FormField as any;

interface AdvancedProviderConfigProps {
    form: any;
    isFieldOverridden: (fieldName: string) => boolean;
    markFieldAsOverridden: (fieldName: string) => void;
    showAdvanced: boolean;
    onToggleAdvanced: () => void;
    hasPresetSelected?: boolean;
    isEditing?: boolean;
}

// 可折叠的配置区块
interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    description?: string;
    defaultOpen?: boolean;
    badge?: string;
    children: React.ReactNode;
}

function CollapsibleSection({
    title,
    icon,
    description,
    defaultOpen = false,
    badge,
    children,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="rounded-lg border bg-card">
            <button
                type="button"
                className="flex w-full items-center justify-between p-3 text-left hover:bg-accent/50 transition-colors rounded-t-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                        {icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{title}</span>
                            {badge && (
                                <Badge variant="outline" className="text-xs">
                                    {badge}
                                </Badge>
                            )}
                        </div>
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>
            {isOpen && (
                <div className="border-t p-4 space-y-4">
                    {children}
                </div>
            )}
        </div>
    );
}

export function AdvancedProviderConfig({
    form,
    isFieldOverridden,
    markFieldAsOverridden,
    showAdvanced,
    onToggleAdvanced,
    hasPresetSelected = false,
    isEditing = false,
}: AdvancedProviderConfigProps) {
    const { t } = useI18n();

    // 预设模式下，高级配置默认折叠且提示已预配置
    const isSimplifiedMode = hasPresetSelected && !isEditing;

    // 计算各区块的配置状态（用于显示徽章）
    const getPathsConfigured = () => {
        const paths = [
            form.watch("modelsPath"),
            form.watch("messagesPath"),
            form.watch("chatCompletionsPath"),
            form.watch("responsesPath"),
            form.watch("imagesGenerationsPath"),
        ].filter(Boolean);
        return paths.length > 0 ? `${paths.length}` : undefined;
    };

    const getRoutingConfigured = () => {
        const weight = form.watch("weight");
        const qps = form.watch("maxQps");
        const region = form.watch("region");
        if (weight !== "1" || qps || region) return t("providers.form_configured");
        return undefined;
    };

    return (
        <div className="space-y-3">
            <button
                type="button"
                className={cn(
                    "flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors",
                    showAdvanced
                        ? "border-primary/30 bg-primary/5"
                        : "border-dashed border-muted-foreground/40 bg-muted/40 hover:bg-muted/60"
                )}
                onClick={onToggleAdvanced}
            >
                <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{t("providers.form_section_advanced")}</span>
                    {isSimplifiedMode && !showAdvanced && (
                        <Badge variant="secondary" className="text-xs">
                            {t("providers.form_preset_configured")}
                        </Badge>
                    )}
                </div>
                {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </button>

            {showAdvanced && (
                <div className="space-y-3">
                    {/* 提示信息 - 预设模式下显示 */}
                    {isSimplifiedMode && (
                        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                            {t("providers.form_advanced_preset_hint")}
                        </div>
                    )}

                    {/* API 路径配置 */}
                    <CollapsibleSection
                        title={t("providers.form_section_api_paths")}
                        icon={<Code2 className="h-4 w-4 text-muted-foreground" />}
                        description={t("providers.form_section_api_paths_desc")}
                        defaultOpen={!isSimplifiedMode}
                        badge={isSimplifiedMode ? t("providers.form_from_preset") : getPathsConfigured()}
                    >
                        {/* Models Path */}
                        <SafeFormField
                            control={form.control}
                            name="modelsPath"
                            render={({ field }: { field: any }) => (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">
                                        {t("providers.form_field_models_path")}
                                        <span className="text-muted-foreground font-normal ml-1">{t("providers.form_field_optional")}</span>
                                    </label>
                                    <Input
                                        {...field}
                                        placeholder={t("providers.form_field_models_path_placeholder")}
                                        className="text-sm h-9"
                                        onChange={(e) => {
                                            field.onChange(e);
                                            markFieldAsOverridden("modelsPath");
                                        }}
                                    />
                                </div>
                            )}
                        />

                        {/* API 端点 - 网格布局 */}
                        <div className="pt-3 border-t">
                            <div className="mb-3">
                                <h5 className="text-xs font-medium">
                                    {t("providers.form_section_api_endpoints")} <span className="text-destructive">*</span>
                                </h5>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t("providers.form_section_api_endpoints_help")}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <SafeFormField
                                    control={form.control}
                                    name="messagesPath"
                                    render={({ field }: { field: any }) => (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">{t("providers.form_field_messages_path")}</label>
                                            <Input
                                                {...field}
                                                placeholder="/v1/messages"
                                                className="text-sm h-9"
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    markFieldAsOverridden("messagesPath");
                                                }}
                                            />
                                        </div>
                                    )}
                                />

                                <SafeFormField
                                    control={form.control}
                                    name="chatCompletionsPath"
                                    render={({ field }: { field: any }) => (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">{t("providers.form_field_chat_completions_path")}</label>
                                            <Input
                                                {...field}
                                                placeholder="/v1/chat/completions"
                                                className="text-sm h-9"
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    markFieldAsOverridden("chatCompletionsPath");
                                                }}
                                            />
                                        </div>
                                    )}
                                />

                                <SafeFormField
                                    control={form.control}
                                    name="responsesPath"
                                    render={({ field }: { field: any }) => (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">{t("providers.form_field_responses_path")}</label>
                                            <Input
                                                {...field}
                                                placeholder="/v1/responses"
                                                className="text-sm h-9"
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    markFieldAsOverridden("responsesPath");
                                                }}
                                            />
                                        </div>
                                    )}
                                />

                                <SafeFormField
                                    control={form.control}
                                    name="imagesGenerationsPath"
                                    render={({ field }: { field: any }) => (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">
                                                {t("providers.form_field_images_generations_path")}
                                                <span className="text-muted-foreground font-normal ml-1">{t("providers.form_field_optional")}</span>
                                            </label>
                                            <Input
                                                {...field}
                                                placeholder="/v1/images/generations"
                                                className="text-sm h-9"
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    markFieldAsOverridden("imagesGenerationsPath");
                                                }}
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* 路由与成本配置 - 合并为一个区块 */}
                    <CollapsibleSection
                        title={t("providers.form_section_routing_cost")}
                        icon={<Route className="h-4 w-4 text-muted-foreground" />}
                        description={t("providers.form_section_routing_cost_desc")}
                        defaultOpen={false}
                        badge={getRoutingConfigured()}
                    >
                        {/* 路由配置 */}
                        <div className="grid grid-cols-3 gap-3">
                            <SafeFormField
                                control={form.control}
                                name="weight"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">{t("providers.form_field_weight")}</label>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.1"
                                            placeholder="1.0"
                                            className="text-sm h-9"
                                        />
                                    </div>
                                )}
                            />

                            <SafeFormField
                                control={form.control}
                                name="maxQps"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">{t("providers.form_field_max_qps")}</label>
                                        <Input
                                            {...field}
                                            type="number"
                                            placeholder="50"
                                            className="text-sm h-9"
                                        />
                                    </div>
                                )}
                            />

                            <SafeFormField
                                control={form.control}
                                name="region"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">{t("providers.form_field_region")}</label>
                                        <Input
                                            {...field}
                                            placeholder="us-east-1"
                                            className="text-sm h-9"
                                        />
                                    </div>
                                )}
                            />
                        </div>

                        {/* 成本配置 */}
                        <div className="pt-3 border-t">
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{t("providers.form_section_cost")}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <SafeFormField
                                    control={form.control}
                                    name="costInput"
                                    render={({ field }: { field: any }) => (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">{t("providers.form_field_cost_input")}</label>
                                            <Input
                                                {...field}
                                                type="number"
                                                step="0.01"
                                                placeholder="0.50"
                                                className="text-sm h-9"
                                            />
                                        </div>
                                    )}
                                />

                                <SafeFormField
                                    control={form.control}
                                    name="costOutput"
                                    render={({ field }: { field: any }) => (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium">{t("providers.form_field_cost_output")}</label>
                                            <Input
                                                {...field}
                                                type="number"
                                                step="0.01"
                                                placeholder="1.50"
                                                className="text-sm h-9"
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* 高级技术配置 */}
                    <CollapsibleSection
                        title={t("providers.form_section_technical")}
                        icon={<Zap className="h-4 w-4 text-muted-foreground" />}
                        description={t("providers.form_section_technical_desc")}
                        defaultOpen={false}
                    >
                        {/* API 样式配置 */}
                        <ApiStylesConfig
                            form={form}
                            isFieldOverridden={isFieldOverridden}
                            markFieldAsOverridden={markFieldAsOverridden}
                        />

                        {/* 可重试状态码 */}
                        <SafeFormField
                            control={form.control}
                            name="retryableStatusCodes"
                            render={({ field }: { field: any }) => (
                                <NumberArrayEditor
                                    label={t("providers.form_field_retryable_status_codes")}
                                    value={field.value || []}
                                    onChange={(value) => {
                                        field.onChange(value);
                                        markFieldAsOverridden("retryableStatusCodes");
                                    }}
                                    placeholder={t("providers.form_field_retryable_status_codes_placeholder")}
                                    description={t("providers.form_field_retryable_status_codes_help")}
                                    min={100}
                                    max={599}
                                />
                            )}
                        />

                        {/* 自定义请求头 */}
                        <SafeFormField
                            control={form.control}
                            name="customHeaders"
                            render={({ field }: { field: any }) => (
                                <JsonEditor
                                    label={t("providers.form_field_custom_headers")}
                                    value={field.value}
                                    onChange={(value) => {
                                        field.onChange(value);
                                        markFieldAsOverridden("customHeaders");
                                    }}
                                    placeholder={t("providers.form_field_custom_headers_placeholder")}
                                    description={t("providers.form_field_custom_headers_help")}
                                    rows={3}
                                />
                            )}
                        />

                        {/* 静态模型列表 */}
                        <SafeFormField
                            control={form.control}
                            name="staticModels"
                            render={({ field }: { field: any }) => (
                                <div className="space-y-2">
                                    <JsonEditor
                                        label={t("providers.form_field_static_models")}
                                        value={field.value}
                                        onChange={(value) => {
                                            field.onChange(value);
                                            markFieldAsOverridden("staticModels");
                                        }}
                                        placeholder={t("providers.form_field_static_models_placeholder")}
                                        description={t("providers.form_field_static_models_help")}
                                        rows={4}
                                    />
                                    <details className="group">
                                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                            <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                                            {t("providers.form_field_static_models_schema_title")}
                                        </summary>
                                        <div className="mt-2 rounded-md bg-muted/50 p-3 text-xs space-y-2">
                                            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                                                <li><code className="bg-background px-1 rounded">id</code>{t("providers.form_field_static_models_schema_id")}</li>
                                                <li><code className="bg-background px-1 rounded">display_name</code>{t("providers.form_field_static_models_schema_display_name")}</li>
                                                <li><code className="bg-background px-1 rounded">context_length</code>{t("providers.form_field_static_models_schema_context_length")}</li>
                                                <li><code className="bg-background px-1 rounded">capabilities</code>{t("providers.form_field_static_models_schema_capabilities")}</li>
                                            </ul>
                                            <div className="pt-1 border-t border-border/50">
                                                <span className="font-medium">{t("providers.form_field_static_models_schema_example")}</span>
                                                <pre className="mt-1 bg-background p-2 rounded text-[10px] overflow-x-auto">{`[{"id": "gpt-4", "display_name": "GPT-4", "capabilities": ["chat"]}]`}</pre>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            )}
                        />
                    </CollapsibleSection>
                </div>
            )}
        </div>
    );
}

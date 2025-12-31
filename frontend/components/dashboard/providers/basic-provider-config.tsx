"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FormField, FormLabel } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";

// 类型安全的FormField包装器
const SafeFormField = FormField as any;

interface BasicProviderConfigProps {
    form: any;
    isFieldOverridden: (fieldName: string) => boolean;
    markFieldAsOverridden: (fieldName: string) => void;
    isSdkTransport: boolean;
    sdkVendorOptions: string[];
    sdkVendorsLoading?: boolean;
    isEditing?: boolean;
    apiKeyPlaceholder?: string;
    hasPresetSelected?: boolean;
}

export function BasicProviderConfig({
    form,
    isFieldOverridden,
    markFieldAsOverridden,
    isSdkTransport,
    sdkVendorOptions,
    sdkVendorsLoading,
    isEditing = false,
    apiKeyPlaceholder,
    hasPresetSelected = false,
}: BasicProviderConfigProps) {
    const { t } = useI18n();
    const [showTechnicalOptions, setShowTechnicalOptions] = useState(false);
    const sdkVendor = form.watch("sdkVendor");
    const isVertexAiSdk = isSdkTransport && sdkVendor === "vertexai";

    // When preset is selected, we show a simplified view
    const isSimplifiedMode = hasPresetSelected && !isEditing;

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("providers.form_section_basic")}</h3>

            {/* Name field - always visible */}
            <SafeFormField
                control={form.control}
                name="name"
                render={({ field }: { field: any }) => (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <FormLabel>
                                {t("providers.form_field_name")} <span className="text-destructive">*</span>
                            </FormLabel>
                            {isFieldOverridden("name") && (
                                <Badge variant="outline" className="text-xs">
                                    {t("providers.form_field_overridden")}
                                </Badge>
                            )}
                        </div>
                        <Input
                            {...field}
                            placeholder={t("providers.form_field_name_placeholder")}
                            onChange={(e) => {
                                field.onChange(e);
                                markFieldAsOverridden("name");
                            }}
                        />
                    </div>
                )}
            />

            {/* API Key field - always visible and prominent */}
            <SafeFormField
                control={form.control}
                name="apiKey"
                render={({ field }: { field: any }) => (
                    <div className="space-y-2">
                        <FormLabel>
                            {t("providers.form_field_api_key")}
                            {!isEditing && <span className="text-destructive"> *</span>}
                        </FormLabel>
                        {isVertexAiSdk ? (
                            <Textarea
                                {...field}
                                placeholder={
                                    isEditing
                                        ? t("providers.form_field_api_key_placeholder_vertexai")
                                        : t("providers.form_field_api_key_placeholder_vertexai")
                                }
                                className="min-h-[120px] font-mono"
                            />
                        ) : (
                            <Input
                                {...field}
                                type="password"
                                placeholder={
                                    isEditing
                                        ? apiKeyPlaceholder || t("providers.form_field_api_key_placeholder")
                                        : t("providers.form_field_api_key_placeholder")
                                }
                            />
                        )}
                        <p className="text-xs text-muted-foreground">
                            {isEditing
                                ? isVertexAiSdk
                                    ? t("providers.form_field_api_key_help_edit_vertexai")
                                    : t("providers.form_field_api_key_help_edit", {
                                          masked: apiKeyPlaceholder || t("providers.form_field_api_key_placeholder"),
                                      })
                                : isVertexAiSdk
                                    ? t("providers.form_field_api_key_help_vertexai")
                                    : t("providers.form_field_api_key_help")}
                        </p>
                    </div>
                )}
            />

            {/* Technical options - collapsed when preset is selected */}
            {isSimplifiedMode ? (
                // Collapsed technical options section for preset mode
                <div className="space-y-3">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                        onClick={() => setShowTechnicalOptions(!showTechnicalOptions)}
                    >
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                {t("providers.form_technical_options")}
                            </span>
                        </div>
                        {showTechnicalOptions ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>

                    {showTechnicalOptions && (
                        <div className="space-y-4 rounded-md border bg-muted/10 p-4">
                            {/* Provider Type */}
                            <SafeFormField
                                control={form.control}
                                name="providerType"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <FormLabel className="text-sm">
                                                {t("providers.form_field_provider_type")}
                                            </FormLabel>
                                            <Badge variant="outline" className="text-xs">
                                                {t("providers.form_from_preset")}
                                            </Badge>
                                        </div>
                                        <Tabs
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                markFieldAsOverridden("providerType");
                                            }}
                                        >
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="native">{t("providers.form_field_provider_type_native")}</TabsTrigger>
                                                <TabsTrigger value="aggregator">{t("providers.form_field_provider_type_aggregator")}</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>
                                )}
                            />

                            {/* Transport */}
                            <SafeFormField
                                control={form.control}
                                name="transport"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <FormLabel className="text-sm">
                                                {t("providers.form_field_transport")}
                                            </FormLabel>
                                            <Badge variant="outline" className="text-xs">
                                                {t("providers.form_from_preset")}
                                            </Badge>
                                        </div>
                                        <Tabs
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                markFieldAsOverridden("transport");
                                            }}
                                        >
                                            <TabsList className="grid w-full grid-cols-3">
                                                <TabsTrigger value="http">{t("providers.form_field_transport_http")}</TabsTrigger>
                                                <TabsTrigger value="sdk">{t("providers.form_field_transport_sdk")}</TabsTrigger>
                                                <TabsTrigger value="claude_cli">{t("providers.form_field_transport_claude_cli")}</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>
                                )}
                            />

                            {/* SDK Vendor (conditional) */}
                            {isSdkTransport && (
                                <SafeFormField
                                    control={form.control}
                                    name="sdkVendor"
                                    render={({ field }: { field: any }) => (
                                        <div className="space-y-2">
                                            <FormLabel className="text-sm">
                                                {t("providers.form_field_sdk_vendor")}
                                            </FormLabel>
                                            {sdkVendorsLoading ? (
                                                <p className="text-xs text-muted-foreground">{t("providers.form_field_sdk_vendor_loading")}</p>
                                            ) : sdkVendorOptions.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">
                                                    {t("providers.form_field_sdk_vendor_empty")}
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {sdkVendorOptions.map((vendor) => (
                                                        <Button
                                                            key={vendor}
                                                            type="button"
                                                            variant={field.value === vendor ? "default" : "outline"}
                                                            size="sm"
                                                            className="capitalize"
                                                            onClick={() => {
                                                                field.onChange(vendor);
                                                                markFieldAsOverridden("sdkVendor");
                                                            }}
                                                        >
                                                            {vendor}
                                                        </Button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                />
                            )}

                            {/* Base URL */}
                            <SafeFormField
                                control={form.control}
                                name="baseUrl"
                                render={({ field }: { field: any }) => (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <FormLabel className="text-sm">
                                                {t("providers.form_field_base_url")}
                                            </FormLabel>
                                            {isFieldOverridden("baseUrl") ? (
                                                <Badge variant="outline" className="text-xs">
                                                    {t("providers.form_field_overridden")}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">
                                                    {t("providers.form_from_preset")}
                                                </Badge>
                                            )}
                                        </div>
                                        <Input
                                            {...field}
                                            placeholder={t("providers.form_field_base_url_placeholder")}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                markFieldAsOverridden("baseUrl");
                                            }}
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    )}
                </div>
            ) : (
                // Full technical options for manual config or edit mode
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <SafeFormField
                            control={form.control}
                            name="providerType"
                            render={({ field }: { field: any }) => (
                                <div className="space-y-2">
                                    <FormLabel>
                                        {t("providers.form_field_provider_type")} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Tabs
                                        value={field.value}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            markFieldAsOverridden("providerType");
                                        }}
                                    >
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="native">{t("providers.form_field_provider_type_native")}</TabsTrigger>
                                            <TabsTrigger value="aggregator">{t("providers.form_field_provider_type_aggregator")}</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <p className="text-xs text-muted-foreground">
                                        {t("providers.form_field_provider_type_help")}
                                    </p>
                                </div>
                            )}
                        />

                        <SafeFormField
                            control={form.control}
                            name="transport"
                            render={({ field }: { field: any }) => (
                                <div className="space-y-2">
                                    <FormLabel>
                                        {t("providers.form_field_transport")} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Tabs
                                        value={field.value}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            markFieldAsOverridden("transport");
                                        }}
                                    >
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="http">{t("providers.form_field_transport_http")}</TabsTrigger>
                                            <TabsTrigger value="sdk">{t("providers.form_field_transport_sdk")}</TabsTrigger>
                                            <TabsTrigger value="claude_cli">{t("providers.form_field_transport_claude_cli")}</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <p className="text-xs text-muted-foreground">
                                        {t("providers.form_field_transport_help")}
                                    </p>
                                </div>
                            )}
                        />
                    </div>

                    {/* SDK 类型（仅在 SDK 模式下显示） */}
                    {isSdkTransport && (
                        <SafeFormField
                            control={form.control}
                            name="sdkVendor"
                            render={({ field }: { field: any }) => (
                                <div className="space-y-2">
                                    <FormLabel>
                                        {t("providers.form_field_sdk_vendor")} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    {sdkVendorsLoading ? (
                                        <p className="text-xs text-muted-foreground">{t("providers.form_field_sdk_vendor_loading")}</p>
                                    ) : sdkVendorOptions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                            {t("providers.form_field_sdk_vendor_empty")}
                                        </p>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-2">
                                                {sdkVendorOptions.map((vendor) => (
                                                    <Button
                                                        key={vendor}
                                                        type="button"
                                                        variant={field.value === vendor ? "default" : "outline"}
                                                        size="sm"
                                                        className="capitalize"
                                                        onClick={() => {
                                                            field.onChange(vendor);
                                                            markFieldAsOverridden("sdkVendor");
                                                        }}
                                                    >
                                                        {vendor}
                                                    </Button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {t("providers.form_field_sdk_vendor_help")}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        />
                    )}

                    <SafeFormField
                        control={form.control}
                        name="baseUrl"
                        render={({ field }: { field: any }) => (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <FormLabel>
                                        {t("providers.form_field_base_url")} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    {isFieldOverridden("baseUrl") && (
                                        <Badge variant="outline" className="text-xs">
                                            {t("providers.form_field_overridden")}
                                        </Badge>
                                    )}
                                </div>
                                <Input
                                    {...field}
                                    placeholder={t("providers.form_field_base_url_placeholder")}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        markFieldAsOverridden("baseUrl");
                                    }}
                                />
                            </div>
                        )}
                    />
                </>
            )}
        </div>
    );
}

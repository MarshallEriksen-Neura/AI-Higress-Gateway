"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProviderStatusCard } from "../common";
import { useI18n } from "@/lib/i18n-context";

const providers = [
    { name: "OpenAI", statusKey: "overview.status_healthy", latency: "245ms", success: "99.9%" },
    { name: "Anthropic", statusKey: "overview.status_healthy", latency: "180ms", success: "99.8%" },
    { name: "Google Gemini", statusKey: "overview.status_healthy", latency: "210ms", success: "99.9%" },
    { name: "Azure OpenAI", statusKey: "overview.status_degraded", latency: "850ms", success: "95.2%" },
];

export function ActiveProviders() {
    const { t } = useI18n();

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{t("dashboard.active_providers")}</h2>
                <Button size="sm" variant="outline">{t("overview.view_all")}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {providers.map((provider, index) => (
                    <ProviderStatusCard 
                        key={index}
                        name={provider.name}
                        statusKey={provider.statusKey}
                        latency={provider.latency}
                        success={provider.success}
                    />
                ))}
            </div>
        </div>
    );
}
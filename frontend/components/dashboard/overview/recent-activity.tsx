"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";

export function RecentActivity() {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("overview.recent_activity")}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                    {t("overview.recent_activity_placeholder")}
                </div>
            </CardContent>
        </Card>
    );
}
"use client";

import React from "react";
import { StatsGrid } from "@/components/dashboard/overview/stats-grid";
import { ActiveProviders } from "@/components/dashboard/overview/active-providers";
import { RecentActivity } from "@/components/dashboard/overview/recent-activity";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { useI18n } from "@/lib/i18n-context";

export default function OverviewPage() {
    const { t } = useI18n();

    return (
        <div className="space-y-8 max-w-7xl">
            {/* 登录 / 注册对话框，默认在 Dashboard 上显示 */}
            <AuthDialog />

            <div>
                <h1 className="text-3xl font-bold mb-2">{t("overview.title")}</h1>
                <p className="text-muted-foreground">{t("overview.subtitle")}</p>
            </div>

            {/* Stats Grid */}
            <StatsGrid />

            {/* Active Providers */}
            <ActiveProviders />

            {/* Recent Activity */}
            <RecentActivity />
        </div>
    );
}

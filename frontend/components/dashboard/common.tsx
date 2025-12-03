"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Server, Database, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface StatCardProps {
  titleKey: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ElementType;
}

export function StatCard({ titleKey, value, change, trend, icon: Icon }: StatCardProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t(titleKey)}
            </p>
            <h3 className="text-3xl font-bold mt-2">{value}</h3>
          </div>
          <div className="p-2 bg-muted rounded">
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          {trend === "up" ? (
            <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
          )}
          <span className={trend === "up" ? "text-green-600" : "text-red-600"}>
            {change}
          </span>
          <span className="text-muted-foreground ml-2">{t("overview.from_last_month")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProviderStatusProps {
  name: string;
  statusKey: string;
  latency: string;
  success: string;
}

export function ProviderStatusCard({ name, statusKey, latency, success }: ProviderStatusProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{name}</CardTitle>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              statusKey === "overview.status_healthy"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {t(statusKey)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("table.latency")}</span>
            <span className="font-medium">{latency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("table.success_rate")}</span>
            <span className="font-medium">{success}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
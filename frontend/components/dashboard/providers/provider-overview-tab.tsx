"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Provider, MetricsResponse } from "@/http/provider";

interface ProviderOverviewTabProps {
  provider: Provider;
  metrics?: MetricsResponse;
  translations: {
    totalRequests: string;
    avgLatency: string;
    errorRate: string;
    configuration: string;
    baseUrl: string;
    transport: string;
    sdkVendor: string;
    modelsPath: string;
    chatPath: string;
    messagesPath: string;
    region: string;
    maxQps: string;
    weight: string;
    billingFactor: string;
  };
  children?: React.ReactNode; // 用于插入共享配置等其他内容
}

export const ProviderOverviewTab = ({ 
  provider, 
  metrics, 
  translations,
  children 
}: ProviderOverviewTabProps) => {
  // 计算汇总指标
  const summaryMetrics = useMemo(() => {
    if (!metrics?.metrics || metrics.metrics.length === 0) {
      return {
        totalRequests: 0,
        avgLatency: 0,
        errorRate: 0,
      };
    }

    const totalRequests = metrics.metrics.reduce((acc, m) => acc + (m.total_requests_1m || 0), 0);
    const avgLatency = metrics.metrics.reduce((acc, m) => acc + (m.avg_latency_ms || 0), 0) / metrics.metrics.length;
    const totalFailures = metrics.metrics.reduce((acc, m) => acc + ((m.total_requests_1m || 0) * m.error_rate), 0);
    const errorRate = totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0;

    return {
      totalRequests,
      avgLatency: avgLatency.toFixed(0),
      errorRate: errorRate.toFixed(2),
    };
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* 汇总指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {translations.totalRequests}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.totalRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {translations.avgLatency}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.avgLatency} ms</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {translations.errorRate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.errorRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* 配置信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>{translations.configuration}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.baseUrl}</div>
            <code className="text-sm p-2 bg-muted rounded block break-all">
              {provider.base_url}
            </code>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.transport}</div>
            <div className="capitalize p-2">{provider.transport}</div>
          </div>
          {provider.sdk_vendor && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">{translations.sdkVendor}</div>
              <div className="capitalize p-2">{provider.sdk_vendor}</div>
            </div>
          )}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.modelsPath}</div>
            <code className="text-sm p-2 bg-muted rounded block break-all">
              {provider.models_path}
            </code>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.chatPath}</div>
            <code className="text-sm p-2 bg-muted rounded block break-all">
              {provider.chat_completions_path}
            </code>
          </div>
          {provider.messages_path && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">{translations.messagesPath}</div>
              <code className="text-sm p-2 bg-muted rounded block break-all">
                {provider.messages_path}
              </code>
            </div>
          )}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.region}</div>
            <div className="text-sm p-2">{provider.region || "-"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.maxQps}</div>
            <div className="text-sm p-2">{provider.max_qps || "-"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.weight}</div>
            <div className="text-sm p-2">{provider.weight}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{translations.billingFactor}</div>
            <div className="text-sm p-2">{provider.billing_factor}</div>
          </div>
        </CardContent>
      </Card>

      {/* 其他内容（如共享配置） */}
      {children}
    </div>
  );
};

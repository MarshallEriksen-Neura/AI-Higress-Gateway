"use client";

import { useMemo } from "react";
import { AlertCircle, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n-context";
import { useCreditProviderConsumption } from "@/lib/swr/use-credits";
import type { ProviderConsumption } from "@/lib/api-types";

interface ProviderRankingCardProps {
  timeRange?: string;
  onProviderClick?: (providerId: string) => void;
  onRetry?: () => void;
}

/**
 * Provider 消耗排行榜卡片
 *
 * 职责：
 * - 显示按消耗排序的 Provider 列表
 * - 支持时间范围切换
 * - 显示消耗、请求量、成功率等指标
 * - 实现快捷链接导航
 *
 * 验证需求：2.1, 2.2, 2.3, 2.4
 * 验证属性：Property 4, 6, 7
 */
export function ProviderRankingCard({
  timeRange = "7d",
  onProviderClick,
  onRetry,
}: ProviderRankingCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { providers, loading, error, refresh } = useCreditProviderConsumption(timeRange);

  // 排序 Provider 列表（按消耗降序）
  const sortedProviders = useMemo(() => {
    return [...providers].sort((a, b) => b.total_consumption - a.total_consumption);
  }, [providers]);

  // 计算排名和百分比
  const rankedProviders = useMemo(() => {
    return sortedProviders.map((provider, index) => ({
      ...provider,
      rank: index + 1,
    }));
  }, [sortedProviders]);

  // 格式化数字
  const formatNumber = (value: number): string => {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  // 格式化百分比
  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(1);
  };

  // 处理 Provider 行点击
  const handleProviderClick = (provider: ProviderConsumption) => {
    onProviderClick?.(provider.provider_id);
    // 导航到 Provider 管理页面
    router.push(`/dashboard/providers/${provider.provider_id}`);
  };

  // 处理重试
  const handleRetry = () => {
    refresh();
    onRetry?.();
  };

  // 加载状态
  if (loading && providers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("provider_ranking.title")}</CardTitle>
          <CardDescription>{t("overview.from_last_month")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-8" data-testid="skeleton" />
                <Skeleton className="h-4 w-24" data-testid="skeleton" />
                <Skeleton className="h-4 w-20" data-testid="skeleton" />
                <Skeleton className="h-4 w-20" data-testid="skeleton" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error && providers.length === 0) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("provider_ranking.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("provider_ranking.error")}
          </p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            {t("consumption.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (providers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("provider_ranking.title")}</CardTitle>
          <CardDescription>{t("overview.from_last_month")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("provider_ranking.no_data")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{t("provider_ranking.title")}</CardTitle>
            <CardDescription>{t("overview.from_last_month")}</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {providers.length} {t("overview.active_providers")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{t("provider_ranking.rank")}</TableHead>
                <TableHead>{t("provider_ranking.provider")}</TableHead>
                <TableHead className="text-right">
                  {t("provider_ranking.consumption")}
                </TableHead>
                <TableHead className="text-right">
                  {t("provider_ranking.requests")}
                </TableHead>
                <TableHead className="text-right">
                  {t("provider_ranking.success_rate")}
                </TableHead>
                <TableHead className="text-right">
                  {t("provider_ranking.percentage")}
                </TableHead>
                {/* Latency 列可选 */}
                {rankedProviders.some((p) => p.latency_p95_ms !== undefined) && (
                  <TableHead className="text-right">
                    {t("provider_ranking.latency")}
                  </TableHead>
                )}
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedProviders.map((provider) => (
                <TableRow
                  key={provider.provider_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleProviderClick(provider)}
                  data-testid={`provider-row-${provider.provider_id}`}
                >
                  <TableCell className="font-medium">{provider.rank}</TableCell>
                  <TableCell className="font-medium">
                    {provider.provider_name}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(provider.total_consumption)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(provider.request_count)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        provider.success_rate >= 0.95
                          ? "default"
                          : provider.success_rate >= 0.9
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {formatPercentage(provider.success_rate)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(provider.percentage_of_total)}%
                  </TableCell>
                  {rankedProviders.some((p) => p.latency_p95_ms !== undefined) && (
                    <TableCell className="text-right">
                      {provider.latency_p95_ms !== undefined
                        ? `${provider.latency_p95_ms}ms`
                        : "-"}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProviderClick(provider);
                      }}
                    >
                      {t("provider_ranking.view_details")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

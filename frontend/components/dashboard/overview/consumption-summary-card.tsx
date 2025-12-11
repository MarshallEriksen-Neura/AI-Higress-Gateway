"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-context";
import { useCreditConsumptionSummary } from "@/lib/swr/use-credits";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ConsumptionSummaryCardProps {
  timeRange?: string;
  onRetry?: () => void;
}

/**
 * 积分消耗概览卡片
 *
 * 职责：
 * - 显示本期消耗、余额、预算信息
 * - 集成 Sparkline 趋势图
 * - 实现预警标签逻辑
 *
 * 验证需求：1.1, 1.2, 1.3, 1.4
 * 验证属性：Property 1, 2, 3
 */
export function ConsumptionSummaryCard({
  timeRange = "7d",
  onRetry,
}: ConsumptionSummaryCardProps) {
  const { t } = useI18n();
  const { consumption, loading, error, refresh } = useCreditConsumptionSummary(timeRange);

  // 计算预警状态
  const warningState = useMemo(() => {
    if (!consumption) return null;

    const daysLeft = consumption.projected_days_left;
    const threshold = consumption.warning_threshold || 7;

    return {
      isWarning: daysLeft < threshold && daysLeft >= 0,
      daysLeft,
      threshold,
    };
  }, [consumption]);

  // 生成 Sparkline 数据（模拟）
  const sparklineData = useMemo(() => {
    if (!consumption) return [];

    // 生成过去 7 天的模拟数据
    const data = [];
    const dailyAvg = consumption.daily_average;

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variance = dailyAvg * (0.8 + Math.random() * 0.4); // ±20% 的波动
      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        consumption: Math.round(variance),
      });
    }

    return data;
  }, [consumption]);

  // 格式化数字
  const formatNumber = (value: number): string => {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  // 处理重试
  const handleRetry = () => {
    refresh();
    onRetry?.();
  };

  // 加载状态
  if (loading && !consumption) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("consumption.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" data-testid="skeleton" />
              <Skeleton className="h-8 w-32" data-testid="skeleton" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" data-testid="skeleton" />
              <Skeleton className="h-8 w-32" data-testid="skeleton" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" data-testid="skeleton" />
              <Skeleton className="h-8 w-32" data-testid="skeleton" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" data-testid="skeleton" />
              <Skeleton className="h-8 w-32" data-testid="skeleton" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" data-testid="skeleton" />
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error && !consumption) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("consumption.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t("consumption.error")}</p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            {t("consumption.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!consumption) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{t("consumption.title")}</CardTitle>
            <CardDescription>
              {t("overview.from_last_month")}
            </CardDescription>
          </div>
          {warningState?.isWarning && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {t("consumption.warning_low_balance")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 主要指标网格 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 本期消耗 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("consumption.current_consumption")}
            </p>
            <p className="text-2xl font-bold">
              {formatNumber(consumption.total_consumption)}
            </p>
          </div>

          {/* 日均消耗 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("consumption.daily_average")}
            </p>
            <p className="text-2xl font-bold">
              {formatNumber(consumption.daily_average)}
            </p>
          </div>

          {/* 余额 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("consumption.balance")}
            </p>
            <p className={`text-2xl font-bold ${warningState?.isWarning ? "text-destructive" : ""}`}>
              {formatNumber(consumption.current_balance)}
            </p>
          </div>

          {/* 预计可用天数 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("consumption.projected_days_left")}
            </p>
            <p className={`text-2xl font-bold ${warningState?.isWarning ? "text-destructive" : ""}`}>
              {consumption.projected_days_left < 0
                ? t("consumption.unlimited")
                : consumption.projected_days_left}
            </p>
          </div>
        </div>

        {/* 预警信息 */}
        {warningState?.isWarning && (
          <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              {t("consumption.warning_days_left", { days: Math.ceil(warningState.daysLeft) })}
            </p>
          </div>
        )}

        {/* Sparkline 趋势图 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("consumption.trend")}
          </p>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-background)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(value) => [formatNumber(value as number), t("consumption.trend")]}
                />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

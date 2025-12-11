"use client";

import { useMemo } from "react";
import { AlertCircle, TrendingDown } from "lucide-react";
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
import { useI18n } from "@/lib/i18n-context";
import { useSuccessRateTrend } from "@/lib/swr/use-overview-metrics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SuccessRateTrendCardProps {
  timeRange?: string;
  onRetry?: () => void;
  anomalyThreshold?: number; // 异常成功率阈值，默认 0.9 (90%)
}

/**
 * 成功率趋势卡片
 *
 * 职责：
 * - 显示整体成功率和折线图
 * - 按 Provider 维度拆分显示
 * - 实现异常成功率高亮
 *
 * 验证需求：3.1, 3.2, 3.3, 3.4
 * 验证属性：Property 8, 9, 10
 */
export function SuccessRateTrendCard({
  timeRange = "7d",
  onRetry,
  anomalyThreshold = 0.9,
}: SuccessRateTrendCardProps) {
  const { t } = useI18n();
  const { trend, loading, error, refresh } = useSuccessRateTrend({
    time_range: timeRange as any,
  });

  // 处理数据转换和异常检测
  const chartData = useMemo(() => {
    if (!trend?.points) return [];

    return trend.points.map((point) => {
      const overallRate = point.error_requests
        ? point.success_requests / (point.success_requests + point.error_requests)
        : 0;

      return {
        timestamp: new Date(point.window_start).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        overall: Math.round(overallRate * 100),
        overallDecimal: overallRate,
      };
    });
  }, [trend]);



  // 计算整体成功率统计
  const successRateStats = useMemo(() => {
    if (!trend?.points || trend.points.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        hasAnomaly: false,
      };
    }

    const rates = trend.points.map((point) =>
      point.error_requests
        ? point.success_requests / (point.success_requests + point.error_requests)
        : 0
    );

    const current = rates[rates.length - 1] || 0;
    const average = rates.reduce((a, b) => a + b, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const hasAnomaly = rates.some((rate) => rate < anomalyThreshold);

    return {
      current: Math.round(current * 100),
      average: Math.round(average * 100),
      min: Math.round(min * 100),
      max: Math.round(max * 100),
      hasAnomaly,
    };
  }, [trend, anomalyThreshold]);

  // 格式化百分比
  const formatPercentage = (value: number): string => {
    return `${value}%`;
  };

  // 处理重试
  const handleRetry = () => {
    refresh();
    onRetry?.();
  };

  // 加载状态
  if (loading && !trend) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("success_rate_trend.title")}</CardTitle>
          <CardDescription>{t("overview.from_last_month")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" data-testid="skeleton" />
                <Skeleton className="h-8 w-16" data-testid="skeleton" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" data-testid="skeleton" />
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error && !trend) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("success_rate_trend.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("success_rate_trend.error")}
          </p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            {t("consumption.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (!trend || !trend.points || trend.points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("success_rate_trend.title")}</CardTitle>
          <CardDescription>{t("overview.from_last_month")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("success_rate_trend.no_data")}
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
            <CardTitle>{t("success_rate_trend.title")}</CardTitle>
            <CardDescription>{t("overview.from_last_month")}</CardDescription>
          </div>
          {successRateStats.hasAnomaly && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {t("success_rate_trend.anomaly_detected")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 成功率统计指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 当前成功率 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("success_rate_trend.overall_rate")}
            </p>
            <p
              className={`text-2xl font-bold ${
                successRateStats.current < anomalyThreshold * 100
                  ? "text-destructive"
                  : ""
              }`}
            >
              {formatPercentage(successRateStats.current)}
            </p>
          </div>

          {/* 平均成功率 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("chart.average")}
            </p>
            <p className="text-2xl font-bold">
              {formatPercentage(successRateStats.average)}
            </p>
          </div>

          {/* 最低成功率 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("chart.minimum")}
            </p>
            <p
              className={`text-2xl font-bold ${
                successRateStats.min < anomalyThreshold * 100
                  ? "text-destructive"
                  : ""
              }`}
            >
              {formatPercentage(successRateStats.min)}
            </p>
          </div>

          {/* 最高成功率 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("chart.maximum")}
            </p>
            <p className="text-2xl font-bold">
              {formatPercentage(successRateStats.max)}
            </p>
          </div>
        </div>

        {/* 异常警告 */}
        {successRateStats.hasAnomaly && (
          <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              {t("success_rate_trend.low_success_rate")}
            </p>
          </div>
        )}

        {/* 成功率趋势折线图 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("success_rate_trend.provider_breakdown")}
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 16, top: 16 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  domain={[0, 100]}
                  label={{ value: "%", angle: -90, position: "insideLeft" }}
                  tick={{ fontSize: 12 }}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-background)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(value) => [formatPercentage(value as number), t("chart.success_rate")]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="overall"
                  name={t("chart.overall_success_rate")}
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

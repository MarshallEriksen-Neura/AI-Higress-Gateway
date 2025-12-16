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
import { useUserSuccessRateTrend } from "@/lib/swr/use-user-overview-metrics";
import { formatChartTime } from "@/lib/utils/time-formatter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
  const { trend, loading, error, refresh } = useUserSuccessRateTrend({
    time_range: timeRange as any,
  });

  // 处理数据转换和异常检测
  const chartData = useMemo(() => {
    if (!trend?.points) return [];

    const points = trend.points;

    // 直接使用时间格式（时:分）
    return points.map((point) => {
      const overallRate = point.error_requests
        ? point.success_requests / (point.success_requests + point.error_requests)
        : 0;

      return {
        timestamp: formatChartTime(point.window_start),
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
          <CardTitle>{t("success_rate_trend.user_title")}</CardTitle>
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
            {t("success_rate_trend.user_title")}
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
          <CardTitle>{t("success_rate_trend.user_title")}</CardTitle>
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
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{t("success_rate_trend.user_title")}</CardTitle>
          {successRateStats.hasAnomaly && (
            <Badge variant="destructive" className="h-5 text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              {t("success_rate_trend.anomaly_detected")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 成功率统计指标 - 极简网格 */}
        <div className="grid grid-cols-2 gap-6">
          {/* 当前成功率 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("success_rate_trend.overall_rate")}
            </p>
            <p
              className={`text-3xl font-light tracking-tight ${
                successRateStats.current < anomalyThreshold * 100
                  ? "text-destructive"
                  : ""
              }`}
            >
              {formatPercentage(successRateStats.current)}
            </p>
          </div>

          {/* 平均成功率 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("chart.average")}
            </p>
            <p className="text-3xl font-light tracking-tight">
              {formatPercentage(successRateStats.average)}
            </p>
          </div>

          {/* 最低成功率 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("chart.minimum")}
            </p>
            <p
              className={`text-3xl font-light tracking-tight ${
                successRateStats.min < anomalyThreshold * 100
                  ? "text-destructive"
                  : ""
              }`}
            >
              {formatPercentage(successRateStats.min)}
            </p>
          </div>

          {/* 最高成功率 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("chart.maximum")}
            </p>
            <p className="text-3xl font-light tracking-tight">
              {formatPercentage(successRateStats.max)}
            </p>
          </div>
        </div>

        {/* 异常警告 - 极简样式 */}
        {successRateStats.hasAnomaly && (
          <div className="flex items-start gap-3 py-3 border-t border-destructive/20">
            <TrendingDown className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive leading-relaxed">
              {t("success_rate_trend.low_success_rate")}
            </p>
          </div>
        )}

        {/* 成功率趋势折线图 - 完整样式 */}
        <div className="pt-4 border-t">
          <ChartContainer
            config={{
              overall: {
                label: t("chart.success_rate"),
                color: "hsl(142, 76%, 36%)", // 绿色表示成功率
              },
            }}
            className="h-64 w-full"
          >
            <LineChart 
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              {/* X轴 */}
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                height={40}
                interval="preserveStartEnd"
              />
              
              {/* Y轴 */}
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={60}
                label={{ 
                  value: '成功率 (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              
              {/* 网格 */}
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              
              {/* Tooltip */}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${formatPercentage(value as number)}`}
                  />
                }
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              
              {/* 图例 */}
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="line"
              />
              
              {/* 折线 */}
              <Line
                type="monotone"
                dataKey="overall"
                name={t("chart.success_rate")}
                stroke="var(--color-overall)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-overall)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={true}
                animationDuration={800}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

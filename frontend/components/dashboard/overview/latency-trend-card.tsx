"use client";

import { useMemo } from "react";
import { AlertCircle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-context";
import { useUserOverviewActivity, UserOverviewTimeRange } from "@/lib/swr/use-user-overview-metrics";
import { formatChartTime } from "@/lib/utils/time-formatter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface LatencyTrendCardProps {
  timeRange?: UserOverviewTimeRange;
  onRetry?: () => void;
}

/**
 * 响应时间趋势卡片
 *
 * 职责：
 * - 显示平均延迟、P95、P99 的折线图
 * - 展示关键延迟指标
 * - 实现加载和错误状态
 */
export function LatencyTrendCard({
  timeRange = "7d",
  onRetry,
}: LatencyTrendCardProps) {
  const { t } = useI18n();
  const { activity, loading, error, refresh } = useUserOverviewActivity({
    time_range: timeRange,
  });

  // 处理数据转换
  const chartData = useMemo(() => {
    if (!activity?.points) return [];

    const points = activity.points;

    // 直接使用时间格式（时:分）
    const data = points.map((point) => ({
      timestamp: formatChartTime(point.window_start),
      avg: Math.round(point.latency_avg_ms),
      p95: Math.round(point.latency_p95_ms),
      p99: Math.round(point.latency_p99_ms),
    }));

    // 调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('[LatencyTrendCard] Chart Data:', {
        pointsCount: points.length,
        chartDataCount: data.length,
        sample: data.slice(0, 5),
        lastSample: data.slice(-3),
      });
    }

    return data;
  }, [activity]);

  // 计算延迟统计
  const latencyStats = useMemo(() => {
    if (!activity?.points || activity.points.length === 0) {
      return {
        average: 0,
        p95: 0,
        p99: 0,
        max: 0,
      };
    }

    const avgValues = activity.points.map((p) => p.latency_avg_ms);
    const p95Values = activity.points.map((p) => p.latency_p95_ms);
    const p99Values = activity.points.map((p) => p.latency_p99_ms);

    return {
      average: Math.round(avgValues.reduce((a, b) => a + b, 0) / avgValues.length),
      p95: Math.round(p95Values.reduce((a, b) => a + b, 0) / p95Values.length),
      p99: Math.round(p99Values.reduce((a, b) => a + b, 0) / p99Values.length),
      max: Math.round(Math.max(...p99Values)),
    };
  }, [activity]);

  // 处理重试
  const handleRetry = () => {
    refresh();
    onRetry?.();
  };

  // 加载状态
  if (loading && !activity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("latency_trend.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" data-testid="skeleton" />
                <Skeleton className="h-8 w-16" data-testid="skeleton" />
              </div>
            ))}
          </div>
          <Skeleton className="h-48 w-full" data-testid="skeleton" />
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error && !activity) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("latency_trend.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("latency_trend.error")}
          </p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            {t("consumption.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (!activity || !activity.points || activity.points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("latency_trend.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("latency_trend.no_data")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("latency_trend.title")}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 延迟统计指标 - 极简网格 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 平均延迟 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("latency_trend.average")}
            </p>
            <p className="text-2xl font-light tracking-tight">
              {latencyStats.average}
              <span className="text-sm text-muted-foreground ml-1">ms</span>
            </p>
          </div>

          {/* P95 延迟 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("latency_trend.p95")}
            </p>
            <p className="text-2xl font-light tracking-tight">
              {latencyStats.p95}
              <span className="text-sm text-muted-foreground ml-1">ms</span>
            </p>
          </div>

          {/* P99 延迟 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("latency_trend.p99")}
            </p>
            <p className="text-2xl font-light tracking-tight">
              {latencyStats.p99}
              <span className="text-sm text-muted-foreground ml-1">ms</span>
            </p>
          </div>

          {/* 最大延迟 */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("latency_trend.max")}
            </p>
            <p className="text-2xl font-light tracking-tight">
              {latencyStats.max}
              <span className="text-sm text-muted-foreground ml-1">ms</span>
            </p>
          </div>
        </div>

        {/* 延迟趋势折线图 - 完整样式 */}
        <div className="pt-4 border-t">
          <ChartContainer
            config={{
              avg: {
                label: t("latency_trend.average"),
                color: "hsl(217, 91%, 60%)", // 蓝色
              },
              p95: {
                label: t("latency_trend.p95"),
                color: "hsl(38, 92%, 50%)", // 橙色
              },
              p99: {
                label: t("latency_trend.p99"),
                color: "hsl(0, 70%, 70%)", // 淡红色
              },
            }}
            className="h-64 w-full"
          >
            <LineChart 
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              {/* 网格线 */}
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
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
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={60}
                domain={['auto', 'auto']}
                label={{ 
                  value: '延迟 (ms)', 
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
                    formatter={(value) => `${value} ms`}
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
                dataKey="avg"
                name={t("latency_trend.average")}
                stroke="var(--color-avg)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-avg)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={true}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="p95"
                name={t("latency_trend.p95")}
                stroke="var(--color-p95)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-p95)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={true}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="p99"
                name={t("latency_trend.p99")}
                stroke="var(--color-p99)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-p99)" }}
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

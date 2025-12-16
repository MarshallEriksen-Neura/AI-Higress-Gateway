"use client";

import { useMemo } from "react";
import { Activity, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-context";
import { useUserOverviewActivity, UserOverviewTimeRange } from "@/lib/swr/use-user-overview-metrics";

interface PerformanceGaugesProps {
  timeRange?: UserOverviewTimeRange;
}

/**
 * 实时性能指标仪表盘
 *
 * 包含三个紧凑型卡片：
 * 1. 当前QPS
 * 2. 平均延迟
 * 3. 错误率
 */
export function PerformanceGauges({
  timeRange = "7d",
}: PerformanceGaugesProps) {
  const { t } = useI18n();
  const { activity, loading } = useUserOverviewActivity({
    time_range: timeRange,
  });

  // 计算实时性能指标
  const metrics = useMemo(() => {
    if (!activity?.points || activity.points.length === 0) {
      return {
        currentQps: 0,
        avgLatency: 0,
        errorRate: 0,
        hasData: false,
      };
    }

    // 取最近的数据点
    const recentPoints = activity.points.slice(-10); // 最近10分钟
    
    if (recentPoints.length === 0) {
      return {
        currentQps: 0,
        avgLatency: 0,
        errorRate: 0,
        hasData: false,
      };
    }

    // 计算平均QPS
    const totalRequests = recentPoints.reduce((sum, p) => sum + p.total_requests, 0);
    const currentQps = totalRequests / (recentPoints.length * 60); // 转换为每秒

    // 计算平均延迟
    const avgLatency = recentPoints.reduce((sum, p) => sum + p.latency_avg_ms, 0) / recentPoints.length;

    // 计算平均错误率
    const avgErrorRate = recentPoints.reduce((sum, p) => sum + p.error_rate, 0) / recentPoints.length;
    const errorRate = avgErrorRate * 100;

    return {
      currentQps: Math.round(currentQps * 10) / 10, // 保留1位小数
      avgLatency: Math.round(avgLatency),
      errorRate: Math.round(errorRate * 10) / 10, // 保留1位小数
      hasData: true,
    };
  }, [activity]);

  // QPS健康度（假设最大QPS为100）
  const qpsHealth = Math.min((metrics.currentQps / 100) * 100, 100);

  // 延迟健康度（反向：延迟越低越好）
  const latencyHealth = useMemo(() => {
    if (metrics.avgLatency < 100) return 95;
    if (metrics.avgLatency < 200) return 85;
    if (metrics.avgLatency < 500) return 60;
    return 30;
  }, [metrics.avgLatency]);

  // 延迟颜色
  const latencyColor = useMemo(() => {
    if (metrics.avgLatency < 100) return "text-foreground";
    if (metrics.avgLatency < 200) return "text-foreground";
    if (metrics.avgLatency < 500) return "text-yellow-600";
    return "text-destructive";
  }, [metrics.avgLatency]);

  // 错误率健康度（反向：错误率越低越好）
  const errorRateHealth = Math.max(100 - metrics.errorRate * 20, 0);

  // 错误率颜色
  const errorRateColor = useMemo(() => {
    if (metrics.errorRate < 1) return "text-foreground";
    if (metrics.errorRate < 5) return "text-yellow-600";
    return "text-destructive";
  }, [metrics.errorRate]);

  // 调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log('[PerformanceGauges] Data:', {
      loading,
      hasActivity: !!activity,
      pointsCount: activity?.points?.length || 0,
      metrics,
    });
  }

  if (loading && !activity) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-32 mb-4" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 无数据状态
  if (!metrics.hasData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {i === 0 ? t("qps.title") : i === 1 ? t("latency.title") : t("error_rate.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无数据
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 当前QPS */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            {t("qps.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-5xl font-light tracking-tight">
              {metrics.currentQps}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
              {t("qps.unit")}
            </p>
          </div>
          <div className="space-y-2">
            <Progress value={qpsHealth} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {qpsHealth > 70 ? t("qps.high") : t("qps.healthy")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 平均延迟 */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {t("latency.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className={`text-5xl font-light tracking-tight ${latencyColor}`}>
              {metrics.avgLatency}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
              {t("latency.unit")}
            </p>
          </div>
          <div className="space-y-2">
            <Progress value={latencyHealth} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {metrics.avgLatency < 100
                ? t("latency.excellent")
                : metrics.avgLatency < 200
                  ? t("latency.good")
                  : metrics.avgLatency < 500
                    ? t("latency.fair")
                    : t("latency.slow")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 错误率 */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            {t("error_rate.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className={`text-5xl font-light tracking-tight ${errorRateColor}`}>
              {metrics.errorRate}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
              {t("error_rate.unit")}
            </p>
          </div>
          <div className="space-y-2">
            <Progress value={errorRateHealth} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {metrics.errorRate < 1
                ? t("error_rate.healthy")
                : metrics.errorRate < 5
                  ? t("error_rate.warning")
                  : t("error_rate.critical")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

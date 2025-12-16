"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";
import { useUserOverviewActivity, UserOverviewTimeRange } from "@/lib/swr/use-user-overview-metrics";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { formatChartTime } from "@/lib/utils/time-formatter";

interface RecentActivityProps {
  timeRange?: UserOverviewTimeRange;
}

export function RecentActivity({ timeRange = "today" }: RecentActivityProps) {
  const { t } = useI18n();
  const { activity, loading } = useUserOverviewActivity({
    time_range: timeRange,
  });

  const chartData = useMemo(() => {
    if (!activity) {
      return [];
    }
    const points = activity.points || [];
    if (!points.length) {
      return [];
    }

    // 取最近 60 个时间桶（大约最近 1 小时），按时间顺序
    const recent = points.slice(-60);
    return recent.map((p) => ({
      time: formatChartTime(p.window_start),
      total: p.total_requests,
      errors: p.error_requests,
      successRate: p.total_requests > 0 ? 1 - p.error_rate : 0,
    }));
  }, [activity]);

  const hasData = chartData.length > 0;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t("overview.my_recent_activity")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !hasData ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            {t("overview.recent_activity_placeholder")}
          </div>
        ) : !hasData ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            {t("overview.recent_activity_placeholder")}
          </div>
        ) : (
          <ChartContainer
            config={{
              total: {
                label: t("chart.requests"),
                color: "hsl(217, 91%, 60%)", // 蓝色
              },
              errors: {
                label: t("chart.errors"),
                color: "hsl(0, 84%, 60%)", // 红色
              },
            }}
            className="h-64 w-full"
          >
            <AreaChart 
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              {/* X轴 */}
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                height={40}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              
              {/* Y轴 */}
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={60}
                allowDecimals={false}
                label={{ 
                  value: '请求数', 
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
                content={<ChartTooltipContent />}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              
              {/* 图例 */}
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="rect"
              />
              
              {/* 面积图 */}
              <Area
                type="monotone"
                dataKey="total"
                name={t("chart.requests")}
                stroke="var(--color-total)"
                fill="var(--color-total)"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
              />
              <Area
                type="monotone"
                dataKey="errors"
                name={t("chart.errors")}
                stroke="var(--color-errors)"
                fill="var(--color-errors)"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { UserOverviewTimeRange } from "@/lib/swr/use-user-overview-metrics";
import { FilterBar } from "@/components/dashboard/overview/filter-bar";
import { StatsGrid } from "@/components/dashboard/overview/stats-grid";
import { ConsumptionSummaryCard } from "@/components/dashboard/overview/consumption-summary-card";
import { ProviderRankingCard } from "@/components/dashboard/overview/provider-ranking-card";
import { SuccessRateTrendCard } from "@/components/dashboard/overview/success-rate-trend-card";
import { LatencyTrendCard } from "@/components/dashboard/overview/latency-trend-card";
import { PerformanceGauges } from "@/components/dashboard/overview/performance-gauges";
import { ActiveProviders } from "@/components/dashboard/overview/active-providers";
import { RecentActivity } from "@/components/dashboard/overview/recent-activity";

/**
 * 客户端包装器组件
 * 负责管理客户端状态、事件处理和数据获取
 *
 * 职责：
 * - 管理时间范围筛选器状态
 * - 将时间范围传递给各个数据卡片组件
 * - 协调筛选器与数据更新的联动
 *
 * 布局结构：
 * 1. 时间筛选器
 * 2. 关键指标网格 (3列)
 * 3. 核心监控图表网格 (2x2)
 * 4. 实时性能指标 (3列)
 * 5. 活跃Provider状态
 * 6. 近期活动图表
 */
export function OverviewClient() {
  const [timeRange, setTimeRange] = useState<UserOverviewTimeRange>("7d");
  const [mounted, setMounted] = useState(false);

  // 确保只在客户端渲染，避免 hydration 错误
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTimeRangeChange = (range: UserOverviewTimeRange) => {
    setTimeRange(range);
  };

  // 服务端渲染时返回 null，避免 hydration 不匹配
  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* 1. 时间范围筛选器 */}
      <FilterBar onTimeRangeChange={handleTimeRangeChange} />

      {/* 2. 关键指标网格 */}
      <StatsGrid timeRange={timeRange} />

      {/* 3. 核心监控图表网格 (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 积分消耗概览卡片 */}
        <ConsumptionSummaryCard timeRange={timeRange} />

        {/* 响应时间趋势卡片 - 新增 */}
        <LatencyTrendCard timeRange={timeRange} />

        {/* Provider 消耗排行榜卡片 */}
        <ProviderRankingCard timeRange={timeRange} />

        {/* 成功率趋势卡片 */}
        <SuccessRateTrendCard timeRange={timeRange} />
      </div>

      {/* 4. 实时性能指标 (3列) - 新增 */}
      <PerformanceGauges timeRange={timeRange} />

      {/* 5. 活跃Provider状态 */}
      <ActiveProviders timeRange={timeRange} />

      {/* 6. 近期活动图表 */}
      <RecentActivity timeRange={timeRange} />
    </>
  );
}

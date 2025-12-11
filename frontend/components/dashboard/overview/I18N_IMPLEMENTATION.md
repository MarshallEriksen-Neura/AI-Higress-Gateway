# 国际化实现文档

## 概述

本文档记录了仪表盘概览页的国际化实现。所有用户可见的文案都已通过 `useI18n()` Hook 进行国际化处理，支持中英文两种语言。

## 国际化文件

### 主文件
- **`frontend/lib/i18n/overview.ts`**: 包含所有概览页相关的翻译文案

### 翻译内容

#### 1. 概览页基础文案 (overview.*)
- `overview.title`: 仪表盘概览 / Dashboard Overview
- `overview.subtitle`: 欢迎回来，以下是今天的整体运行情况 / Welcome back, here's what's happening today
- `overview.total_requests`: 总请求数 / Total Requests
- `overview.active_providers`: 活跃提供商 / Active Providers
- `overview.success_rate`: 整体成功率 / Overall Success Rate
- 等等...

#### 2. 筛选器文案 (filter.*)
- `filter.time_range.label`: 时间范围 / Time Range
- `filter.time_range.today`: 今天 / Today
- `filter.time_range.7d`: 最近 7 天 / Last 7 Days
- `filter.time_range.30d`: 最近 30 天 / Last 30 Days
- `filter.time_range.90d`: 最近 90 天 / Last 90 Days
- `filter.time_range.all`: 全部时间 / All Time

#### 3. 积分消耗卡片文案 (consumption.*)
- `consumption.title`: 积分消耗概览 / Credit Consumption Overview
- `consumption.current_consumption`: 本期消耗 / Current Consumption
- `consumption.daily_average`: 日均消耗 / Daily Average
- `consumption.balance`: 余额 / Balance
- `consumption.projected_days_left`: 预计可用天数 / Projected Days Left
- `consumption.warning_days_left`: 仅剩 {days} 天 / Only {days} days left (支持参数替换)
- 等等...

#### 4. Provider 排行榜文案 (provider_ranking.*)
- `provider_ranking.title`: Provider 消耗排行榜 / Provider Consumption Ranking
- `provider_ranking.rank`: 排名 / Rank
- `provider_ranking.provider`: 提供商 / Provider
- `provider_ranking.consumption`: 消耗 / Consumption
- `provider_ranking.requests`: 请求数 / Requests
- `provider_ranking.success_rate`: 成功率 / Success Rate
- 等等...

#### 5. 成功率趋势文案 (success_rate_trend.*)
- `success_rate_trend.title`: 请求成功率趋势 / Success Rate Trend
- `success_rate_trend.overall_rate`: 整体成功率 / Overall Success Rate
- `success_rate_trend.provider_breakdown`: Provider 维度拆分 / Provider Breakdown
- 等等...

#### 6. 快捷操作文案 (quick_actions.*)
- `quick_actions.title`: 快捷操作 / Quick Actions
- `quick_actions.recharge`: 充值 / Recharge
- `quick_actions.manage_providers`: Provider 管理 / Manage Providers
- `quick_actions.routing_config`: 路由配置 / Routing Configuration
- 等等...

#### 7. 活跃模型文案 (active_models.*)
- `active_models.title`: 活跃模型 / Active Models
- `active_models.most_called`: 调用最多的模型 / Most Called Models
- `active_models.most_failed`: 失败最多的模型 / Most Failed Models
- 等等...

#### 8. 事件流文案 (event_stream.*)
- `event_stream.title`: 事件流 / Event Stream
- `event_stream.recent_events`: 最近的关键事件 / Recent Key Events
- `event_stream.rate_limit`: 限流 / Rate Limit
- `event_stream.error`: 错误 / Error
- `event_stream.warning`: 警告 / Warning
- 等等...

#### 9. 图表标签文案 (chart.*)
- `chart.average`: 平均值 / Average
- `chart.minimum`: 最小值 / Minimum
- `chart.maximum`: 最大值 / Maximum
- `chart.requests`: 请求数 / Requests
- `chart.errors`: 错误数 / Errors
- `chart.success_rate`: 成功率 / Success Rate
- `chart.overall_success_rate`: 整体成功率 / Overall Success Rate

#### 10. 时间格式化文案 (time.*)
- `time.just_now`: 刚刚 / Just now
- `time.minutes_ago`: {minutes} 分钟前 / {minutes} minutes ago
- `time.hours_ago`: {hours} 小时前 / {hours} hours ago
- `time.days_ago`: {days} 天前 / {days} days ago

## 组件国际化使用

### 所有已国际化的组件

1. **FilterBar** (`filter-bar.tsx`)
   - 使用 `useI18n()` Hook 获取时间范围选项的标签

2. **ConsumptionSummaryCard** (`consumption-summary-card.tsx`)
   - 使用 `useI18n()` Hook 获取卡片标题、指标标签等

3. **ProviderRankingCard** (`provider-ranking-card.tsx`)
   - 使用 `useI18n()` Hook 获取表格列标题、按钮文本等

4. **SuccessRateTrendCard** (`success-rate-trend-card.tsx`)
   - 使用 `useI18n()` Hook 获取统计指标标签、图表标签等

5. **QuickActionsBar** (`quick-actions-bar.tsx`)
   - 使用 `useI18n()` Hook 获取快捷操作按钮的标签和描述

6. **ActiveModelsCard** (`active-models-card.tsx`)
   - 使用 `useI18n()` Hook 获取卡片标题、表格列标题等

7. **EventStreamCard** (`event-stream-card.tsx`)
   - 使用 `useI18n()` Hook 获取事件类型标签、时间格式化文案等

8. **RecentActivity** (`recent-activity.tsx`)
   - 使用 `useI18n()` Hook 获取图表 Tooltip 标签

9. **ActivityChart** (`activity-chart.tsx`)
   - 使用 `useI18n()` Hook 获取图表 Tooltip 标签

10. **GatewayConfigCard** (`gateway-config-card.tsx`)
    - 使用 `useI18n()` Hook 获取配置项标签

11. **StatsGrid** (`stats-grid.tsx`)
    - 通过 StatCard 组件使用国际化

12. **ActiveProviders** (`active-providers.tsx`)
    - 使用 `useI18n()` Hook 获取标题和按钮文本

## 参数替换

某些翻译文案支持参数替换，使用 `{paramName}` 的格式：

```typescript
// 示例：消耗预警文案
t("consumption.warning_days_left", { days: 5 })
// 结果：仅剩 5 天 (中文) 或 Only 5 days left (英文)

// 示例：时间格式化
t("time.minutes_ago", { minutes: 10 })
// 结果：10 分钟前 (中文) 或 10 minutes ago (英文)
```

## 使用方法

### 在组件中使用国际化

```typescript
import { useI18n } from "@/lib/i18n-context";

export function MyComponent() {
  const { t } = useI18n();

  return (
    <div>
      <h1>{t("overview.title")}</h1>
      <p>{t("consumption.warning_days_left", { days: 7 })}</p>
    </div>
  );
}
```

### 添加新的翻译

1. 在 `frontend/lib/i18n/overview.ts` 中添加新的翻译 key
2. 同时添加中英文版本
3. 在组件中使用 `t("key")` 获取翻译

```typescript
// 在 overview.ts 中
export const overviewTranslations: Record<Language, Record<string, string>> = {
  en: {
    "my_new_key": "My new text",
  },
  zh: {
    "my_new_key": "我的新文本",
  },
};

// 在组件中
const { t } = useI18n();
const text = t("my_new_key");
```

## 验证需求

本国际化实现验证了以下需求：

- **需求 8.1**: WHEN 用户访问仪表盘概览页 THEN 系统 SHALL 根据用户语言设置显示对应语言的所有文案和标签
- **需求 8.2**: WHEN 系统显示概览页内容 THEN 系统 SHALL 通过 `useI18n()` Hook 获取所有用户可见的文案
- **需求 8.3**: WHEN 新增概览页文案时 THEN 系统 SHALL 在 `frontend/lib/i18n/` 中补充中英文翻译
- **需求 8.4**: WHERE 使用通用文案时 THEN 系统 SHALL 优先复用已存在的 i18n key，避免重复定义

## 编译验证

所有代码已通过 TypeScript 编译检查，无类型错误。

```bash
npm run build
# ✓ Compiled successfully
```

## 相关文件

- `frontend/lib/i18n/overview.ts`: 翻译文件
- `frontend/lib/i18n/index.ts`: 翻译索引（已包含 overviewTranslations）
- `frontend/lib/i18n-context.tsx`: i18n 上下文和 Hook 实现
- 所有概览页组件文件


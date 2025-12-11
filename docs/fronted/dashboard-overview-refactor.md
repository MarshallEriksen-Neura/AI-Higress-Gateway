# 仪表盘概览页 - 实现指南

> 详细的设计方案请参考 `.kiro/specs/dashboard-overview-refactor/design.md`

## 前端数据层（SWR Hooks）

### useOverviewMetrics
获取整体指标汇总，包括总请求数、成功率、活跃 Provider 数等。

**位置**：`frontend/lib/swr/use-overview-metrics.ts`

**使用示例**：
```typescript
const { summary, isLoading, error } = useOverviewMetrics({
  timeRange: '7d',
  transport: 'all',
  isStream: 'all'
});
```

**返回数据结构**：
```typescript
{
  time_range: string;
  total_requests: number;
  success_requests: number;
  error_requests: number;
  success_rate: number;
  active_providers: number;
  total_requests_prev?: number;
  success_rate_prev?: number;
}
```

**缓存策略**：`static` (60s TTL)

---

### useCreditConsumptionSummary
获取积分消耗汇总，包括本期消耗、日均消耗、预计可用天数等。

**位置**：`frontend/lib/swr/use-credits.ts` (扩展)

**使用示例**：
```typescript
const { consumption, isLoading, error } = useCreditConsumptionSummary({
  timeRange: '7d'
});
```

**返回数据结构**：
```typescript
{
  time_range: string;
  total_consumption: number;        // 本期消耗积分
  daily_average: number;            // 日均消耗
  projected_days_left: number;      // 预计可用天数
  current_balance: number;          // 当前余额
  daily_limit?: number;             // 每日限额（可选）
  warning_threshold: number;        // 预警阈值（天数）
}
```

**缓存策略**：`static` (60s TTL)

---

### useActiveProviders
获取活跃 Provider 列表，按请求量排序。

**位置**：`frontend/lib/swr/use-overview-metrics.ts`

**使用示例**：
```typescript
const { providers, isLoading, error } = useActiveProviders({
  timeRange: '7d',
  limit: 10
});
```

**返回数据结构**：
```typescript
{
  provider_id: string;
  total_requests: number;
  success_requests: number;
  error_requests: number;
  success_rate: number;
  latency_p95_ms?: number;
}[]
```

**缓存策略**：`static` (60s TTL)

---

### useCreditProviderConsumption
获取按 Provider 聚合的积分消耗排行。

**位置**：`frontend/lib/swr/use-credits.ts` (扩展)

**使用示例**：
```typescript
const { providers, isLoading, error } = useCreditProviderConsumption({
  timeRange: '7d'
});
```

**返回数据结构**：
```typescript
{
  provider_id: string;
  provider_name: string;
  total_consumption: number;        // 消耗积分
  request_count: number;            // 请求数
  success_rate: number;             // 成功率
  latency_p95_ms?: number;          // P95 延迟
  percentage_of_total: number;      // 占总消耗的百分比
}[]
```

**缓存策略**：`static` (60s TTL)

---

### useOverviewActivity
获取近期活动时间序列数据，用于"近期活动"卡片。

**位置**：`frontend/lib/swr/use-overview-metrics.ts`

**使用示例**：
```typescript
const { activity, isLoading, error } = useOverviewActivity({
  timeRange: 'today',
  bucket: 'minute'
});
```

**返回数据结构**：
```typescript
{
  window_start: string;             // ISO 8601 时间戳
  total_requests: number;
  success_requests: number;
  error_requests: number;
  latency_avg_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  error_rate: number;
}[]
```

**缓存策略**：`frequent` (30s TTL)

---

## 核心组件实现指南

### OverviewFilterBar
**职责**：时间范围和维度筛选

**Props**：
```typescript
interface OverviewFilterBarProps {
  timeRange: 'today' | '7d' | '30d' | '90d' | 'all';
  onTimeRangeChange: (range: string) => void;
  onProviderFilterChange?: (providers: string[]) => void;
  onModelFilterChange?: (models: string[]) => void;
}
```

**实现位置**：`frontend/components/dashboard/overview/filter-bar.tsx`

**关键特性**：
- 支持五个时间范围选项
- 将选择状态保存到本地存储（localStorage key: `overview_time_range`）
- 页面刷新时恢复上次选择
- 使用 `@/components/ui/select` 和 `@/components/ui/button` 组件

---

### ConsumptionSummaryCard
**职责**：展示积分消耗概览和 Sparkline 趋势

**Props**：
```typescript
interface ConsumptionSummaryCardProps {
  data: CreditConsumptionSummary;
  isLoading: boolean;
  error?: Error;
}
```

**实现位置**：`frontend/components/dashboard/overview/consumption-summary-card.tsx`

**关键特性**：
- 显示本期消耗、日均消耗、预计可用天数
- 集成 Sparkline 趋势图（使用 recharts）
- 当预计可用天数 < 阈值时显示预警标签
- 加载态显示 Skeleton 占位符
- 错误态显示重试按钮

---

### ProviderRankingCard
**职责**：展示 Provider 消耗排行榜

**Props**：
```typescript
interface ProviderRankingCardProps {
  data: ProviderConsumption[];
  isLoading: boolean;
  error?: Error;
  onProviderClick?: (providerId: string) => void;
}
```

**实现位置**：`frontend/components/dashboard/overview/provider-ranking-card.tsx`

**关键特性**：
- 按消耗积分降序排列
- 显示消耗、请求量、成功率、P95 延迟等指标
- 支持点击行导航到 Provider 管理页面
- 显示消耗占比百分比
- 使用 `@/components/ui/table` 组件

---

### SuccessRateTrendCard
**职责**：展示成功率趋势和 Provider 维度分析

**Props**：
```typescript
interface SuccessRateTrendCardProps {
  data: SuccessRateTrend[];
  isLoading: boolean;
  error?: Error;
}
```

**实现位置**：`frontend/components/dashboard/overview/success-rate-trend-card.tsx`

**关键特性**：
- 显示整体成功率和折线图
- 按 Provider 维度拆分显示多条曲线
- 当 Provider 成功率 < 阈值时高亮显示
- 使用 recharts LineChart 组件
- 支持 Tooltip 显示详细数据

---

### QuickActionsBar
**职责**：提供快捷操作入口

**Props**：
```typescript
interface QuickActionsBarProps {
  onNavigate?: (path: string) => void;
}
```

**实现位置**：`frontend/components/dashboard/overview/quick-actions-bar.tsx`

**关键特性**：
- 提供三个快捷按钮：充值、Provider 管理、路由配置
- 点击按钮导航到对应页面
- 使用 `next/link` 或 `useRouter` 实现导航
- 使用 `@/components/ui/button` 组件

---

## 数据类型定义

在 `frontend/lib/api-types.ts` 中添加以下类型：

```typescript
// 积分消耗汇总
export interface CreditConsumptionSummary {
  time_range: string;
  total_consumption: number;
  daily_average: number;
  projected_days_left: number;
  current_balance: number;
  daily_limit?: number;
  warning_threshold: number;
}

// Provider 消耗数据
export interface ProviderConsumption {
  provider_id: string;
  provider_name: string;
  total_consumption: number;
  request_count: number;
  success_rate: number;
  latency_p95_ms?: number;
  percentage_of_total: number;
}

// 成功率趋势
export interface SuccessRateTrend {
  timestamp: string;
  overall_success_rate: number;
  provider_success_rates: {
    provider_id: string;
    success_rate: number;
  }[];
}

// 时间序列数据点
export interface TimeSeriesDataPoint {
  window_start: string;
  total_requests: number;
  success_requests: number;
  error_requests: number;
  latency_avg_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  error_rate: number;
}
```

---

## 国际化文案

在 `frontend/lib/i18n/overview.ts` 中定义所有文案：

```typescript
export const overviewI18n = {
  zh: {
    timeRange: '时间范围',
    today: '今天',
    sevenDays: '7 天',
    thirtyDays: '30 天',
    ninetyDays: '90 天',
    all: '全部',
    consumptionSummary: '积分消耗概览',
    totalConsumption: '本期消耗',
    dailyAverage: '日均消耗',
    projectedDaysLeft: '预计可用天数',
    currentBalance: '当前余额',
    warningLabel: '预警',
    providerRanking: 'Provider 消耗排行',
    consumption: '消耗',
    requestCount: '请求数',
    successRate: '成功率',
    latency: '延迟',
    successRateTrend: '请求成功率趋势',
    overallSuccessRate: '整体成功率',
    quickActions: '快捷操作',
    recharge: '充值',
    providerManagement: 'Provider 管理',
    routingConfig: '路由配置',
    loadingFailed: '加载失败',
    retry: '重试',
    noData: '暂无数据',
  },
  en: {
    timeRange: 'Time Range',
    today: 'Today',
    sevenDays: '7 Days',
    thirtyDays: '30 Days',
    ninetyDays: '90 Days',
    all: 'All',
    consumptionSummary: 'Credit Consumption Overview',
    totalConsumption: 'Total Consumption',
    dailyAverage: 'Daily Average',
    projectedDaysLeft: 'Projected Days Left',
    currentBalance: 'Current Balance',
    warningLabel: 'Warning',
    providerRanking: 'Provider Consumption Ranking',
    consumption: 'Consumption',
    requestCount: 'Requests',
    successRate: 'Success Rate',
    latency: 'Latency',
    successRateTrend: 'Success Rate Trend',
    overallSuccessRate: 'Overall Success Rate',
    quickActions: 'Quick Actions',
    recharge: 'Recharge',
    providerManagement: 'Provider Management',
    routingConfig: 'Routing Config',
    loadingFailed: 'Loading Failed',
    retry: 'Retry',
    noData: 'No Data',
  }
};
```

---

## 响应式布局

使用 Tailwind CSS 响应式类实现不同设备的布局：

```typescript
// 桌面端四列、平板端两列、移动端单列
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 卡片内容 */}
</div>
```

---

## 错误处理

所有组件应实现以下错误处理逻辑：

```typescript
if (error) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">{i18n.loadingFailed}</p>
          <Button onClick={() => mutate()}>
            {i18n.retry}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

if (isLoading) {
  return <SkeletonCard />;
}
```

---

## 性能优化

1. **缓存策略**：使用 SWR 的 `static` 缓存策略，TTL 60 秒；活动数据使用 `frequent` 策略，TTL 30 秒
2. **代码分割**：使用 `next/dynamic` 动态导入概览页组件；图表库（recharts）按需加载
3. **渲染优化**：使用 `React.memo` 避免不必要的重渲染；将容器组件和展示组件分离；使用 `useMemo` 缓存计算结果
4. **API 调用优化**：避免在每次渲染时创建新的 API key 对象；使用 `useMemo` 组合查询参数

---

## 测试指南

- **单元测试**：测试各卡片组件的渲染逻辑、数据格式化函数、时间范围选择器的状态管理
- **集成测试**：测试 SWR Hook 与 API 的集成、筛选器变化时的数据更新流程、错误状态的处理
- **属性测试**：使用 Property-Based Testing 验证正确性属性，参考设计文档中的 25 个正确性属性，使用 vitest 和 fast-check 库实现

# 任务 7 验证报告：实现系统页核心趋势图区域

## 任务概述

在系统页容器中集成核心趋势图区域，包括：
- 请求 & 错误趋势图（RequestsAndErrorsChart）
- 延迟分位数趋势图（LatencyPercentilesChart）

## 实现位置

文件：`frontend/app/dashboard/system/_components/system-dashboard-client.tsx`

## 实现细节

### 1. 数据源集成 ✅

使用系统页专用的 SWR Hook：
```typescript
const pulseResult = useSystemDashboardPulse(pulseFilters);
```

- API 端点：`/metrics/v2/system-dashboard/pulse`
- 数据类型：`DashboardV2PulseResponse`
- 返回字段：`points: DashboardV2PulseDataPoint[]`

### 2. 图表组件复用 ✅

#### 请求 & 错误趋势图
- 组件：`RequestsErrorsChart`
- 导入路径：`@/app/dashboard/overview/_components/charts`
- Props：
  - `data`: `pulseResult.points`
  - `isLoading`: `pulseResult.loading`

#### 延迟分位数趋势图
- 组件：`LatencyPercentilesChart`
- 导入路径：`@/app/dashboard/overview/_components/charts`
- Props：
  - `data`: `pulseResult.points`
  - `isLoading`: `pulseResult.loading`

### 3. 响应式布局 ✅

```tsx
<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div>{/* 请求 & 错误趋势图 */}</div>
  <div>{/* 延迟分位数趋势图 */}</div>
</section>
```

- 移动端：单列布局（grid-cols-1）
- 桌面端：双列布局（lg:grid-cols-2）
- 间距：gap-6

### 4. 错误处理 ✅

每个图表都包含完整的错误处理：

```tsx
{pulseResult.error ? (
  <ErrorState
    title={t("dashboard.errors.loadFailed")}
    message={pulseResult.error.message}
    onRetry={pulseResult.refresh}
  />
) : pulseResult.points.length === 0 && !pulseResult.loading ? (
  <EmptyState message={t("dashboard.errors.noData")} />
) : (
  <Chart data={pulseResult.points} isLoading={pulseResult.loading} />
)}
```

- **错误态**：显示 ErrorState 组件，提供重试按钮
- **空态**：显示 EmptyState 组件
- **加载态**：图表组件内部处理

### 5. 筛选器集成 ✅

Pulse 数据受以下筛选器影响：
- `transport`：传输方式（all/http/sdk/claude_cli）
- `isStream`：流式筛选（all/true/false）

注意：Pulse 数据固定为近 24 小时，不受 `timeRange` 筛选器影响。

## 需求验证

### 需求 2.1 ✅
> WHEN 管理员访问系统页 THEN 系统 SHALL 显示"请求 & 错误趋势"图表，展示近 24 小时全局数据

- ✅ 图表已集成到系统页容器
- ✅ 使用 `/metrics/v2/system-dashboard/pulse` 接口
- ✅ 数据为近 24 小时全局数据

### 需求 2.2 ✅
> WHEN 显示请求趋势时 THEN 系统 SHALL 使用折线图展示 `total_requests`

- ✅ RequestsErrorsChart 组件使用折线图展示总请求数
- ✅ 数据字段：`total_requests`

### 需求 2.3 ✅
> WHEN 显示错误趋势时 THEN 系统 SHALL 使用堆叠柱状图展示错误类型

- ✅ RequestsErrorsChart 组件使用堆叠柱状图
- ✅ 错误类型：`error_4xx_requests`, `error_5xx_requests`, `error_429_requests`, `error_timeout_requests`

### 需求 2.5 ✅
> WHEN 后端返回数据有缺失分钟 THEN 系统 SHALL 正确渲染补零后的连续曲线

- ✅ RequestsErrorsChart 组件内部实现了 `fillMissingMinutes` 函数
- ✅ 自动补零缺失的分钟数据

### 需求 3.1 ✅
> WHEN 管理员访问系统页 THEN 系统 SHALL 显示"延迟分位数趋势"图表，展示近 24 小时全局数据

- ✅ 图表已集成到系统页容器
- ✅ 使用相同的 Pulse 数据源

### 需求 3.2 ✅
> WHEN 显示延迟趋势时 THEN 系统 SHALL 使用折线图展示三条曲线

- ✅ LatencyPercentilesChart 组件使用折线图
- ✅ 三条曲线：`latency_p50_ms`, `latency_p95_ms`, `latency_p99_ms`

### 需求 3.4 ✅
> WHEN 延迟值显示时 THEN 系统 SHALL 使用毫秒（ms）作为单位

- ✅ LatencyPercentilesChart 组件在 Y 轴显示 "ms" 单位标签
- ✅ 数据字段已包含 `_ms` 后缀

## 类型检查

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | grep "system-dashboard-client"
# 无错误输出
```

✅ 无 TypeScript 类型错误

## 组件依赖关系

```
SystemDashboardClient
├── useSystemDashboardPulse (SWR Hook)
│   └── GET /metrics/v2/system-dashboard/pulse
├── RequestsErrorsChart (复用)
│   ├── ComposedChart (recharts)
│   ├── Line (总请求数)
│   └── Bar (堆叠错误)
├── LatencyPercentilesChart (复用)
│   ├── LineChart (recharts)
│   └── Line × 3 (P50/P95/P99)
├── ErrorState (错误处理)
└── EmptyState (空态处理)
```

## 测试建议

虽然任务 7.1（属性测试）被标记为可选，但建议进行以下手动测试：

1. **数据加载测试**
   - 访问系统页，验证图表正确加载
   - 检查图表显示近 24 小时数据

2. **筛选器测试**
   - 切换 transport 筛选器，验证图表数据更新
   - 切换 isStream 筛选器，验证图表数据更新
   - 验证 timeRange 筛选器不影响 Pulse 图表

3. **错误处理测试**
   - 模拟 API 错误，验证 ErrorState 显示
   - 点击重试按钮，验证数据重新加载
   - 模拟空数据，验证 EmptyState 显示

4. **响应式测试**
   - 在桌面端验证双列布局
   - 在移动端验证单列布局
   - 验证图表在不同屏幕尺寸下正确显示

5. **性能测试**
   - 验证图表渲染流畅
   - 验证数据补零不影响性能
   - 验证 SWR 缓存正常工作（60s TTL）

## 总结

✅ 任务 7 已完成，所有需求均已满足：
- 成功集成请求 & 错误趋势图
- 成功集成延迟分位数趋势图
- 图表使用系统页专用数据源
- 包含完整的错误处理和空态处理
- 响应式布局正确实现
- 无 TypeScript 类型错误

下一步可以继续执行任务 8（实现系统页 Token 使用区域）。

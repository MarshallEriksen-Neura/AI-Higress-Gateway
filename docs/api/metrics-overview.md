# 仪表盘概览 Metrics 接口（/metrics/overview/*）

> 本文档描述的是「仪表盘概览」使用的内部指标接口，目前主要用于前端 `/dashboard/overview` 页面。

## 鉴权

- 需要登录用户（JWT），与其他 `/metrics/*` 路由一致。

---

## 1. 总览汇总 `/metrics/overview/summary`

### 请求

`GET /metrics/overview/summary`

#### Query 参数

- `time_range`：时间范围（可选，默认 `7d`）
  - `today`：今天 0 点至当前时间；
  - `7d`：过去 7 天；
  - `30d`：过去 30 天；
  - `all`：全部历史数据（不计算上一周期）。
- `transport`：传输模式过滤（可选，默认 `all`）
  - `http` / `sdk` / `all`。
- `is_stream`：流式过滤（可选，默认 `all`）
  - `true` / `false` / `all`。

> 与现有 `/metrics/providers/*` 路由保持一致的过滤语义。

### 响应

`200 OK`

```jsonc
{
  "time_range": "7d",
  "transport": "all",
  "is_stream": "all",
  "total_requests": 1200000,
  "success_requests": 1130000,
  "error_requests": 70000,
  "success_rate": 0.9417,
  "total_requests_prev": 1060000,
  "success_requests_prev": 1010000,
  "error_requests_prev": 50000,
  "success_rate_prev": 0.9528,
  "active_providers": 8,
  "active_providers_prev": 6
}
```

字段说明：

- `total_requests` / `success_requests` / `error_requests`：
  - 当前时间范围内的总请求数 / 成功请求数 / 失败请求数；
  - 数据来源：`provider_routing_metrics_history` 表的聚合。
- `success_rate`：
  - 成功率，范围 `[0,1]`；
  - 计算方式：`success_requests / total_requests`，当 `total_requests=0` 时为 `0.0`。
- `active_providers`：
  - 当前时间范围内，拥有至少一条请求记录的 Provider 数量；
  - 通过对 `provider_id` 做 `COUNT(DISTINCT ...)` 得出。
- `*_prev` 一组字段：
  - 上一对比周期的同类指标，用于前端计算“相比上一个周期”的变化；
  - 对于 `today/7d/30d`，上一周期的时间窗口长度与当前窗口一致；
  - 对于 `time_range=all`，这些字段固定为 `null`，表示不提供对比数据。

---

## 2. 活跃 Provider 列表 `/metrics/overview/providers`

### 请求

`GET /metrics/overview/providers`

#### Query 参数

- `time_range`：同上，默认 `7d`。
- `transport`：同上，默认 `all`。
- `is_stream`：同上，默认 `all`。
- `limit`：返回的 Provider 最大数量（默认 `4`，范围 `[1,50]`），按请求量降序排序。

### 响应

`200 OK`

```jsonc
{
  "time_range": "7d",
  "transport": "all",
  "is_stream": "all",
  "items": [
    {
      "provider_id": "openai",
      "total_requests": 330000,
      "success_requests": 320000,
      "error_requests": 10000,
      "success_rate": 0.9697,
      "latency_p95_ms": 250.3
    }
    // ...
  ]
}
```

字段说明（`items[*]`）：

- `provider_id`：Provider 标识。
- `total_requests` / `success_requests` / `error_requests`：
  - 在当前时间范围内的聚合统计；
  - 数据来源：对 `provider_routing_metrics_history` 按 `provider_id` 分组求和。
- `success_rate`：
  - 成功率 `[0,1]`，`success_requests / total_requests`；
  - 当 `total_requests=0` 时为 `0.0`。
- `latency_p95_ms`：
  - P95 延迟（毫秒），使用加权平均近似：
    - `sum(latency_p95_ms * total_requests_1m) / sum(total_requests_1m)`；
  - 当无请求时为 `null`。

前端使用：

- SWR Hook：`useActiveProvidersOverview`（`frontend/lib/swr/use-overview-metrics.ts`）；
- 组件：`frontend/components/dashboard/overview/active-providers.tsx`；
  - 将 `latency_p95_ms` 和 `success_rate` 转成卡片上显示的“延迟 / 成功率”；
  - 根据成功率和延迟简单推导出“健康 / 性能下降”状态。

---

## 3. 近期活动时间序列 `/metrics/overview/timeseries`

### 请求

`GET /metrics/overview/timeseries`

#### Query 参数

- `time_range`：同上，默认 `7d`；在概览页「近期活动」中常用 `today`。
- `bucket`：时间粒度，当前仅支持：
  - `minute`：按分钟聚合。
- `transport` / `is_stream`：同上，默认 `all`。

### 响应

`200 OK`

```jsonc
{
  "time_range": "today",
  "bucket": "minute",
  "transport": "all",
  "is_stream": "all",
  "points": [
    {
      "window_start": "2024-12-06T09:00:00Z",
      "total_requests": 1234,
      "success_requests": 1200,
      "error_requests": 34,
      "latency_avg_ms": 180.5,
      "latency_p95_ms": 260.1,
      "latency_p99_ms": 310.2,
      "error_rate": 0.0275
    }
    // ...
  ]
}
```

说明：

- 每个 `points[*]` 代表一个时间桶（当前为 1 分钟）；
- 各字段与 `MetricsDataPoint` 模型一致，来源为：
  - 按 `window_start` 分组，对所有 Provider 的 `provider_routing_metrics_history` 记录做聚合；
  - 延迟字段使用加权平均近似。

前端使用：

- SWR Hook：`useOverviewActivity`（`frontend/lib/swr/use-overview-metrics.ts`）：
  - 默认 `time_range=today`；
  - 返回 `activity.points` 作为“近期活动”数据源。
- 组件：`frontend/components/dashboard/overview/recent-activity.tsx`：
  - 取最近若干时间桶，绘制简单的条形图（请求量相对高度）；
  - 同行展示每个时间点的 `total_requests` / `error_requests` / 成功率。

---

## 缓存策略（所有 `/metrics/overview/*`）

- 使用 Redis 做轻量缓存，TTL 统一为 `60s`：
  - summary：`metrics:overview:summary:{time_range}:{transport}:{is_stream}`
  - providers：`metrics:overview:providers:{time_range}:{transport}:{is_stream}:{limit}`
  - timeseries：`metrics:overview:timeseries:{time_range}:{transport}:{is_stream}:{bucket}`
- 缓存 miss 或 Redis 异常时，均回退到数据库聚合查询，不影响接口可用性。



---

## 4. 与积分消耗 API 的关系

概览页同时使用 `/metrics/overview/*` 和 `/v1/credits/me/*` 两类 API：

### 指标类 API（/metrics/overview/*)
- 用于展示**运营指标**：请求量、成功率、活跃 Provider 等
- 数据来源：`provider_routing_metrics_history` 表
- 适用场景：整体系统健康度、性能趋势分析

### 积分类 API（/v1/credits/me/*)
- 用于展示**成本指标**：积分消耗、余额、预算等
- 数据来源：`credit_transactions` 表
- 适用场景：成本管理、预算告警、充值提醒

### 前端集成示例

```typescript
// 同时获取运营指标和成本指标
const { summary: metrics } = useOverviewMetrics({ timeRange: '7d' });
const { consumption: credits } = useCreditConsumptionSummary({ timeRange: '7d' });

// 在概览页顶部并排展示
<div className="grid grid-cols-2 gap-4">
  <MetricsCard data={metrics} />
  <CreditCard data={credits} />
</div>
```

---

## 5. 前端 SWR Hook 映射表

| Hook 名称 | API 端点 | 缓存策略 | 用途 |
|---------|---------|--------|------|
| `useOverviewMetrics` | `GET /metrics/overview/summary` | static (60s) | 整体指标汇总 |
| `useActiveProviders` | `GET /metrics/overview/providers` | static (60s) | 活跃 Provider 列表 |
| `useOverviewActivity` | `GET /metrics/overview/timeseries` | frequent (30s) | 近期活动时间序列 |
| `useCreditConsumptionSummary` | `GET /v1/credits/me/consumption/summary` | static (60s) | 积分消耗汇总 |
| `useCreditProviderConsumption` | `GET /v1/credits/me/consumption/providers` | static (60s) | Provider 维度消耗 |
| `useCreditConsumptionTimeseries` | `GET /v1/credits/me/consumption/timeseries` | static (60s) | 积分消耗时间序列 |



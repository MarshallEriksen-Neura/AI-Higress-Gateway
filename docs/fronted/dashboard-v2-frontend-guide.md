# Dashboard v2（用户页 + 系统页）前端实现指南

更新时间：2025-12-18  
适用范围：新概览页（Dashboard v2）前端页面与图表实现；数据来源以后端 `/metrics/v2/*` 为准。

> 目标：让 DevOps、平台工程师与财务使用者在 5 秒内回答：
> 1) 系统健康吗？（错误/延迟是否异常）  
> 2) 谁在用、用多少？（流量趋势、Token 输入/输出）  
> 3) 花了多少钱？（用户页展示个人 credits，系统页不展示成本）

相关后端接口文档：
- `docs/api/metrics-dashboard-v2.md`

---

## 0. 页面与权限

### 0.1 两张页面

1) **用户 Dashboard（个人）**  
面向：所有登录用户  
核心：个人健康（请求/错误/延迟）+ Token（输入/输出/总量）+ 个人 credits（花费）

2) **系统 Dashboard（管理员）**  
面向：仅 `is_superuser=true` 的管理员  
核心：系统健康（请求/错误/延迟）+ 系统 Token（输入/输出/总量）+ Provider 状态概览  
说明：系统页**不展示成本**（避免误导/缺少预算模型）。

### 0.2 鉴权与错误处理建议

- 所有接口都需要 JWT；系统页接口在非管理员会返回 `403`。
- 前端建议：系统页在进入前就做权限判断（例如通过现有 session/me 信息），避免用户看到“红色错误页”。
- 对于接口级错误：使用统一 `ErrorState`（已有模式可参考 `frontend/components/dashboard/overview/error-state.tsx`）。

---

## 1. 信息架构与页面布局（栅格化）

以下布局与 mockup 保持一致（推荐 12 列栅格）：

### 1.1 顶部工具条（Filter / Status）

建议控件：
- 时间范围：`today | 7d | 30d`（影响 KPI、Token、Top Models、Cost 结构；Pulse 固定近 24h）
- 过滤：`transport=all|http|sdk|claude_cli`、`is_stream=all|true|false`
- 状态提示（可选）：
  - 系统运行状态：由错误率/超时率阈值在前端推导（见 4.2）
  - 预算使用（当前后端无预算模型）：默认隐藏或显示 “未配置”

### 1.2 层级 1：KPI Cards（4–5 张）

用户页推荐 5 张：
- 今日/本周期总请求数（`total_requests`）
- 本周期 credits 花费（`credits_spent`，注意是 credits，不是美元）
- P95 延迟（`latency_p95_ms`）
- 错误率（`error_rate`）
- Token 总量（`tokens.total`，可在卡片内分 Input/Output）

系统页推荐 4 张（不展示成本）：
- 总请求数、P95、错误率、Token 总量

> “环比箭头/百分比变化”：v2 当前没有直接提供对比口径（如 yesterday/prev_week）。建议先不上环比，或用二次请求/前端计算做 “v2.1” 增强（见 6.2）。

### 1.3 层级 2：核心趋势（2 张大图）

1) **Requests & Errors（近 24h）**  
折线：`total_requests`  
堆叠柱：`error_4xx_requests / error_5xx_requests / error_429_requests / error_timeout_requests`

2) **Latency Percentiles（近 24h）**  
折线：`latency_p50_ms / latency_p95_ms / latency_p99_ms`

### 1.4 层级 3：Cost & Token（3 卡）

用户页：
- 成本结构（Donut）：`cost-by-provider`（provider 维度）
- Token 输入 vs 输出（Stacked Bar）：`tokens`（hour/day）

系统页：
- Token 输入 vs 输出（Stacked Bar）：`tokens`（hour/day）
- Provider 状态：系统专用 `providers` 列表

### 1.5 层级 4：排行与明细（Top Lists）

当前 v2 已支持：
- **Top Models**：按请求量排行，同时返回该模型 token 总量

当前 v2 不支持（建议暂不做或隐藏）：
- Top Consumers（按 API Key / 应用）——需要新增接口或扩展现有 v2（见 6.3）。

---

## 2. 数据接入：接口到组件映射

### 2.1 用户页（/metrics/v2/user-dashboard/*）

| 版块 | 接口 | 关键字段 | 备注 |
|---|---|---|---|
| KPI 卡 | `GET /metrics/v2/user-dashboard/kpis` | `total_requests, error_rate, latency_p95_ms, tokens{input,output,total,estimated_requests}, credits_spent` | `credits_spent` 为 credits；只统计 `usage/stream_usage` |
| Pulse：请求&错误 + 延迟分位 | `GET /metrics/v2/user-dashboard/pulse` | `points[].total_requests`、`points[].error_*`、`points[].latency_p50/p95/p99` | 固定近 24h、分钟粒度、后端会补零 |
| Token 趋势 | `GET /metrics/v2/user-dashboard/tokens` | `points[].input_tokens/output_tokens/total_tokens/estimated_requests` | `bucket=hour|day` |
| Top Models | `GET /metrics/v2/user-dashboard/top-models` | `items[].model/requests/tokens_total` | 适合作为“最受欢迎模型” |
| 成本结构（按 provider） | `GET /metrics/v2/user-dashboard/cost-by-provider` | `items[].provider_id/credits_spent/transactions` | 可渲染 Donut 或 bar list |

### 2.2 系统页（/metrics/v2/system-dashboard/*，管理员）

| 版块 | 接口 | 关键字段 | 备注 |
|---|---|---|---|
| KPI 卡 | `GET /metrics/v2/system-dashboard/kpis` | `total_requests, error_rate, latency_p95_ms, tokens{...}` | 不含 credits |
| Pulse | `GET /metrics/v2/system-dashboard/pulse` | 同用户页 | 固定近 24h |
| Token 趋势 | `GET /metrics/v2/system-dashboard/tokens` | 同用户页 | `bucket=hour|day` |
| Top Models | `GET /metrics/v2/system-dashboard/top-models` | 同用户页 | 系统范围 |
| Provider 状态 | `GET /metrics/v2/system-dashboard/providers` | `items[].provider_id/operation_status/status/audit_status/last_check` | 用于“供应商状态概览” |

### 2.3 公共配置（可选展示）

- `GET /system/gateway-config`：可读到 `metrics_retention_days`（用于提示“历史最多保留 N 天”）。

---

## 3. 前端工程结构建议（Next.js App Router）

### 3.1 页面拆分（推荐）

建议新增/替换两个页面：
- 用户页：`frontend/app/dashboard/overview-v2/page.tsx`（服务端组件）
  - 客户端容器：`frontend/app/dashboard/overview-v2/components/overview-v2-client.tsx`
- 系统页：`frontend/app/system/dashboard/page.tsx`（服务端组件，做权限 gate）
  - 客户端容器：`frontend/app/system/dashboard/components/system-dashboard-client.tsx`

> 若你打算直接替换现有 `/dashboard/overview`，也建议先以 `overview-v2` 落地，稳定后再切换路由，减少回滚成本。

### 3.2 组件建议（按域归类）

建议目录：
- `frontend/components/dashboard/v2/filters/*`：TimeRange/Transport/Stream filter
- `frontend/components/dashboard/v2/kpis/*`：KPI 卡组件（复用 `@/components/ui/card`）
- `frontend/components/dashboard/v2/charts/*`：Pulse、Latency、Tokens、Donut
- `frontend/components/dashboard/v2/tables/*`：Top Models

图表建议复用：
- `frontend/components/ui/chart.tsx`（Recharts 封装）
- 按 `frontend/docs/code-splitting-strategy.md` 做动态 import（避免 Recharts 影响首屏）。

---

## 4. 交互与可视化细节（建议口径）

### 4.1 时间范围与刷新策略

- KPI/Top/Token：`time_range=today|7d|30d`
- Pulse：固定近 24h（无需 time_range），标题写“近24h”
- SWR 刷新：后端 Redis TTL=60s，建议前端用 `strategy: 'frequent'`（30s）或自定义为 60s，避免无意义的高频刷新。

### 4.2 健康状态徽章（前端推导）

后端不直接给 “系统运行正常/抖动/异常” 总结值，可按简单阈值推导：
- `error_rate < 1%` 且 `latency_p95_ms` 未超过自定义阈值（例如 1s）：🟢
- `error_rate 1–5%` 或 `p95` 明显升高：🟡
- `error_rate > 5%` 或超时大量出现：🔴

阈值建议做成前端常量（或后续进入 `gateway-config` 扩展）。

### 4.3 Token 估算提示

`tokens.estimated_requests` / `points[].estimated_requests` 表示有多少请求的 token 来自估算（上游未返回 usage / 流式首包估算）。建议：
- 当 `estimated_requests > 0` 时，在 Token 卡/图表角落显示一个 “ⓘ” tooltip，说明口径。

---

## 5. 当前不支持/建议隐藏的模块（避免误导）

以下指标在 v2 里尚未提供稳定口径，建议默认不展示或标记 “未配置/暂不支持”：

1) **缓存命中率**：除非网关自身实现缓存并记录命中/未命中，否则无法准确计算。  
2) **预算已用 %**：后端没有预算模型（budget/quota）与归因口径。  
3) **Top Consumers（应用/API Key 维度）**：v2 目前无对应接口（见 6.3）。

---

## 6. v2.1 后端增强建议（可选）

### 6.1 环比/同比

为 KPI 卡实现 “↑/↓ 环比”，建议后端支持：
- `compare_to=prev_period|yesterday|last_week` 并返回 `*_prev` 或 `delta_pct`

### 6.2 “Cost by Model” 甜甜圈钻取

当前只有 `cost-by-provider`。若要做到 “按 provider → 按 model 钻取”，建议新增：
- `GET /metrics/v2/user-dashboard/cost-by-model?provider_id=...`

### 6.3 Top Consumers（API Key / 调用方）

建议新增：
- `GET /metrics/v2/user-dashboard/top-api-keys`
- `GET /metrics/v2/system-dashboard/top-api-keys`（管理员）

数据可直接基于 `provider_routing_metrics_history.api_key_id` 聚合（已落盘）。

---

## 7. 前端验收清单（上线前）

- KPI 数字与 Pulse/Token 曲线在同一时间范围下能自洽（至少方向一致）
- 403（系统页）能优雅处理（隐藏入口/提示无权限）
- Token 估算提示在 `estimated_requests>0` 时可见
- 空态/无数据：不画“随机曲线”，改为明确空态提示
- i18n：所有可见文案走 `useI18n()`（不硬编码）


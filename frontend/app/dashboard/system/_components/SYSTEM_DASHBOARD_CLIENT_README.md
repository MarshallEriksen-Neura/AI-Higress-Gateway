# SystemDashboardClient 组件

## 概述

`SystemDashboardClient` 是 Dashboard v2 系统页的客户端容器组件，负责管理筛选器状态、获取数据并将数据传递给各个子组件。

## 功能特性

- ✅ 管理筛选器状态（时间范围、传输方式、流式）
- ✅ 调用所有系统页 SWR Hooks 获取数据
- ✅ 将数据传递给各个子组件
- ✅ 处理加载态、错误态、空态
- ✅ 响应式布局（桌面/平板/移动）
- ✅ 国际化支持

## 组件结构

```
SystemDashboardClient
├── 顶部工具条
│   ├── 页面标题 + HealthBadge
│   └── FilterBar（时间范围、传输方式、流式筛选器）
├── 层级 1 - KPI 卡片（4 张）
│   ├── TotalRequestsCard
│   ├── LatencyP95Card
│   ├── ErrorRateCard
│   └── TotalTokensCard
├── 层级 2 - 核心趋势图（2 张大图并排）
│   ├── RequestsErrorsChart
│   └── LatencyPercentilesChart
├── 层级 3 - Token 使用
│   └── TokenUsageChart
└── 层级 4 - 排行榜和 Provider 状态
    ├── TopModelsTable
    └── ProviderStatusList
```

## 使用方法

### 基本用法

```tsx
import { SystemDashboardClient } from "@/app/dashboard/system/_components";

export default function SystemDashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <SystemDashboardClient />
    </div>
  );
}
```

### 与权限守卫配合使用

```tsx
import { PermissionGuard } from "@/components/auth/permission-guard";
import { SystemDashboardClient } from "@/app/dashboard/system/_components";

export default function SystemDashboardPage() {
  return (
    <PermissionGuard requiredPermission="superuser">
      <div className="container mx-auto p-6">
        <SystemDashboardClient />
      </div>
    </PermissionGuard>
  );
}
```

## 数据流

1. **筛选器状态管理**：使用 `useState` 管理时间范围、传输方式、流式筛选器的状态
2. **数据获取**：通过 SWR Hooks 并行获取所有数据
   - `useSystemDashboardKPIs` - KPI 指标
   - `useSystemDashboardPulse` - 近 24h 脉搏数据
   - `useSystemDashboardTokens` - Token 使用趋势
   - `useSystemDashboardTopModels` - 热门模型排行
   - `useSystemDashboardProviders` - Provider 状态列表
3. **数据传递**：将数据传递给各个子组件进行渲染
4. **状态处理**：统一处理加载态、错误态、空态

## 筛选器参数

### 时间范围（Time Range）
- `today` - 今天
- `7d` - 过去 7 天（默认）
- `30d` - 过去 30 天

### 传输方式（Transport）
- `all` - 全部（默认）
- `http` - HTTP
- `sdk` - SDK
- `claude_cli` - Claude CLI

### 流式（Stream）
- `all` - 全部（默认）
- `true` - 流式
- `false` - 非流式

## 响应式布局

### KPI 卡片网格
- **桌面端（≥1024px）**：四列布局
- **平板端（768-1023px）**：两列布局
- **移动端（<768px）**：单列布局

### 核心趋势图
- **桌面端（≥1024px）**：两列并排
- **移动端（<1024px）**：单列堆叠

### Provider 状态列表
- **桌面端（≥1024px）**：三列布局
- **平板端（768-1023px）**：两列布局
- **移动端（<768px）**：单列布局

## 国际化

所有用户可见文案通过 `useI18n()` Hook 获取，支持中英文切换。

### 相关文案 Key

```typescript
// 页面标题
"dashboardV2.system.title" // 系统仪表盘

// 错误提示
"dashboard.errors.loadFailed" // 加载数据失败
"dashboard.errors.noData" // 暂无数据

// 其他文案参考 frontend/lib/i18n/dashboard.ts
```

## 性能优化

1. **SWR 缓存**：使用 60s TTL 缓存策略，减少 API 调用
2. **useMemo**：使用 `useMemo` 避免重复创建筛选器参数对象
3. **并行请求**：所有 SWR Hooks 并行调用，提高加载速度
4. **React.memo**：子组件使用 `React.memo` 避免不必要的重渲染

## 错误处理

- **API 请求失败**：显示 `ErrorState` 组件，提供重试按钮
- **数据为空**：显示 `EmptyState` 组件，避免空白图表
- **网络超时**：利用 SWR 的自动重试机制

## 相关组件

- `SystemKPICardsGrid` - 系统页 KPI 卡片网格
- `ProviderStatusList` - Provider 状态列表
- `FilterBar` - 筛选器组件（复用自用户页）
- `HealthBadge` - 健康状态徽章（复用自用户页）
- `ErrorState` - 错误状态组件（复用自用户页）
- `EmptyState` - 空状态组件（复用自用户页）

## 验证需求

- ✅ 需求 7.1：在页面顶部显示时间范围筛选器
- ✅ 需求 7.4：默认选择 7d 时间范围
- ✅ 需求 8.1：在页面顶部显示传输方式筛选器
- ✅ 需求 8.2：在页面顶部显示流式筛选器

## 注意事项

1. **权限控制**：此组件不包含权限检查逻辑，需要在父组件中使用 `PermissionGuard` 包裹
2. **服务端渲染**：此组件是客户端组件（`"use client"`），不能在服务端渲染
3. **数据依赖**：依赖后端 `/metrics/v2/system-dashboard/*` 接口
4. **筛选器影响**：
   - Pulse 数据固定近 24h，不受时间范围筛选器影响
   - Provider 状态不受任何筛选器影响
   - 其他数据受所有筛选器影响

## 示例代码

### 完整页面示例

```tsx
// frontend/app/dashboard/system/page.tsx
import { PermissionGuard } from "@/components/auth/permission-guard";
import { SystemDashboardClient } from "./_components";

export default function SystemDashboardPage() {
  return (
    <PermissionGuard requiredPermission="superuser">
      <div className="container mx-auto p-6">
        <SystemDashboardClient />
      </div>
    </PermissionGuard>
  );
}
```

### 自定义布局示例

```tsx
import { SystemDashboardClient } from "@/app/dashboard/system/_components";

export default function CustomSystemDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto p-4">
          <h1 className="text-3xl font-bold">系统监控</h1>
        </div>
      </header>
      <main className="container mx-auto p-6">
        <SystemDashboardClient />
      </main>
    </div>
  );
}
```

## 更新日志

### v1.0.0 (2025-12-18)
- ✅ 初始实现
- ✅ 集成筛选器组件
- ✅ 集成健康状态徽章
- ✅ 实现筛选器状态管理
- ✅ 实现数据获取逻辑
- ✅ 实现响应式布局
- ✅ 实现国际化支持

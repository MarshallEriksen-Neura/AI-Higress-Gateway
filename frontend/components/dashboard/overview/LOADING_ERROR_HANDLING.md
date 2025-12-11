# 加载态和错误处理实现文档

## 概述

本文档描述了仪表盘概览页的加载态和错误处理实现，包括 Skeleton 占位符、错误提示和空数据提示组件。

## 验证需求

- **需求 7.4**: WHILE 页面加载数据时 THEN 系统 SHALL 显示 Skeleton 占位符，避免布局抖动

## 实现的组件

### 1. ErrorState 组件
**文件**: `frontend/components/dashboard/overview/error-state.tsx`

用于显示统一的错误提示，支持两种变体：

#### 卡片变体 (variant="card")
- 显示错误标题和消息
- 显示错误图标
- 提供重试按钮（可选）
- 使用 Card 组件包装

#### Alert 变体 (variant="alert")
- 使用 Alert 组件显示错误
- 更紧凑的设计
- 适合内联错误提示

**使用示例**:
```tsx
<ErrorState
  title="加载失败"
  message="无法加载数据，请稍后重试"
  onRetry={() => refresh()}
  retryLabel="重试"
  variant="card"
/>
```

### 2. LoadingState 组件
**文件**: `frontend/components/dashboard/overview/loading-state.tsx`

用于显示加载态占位符，支持多种变体：

#### 卡片变体 (variant="card")
- 显示卡片结构的 Skeleton
- 包含标题和内容占位符

#### 表格变体 (variant="table")
- 显示表格结构的 Skeleton
- 支持自定义行数和列数
- 包含表头和行占位符

#### 图表变体 (variant="chart")
- 显示图表结构的 Skeleton
- 包含图例和图表区域占位符

#### 网格变体 (variant="grid")
- 显示网格布局的 Skeleton
- 支持自定义列数

**使用示例**:
```tsx
<LoadingState
  variant="table"
  rows={5}
  columns={4}
  title="加载中"
/>
```

### 3. EmptyState 组件
**文件**: `frontend/components/dashboard/overview/empty-state.tsx`

用于显示空数据提示，提供友好的用户体验：

- 显示标题和消息
- 支持显示图标
- 支持操作按钮（可选）
- 居中布局

**使用示例**:
```tsx
<EmptyState
  title="暂无数据"
  message="当前没有可显示的数据"
  icon={<AlertCircle className="h-12 w-12" />}
  action={{
    label: "开始使用",
    onClick: () => navigate("/start"),
  }}
/>
```

## 现有卡片中的集成

所有概览页卡片都已集成加载态和错误处理：

### ConsumptionSummaryCard
- 加载状态：显示 Skeleton 占位符
- 错误状态：显示错误提示和重试按钮
- 无数据状态：返回 null（不显示卡片）

### ProviderRankingCard
- 加载状态：显示表格 Skeleton
- 错误状态：显示错误提示和重试按钮
- 无数据状态：显示"暂无数据"提示

### SuccessRateTrendCard
- 加载状态：显示图表 Skeleton
- 错误状态：显示错误提示和重试按钮
- 无数据状态：显示"暂无数据"提示

### ActiveModelsCard
- 加载状态：显示表格 Skeleton
- 错误状态：显示错误提示和重试按钮
- 无数据状态：显示"暂无数据"提示

### EventStreamCard
- 加载状态：显示列表 Skeleton
- 错误状态：显示错误提示和重试按钮
- 无数据状态：显示"暂无数据"提示

## 国际化支持

所有错误和加载态文案都通过 i18n 系统支持多语言：

**中文文案**:
- `consumption.error`: "消耗数据加载失败"
- `consumption.retry`: "重试"
- `consumption.loading`: "加载消耗数据中..."
- 等等

**英文文案**:
- `consumption.error`: "Failed to load consumption data"
- `consumption.retry`: "Retry"
- `consumption.loading`: "Loading consumption data..."
- 等等

## 测试覆盖

### 单元测试

#### ErrorState 测试 (`error-state.test.tsx`)
- 卡片变体渲染
- Alert 变体渲染
- 错误图标显示
- 重试按钮功能
- 自定义样式

#### LoadingState 测试 (`loading-state.test.tsx`)
- 卡片变体 Skeleton 显示
- 表格变体行列结构
- 图表变体图例和图表区域
- 网格变体列数
- 自定义样式

#### EmptyState 测试 (`empty-state.test.tsx`)
- 标题和消息显示
- 图标显示
- 操作按钮功能
- 自定义样式

### 集成测试 (`loading-error-integration.test.tsx`)
- 加载态处理
- 错误处理
- 空数据处理
- 状态转换
- 重试功能

## 最佳实践

### 1. 加载态设计
- 使用 Skeleton 占位符避免布局抖动
- 保持占位符的尺寸与实际内容一致
- 使用脉冲动画增强视觉反馈

### 2. 错误处理
- 显示用户友好的错误消息
- 提供重试功能
- 保留缓存数据（如有）以改善用户体验
- 记录错误日志用于调试

### 3. 空数据提示
- 显示清晰的"暂无数据"提示
- 提供操作建议（如调整时间范围）
- 使用图标增强视觉效果

### 4. 状态管理
- 优先级：加载 > 错误 > 无数据 > 成功
- 在有缓存数据时优先显示缓存数据
- 支持用户手动重试

## 性能考虑

- Skeleton 组件使用 CSS 动画，性能开销小
- 避免在加载时频繁重新渲染
- 使用 SWR 缓存策略减少 API 调用

## 可访问性

- 所有错误提示都包含 `role="alert"`
- 使用语义化 HTML 标签
- 提供足够的色彩对比度
- 支持键盘导航

## 导出

所有组件都通过 `frontend/components/dashboard/overview/index.ts` 导出，方便导入：

```tsx
import {
  ErrorState,
  LoadingState,
  EmptyState,
} from "@/components/dashboard/overview";
```

## 相关文件

- 设计文档: `.kiro/specs/dashboard-overview-refactor/design.md`
- 需求文档: `.kiro/specs/dashboard-overview-refactor/requirements.md`
- 任务列表: `.kiro/specs/dashboard-overview-refactor/tasks.md`
- i18n 文案: `frontend/lib/i18n/overview.ts`

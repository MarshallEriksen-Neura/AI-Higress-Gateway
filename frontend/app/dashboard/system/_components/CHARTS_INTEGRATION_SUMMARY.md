# 系统页核心趋势图集成总结

## 概述

任务 7 已成功完成，系统页容器组件现在包含完整的核心趋势图区域。

## 集成的图表

### 1. 请求 & 错误趋势图（RequestsErrorsChart）

**功能**：
- 显示近 24 小时的全局请求和错误趋势
- 使用折线图展示总请求数
- 使用堆叠柱状图展示四种错误类型

**数据源**：
- API：`/metrics/v2/system-dashboard/pulse`
- Hook：`useSystemDashboardPulse(pulseFilters)`
- 数据类型：`DashboardV2PulseDataPoint[]`

**特性**：
- 自动补零缺失的分钟数据
- 响应式设计
- 支持暗色模式
- 国际化支持

### 2. 延迟分位数趋势图（LatencyPercentilesChart）

**功能**：
- 显示近 24 小时的全局延迟分位数趋势
- 使用折线图展示 P50、P95、P99 三条曲线
- Y 轴显示毫秒（ms）单位

**数据源**：
- API：`/metrics/v2/system-dashboard/pulse`（与请求趋势图共享）
- Hook：`useSystemDashboardPulse(pulseFilters)`
- 数据类型：`DashboardV2PulseDataPoint[]`

**特性**：
- 自动补零缺失的分钟数据
- 响应式设计
- 支持暗色模式
- 国际化支持

## 布局结构

```tsx
<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* 左侧：请求 & 错误趋势图 */}
  <div>
    <RequestsErrorsChart />
  </div>
  
  {/* 右侧：延迟分位数趋势图 */}
  <div>
    <LatencyPercentilesChart />
  </div>
</section>
```

- **移动端**：单列布局，图表垂直堆叠
- **桌面端**：双列布局，图表并排显示
- **间距**：6 个单位（gap-6）

## 错误处理

每个图表都包含三种状态处理：

1. **错误态**：
   - 显示 ErrorState 组件
   - 提供错误信息和重试按钮
   - 用户可以点击重试重新加载数据

2. **空态**：
   - 显示 EmptyState 组件
   - 提示"暂无数据"

3. **加载态**：
   - 图表组件内部显示加载占位符
   - 避免布局抖动

## 筛选器支持

Pulse 数据受以下筛选器影响：

- **传输方式（transport）**：
  - all（全部）
  - http（HTTP）
  - sdk（SDK）
  - claude_cli（Claude CLI）

- **流式筛选（isStream）**：
  - all（全部）
  - true（流式）
  - false（非流式）

**注意**：Pulse 数据固定为近 24 小时，不受时间范围筛选器影响。

## 数据流

```
用户操作
  ↓
筛选器状态更新（transport, isStream）
  ↓
pulseFilters 对象更新（useMemo）
  ↓
useSystemDashboardPulse Hook 触发
  ↓
SWR 发起 API 请求
  ↓
GET /metrics/v2/system-dashboard/pulse?transport=xxx&is_stream=xxx
  ↓
后端返回 DashboardV2PulseResponse
  ↓
pulseResult.points 更新
  ↓
图表组件重新渲染
```

## 性能优化

1. **SWR 缓存**：
   - TTL：60 秒
   - 自动去重
   - 自动重试

2. **useMemo 优化**：
   - 筛选器参数使用 useMemo 缓存
   - 避免不必要的 API 请求

3. **组件复用**：
   - 图表组件从用户页复用
   - 减少代码重复

4. **数据补零**：
   - 在图表组件内部处理
   - 不影响 API 性能

## 验证清单

- ✅ 图表正确集成到系统页容器
- ✅ 使用系统页专用数据源
- ✅ 响应式布局正确实现
- ✅ 错误处理完整
- ✅ 空态处理完整
- ✅ 加载态处理完整
- ✅ 筛选器集成正确
- ✅ 无 TypeScript 类型错误
- ✅ 无 ESLint 错误
- ✅ 符合所有需求（2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.4）

## 下一步

任务 7 已完成，可以继续执行：
- 任务 8：实现系统页 Token 使用区域
- 任务 9：实现系统页模型排行榜区域
- 任务 10：实现系统页响应式布局

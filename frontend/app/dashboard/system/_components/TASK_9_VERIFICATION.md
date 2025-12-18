# 任务 9 验证文档 - 系统页模型排行榜区域

## 任务概述

**任务 9**: 实现系统页模型排行榜区域
- 在系统页容器中集成 Top Models 排行榜（复用 TopModelsTable）
- 确保表格使用系统页的数据源
- _需求: 5.1, 5.3, 5.4_

## 实现验证

### ✅ 1. TopModelsTable 组件复用

**位置**: `frontend/app/dashboard/overview/_components/tables/top-models-table.tsx`

**功能验证**:
- ✅ 组件已存在并正确实现
- ✅ 支持 `data`, `isLoading`, `error` 三个 props
- ✅ 按 `requests` 降序排序（验证需求 5.4）
- ✅ 显示模型名称、请求量、Token 总量（验证需求 5.3）
- ✅ 实现了加载态（Skeleton）
- ✅ 实现了错误态处理
- ✅ 实现了空数据占位符
- ✅ 使用国际化文案

**关键代码**:
```typescript
// 按 requests 降序排序
const sortedData = [...data].sort((a, b) => b.requests - a.requests)

// 表格显示三列
<TableHead>{t("dashboardV2.topModels.modelName")}</TableHead>
<TableHead className="text-right">{t("dashboardV2.topModels.requests")}</TableHead>
<TableHead className="text-right">{t("dashboardV2.topModels.totalTokens")}</TableHead>
```

### ✅ 2. 系统页数据源集成

**位置**: `frontend/app/dashboard/system/_components/system-dashboard-client.tsx`

**功能验证**:
- ✅ 使用 `useSystemDashboardTopModels` Hook 获取系统页数据
- ✅ 传递正确的筛选器参数（timeRange, transport, isStream）
- ✅ 限制返回 10 条数据
- ✅ 正确处理加载态、错误态、空态
- ✅ 提供重试功能

**关键代码**:
```typescript
// 获取系统页 Top Models 数据
const topModelsResult = useSystemDashboardTopModels(filters, 10);

// 在层级 4 中渲染
<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div>
    {topModelsResult.error ? (
      <ErrorState
        title={t("dashboard.errors.loadFailed")}
        message={topModelsResult.error.message}
        onRetry={topModelsResult.refresh}
      />
    ) : topModelsResult.items.length === 0 && !topModelsResult.loading ? (
      <EmptyState message={t("dashboard.errors.noData")} />
    ) : (
      <TopModelsTable
        data={topModelsResult.items}
        isLoading={topModelsResult.loading}
      />
    )}
  </div>
  {/* Provider 状态列表 */}
</section>
```

### ✅ 3. SWR Hook 验证

**位置**: `frontend/lib/swr/use-dashboard-v2.ts`

**功能验证**:
- ✅ `useSystemDashboardTopModels` Hook 已实现
- ✅ 调用正确的 API 端点：`/metrics/v2/system-dashboard/top-models`
- ✅ 传递正确的查询参数：`time_range`, `limit`, `transport`, `is_stream`
- ✅ 使用 `dashboardV2CacheConfig` 缓存策略（60s TTL）
- ✅ 返回 `items` 数组（空数组作为默认值）
- ✅ 提供 `refresh` 函数用于重试

**关键代码**:
```typescript
export const useSystemDashboardTopModels = (
  filters: DashboardV2FilterParams = {},
  limit: number = 10
) => {
  const params = useMemo(() => ({
    time_range: timeRange,
    limit: limit.toString(),
    transport,
    is_stream: isStream,
  }), [timeRange, limit, transport, isStream]);

  const { data, error, loading, validating, refresh } = useApiGet<DashboardV2TopModelsResponse>(
    '/metrics/v2/system-dashboard/top-models',
    { ...dashboardV2CacheConfig, params }
  );

  return {
    data,
    items: data?.items || [],
    error,
    loading,
    validating,
    refresh,
  };
};
```

### ✅ 4. 布局验证

**功能验证**:
- ✅ Top Models 表格位于层级 4（排行榜和 Provider 状态）
- ✅ 使用网格布局：`grid grid-cols-1 lg:grid-cols-2 gap-6`
- ✅ 在桌面端（≥1024px）与 Provider 状态列表并排显示
- ✅ 在移动端（<1024px）垂直堆叠显示
- ✅ 与 Provider 状态列表对齐

### ✅ 5. 需求验证

#### 需求 5.1 ✅
**WHEN 管理员访问系统页 THEN 系统 SHALL 显示"Top Models"列表**

验证：
- ✅ 系统页客户端组件中已集成 TopModelsTable
- ✅ 在层级 4 中正确渲染

#### 需求 5.3 ✅
**WHEN 列表显示时 THEN 系统 SHALL 展示每个模型的 `model` 名称、`requests` 请求量、`tokens_total` Token 总量**

验证：
- ✅ TopModelsTable 组件显示三列：模型名称、请求量、Token 总量
- ✅ 使用 `toLocaleString()` 格式化数字

#### 需求 5.4 ✅
**WHEN 列表显示时 THEN 系统 SHALL 按 `requests` 降序排列模型**

验证：
- ✅ TopModelsTable 组件中实现了排序逻辑
- ✅ 使用 `sort((a, b) => b.requests - a.requests)` 降序排序

### ✅ 6. 类型检查

**验证结果**:
- ✅ 无 TypeScript 类型错误
- ✅ 所有导入路径正确
- ✅ Props 类型匹配

## 测试建议

### 手动测试步骤

1. **基本功能测试**:
   ```bash
   # 启动开发服务器
   cd frontend
   npm run dev
   
   # 访问系统页
   # http://localhost:3000/dashboard/system
   ```

2. **验证点**:
   - [ ] Top Models 表格正确显示
   - [ ] 显示模型名称、请求量、Token 总量三列
   - [ ] 数据按请求量降序排列
   - [ ] 加载态显示 Skeleton
   - [ ] 错误态显示错误提示和重试按钮
   - [ ] 空数据显示"暂无数据"占位符
   - [ ] 响应式布局正确（桌面并排、移动堆叠）

3. **筛选器测试**:
   - [ ] 切换时间范围，Top Models 数据更新
   - [ ] 切换传输方式，Top Models 数据更新
   - [ ] 切换流式筛选器，Top Models 数据更新

4. **国际化测试**:
   - [ ] 中文界面显示正确
   - [ ] 英文界面显示正确

## 总结

✅ **任务 9 已完成**

所有功能点都已正确实现：
1. ✅ 复用了 TopModelsTable 组件
2. ✅ 使用系统页专用的数据源（useSystemDashboardTopModels）
3. ✅ 正确传递筛选器参数
4. ✅ 实现了完整的错误处理和空态处理
5. ✅ 满足所有需求（5.1, 5.3, 5.4）
6. ✅ 无类型错误

**下一步**: 可以继续实现任务 10（响应式布局）或进行手动测试验证。

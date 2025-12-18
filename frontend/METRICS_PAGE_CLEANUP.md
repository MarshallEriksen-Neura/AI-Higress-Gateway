# Metrics 页面清理总结

## 清理原因

旧的 `/dashboard/metrics` 页面已被新的 `/dashboard/system` 页面替代，因此需要清理相关代码和引用。

## 已删除的文件和目录

### 1. 页面文件
- ✅ `frontend/app/dashboard/metrics/` - 整个目录
  - `page.tsx` - metrics 主页面
  - `components/metrics-client.tsx` - metrics 客户端组件
  - `providers/page.tsx` - providers metrics 页面
  - `providers/components/providers-metrics-client.tsx` - providers metrics 客户端组件

### 2. 组件文件
- ✅ `frontend/components/dashboard/metrics/` - 整个目录
  - `metrics-cards.tsx` - metrics 卡片组件
  - `metrics-charts.tsx` - metrics 图表组件
  - `provider-performance.tsx` - provider 性能组件
  - `providers-metrics-table.tsx` - providers metrics 表格组件

## 已清理的引用

### 1. 用户概览页面的链接

#### A. `frontend/components/dashboard/overview/filter-bar.tsx`
**修改前**：
```tsx
<a href="/dashboard/metrics" ...>
  {t("overview.system_monitor_link")}
</a>
```

**修改后**：
- ✅ 删除了指向 `/dashboard/metrics` 的链接
- ✅ 删除了相关的 UI 元素

#### B. `frontend/components/dashboard/overview/active-providers.tsx`
**修改前**：
```tsx
<Link href="/dashboard/metrics/providers">
  <Button>{t("overview.view_all")}</Button>
</Link>
```

**修改后**：
- ✅ 删除了"查看全部"按钮
- ✅ 删除了不再使用的 `Link` 和 `Button` 导入

## 保留的引用（需要手动处理）

### 导航菜单配置

以下文件中的导航配置需要您手动更新：

1. **`frontend/components/sidebars/adaptive-sidebar.tsx` - 第 78 行**
   ```tsx
   {
     titleKey: "nav.metrics",
     href: "/dashboard/metrics",
     icon: Activity,
   }
   ```
   **建议**：改为指向 `/dashboard/system`

2. **`frontend/components/layout/mobile-sidebar.tsx` - 第 73 行**
   ```tsx
   {
     titleKey: "nav.metrics",
     href: "/dashboard/metrics",
     icon: Activity,
   }
   ```
   **建议**：改为指向 `/dashboard/system`

## 验证清单

- [x] 删除 `frontend/app/dashboard/metrics/` 目录
- [x] 删除 `frontend/components/dashboard/metrics/` 目录
- [x] 清理 `filter-bar.tsx` 中的 metrics 链接
- [x] 清理 `active-providers.tsx` 中的 metrics 链接
- [x] TypeScript 类型检查通过
- [ ] 更新导航菜单配置（待您处理）
- [ ] 测试用户概览页面正常显示
- [ ] 测试导航菜单正常工作

## 影响范围

### 用户影响
- ✅ 用户概览页面不再显示指向旧 metrics 页面的链接
- ⚠️ 导航菜单中的"监控指标"链接需要更新（待您处理）

### 管理员影响
- ✅ 管理员现在使用新的 `/dashboard/system` 页面查看全局监控数据
- ✅ 新页面提供了更完整的功能（KPI、趋势图、Provider 状态等）

## 后续步骤

1. **更新导航配置**（您会处理）：
   - 修改 `adaptive-sidebar.tsx`
   - 修改 `mobile-sidebar.tsx`
   - 将 `/dashboard/metrics` 改为 `/dashboard/system`

2. **测试验证**：
   - 访问用户概览页面，确认没有断链
   - 访问系统页面，确认功能正常
   - 测试导航菜单，确认链接正确

3. **清理国际化**（可选）：
   - 如果 `overview.system_monitor_link` 和 `overview.view_all` 不再使用，可以从国际化文件中删除

## 相关文档

- [系统页实现文档](./app/dashboard/system/TASK_14_COMPLETION.md)
- [Bug 修复报告](./app/dashboard/system/BUG_FIXES.md)
- [手动测试指南](./app/dashboard/system/MANUAL_TEST_GUIDE.md)

## 总结

✅ 旧的 metrics 页面及其组件已完全清理
✅ 用户概览页面的相关链接已删除
⚠️ 导航菜单配置需要您手动更新

清理工作已基本完成，剩余的导航配置更新交给您处理！

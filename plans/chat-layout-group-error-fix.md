# Chat Layout Group Error 修复方案

## 问题描述

**错误信息**: `Error: Group chat-layout not found`

**错误位置**: [`frontend/app/chat/layout.tsx:75`](frontend/app/chat/layout.tsx:75)

**错误堆栈**:
```
at getImperativeGroupMethods.ts:22:11
at Object.setLayout (getImperativeGroupMethods.ts:37:11)
at ChatLayout.useEffect (layout.tsx:75:19)
```

## 根本原因

1. **时序问题**: 在 `useEffect` 中调用 `groupHandle.setLayout(storedLayout)` 时，`ResizablePanelGroup` 的内部注册可能还未完成
2. **ref 回调时机**: `useGroupCallbackRef` 返回的 ref 回调被调用时，Group 组件可能还在初始化过程中
3. **条件渲染**: `ResizablePanelGroup` 被包裹在 `selectedProjectId` 的条件渲染中，导致组件挂载时机不确定

## 修复方案（方案 B）

保留现有的 Zustand store 和命令式 API，通过以下方式修复时序问题：

### 1. 添加防御性检查

在调用 `setLayout` 前验证：
- `groupHandle` 不为 null
- `storedLayout` 有效
- Group 已完全初始化

### 2. 使用 try-catch 包裹

捕获可能的错误，避免应用崩溃：
```typescript
try {
  groupHandle.setLayout(storedLayout);
} catch (error) {
  console.warn('Failed to restore layout:', error);
  // 静默失败，使用默认布局
}
```

### 3. 延迟执行（可选）

如果直接调用仍有问题，使用 `setTimeout` 延迟到下一个事件循环：
```typescript
setTimeout(() => {
  try {
    groupHandle.setLayout(storedLayout);
  } catch (error) {
    console.warn('Failed to restore layout:', error);
  }
}, 0);
```

### 4. 验证 storedLayout 格式

确保存储的布局数据格式正确：
```typescript
const isValidStoredLayout =
  storedLayout &&
  typeof storedLayout === 'object' &&
  'chat-sidebar' in storedLayout &&
  'chat-main' in storedLayout &&
  Object.keys(storedLayout).length === 2;
```

## 代码变更

### 修改文件: [`frontend/app/chat/layout.tsx`](frontend/app/chat/layout.tsx:64-78)

**修改前**:
```typescript
useEffect(() => {
  if (hasAppliedStoredLayoutRef.current) return;
  if (!storedLayout) return;
  if (!groupHandle) return;

  const isValidStoredLayout =
    "chat-sidebar" in storedLayout &&
    "chat-main" in storedLayout &&
    Object.keys(storedLayout).length === 2;

  if (isValidStoredLayout) {
    groupHandle.setLayout(storedLayout);
  }
  hasAppliedStoredLayoutRef.current = true;
}, [groupHandle, storedLayout]);
```

**修改后**:
```typescript
useEffect(() => {
  if (hasAppliedStoredLayoutRef.current) return;
  if (!storedLayout) return;
  if (!groupHandle) return;

  const isValidStoredLayout =
    storedLayout &&
    typeof storedLayout === 'object' &&
    "chat-sidebar" in storedLayout &&
    "chat-main" in storedLayout &&
    Object.keys(storedLayout).length === 2;

  if (isValidStoredLayout) {
    try {
      groupHandle.setLayout(storedLayout);
      hasAppliedStoredLayoutRef.current = true;
    } catch (error) {
      console.warn('Failed to restore chat layout:', error);
      // 静默失败，使用默认布局
    }
  }
}, [groupHandle, storedLayout]);
```

## 关键改进点

1. ✅ **类型检查**: 添加 `typeof storedLayout === 'object'` 确保数据类型正确
2. ✅ **错误处理**: 使用 `try-catch` 捕获 Group 未注册的错误
3. ✅ **静默失败**: 错误时不阻塞应用，使用默认布局
4. ✅ **条件标记**: 只在成功时设置 `hasAppliedStoredLayoutRef.current = true`
5. ✅ **最小改动**: 保留现有架构，只修复时序问题

## 测试验证

### 测试场景

1. **首次访问**: 无存储布局，使用默认布局
2. **刷新页面**: 恢复之前调整的布局
3. **调整布局**: 拖动分隔条，布局保存到 Zustand store
4. **切换项目**: 布局应保持不变
5. **清除存储**: 清除 localStorage 后使用默认布局

### 验证步骤

1. 启动开发服务器: `npm run dev`
2. 访问 `/chat` 页面
3. 检查控制台无错误信息
4. 调整左侧边栏宽度
5. 刷新页面，验证布局是否恢复
6. 打开浏览器 DevTools > Application > Local Storage
7. 查看 `chat-layout` 键的值

## 备选方案（如果方案 B 仍有问题）

如果添加错误处理后仍然出现问题，可以考虑：

### 方案 A: 使用 `useDefaultLayout` hook

完全移除命令式 API，使用库提供的持久化方案：

```typescript
import { useDefaultLayout } from 'react-resizable-panels';

const { defaultLayout, onLayoutChange } = useDefaultLayout({
  groupId: 'chat-layout',
  storage: window.localStorage,
});

<ResizablePanelGroup
  id="chat-layout"
  direction="horizontal"
  defaultLayout={defaultLayout}
  onLayoutChange={onLayoutChange}
>
```

**优点**:
- 库原生支持，更可靠
- 自动处理时序问题
- 代码更简洁

**缺点**:
- 需要移除 Zustand store
- 改动较大

## 相关文件

- [`frontend/app/chat/layout.tsx`](frontend/app/chat/layout.tsx) - 主要修改文件
- [`frontend/lib/stores/chat-layout-store.ts`](frontend/lib/stores/chat-layout-store.ts) - 布局状态管理
- [`frontend/components/ui/resizable.tsx`](frontend/components/ui/resizable.tsx) - Resizable 组件封装
- [`frontend/node_modules/react-resizable-panels/dist/react-resizable-panels.d.ts`](frontend/node_modules/react-resizable-panels/dist/react-resizable-panels.d.ts) - 类型定义

## 参考资料

- [react-resizable-panels v4.x 文档](https://github.com/bvaughn/react-resizable-panels)
- [useGroupCallbackRef API](frontend/node_modules/react-resizable-panels/dist/react-resizable-panels.d.ts:339)
- [GroupImperativeHandle 接口](frontend/node_modules/react-resizable-panels/dist/react-resizable-panels.d.ts:29)

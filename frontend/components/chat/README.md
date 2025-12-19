# Chat Assistant Components

聊天助手系统的 UI 组件库。

## 组件列表

### AssistantCard

助手卡片组件，用于显示单个助手的信息。

**功能：**
- 显示助手名称和默认模型
- 提供编辑、归档、删除操作按钮
- 支持选中状态高亮
- 二次确认对话框（归档和删除）

**Props：**
```typescript
interface AssistantCardProps {
  assistant: Assistant;
  isSelected?: boolean;
  onSelect?: (assistantId: string) => void;
  onEdit?: (assistant: Assistant) => void;
  onArchive?: (assistantId: string) => void;
  onDelete?: (assistantId: string) => void;
}
```

**使用示例：**
```tsx
<AssistantCard
  assistant={assistant}
  isSelected={selectedId === assistant.assistant_id}
  onSelect={handleSelect}
  onEdit={handleEdit}
  onArchive={handleArchive}
  onDelete={handleDelete}
/>
```

### AssistantList

助手列表组件，用于显示和管理多个助手。

**功能：**
- 显示助手列表
- 支持选中助手
- 提供"新建助手"按钮
- 支持分页加载
- 空状态和加载状态处理

**Props：**
```typescript
interface AssistantListProps {
  assistants: Assistant[];
  isLoading?: boolean;
  selectedAssistantId?: string;
  onSelectAssistant?: (assistantId: string) => void;
  onCreateAssistant?: () => void;
  onEditAssistant?: (assistant: Assistant) => void;
  onArchiveAssistant?: (assistantId: string) => void;
  onDeleteAssistant?: (assistantId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}
```

**使用示例：**
```tsx
<AssistantList
  assistants={assistants}
  isLoading={isLoading}
  selectedAssistantId={selectedId}
  onSelectAssistant={handleSelect}
  onCreateAssistant={handleCreate}
  onEditAssistant={handleEdit}
  onArchiveAssistant={handleArchive}
  onDeleteAssistant={handleDelete}
  onLoadMore={handleLoadMore}
  hasMore={hasMore}
/>
```

### AssistantForm

助手创建/编辑表单组件。

**功能：**
- 创建新助手
- 编辑现有助手
- 使用 React Hook Form + Zod 验证
- 支持助手名称、系统提示词、默认模型配置

**Props：**
```typescript
interface AssistantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAssistant?: Assistant | null;
  projectId: string;
  onSubmit: (data: CreateAssistantRequest | UpdateAssistantRequest) => Promise<void>;
  isSubmitting?: boolean;
  availableModels?: string[];
}
```

**使用示例：**
```tsx
<AssistantForm
  open={isFormOpen}
  onOpenChange={setIsFormOpen}
  editingAssistant={editingAssistant}
  projectId={projectId}
  onSubmit={handleSubmit}
  isSubmitting={isSubmitting}
  availableModels={["auto", "gpt-4", "claude-3-opus"]}
/>
```

## 依赖

这些组件依赖以下模块：

- `@/components/ui/*` - shadcn/ui 组件库
- `@/lib/api-types` - API 类型定义
- `@/lib/i18n-context` - 国际化支持
- `react-hook-form` - 表单管理
- `zod` - 表单验证
- `lucide-react` - 图标库

## 国际化

所有用户可见的文案都通过 `useI18n()` hook 获取，文案定义在 `frontend/lib/i18n/chat.ts` 中。

## 样式

组件遵循项目的极简墨水风格设计，使用 Tailwind CSS 和 shadcn/ui 组件库。

## Requirements

这些组件实现了以下需求：

- **Requirements 1.1**: 创建助手（名称、系统提示词、默认模型）
- **Requirements 1.2**: 编辑助手
- **Requirements 1.3**: 归档助手
- **Requirements 1.4**: 删除助手（带二次确认）
- **Requirements 1.5**: 显示助手列表，支持分页
- **Requirements 1.6**: 查看助手详情

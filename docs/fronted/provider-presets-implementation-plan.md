# 提供商预设管理页面实现计划

## 实施概览

本文档提供提供商预设管理页面的详细实现步骤和代码结构指南。

## 实施步骤

### 步骤 1: 创建 API 客户端 (frontend/http/provider-preset.ts)

**目标**: 封装所有与提供商预设相关的 API 调用

**接口定义**:
```typescript
// 提供商预设接口
export interface ProviderPreset {
  id: string;
  preset_id: string;
  display_name: string;
  description: string | null;
  provider_type: 'native' | 'aggregator';
  transport: 'http' | 'sdk';
  base_url: string;
  models_path: string;
  messages_path: string | null;
  chat_completions_path: string;
  responses_path: string | null;
  supported_api_styles: ('openai' | 'responses' | 'claude')[] | null;
  retryable_status_codes: number[] | null;
  custom_headers: Record<string, string> | null;
  static_models: any[] | null;
  created_at: string;
  updated_at: string;
}

// 创建请求
export interface CreateProviderPresetRequest {
  preset_id: string;
  display_name: string;
  description?: string;
  provider_type?: 'native' | 'aggregator';
  transport?: 'http' | 'sdk';
  base_url: string;
  models_path?: string;
  messages_path?: string;
  chat_completions_path?: string;
  responses_path?: string;
  supported_api_styles?: ('openai' | 'responses' | 'claude')[];
  retryable_status_codes?: number[];
  custom_headers?: Record<string, string>;
  static_models?: any[];
}

// 更新请求
export interface UpdateProviderPresetRequest {
  display_name?: string;
  description?: string;
  provider_type?: 'native' | 'aggregator';
  transport?: 'http' | 'sdk';
  base_url?: string;
  models_path?: string;
  messages_path?: string;
  chat_completions_path?: string;
  responses_path?: string;
  supported_api_styles?: ('openai' | 'responses' | 'claude')[];
  retryable_status_codes?: number[];
  custom_headers?: Record<string, string>;
  static_models?: any[];
}

// 列表响应
export interface ProviderPresetListResponse {
  items: ProviderPreset[];
  total: number;
}
```

**服务方法**:
```typescript
export const providerPresetService = {
  // 获取预设列表（所有用户可访问）
  getProviderPresets: async (): Promise<ProviderPresetListResponse> => {
    const response = await httpClient.get('/provider-presets');
    return response.data;
  },

  // 创建预设（仅管理员）
  createProviderPreset: async (
    data: CreateProviderPresetRequest
  ): Promise<ProviderPreset> => {
    const response = await httpClient.post('/admin/provider-presets', data);
    return response.data;
  },

  // 更新预设（仅管理员）
  updateProviderPreset: async (
    presetId: string,
    data: UpdateProviderPresetRequest
  ): Promise<ProviderPreset> => {
    const response = await httpClient.put(
      `/admin/provider-presets/${presetId}`,
      data
    );
    return response.data;
  },

  // 删除预设（仅管理员）
  deleteProviderPreset: async (presetId: string): Promise<void> => {
    await httpClient.delete(`/admin/provider-presets/${presetId}`);
  },
};
```

### 步骤 2: 创建表格组件 (frontend/components/dashboard/provider-presets/provider-preset-table.tsx)

**功能**: 展示提供商预设列表

**Props 接口**:
```typescript
interface ProviderPresetTableProps {
  presets: ProviderPreset[];
  isLoading: boolean;
  onEdit: (preset: ProviderPreset) => void;
  onDelete: (presetId: string) => void;
}
```

**表格列**:
1. 预设ID (preset_id)
2. 显示名称 (display_name)
3. 基础URL (base_url) - 截断显示，悬停显示完整
4. 提供商类型 (provider_type) - Badge组件
5. 传输方式 (transport) - Badge组件
6. 创建时间 (created_at) - 相对时间格式
7. 操作 - 编辑和删除按钮

**关键特性**:
- 加载状态显示骨架屏
- 空状态友好提示
- 响应式设计（移动端转卡片）
- 悬停效果

### 步骤 3: 创建表单组件 (frontend/components/dashboard/provider-presets/provider-preset-form.tsx)

**功能**: 创建和编辑提供商预设

**Props 接口**:
```typescript
interface ProviderPresetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: ProviderPreset; // 编辑时传入
  onSuccess: () => void;
}
```

**表单结构**:

使用 Tabs 组件分为两个标签页：

**基础配置标签**:
- 预设ID (Input) - 创建时可编辑，编辑时只读
- 显示名称 (Input) - 必填
- 描述 (Textarea) - 可选
- 基础URL (Input) - 必填，URL验证
- 提供商类型 (Select) - native/aggregator
- 传输方式 (Select) - http/sdk

**高级配置标签**:
- 模型路径 (Input) - 默认 /v1/models
- 消息路径 (Input) - 可选
- 聊天完成路径 (Input) - 默认 /v1/chat/completions
- 响应路径 (Input) - 可选
- 支持的API风格 (多选 Checkbox) - openai/responses/claude
- 可重试状态码 (Input) - 逗号分隔的数字
- 自定义请求头 (Textarea) - JSON格式
- 静态模型列表 (Textarea) - JSON格式

**表单验证**:
- 客户端实时验证
- 提交前完整验证
- 错误信息显示在字段下方

**提交流程**:
1. 验证表单
2. 调用API（创建或更新）
3. 成功：关闭对话框，触发onSuccess回调
4. 失败：显示错误Toast

### 步骤 4: 创建主页面 (frontend/app/dashboard/provider-presets/page.tsx)

**功能**: 整合所有组件，管理状态

**状态管理**:
```typescript
const [formOpen, setFormOpen] = useState(false);
const [editingPreset, setEditingPreset] = useState<ProviderPreset | undefined>();
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
```

**SWR 数据获取**:
```typescript
const { data, error, isLoading, mutate } = useSWR(
  '/provider-presets',
  providerPresetService.getProviderPresets,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  }
);
```

**事件处理器**:
```typescript
// 打开创建表单
const handleCreate = () => {
  setEditingPreset(undefined);
  setFormOpen(true);
};

// 打开编辑表单
const handleEdit = (preset: ProviderPreset) => {
  setEditingPreset(preset);
  setFormOpen(true);
};

// 打开删除确认
const handleDeleteClick = (presetId: string) => {
  setDeletingPresetId(presetId);
  setDeleteConfirmOpen(true);
};

// 确认删除
const handleDeleteConfirm = async () => {
  if (!deletingPresetId) return;
  
  try {
    await providerPresetService.deleteProviderPreset(deletingPresetId);
    toast.success('预设删除成功');
    mutate(); // 刷新列表
  } catch (error) {
    toast.error('删除失败：' + error.message);
  } finally {
    setDeleteConfirmOpen(false);
    setDeletingPresetId(null);
  }
};

// 表单提交成功
const handleFormSuccess = () => {
  mutate(); // 刷新列表
  toast.success(editingPreset ? '预设更新成功' : '预设创建成功');
};
```

**页面布局**:
```tsx
<div className="space-y-6 max-w-7xl">
  {/* 页面标题和创建按钮 */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold mb-2">提供商预设管理</h1>
      <p className="text-muted-foreground">
        管理官方提供商预设配置
      </p>
    </div>
    <Button onClick={handleCreate}>
      <Plus className="w-4 h-4 mr-2" />
      创建预设
    </Button>
  </div>

  {/* 预设列表表格 */}
  <ProviderPresetTable
    presets={data?.items || []}
    isLoading={isLoading}
    onEdit={handleEdit}
    onDelete={handleDeleteClick}
  />

  {/* 创建/编辑表单对话框 */}
  <ProviderPresetForm
    open={formOpen}
    onOpenChange={setFormOpen}
    preset={editingPreset}
    onSuccess={handleFormSuccess}
  />

  {/* 删除确认对话框 */}
  <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除</AlertDialogTitle>
        <AlertDialogDescription>
          确定要删除此预设吗？此操作不可撤销。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction onClick={handleDeleteConfirm}>
          删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</div>
```

### 步骤 5: 更新导航 (frontend/components/layout/sidebar-nav.tsx)

**添加预设管理入口**:

在 Dashboard 部分添加新的导航项：

```typescript
{
  title: "提供商预设",
  href: "/dashboard/provider-presets",
  icon: Settings, // 或其他合适的图标
  badge: "管理员",
}
```

### 步骤 6: 添加必要的 shadcn/ui 组件

确保已安装以下组件（如未安装需要添加）：

```bash
# 在 frontend 目录下执行
bunx shadcn@latest add button
bunx shadcn@latest add dialog
bunx shadcn@latest add input
bunx shadcn@latest add label
bunx shadcn@latest add select
bunx shadcn@latest add textarea
bunx shadcn@latest add tabs
bunx shadcn@latest add badge
bunx shadcn@latest add alert-dialog
bunx shadcn@latest add checkbox
```

## 实现顺序建议

1. **第一阶段**: API客户端和类型定义
   - 创建 provider-preset.ts
   - 定义所有接口类型
   - 实现服务方法

2. **第二阶段**: 基础UI组件
   - 创建表格组件（简化版，只显示基本信息）
   - 创建主页面骨架
   - 集成SWR数据获取

3. **第三阶段**: 表单功能
   - 创建基础配置表单
   - 实现创建功能
   - 实现编辑功能

4. **第四阶段**: 高级功能
   - 添加高级配置标签页
   - 实现删除功能
   - 添加表单验证

5. **第五阶段**: 优化和完善
   - 添加加载状态
   - 添加错误处理
   - 优化用户体验
   - 更新导航

## 关键技术点

### 1. SWR 配置

```typescript
import useSWR from 'swr';

const { data, error, isLoading, mutate } = useSWR(
  '/provider-presets',
  providerPresetService.getProviderPresets,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  }
);
```

### 2. 表单状态管理

使用受控组件模式：

```typescript
const [formData, setFormData] = useState<CreateProviderPresetRequest>({
  preset_id: '',
  display_name: '',
  base_url: '',
  provider_type: 'native',
  transport: 'http',
  models_path: '/v1/models',
  chat_completions_path: '/v1/chat/completions',
});

const handleChange = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

### 3. JSON 字段处理

对于 custom_headers 和 static_models：

```typescript
const [customHeadersText, setCustomHeadersText] = useState('{}');
const [customHeadersError, setCustomHeadersError] = useState('');

const validateJSON = (text: string) => {
  try {
    JSON.parse(text);
    setCustomHeadersError('');
    return true;
  } catch (e) {
    setCustomHeadersError('无效的JSON格式');
    return false;
  }
};
```

### 4. 错误处理

```typescript
try {
  await providerPresetService.createProviderPreset(formData);
  toast.success('创建成功');
  onSuccess();
} catch (error: any) {
  if (error.response?.status === 400) {
    toast.error(error.response.data.detail || '请求参数错误');
  } else if (error.response?.status === 403) {
    toast.error('您没有权限执行此操作');
  } else {
    toast.error('操作失败，请稍后重试');
  }
}
```

## 测试检查清单

- [ ] 列表正确显示所有预设
- [ ] 创建预设功能正常
- [ ] 编辑预设功能正常
- [ ] 删除预设功能正常（含确认）
- [ ] 表单验证正确工作
- [ ] 错误提示清晰明确
- [ ] 加载状态正确显示
- [ ] 空状态友好展示
- [ ] 响应式布局正常
- [ ] 导航链接正确
- [ ] 权限控制有效（非管理员无法访问）

## 注意事项

1. **权限控制**: 确保只有管理员可以访问此页面
2. **数据验证**: 客户端和服务端都要验证
3. **错误处理**: 提供清晰的错误信息
4. **用户体验**: 操作反馈及时，加载状态明确
5. **代码复用**: 尽量复用现有组件和工具函数
6. **类型安全**: 充分利用TypeScript类型系统
7. **性能优化**: 使用SWR缓存，避免不必要的重新渲染

## 后续优化方向

1. 添加搜索和过滤功能
2. 支持批量操作
3. 添加预设使用统计
4. 支持预设导入导出
5. 添加预设模板库
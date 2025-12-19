# 聊天助手系统错误处理指南

本文档说明如何在聊天助手系统中使用错误处理和国际化功能。

## 概述

聊天助手系统的错误处理基于项目的统一错误处理框架，提供了：

1. **标准化错误对象** - 统一的错误数据结构
2. **错误分类和严重程度** - 便于不同处理策略
3. **国际化支持** - 中英文错误消息
4. **操作建议** - 为用户提供下一步操作指引
5. **类型安全** - TypeScript 类型定义

## 快速开始

### 1. 导入错误处理工具

```typescript
import { ChatErrorHandler, CHAT_ERROR_CODES } from '@/lib/errors';
import { useI18n } from '@/lib/i18n-context';
```

### 2. 在组件中处理错误

```typescript
function MyComponent() {
  const { t } = useI18n();
  
  const handleError = (error: unknown) => {
    // 标准化错误
    const standardError = ErrorHandler.normalize(error);
    
    // 获取用户友好的错误消息
    const message = ErrorHandler.getUserMessage(standardError, t);
    
    // 获取操作建议
    const action = ChatErrorHandler.getActionSuggestion(standardError, t);
    
    // 显示错误提示
    toast.error(message, { description: action });
  };
  
  return <div>...</div>;
}
```

### 3. 在 API 调用中使用

```typescript
async function sendMessage(conversationId: string, content: string) {
  try {
    const response = await messageService.sendMessage(conversationId, { content });
    return response;
  } catch (error) {
    const standardError = ErrorHandler.normalize(error);
    
    // 判断是否可以重试
    if (ErrorHandler.isRetryable(standardError)) {
      // 显示重试按钮
    }
    
    throw standardError;
  }
}
```

## 错误码列表

### 助手相关错误

| 错误码 | 说明 | 可重试 | 需要操作 |
|--------|------|--------|----------|
| `assistant_not_found` | 助手不存在或已被删除 | ❌ | ❌ |
| `assistant_archived` | 助手已归档 | ❌ | ❌ |

### 会话相关错误

| 错误码 | 说明 | 可重试 | 需要操作 |
|--------|------|--------|----------|
| `conversation_not_found` | 会话不存在或已被删除 | ❌ | ❌ |
| `conversation_archived` | 会话已归档，无法继续对话 | ❌ | ❌ |

### 消息相关错误

| 错误码 | 说明 | 可重试 | 需要操作 |
|--------|------|--------|----------|
| `message_send_failed` | 消息发送失败 | ✅ | ✅ |
| `run_execution_failed` | 模型执行失败 | ✅ | ✅ |

### 评测相关错误

| 错误码 | 说明 | 可重试 | 需要操作 |
|--------|------|--------|----------|
| `eval_not_enabled` | 该项目未启用推荐评测 | ❌ | ✅ |
| `eval_cooldown` | 评测触发过于频繁 | ✅ | ❌ |
| `eval_not_found` | 评测不存在 | ❌ | ❌ |
| `invalid_reason_tags` | 原因标签无效 | ❌ | ✅ |

### 配置相关错误

| 错误码 | 说明 | 可重试 | 需要操作 |
|--------|------|--------|----------|
| `invalid_config` | 配置参数无效 | ❌ | ✅ |
| `empty_candidate_models` | 候选模型池不能为空 | ❌ | ✅ |
| `invalid_max_challengers` | 最大挑战者数超出合理范围 | ❌ | ✅ |
| `project_ai_config_incomplete` | Project AI 配置不完整 | ❌ | ✅ |

## 错误处理工具类

### ChatErrorHandler

扩展了通用的 `ErrorHandler`，提供聊天模块特定的错误处理方法。

#### 错误类型判断

```typescript
// 判断是否为助手相关错误
ChatErrorHandler.isAssistantError(error);

// 判断是否为会话相关错误
ChatErrorHandler.isConversationError(error);

// 判断是否为消息相关错误
ChatErrorHandler.isMessageError(error);

// 判断是否为评测相关错误
ChatErrorHandler.isEvalError(error);

// 判断是否为配置相关错误
ChatErrorHandler.isConfigError(error);

// 判断是否为归档资源错误
ChatErrorHandler.isArchivedError(error);

// 判断是否为资源不存在错误
ChatErrorHandler.isNotFoundError(error);
```

#### 获取操作建议

```typescript
const action = ChatErrorHandler.getActionSuggestion(error, t);
// 返回: "返回上一页" | "选择其他资源" | "重试" | ...
```

#### 获取冷却时间

```typescript
const cooldownSeconds = ChatErrorHandler.getCooldownSeconds(error);
// 返回: number | undefined
```

## 国际化文案

所有错误消息都支持中英文国际化，使用 `useI18n` hook 获取翻译函数：

```typescript
const { t } = useI18n();

// 错误消息
t('chat.errors.assistant_not_found'); // "助手不存在或已被删除" (中文)
t('chat.errors.assistant_not_found'); // "Assistant not found or has been deleted" (英文)

// 操作建议
t('chat.errors.action_go_back'); // "返回上一页" (中文)
t('chat.errors.action_retry'); // "重试" (中文)
```

### 文案 Key 命名规范

- 错误消息: `chat.errors.{error_code}`
- 操作建议: `chat.errors.action_{action_type}`
- 组件文案: `chat.{module}.{key}`

## 最佳实践

### 1. 始终标准化错误

```typescript
// ✅ 正确
const standardError = ErrorHandler.normalize(error);

// ❌ 错误 - 直接使用原始错误
console.error(error);
```

### 2. 使用国际化消息

```typescript
// ✅ 正确
const message = ErrorHandler.getUserMessage(standardError, t);

// ❌ 错误 - 硬编码消息
const message = "助手不存在";
```

### 3. 提供操作建议

```typescript
// ✅ 正确
const action = ChatErrorHandler.getActionSuggestion(standardError, t);
toast.error(message, { description: action });

// ❌ 错误 - 只显示错误消息
toast.error(message);
```

### 4. 根据错误类型采取行动

```typescript
// ✅ 正确
if (ChatErrorHandler.isArchivedError(standardError)) {
  // 禁用编辑功能
  setEditDisabled(true);
} else if (ChatErrorHandler.isNotFoundError(standardError)) {
  // 返回上一页
  router.back();
}

// ❌ 错误 - 所有错误统一处理
toast.error(message);
```

### 5. 处理可重试错误

```typescript
// ✅ 正确
if (ErrorHandler.isRetryable(standardError)) {
  // 显示重试按钮
  setShowRetry(true);
}

// ❌ 错误 - 不判断是否可重试
setShowRetry(true);
```

## 示例场景

### 场景 1: 发送消息失败

```typescript
const handleSendMessage = async (content: string) => {
  try {
    await messageService.sendMessage(conversationId, { content });
    toast.success(t('chat.message.sent'));
  } catch (error) {
    const standardError = ErrorHandler.normalize(error);
    const message = ErrorHandler.getUserMessage(standardError, t);
    
    if (standardError.error === CHAT_ERROR_CODES.CONVERSATION_ARCHIVED) {
      // 会话已归档，禁用输入框
      setInputDisabled(true);
      toast.error(message);
    } else if (ErrorHandler.isRetryable(standardError)) {
      // 可重试错误，显示重试按钮
      toast.error(message, {
        action: {
          label: t('chat.action.retry'),
          onClick: () => handleSendMessage(content),
        },
      });
    } else {
      // 其他错误
      toast.error(message);
    }
  }
};
```

### 场景 2: 触发评测失败

```typescript
const handleTriggerEval = async (baselineRunId: string) => {
  try {
    await evalService.createEval({
      project_id: projectId,
      assistant_id: assistantId,
      conversation_id: conversationId,
      message_id: messageId,
      baseline_run_id: baselineRunId,
    });
    toast.success(t('chat.eval.trigger_success'));
  } catch (error) {
    const standardError = ErrorHandler.normalize(error);
    const message = ErrorHandler.getUserMessage(standardError, t);
    const action = ChatErrorHandler.getActionSuggestion(standardError, t);
    
    if (standardError.error === CHAT_ERROR_CODES.EVAL_COOLDOWN) {
      // 冷却中，显示倒计时
      const cooldownSeconds = ChatErrorHandler.getCooldownSeconds(standardError);
      toast.error(message, {
        description: `${action} (${cooldownSeconds}s)`,
      });
    } else if (standardError.error === CHAT_ERROR_CODES.EVAL_NOT_ENABLED) {
      // 未启用评测，提示联系管理员
      toast.error(message, { description: action });
    } else {
      toast.error(message);
    }
  }
};
```

### 场景 3: 加载资源失败

```typescript
const { data: assistant, error } = useAssistant(assistantId);

useEffect(() => {
  if (error) {
    const standardError = ErrorHandler.normalize(error);
    
    if (ChatErrorHandler.isNotFoundError(standardError)) {
      // 资源不存在，返回列表页
      router.push('/chat');
      toast.error(t('chat.errors.assistant_not_found'));
    } else if (ChatErrorHandler.isArchivedError(standardError)) {
      // 资源已归档，显示提示但允许查看
      toast.warning(t('chat.errors.assistant_archived'));
    }
  }
}, [error]);
```

## 相关文件

- `frontend/lib/errors/chat-errors.ts` - 聊天错误处理工具
- `frontend/lib/errors/error-map.ts` - 错误码映射配置
- `frontend/lib/errors/error-handler.ts` - 通用错误处理器
- `frontend/lib/i18n/chat.ts` - 聊天模块国际化文案
- `frontend/lib/errors/chat-errors.example.ts` - 使用示例

## 扩展

如果需要添加新的错误类型：

1. 在 `CHAT_ERROR_CODES` 中添加新的错误码常量
2. 在 `error-map.ts` 中添加错误映射配置
3. 在 `chat.ts` 中添加对应的国际化文案
4. 在 `ChatErrorHandler` 中添加相应的判断方法（如需要）
5. 更新本文档的错误码列表

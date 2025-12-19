# 聊天助手系统 - 基础设施文档

本文档描述了聊天助手系统的基础设施实现，包括类型定义、HTTP 客户端服务和 SWR hooks。

## 文件结构

```
frontend/
├── lib/
│   ├── api-types.ts                    # 新增聊天助手系统类型定义
│   ├── stores/
│   │   └── chat-store.ts               # 聊天状态管理 (Zustand)
│   └── swr/
│       ├── use-assistants.ts           # 助手管理 hooks
│       ├── use-conversations.ts        # 会话管理 hooks
│       ├── use-messages.ts             # 消息和 Run hooks
│       ├── use-evals.ts                # 评测 hooks
│       ├── use-eval-config.ts          # 评测配置 hooks
│       └── __tests__/
│           └── chat-types.test.ts      # 类型定义测试
└── http/
    ├── assistant.ts                    # 助手服务
    ├── conversation.ts                 # 会话服务
    ├── message.ts                      # 消息服务
    ├── eval.ts                         # 评测服务
    └── eval-config.ts                  # 评测配置服务
```

## 类型定义

所有类型定义已添加到 `frontend/lib/api-types.ts`，包括：

### 助手相关
- `Assistant` - 助手实体
- `CreateAssistantRequest` - 创建助手请求
- `UpdateAssistantRequest` - 更新助手请求
- `GetAssistantsParams` - 获取助手列表参数
- `AssistantsResponse` - 助手列表响应

### 会话相关
- `Conversation` - 会话实体
- `CreateConversationRequest` - 创建会话请求
- `UpdateConversationRequest` - 更新会话请求
- `GetConversationsParams` - 获取会话列表参数
- `ConversationsResponse` - 会话列表响应

### 消息相关
- `Message` - 消息实体
- `RunSummary` - Run 摘要（用于列表）
- `RunDetail` - Run 详情（惰性加载）
- `SendMessageRequest` - 发送消息请求
- `SendMessageResponse` - 发送消息响应
- `GetMessagesParams` - 获取消息列表参数
- `MessagesResponse` - 消息列表响应

### 评测相关
- `ChallengerRun` - Challenger 运行记录
- `EvalExplanation` - 评测解释
- `EvalResponse` - 评测响应
- `CreateEvalRequest` - 创建评测请求
- `ReasonTag` - 评分原因标签
- `SubmitRatingRequest` - 提交评分请求
- `RatingResponse` - 评分响应

### 评测配置相关
- `EvalConfig` - 评测配置实体
- `UpdateEvalConfigRequest` - 更新评测配置请求
- `ProviderScope` - Provider 范围类型

## HTTP 客户端服务

所有服务都使用统一的 `httpClient` 实例，自动处理认证、错误和 token 刷新。

### assistantService
```typescript
import { assistantService } from '@/http';

// 获取助手列表
const response = await assistantService.getAssistants({ project_id, cursor, limit });

// 创建助手
const assistant = await assistantService.createAssistant({ project_id, name, ... });

// 获取助手详情
const assistant = await assistantService.getAssistant(assistantId);

// 更新助手
const assistant = await assistantService.updateAssistant(assistantId, { name, ... });

// 删除助手
await assistantService.deleteAssistant(assistantId);
```

### conversationService
```typescript
import { conversationService } from '@/http';

// 获取会话列表
const response = await conversationService.getConversations({ assistant_id, cursor, limit });

// 创建会话
const conversation = await conversationService.createConversation({ assistant_id, project_id, ... });

// 更新会话
const conversation = await conversationService.updateConversation(conversationId, { title, ... });

// 删除会话
await conversationService.deleteConversation(conversationId);
```

### messageService
```typescript
import { messageService } from '@/http';

// 获取消息列表
const response = await messageService.getMessages(conversationId, { cursor, limit });

// 发送消息
const response = await messageService.sendMessage(conversationId, { content });

// 获取 Run 详情
const run = await messageService.getRun(runId);
```

### evalService
```typescript
import { evalService } from '@/http';

// 创建评测
const eval = await evalService.createEval({ project_id, assistant_id, ... });

// 获取评测状态
const eval = await evalService.getEval(evalId);

// 提交评分
const rating = await evalService.submitRating(evalId, { winner_run_id, reason_tags });
```

### evalConfigService
```typescript
import { evalConfigService } from '@/http';

// 获取评测配置
const config = await evalConfigService.getEvalConfig(projectId);

// 更新评测配置
const config = await evalConfigService.updateEvalConfig(projectId, { enabled, ... });
```

## SWR Hooks

所有 hooks 都已配置适当的缓存策略：

### useAssistants
```typescript
import { useAssistants } from '@/lib/swr';

const { assistants, nextCursor, isLoading, error, mutate } = useAssistants({
  project_id: 'project-id',
  cursor: undefined,
  limit: 20,
});
```
- **缓存策略**: `static`（助手列表变化不频繁）

### useAssistant
```typescript
import { useAssistant } from '@/lib/swr';

const { assistant, isLoading, error, mutate } = useAssistant(assistantId);
```
- **缓存策略**: `default`

### useConversations
```typescript
import { useConversations } from '@/lib/swr';

const { conversations, nextCursor, isLoading, error, mutate } = useConversations({
  assistant_id: 'asst-id',
  cursor: undefined,
  limit: 20,
});
```
- **缓存策略**: `frequent`（会话列表会因新消息而更新）

### useConversation
```typescript
import { useConversation } from '@/lib/swr';

const { conversation, isLoading, error, mutate } = useConversation(conversationId);
```
- **缓存策略**: `default`

### useMessages
```typescript
import { useMessages } from '@/lib/swr';

const { messages, nextCursor, isLoading, error, mutate } = useMessages(conversationId, {
  cursor: undefined,
  limit: 50,
});
```
- **缓存策略**: `frequent`（实时对话场景）

### useRun
```typescript
import { useRun } from '@/lib/swr';

const { run, isLoading, error, mutate } = useRun(runId);
```
- **缓存策略**: `default`（惰性加载）

### useEval
```typescript
import { useEval } from '@/lib/swr';

const { eval, isLoading, error, mutate, isPolling } = useEval(evalId, {
  enablePolling: true,  // 默认启用轮询
});
```
- **缓存策略**: `default` + 轮询
- **轮询策略**: 递增退避（1s → 2s → 3s）
- **自动停止**: 当 status 为 `ready` 或 `rated` 时停止轮询

### useEvalConfig
```typescript
import { useEvalConfig } from '@/lib/swr';

const { config, isLoading, error, mutate } = useEvalConfig(projectId);
```
- **缓存策略**: `static`（管理员配置，变化不频繁）

## Mutation Hooks

所有 mutation hooks 都返回异步函数：

```typescript
import {
  useCreateAssistant,
  useUpdateAssistant,
  useDeleteAssistant,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation,
  useSendMessage,
  useCreateEval,
  useSubmitRating,
  useUpdateEvalConfig,
} from '@/lib/swr';

// 使用示例
const createAssistant = useCreateAssistant();
const assistant = await createAssistant({ project_id, name, ... });

const sendMessage = useSendMessage();
const response = await sendMessage(conversationId, { content: 'Hello' });
```

## 状态管理 (Zustand)

聊天模块使用 Zustand 管理轻量级 UI 状态：

```typescript
import { useChatStore } from '@/lib/stores/chat-store';

const {
  selectedAssistantId,
  selectedConversationId,
  activeEvalId,
  setSelectedAssistant,
  setSelectedConversation,
  setActiveEval,
  reset,
} = useChatStore();

// 选中助手
setSelectedAssistant('asst-id');

// 选中会话
setSelectedConversation('conv-id');

// 打开评测面板
setActiveEval('eval-id');

// 重置状态
reset();
```

## 缓存策略说明

项目使用以下缓存策略（定义在 `frontend/lib/swr/cache.ts`）：

- **static**: 静态数据，很少变化（助手列表、评测配置）
  - `revalidateOnFocus: false`
  - `revalidateOnReconnect: false`
  - `refreshInterval: 0`
  - `dedupingInterval: 60000`

- **default**: 默认策略，适度缓存
  - `revalidateOnFocus: false`
  - `revalidateOnReconnect: true`
  - `dedupingInterval: 2000`

- **frequent**: 频繁更新的数据（会话列表、消息列表）
  - `revalidateOnFocus: true`
  - `revalidateOnReconnect: true`
  - `refreshInterval: 30000` (30秒)
  - `dedupingInterval: 1000`

- **realtime**: 实时数据（如果需要）
  - `revalidateOnFocus: true`
  - `revalidateOnReconnect: true`
  - `refreshInterval: 5000` (5秒)
  - `dedupingInterval: 500`

## 测试

运行类型定义和服务导出测试：

```bash
cd frontend
npx vitest run lib/swr/__tests__/chat-types.test.ts
```

所有测试应该通过，验证：
- 类型定义正确
- 服务正确导出
- 所有方法可访问

## 实现状态

### ✅ 已完成
- [x] 任务 1: 设置项目基础设施和类型定义
- [x] 任务 2: 实现助手管理功能
  - [x] 2.1 创建 assistantService HTTP client
  - [x] 2.2 创建 useAssistants SWR hook
  - [x] 2.3 创建 useAssistant SWR hook

### 🚧 进行中
- [ ] 任务 3: 实现会话管理功能
- [ ] 任务 4: 实现消息和 Run 功能
- [ ] 任务 5: 实现评测功能
- [ ] 任务 6: 实现评测配置功能
- [ ] 任务 7: 实现错误处理和国际化
- [ ] 任务 8: 实现 Zustand 状态管理

### 📋 待实现
- [ ] 任务 10-15: UI 组件实现
- [ ] 任务 16: 性能优化
- [ ] 任务 18: 可访问性
- [ ] 任务 19: 集成测试和端到端测试

## 下一步

继续实现：
1. 会话管理功能（任务 3）
2. 消息和 Run 功能（任务 4）
3. 评测功能（任务 5）
4. 评测配置功能（任务 6）
5. 错误处理和国际化（任务 7）
6. Zustand 状态管理（任务 8）

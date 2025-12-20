# 服务端预取数据指南

## 概述

为了避免客户端初始加载时的数据闪烁，我们使用 Next.js App Router 的服务端组件预取数据，然后通过 SWR 的 `fallback` 机制传递给客户端组件。

## 核心工具

### 1. `serverFetch` - 服务端数据获取工具

位置：`frontend/lib/swr/server-fetch.ts`

```typescript
import { serverFetch } from '@/lib/swr/server-fetch';

// 在服务端组件中使用
const data = await serverFetch<DataType>('/api/endpoint');
```

特性：
- 自动从 cookies 中获取认证 token
- 自动处理错误（返回 null）
- 默认不缓存（`cache: 'no-store'`）

### 2. `SWRProvider` - 支持 fallback 的 Provider

位置：`frontend/lib/swr/provider.tsx`

```typescript
<SWRProvider fallback={{ '/api/endpoint': data }}>
  <ClientComponent />
</SWRProvider>
```

## 实现步骤

### 步骤 1：将 page.tsx 改为服务端组件

```typescript
// ❌ 错误：客户端组件
"use client";
export default function MyPage() {
  return <MyClientComponent />;
}

// ✅ 正确：服务端组件（不加 "use client"）
export default async function MyPage() {
  return <MyClientComponent />;
}
```

### 步骤 2：在服务端预取数据

```typescript
import { serverFetch } from '@/lib/swr/server-fetch';
import type { MyDataType } from '@/lib/api-types';

export default async function MyPage() {
  // 预取数据
  const data = await serverFetch<MyDataType>('/api/my-endpoint');
  
  return <MyClientComponent />;
}
```

### 步骤 3：通过 SWRProvider 传递 fallback

```typescript
import { SWRProvider } from '@/lib/swr/provider';
import { serverFetch } from '@/lib/swr/server-fetch';

export default async function MyPage() {
  const data = await serverFetch<MyDataType>('/api/my-endpoint');
  
  return (
    <SWRProvider
      fallback={{
        '/api/my-endpoint': data,
      }}
    >
      <MyClientComponent />
    </SWRProvider>
  );
}
```

### 步骤 4：客户端组件正常使用 SWR Hook

```typescript
"use client";

import { useMyData } from '@/lib/swr/use-my-data';

export function MyClientComponent() {
  // SWR 会优先使用 fallback 数据，避免闪烁
  const { data, isLoading } = useMyData();
  
  // 首次渲染不会显示 loading，因为有 fallback
  if (isLoading) return <div>加载中...</div>;
  
  return <div>{data?.value}</div>;
}
```

## 完整示例

### 示例 1：Conversation 详情页

```typescript
// frontend/app/chat/[assistant_id]/[conversation_id]/page.tsx
import { SWRProvider } from "@/lib/swr/provider";
import { serverFetch } from "@/lib/swr/server-fetch";
import { ConversationPageClient } from "./components/conversation-page-client";
import type { ConversationsResponse } from "@/lib/api-types";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ assistant_id: string; conversation_id: string }>;
}) {
  const { assistant_id, conversation_id } = await params;

  // 服务端预取会话列表
  const conversationsData = await serverFetch<ConversationsResponse>(
    `/v1/conversations?assistant_id=${assistant_id}&limit=50`
  );

  return (
    <SWRProvider
      fallback={{
        [`/v1/conversations?assistant_id=${assistant_id}&limit=50`]: conversationsData,
      }}
    >
      <ConversationPageClient
        assistantId={assistant_id}
        conversationId={conversation_id}
      />
    </SWRProvider>
  );
}
```

### 示例 2：预取多个数据源

```typescript
export default async function DashboardPage() {
  // 并行预取多个数据源
  const [balance, transactions, apiKeys] = await Promise.all([
    serverFetch('/api/credits/balance'),
    serverFetch('/api/credits/transactions?page=1&page_size=10'),
    serverFetch('/api/users/me/api-keys'),
  ]);

  return (
    <SWRProvider
      fallback={{
        '/api/credits/balance': balance,
        '/api/credits/transactions?page=1&page_size=10': transactions,
        '/api/users/me/api-keys': apiKeys,
      }}
    >
      <DashboardClient />
    </SWRProvider>
  );
}
```

## 注意事项

### 1. SWR Key 必须完全匹配

fallback 的 key 必须与客户端 SWR hook 使用的 key 完全一致：

```typescript
// ❌ 错误：key 不匹配
// 服务端
fallback: { '/api/data': data }
// 客户端
useSWR('/api/data?foo=bar', fetcher)

// ✅ 正确：key 完全匹配
// 服务端
fallback: { '/api/data?foo=bar': data }
// 客户端
useSWR('/api/data?foo=bar', fetcher)
```

### 2. 不要预取依赖客户端状态的数据

如果数据依赖客户端状态（如 Zustand store），不要在服务端预取：

```typescript
// ❌ 错误：assistants 依赖客户端的 selectedProjectId
export default async function ChatPage() {
  // 服务端不知道用户选择了哪个 project
  const assistants = await serverFetch('/v1/assistants?project_id=???');
  // ...
}

// ✅ 正确：让客户端根据实际状态动态加载
export default async function ChatPage() {
  return (
    <SWRProvider fallback={{}}>
      <ChatHomeClient />
    </SWRProvider>
  );
}
```

### 3. 处理认证失败

`serverFetch` 在认证失败时返回 `null`，客户端会重新请求：

```typescript
const data = await serverFetch('/api/protected-data');
// data 可能为 null（未登录或 token 过期）

return (
  <SWRProvider
    fallback={{
      '/api/protected-data': data, // null 也是有效的 fallback
    }}
  >
    <MyClient />
  </SWRProvider>
);
```

### 4. 动态路由参数

确保使用 `await params` 获取动态路由参数：

```typescript
// ✅ 正确
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await serverFetch(`/api/items/${id}`);
  // ...
}
```

## 优势

1. **无闪烁体验**：首次渲染直接使用服务端数据
2. **SEO 友好**：数据在服务端渲染，搜索引擎可抓取
3. **自动同步**：SWR 会在客户端自动重新验证数据
4. **渐进增强**：即使 JavaScript 加载失败，用户也能看到初始内容
5. **性能优化**：减少客户端请求，加快首屏渲染

## 何时使用

- ✅ 页面有明确的 URL 参数（如 ID）
- ✅ 数据不依赖客户端状态
- ✅ 数据对首屏渲染很重要
- ✅ 数据量适中（不要预取大量数据）

## 何时不使用

- ❌ 数据依赖客户端状态（Zustand、localStorage 等）
- ❌ 数据需要实时更新（使用 SWR 的 `refreshInterval`）
- ❌ 数据量很大（会增加服务端负担）
- ❌ 数据不重要（如统计、分析数据）

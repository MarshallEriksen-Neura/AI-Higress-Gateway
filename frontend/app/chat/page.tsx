import { SWRProvider } from "@/lib/swr/provider";
import { ChatHomeClient } from "./components/chat-home-client";

/**
 * Chat 页面 - 服务端组件
 * 
 * 注意：由于 chat 页面的数据（assistants）依赖于客户端状态（selectedProjectId），
 * 我们不在服务端预取这些数据，而是让客户端根据实际状态动态加载。
 * 
 * 如果未来需要预取不依赖客户端状态的数据（如用户的 API keys 列表），
 * 可以在这里添加 serverFetch 调用并通过 fallback 传递给客户端。
 */
export default async function ChatPage() {
  // 示例：如果需要预取 API keys 列表
  // const apiKeys = await serverFetch<ApiKey[]>('/users/me/api-keys');
  
  return (
    <SWRProvider fallback={{}}>
      <ChatHomeClient />
    </SWRProvider>
  );
}

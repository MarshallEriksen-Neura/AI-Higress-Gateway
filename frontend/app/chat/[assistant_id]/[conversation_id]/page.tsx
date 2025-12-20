import { SWRProvider } from "@/lib/swr/provider";
import { serverFetch } from "@/lib/swr/server-fetch";
import { ConversationPageClient } from "./components/conversation-page-client";
import type { ConversationsResponse } from "@/lib/api-types";

/**
 * Conversation 详情页 - 服务端组件
 * 预取会话列表数据，避免客户端初始加载闪烁
 */
export default async function ConversationPage({
  params,
}: {
  params:
    | { assistant_id: string; conversation_id: string }
    | Promise<{ assistant_id: string; conversation_id: string }>;
}) {
  const resolvedParams = await params;
  const { assistant_id, conversation_id } = resolvedParams;

  // 服务端预取会话列表数据
  // 由于 useConversationFromList 需要从列表中查找，我们预取整个列表
  const conversationsData = await serverFetch<ConversationsResponse>(
    `/v1/conversations?assistant_id=${assistant_id}&limit=50`
  );

  return (
    <SWRProvider
      fallback={{
        // 为会话列表查询提供 fallback 数据
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

"use client";

import { useCallback } from "react";

import { SlateChatInput } from "@/components/chat/slate-chat-input";
import { useChatStore } from "@/lib/stores/chat-store";
import { useClearConversationMessages, useSendMessage } from "@/lib/swr/use-messages";

export function ConversationChatInput({
  conversationId,
  assistantId,
  overrideLogicalModel,
  disabled = false,
  className,
  onMcpAction,
}: {
  conversationId: string;
  assistantId: string;
  overrideLogicalModel?: string | null;
  disabled?: boolean;
  className?: string;
  onMcpAction?: () => void;
}) {
  const bridgeAgentId = useChatStore((s) => s.conversationBridgeAgentIds[conversationId] ?? null);

  const sendMessage = useSendMessage(conversationId, assistantId, overrideLogicalModel);
  const clearConversationMessages = useClearConversationMessages(assistantId);

  const handleSend = useCallback(
    async (payload: { content: string; model_preset?: Record<string, number> }) => {
      await sendMessage({
        content: payload.content,
        model_preset: payload.model_preset,
        bridge_agent_id: bridgeAgentId || undefined,
      });
    },
    [sendMessage, bridgeAgentId]
  );

  const handleClearHistory = useCallback(async () => {
    await clearConversationMessages(conversationId);
  }, [
    clearConversationMessages,
    conversationId,
  ]);

  return (
    <SlateChatInput
      conversationId={conversationId}
      assistantId={assistantId}
      disabled={disabled}
      className={className}
      onSend={async ({ content, model_preset }) => handleSend({ content, model_preset })}
      onClearHistory={handleClearHistory}
      onMcpAction={onMcpAction}
    />
  );
}

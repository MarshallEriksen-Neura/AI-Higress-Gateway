"use client";

import { Bot } from "lucide-react";

import { MessageBubble } from "@/components/chat/message-bubble";
import { useI18n } from "@/lib/i18n-context";
import { useChatStore } from "@/lib/stores/chat-store";

export function ConversationPendingIndicator({
  conversationId,
}: {
  conversationId: string;
}) {
  const { t } = useI18n();
  const isPendingResponse =
    useChatStore((s) => s.conversationPending[conversationId]) ?? false;

  if (!isPendingResponse) return null;

  return (
    <div className="px-4 pb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-white/50 shadow-lg">
            <Bot className="size-6" aria-hidden="true" />
          </div>
        </div>
        <div className="max-w-[min(800px,85%)] md:max-w-[min(800px,75%)]">
          <MessageBubble role="assistant">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="size-2.5 rounded-full animate-pulse"
                    style={{
                      background: `hsl(${200 + i * 30}, 70%, 60%)`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: "1.2s",
                    }}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("chat.message.loading")}
              </div>
            </div>
          </MessageBubble>
        </div>
      </div>
    </div>
  );
}

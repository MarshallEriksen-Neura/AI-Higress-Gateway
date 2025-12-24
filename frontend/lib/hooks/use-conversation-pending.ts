"use client";

import { useCallback } from "react";
import { useChatStore } from "@/lib/stores/chat-store";

type RunWithPendingOptions = {
  /**
   * 最短展示时长（ms），避免“闪一下”。
   * 设为 0 表示不限制。
   */
  minDurationMs?: number;
};

export function useConversationPending() {
  const setConversationPending = useChatStore((s) => s.setConversationPending);

  const setPending = useCallback(
    (conversationId: string, pending: boolean) => {
      if (!conversationId) return;
      setConversationPending(conversationId, pending);
    },
    [setConversationPending]
  );

  const runWithPending = useCallback(
    async <T,>(
      conversationId: string,
      fn: () => Promise<T>,
      options?: RunWithPendingOptions
    ): Promise<T> => {
      const startedAt = Date.now();
      setPending(conversationId, true);
      try {
        return await fn();
      } finally {
        const minDurationMs = Math.max(0, options?.minDurationMs ?? 0);
        const elapsed = Date.now() - startedAt;
        const remaining = minDurationMs - elapsed;
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }
        setPending(conversationId, false);
      }
    },
    [setPending]
  );

  return { setPending, runWithPending };
}


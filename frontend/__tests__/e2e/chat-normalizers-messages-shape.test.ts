import { describe, expect, it } from "vitest";

import { normalizeMessagesResponse } from "@/lib/normalizers/chat-normalizers";

describe("chat normalizers: messages shape", () => {
  it("normalizeMessagesResponse: 支持扁平化 message 字段", () => {
    const backend = {
      items: [
        {
          message_id: "msg-1",
          role: "user",
          content: { type: "text", text: "hi" },
          created_at: "2025-01-01T00:00:00Z",
          runs: [],
        },
      ],
      next_cursor: undefined,
    } as any;

    const normalized = normalizeMessagesResponse(backend, "conv-1");
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].message.message_id).toBe("msg-1");
    expect(normalized.items[0].message.conversation_id).toBe("conv-1");
    expect(normalized.items[0].message.content).toBe("hi");
  });
});


"use client";

import { tokenManager } from "@/lib/auth/token-manager";

export type SSEMessage = {
  event: string;
  data: string;
};

export async function streamSSE(
  url: string,
  onMessage: (msg: SSEMessage) => void,
  signal: AbortSignal
): Promise<void> {
  const token = tokenManager.getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(url, { headers, signal });
  if (!resp.ok || !resp.body) {
    throw new Error(`SSE failed: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const msg = parseSSEFrame(frame);
      if (msg) onMessage(msg);
    }
  }
}

function parseSSEFrame(frame: string): SSEMessage | null {
  const lines = frame.split("\n");
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data += line.slice("data:".length).trim();
    }
  }
  if (!data) return null;
  return { event, data };
}


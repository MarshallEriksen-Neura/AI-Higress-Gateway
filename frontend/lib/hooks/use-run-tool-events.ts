"use client";

import { useEffect, useMemo } from "react";

import { streamSSE, type SSEMessage } from "@/lib/bridge/sse";
import { useRunToolEventsStore, type ToolInvocation } from "@/lib/stores/run-tool-events-store";

type Envelope =
  | {
      type: "run.event";
      run_id: string;
      seq: number;
      event_type: string;
      payload: Record<string, any>;
    }
  | { type: "replay.done" }
  | { type: "heartbeat" }
  | Record<string, any>;

type StreamEntry = {
  controller: AbortController;
  refs: number;
  started: boolean;
};

const _streams = new Map<string, StreamEntry>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(data: string): any | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function isToolPayload(
  payload: any
): payload is { type: "tool.status" | "tool.result" } & Record<string, any> {
  if (!payload || typeof payload !== "object") return false;
  const t = (payload as any).type;
  return t === "tool.status" || t === "tool.result";
}

function handleRunEventMessage(runId: string, msg: SSEMessage) {
  const parsed = parseJson(msg.data);
  if (!parsed || typeof parsed !== "object") return;
  const env = parsed as Envelope;

  if ((env as any).type !== "run.event") return;
  const seq = typeof (env as any).seq === "number" ? (env as any).seq : 0;
  const payload = (env as any).payload;
  if (!isToolPayload(payload)) return;

  useRunToolEventsStore.getState().apply_tool_event(runId, seq, payload);
}

async function runStreamLoop(runId: string, controller: AbortController) {
  while (!controller.signal.aborted) {
    const afterSeq = useRunToolEventsStore.getState().by_run_id[runId]?.last_seq ?? 0;
    const url = `/v1/runs/${runId}/events?after_seq=${afterSeq}`;
    try {
      await streamSSE(
        url,
        (msg) => handleRunEventMessage(runId, msg),
        controller.signal
      );
      return;
    } catch {
      if (controller.signal.aborted) return;
      await sleep(800);
    }
  }
}

export function useRunToolInvocations(
  runId: string | null,
  options?: {
    enabled?: boolean;
    seedInvocations?: ToolInvocation[] | null;
  }
) {
  const normalizedRunId = (runId || "").trim() || null;
  const enabled = !!options?.enabled && !!normalizedRunId;
  const seed = options?.seedInvocations ?? null;

  const seedHash = useMemo(() => {
    if (!seed?.length) return "";
    return seed
      .map((it) => `${it.req_id}:${it.state || ""}:${it.duration_ms || ""}:${it.result_preview || ""}`)
      .join("|");
  }, [seed]);

  const runState = useRunToolEventsStore((s) => {
    if (!normalizedRunId) return undefined;
    return s.by_run_id[normalizedRunId];
  });

  const invocations = useMemo(() => {
    if (!runState) return [];
    return runState.order
      .map((reqId) => runState.invocations_by_req_id[reqId])
      .filter((it): it is ToolInvocation => !!it && typeof (it as any).req_id === "string");
  }, [runState]);

  useEffect(() => {
    if (!normalizedRunId || !seed?.length) return;
    useRunToolEventsStore.getState().seed_from_run_summary(normalizedRunId, seed);
  }, [normalizedRunId, seedHash]);

  useEffect(() => {
    if (!normalizedRunId || !enabled) return;

    const existing = _streams.get(normalizedRunId);
    if (existing) {
      existing.refs += 1;
      return () => {
        existing.refs -= 1;
        if (existing.refs <= 0) {
          existing.controller.abort();
          _streams.delete(normalizedRunId);
        }
      };
    }

    const entry: StreamEntry = { controller: new AbortController(), refs: 1, started: false };
    _streams.set(normalizedRunId, entry);
    entry.started = true;
    void runStreamLoop(normalizedRunId, entry.controller);

    return () => {
      entry.refs -= 1;
      if (entry.refs <= 0) {
        entry.controller.abort();
        _streams.delete(normalizedRunId);
      }
    };
  }, [normalizedRunId, enabled]);

  return invocations;
}

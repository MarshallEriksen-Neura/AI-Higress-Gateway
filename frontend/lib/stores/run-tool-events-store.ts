"use client";

import { create } from "zustand";

import type { RunSummary } from "@/lib/api-types";

export type ToolInvocation = NonNullable<RunSummary["tool_invocations"]>[number];

type RunToolState = {
  invocations_by_req_id: Record<string, ToolInvocation>;
  order: string[];
  last_seq: number;
};

type ToolEventPayload = {
  type: string;
  run_id?: string;
  req_id?: string;
  agent_id?: string;
  tool_name?: string;
  tool_call_id?: string | null;
  state?: ToolInvocation["state"];
  duration_ms?: number;
  ok?: boolean;
  canceled?: boolean;
  exit_code?: number;
  error?: Record<string, any> | null;
  result_preview?: string | null;
};

interface RunToolEventsState {
  by_run_id: Record<string, RunToolState>;
  seed_from_run_summary: (runId: string, invocations: ToolInvocation[]) => void;
  apply_tool_event: (runId: string, seq: number, payload: ToolEventPayload) => void;
  clear_run: (runId: string) => void;
}

function normalizeRunId(value: unknown): string {
  const s = typeof value === "string" ? value.trim() : "";
  return s;
}

function normalizeReqId(value: unknown): string {
  const s = typeof value === "string" ? value.trim() : "";
  return s;
}

function ensureRunState(state: RunToolEventsState, runId: string): RunToolState {
  const existing = state.by_run_id[runId];
  if (existing) return existing;
  return { invocations_by_req_id: {}, order: [], last_seq: 0 };
}

export const useRunToolEventsStore = create<RunToolEventsState>((set) => ({
  by_run_id: {},

  seed_from_run_summary: (runId, invocations) =>
    set((state) => {
      const normalizedRunId = normalizeRunId(runId);
      if (!normalizedRunId || !Array.isArray(invocations) || !invocations.length) return state;

      const current = ensureRunState(state as RunToolEventsState, normalizedRunId);
      const nextInv = { ...current.invocations_by_req_id };
      const nextOrder = current.order.slice();

      for (const item of invocations) {
        const reqId = normalizeReqId((item as any)?.req_id);
        if (!reqId) continue;
        if (!nextInv[reqId]) {
          nextOrder.push(reqId);
        }
        nextInv[reqId] = { ...(nextInv[reqId] || {}), ...(item as any) };
      }

      return {
        ...state,
        by_run_id: {
          ...state.by_run_id,
          [normalizedRunId]: {
            ...current,
            invocations_by_req_id: nextInv,
            order: nextOrder,
          },
        },
      };
    }),

  apply_tool_event: (runId, seq, payload) =>
    set((state) => {
      const normalizedRunId = normalizeRunId(runId || (payload as any)?.run_id);
      if (!normalizedRunId) return state;

      const type = typeof payload?.type === "string" ? payload.type.trim() : "";
      if (type !== "tool.status" && type !== "tool.result") return state;

      const current = ensureRunState(state as RunToolEventsState, normalizedRunId);
      const next = { ...current.invocations_by_req_id };
      const nextOrder = current.order.slice();

      const reqId = normalizeReqId(payload?.req_id);
      if (!reqId) return state;

      if (!next[reqId]) {
        nextOrder.push(reqId);
      }

      const base: ToolInvocation = {
        req_id: reqId,
        agent_id: String(payload?.agent_id || "").trim(),
        tool_name: String(payload?.tool_name || "").trim(),
        tool_call_id: payload?.tool_call_id ?? undefined,
      };

      const merged: ToolInvocation = {
        ...(next[reqId] || {}),
        ...base,
        state: payload?.state ?? (type === "tool.status" ? "running" : (next[reqId] as any)?.state),
        duration_ms: typeof payload?.duration_ms === "number" ? payload.duration_ms : (next[reqId] as any)?.duration_ms,
        ok: typeof payload?.ok === "boolean" ? payload.ok : (next[reqId] as any)?.ok,
        canceled: typeof payload?.canceled === "boolean" ? payload.canceled : (next[reqId] as any)?.canceled,
        exit_code: typeof payload?.exit_code === "number" ? payload.exit_code : (next[reqId] as any)?.exit_code,
        error: payload?.error ?? (next[reqId] as any)?.error ?? undefined,
        result_preview:
          payload?.result_preview ?? (next[reqId] as any)?.result_preview ?? undefined,
      };

      next[reqId] = merged;

      const nextSeq = Number.isFinite(seq) ? Math.max(current.last_seq, Math.max(0, seq)) : current.last_seq;

      return {
        ...state,
        by_run_id: {
          ...state.by_run_id,
          [normalizedRunId]: {
            invocations_by_req_id: next,
            order: nextOrder,
            last_seq: nextSeq,
          },
        },
      };
    }),

  clear_run: (runId) =>
    set((state) => {
      const normalizedRunId = normalizeRunId(runId);
      if (!normalizedRunId) return state;
      const next = { ...state.by_run_id };
      delete next[normalizedRunId];
      return { ...state, by_run_id: next };
    }),
}));


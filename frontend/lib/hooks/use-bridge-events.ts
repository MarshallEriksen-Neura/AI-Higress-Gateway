"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { BridgeEnvelope } from "@/lib/api-types";
import { streamSSE } from "@/lib/bridge/sse";

export type BridgeEventState = {
  connected: boolean;
  error: string | null;
  events: BridgeEnvelope[];
};

export function useBridgeEvents(maxEvents: number = 200) {
  const [state, setState] = useState<BridgeEventState>({
    connected: false,
    error: null,
    events: [],
  });

  const controllerRef = useRef<AbortController | null>(null);

  const connect = useMemo(
    () => () => {
      if (controllerRef.current) return;
      const controller = new AbortController();
      controllerRef.current = controller;

      setState((s) => ({ ...s, connected: false, error: null }));

      streamSSE(
        "/v1/bridge/events",
        (msg) => {
          if (msg.event === "ready") {
            setState((s) => ({ ...s, connected: true }));
            return;
          }
          if (msg.event !== "bridge") return;
          try {
            const parsed = JSON.parse(msg.data) as BridgeEnvelope;
            setState((s) => {
              const next = [parsed, ...s.events].slice(0, maxEvents);
              return { ...s, connected: true, events: next };
            });
          } catch {
            // ignore
          }
        },
        controller.signal
      ).catch((err) => {
        setState((s) => ({ ...s, connected: false, error: String(err?.message || err) }));
      }).finally(() => {
        controllerRef.current = null;
      });
    },
    [maxEvents]
  );

  const disconnect = useMemo(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setState((s) => ({ ...s, connected: false }));
    },
    []
  );

  const clear = useMemo(
    () => () => setState((s) => ({ ...s, events: [] })),
    []
  );

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    clear,
  };
}


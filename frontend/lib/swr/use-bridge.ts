"use client";

import { useApiGet, useApiPost } from "@/lib/swr/hooks";
import type {
  BridgeAgentsResponse,
  BridgeToolsResponse,
  BridgeInvokeRequest,
  BridgeInvokeResponse,
  BridgeCancelRequest,
  BridgeCancelResponse,
  BridgeAgentTokenRequest,
  BridgeAgentTokenResponse,
} from "@/lib/api-types";

export const useBridgeAgents = () => {
  const { data, error, loading, refresh } = useApiGet<BridgeAgentsResponse>("/v1/bridge/agents", {
    strategy: "frequent",
  });
  return {
    agents: data?.agents ?? [],
    error,
    loading,
    refresh,
  };
};

export const useBridgeTools = (agentId: string | null) => {
  const { data, error, loading, refresh } = useApiGet<BridgeToolsResponse>(
    agentId ? `/v1/bridge/agents/${agentId}/tools` : null,
    { strategy: "frequent" }
  );
  return {
    tools: data?.tools ?? [],
    error,
    loading,
    refresh,
  };
};

export const useBridgeInvoke = () => useApiPost<BridgeInvokeResponse, BridgeInvokeRequest>("/v1/bridge/invoke");

export const useBridgeCancel = () => useApiPost<BridgeCancelResponse, BridgeCancelRequest>("/v1/bridge/cancel");

export const useBridgeAgentToken = () =>
  useApiPost<BridgeAgentTokenResponse, BridgeAgentTokenRequest>("/v1/bridge/agent-token");

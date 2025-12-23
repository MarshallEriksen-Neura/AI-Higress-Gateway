"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Zap, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n-context";
import { useChatStore } from "@/lib/stores/chat-store";
import { useBridgeAgents, useBridgeTools } from "@/lib/swr/use-bridge";

const EMPTY_STRING_ARRAY: string[] = [];

function AgentToolsPreview({ agentId }: { agentId: string }) {
  const { t } = useI18n();
  const { tools, loading } = useBridgeTools(agentId);

  if (loading) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {t("chat.mcp.tools_preview_loading")}
      </span>
    );
  }

  if (!tools.length) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {t("chat.mcp.tools_preview_empty")}
      </span>
    );
  }

  const toolNames = tools.map((tool) => tool.name);
  const display = toolNames.slice(0, 3).join(", ");
  const more = toolNames.length > 3 ? ` +${toolNames.length - 3}` : "";

  return (
    <span className="text-[11px] text-muted-foreground truncate" title={toolNames.join(", ")}>
      {display}
      {more}
    </span>
  );
}

export function McpSelector({
  conversationId,
  disabled,
  isSending,
}: {
  conversationId: string;
  disabled: boolean;
  isSending: boolean;
}) {
  const { t } = useI18n();
  const { agents, loading: bridgeAgentsLoading } = useBridgeAgents();
  const bridgeAgentIds =
    useChatStore((s) => s.conversationBridgeAgentIds[conversationId]) ?? EMPTY_STRING_ARRAY;
  const bridgeToolSelections =
    useChatStore((s) => s.conversationBridgeToolSelections[conversationId]) ?? {};
  const defaultBridgeToolSelections =
    useChatStore((s) => s.defaultBridgeToolSelections) ?? {};

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"agents" | "servers">("agents");
  const [activeAgentId, setActiveAgentId] = useState<string | null>(bridgeAgentIds[0] ?? null);

  const setConversationBridgeAgentIds = useChatStore((s) => s.setConversationBridgeAgentIds);
  const setConversationBridgeToolSelections = useChatStore((s) => s.setConversationBridgeToolSelections);
  const setDefaultBridgeToolSelections = useChatStore((s) => s.setDefaultBridgeToolSelections);

  useEffect(() => {
    if (!open) return;
    if (disabled || isSending) {
      setOpen(false);
      return;
    }
  }, [disabled, isSending, open]);

  useEffect(() => {
    setActiveAgentId((prev) => {
      if (prev && bridgeAgentIds.includes(prev)) return prev;
      return bridgeAgentIds[0] ?? null;
    });
  }, [bridgeAgentIds]);

  const clearBridgeAgents = useCallback(() => {
    setConversationBridgeAgentIds(conversationId, null);
    Object.keys(bridgeToolSelections || {}).forEach((aid) =>
      setConversationBridgeToolSelections(conversationId, aid, null)
    );
    Object.keys(defaultBridgeToolSelections || {}).forEach((aid) =>
      setDefaultBridgeToolSelections(aid, null)
    );
  }, [
    conversationId,
    setConversationBridgeAgentIds,
    bridgeToolSelections,
    setConversationBridgeToolSelections,
    defaultBridgeToolSelections,
    setDefaultBridgeToolSelections,
  ]);

  const { tools: activeAgentTools = [], loading: activeAgentToolsLoading } = useBridgeTools(activeAgentId);

  const serverGroups = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    for (const tool of activeAgentTools) {
      const server = (tool.meta && typeof tool.meta.server === "string" && tool.meta.server.trim()) || "";
      const name = (tool.name || "").trim();
      if (!server || !name) continue;
      grouped[server] = grouped[server] || [];
      grouped[server].push(name);
    }
    return grouped;
  }, [activeAgentTools]);

  const getEffectiveTools = useCallback(
    (agentId: string | null) => {
      if (!agentId) return EMPTY_STRING_ARRAY;
      const conv = bridgeToolSelections[agentId] ?? [];
      if (conv.length) return conv;
      return defaultBridgeToolSelections[agentId] ?? [];
    },
    [bridgeToolSelections, defaultBridgeToolSelections]
  );

  const activeSelectedTools = getEffectiveTools(activeAgentId);
  const defaultSelectedTools = activeAgentId ? defaultBridgeToolSelections[activeAgentId] ?? [] : [];
  const effectiveAgentIds = useMemo(() => {
    const set = new Set<string>();
    Object.entries({ ...defaultBridgeToolSelections, ...bridgeToolSelections }).forEach(([aid, tools]) => {
      if (Array.isArray(tools) && tools.length) set.add(aid);
    });
    bridgeAgentIds.forEach((id) => set.add(id));
    return Array.from(set);
  }, [bridgeAgentIds, bridgeToolSelections, defaultBridgeToolSelections]);

  const selectedServers = useMemo(() => {
    const set = new Set<string>();
    if (!activeSelectedTools.length) return set;
    for (const [server, names] of Object.entries(serverGroups)) {
      for (const n of names) {
        if (activeSelectedTools.includes(n)) {
          set.add(server);
          break;
        }
      }
    }
    return set;
  }, [activeSelectedTools, serverGroups]);

  const toggleServer = useCallback(
    (serverName: string) => {
      if (!activeAgentId) return;
      const names = serverGroups[serverName] || [];
      if (!names.length) return;
      const current = new Set(activeSelectedTools);
      if (selectedServers.has(serverName)) {
        names.forEach((n) => current.delete(n));
      } else {
        names.forEach((n) => current.add(n));
      }
      setConversationBridgeToolSelections(conversationId, activeAgentId, Array.from(current));
      setDefaultBridgeToolSelections(activeAgentId, Array.from(current));
      const nextHasTools = current.size > 0;
      setConversationBridgeAgentIds(
        conversationId,
        nextHasTools
          ? Array.from(new Set([...bridgeAgentIds, activeAgentId]))
          : bridgeAgentIds.filter((id) => id !== activeAgentId)
      );
    },
    [
      activeAgentId,
      activeSelectedTools,
      conversationId,
      selectedServers,
      serverGroups,
      bridgeAgentIds,
      setConversationBridgeAgentIds,
      setConversationBridgeToolSelections,
      setDefaultBridgeToolSelections,
    ]
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled || isSending) return;
        setOpen(next);
        if (next) setStage("agents");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant={effectiveAgentIds.length ? "secondary" : "ghost"}
          disabled={disabled || isSending}
          aria-label={t("chat.message.mcp_tools")}
          title={t("chat.message.mcp_tools")}
          className="relative"
        >
          <Zap className="size-4" />
          {effectiveAgentIds.length ? (
            <Badge
              variant="secondary"
              className="absolute -right-2 -top-1 h-5 min-w-5 px-1 text-[11px] leading-none"
            >
              {effectiveAgentIds.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start" side="top">
        {stage === "agents" ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">{t("chat.mcp.quick_pick_title")}</div>
              <Button variant="ghost" size="sm" onClick={clearBridgeAgents} disabled={!effectiveAgentIds.length}>
                {t("bridge.events.clear")}
              </Button>
            </div>
            <ScrollArea className="h-56 pr-2">
              {bridgeAgentsLoading ? (
                <div className="py-2 text-sm text-muted-foreground">{t("chat.mcp.quick_pick_loading")}</div>
              ) : agents.length ? (
                <div className="space-y-2">
                  {agents.map((a) => (
                    <button
                      type="button"
                      key={a.agent_id}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50 text-left"
                      onClick={() => {
                        setActiveAgentId(a.agent_id);
                        setStage("servers");
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{a.agent_id}</div>
                        <AgentToolsPreview agentId={a.agent_id} />
                      </div>
                      <Badge variant="outline" className="h-6">
                        {getEffectiveTools(a.agent_id).length} sel
                      </Badge>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-sm text-muted-foreground">{t("chat.mcp.quick_pick_empty")}</div>
              )}
            </ScrollArea>
            <div className="mt-2 text-xs text-muted-foreground">{t("chat.mcp.quick_pick_hint")}</div>
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setStage("agents")}
                  aria-label={t("chat.action.back")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium truncate">
                  {t("chat.mcp.tools_pick_title", { agent: activeAgentId ?? "" })}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConversationBridgeToolSelections(conversationId, activeAgentId || "", null);
                  setDefaultBridgeToolSelections(activeAgentId || "", null);
                  setConversationBridgeAgentIds(
                    conversationId,
                    bridgeAgentIds.filter((id) => id !== activeAgentId)
                  );
                }}
                disabled={!activeSelectedTools.length && !defaultSelectedTools.length}
              >
                {t("chat.mcp.tools_clear")}
              </Button>
            </div>
            <ScrollArea className="h-56 pr-2">
              {activeAgentToolsLoading ? (
                <div className="py-2 text-sm text-muted-foreground">{t("chat.mcp.quick_pick_loading")}</div>
              ) : Object.keys(serverGroups).length ? (
                <div className="space-y-2">
                  {Object.entries(serverGroups).map(([server, names]) => {
                    const selected = selectedServers.has(server);
                    return (
                      <button
                        type="button"
                        key={server}
                        className={`flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50 text-left ${selected ? "bg-muted/60" : ""}`}
                        onClick={() => toggleServer(server)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{server}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {names.length} tool{names.length > 1 ? "s" : ""}
                          </div>
                        </div>
                        {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2 text-sm text-muted-foreground">{t("chat.mcp.quick_pick_empty")}</div>
              )}
            </ScrollArea>
            <div className="mt-2 text-xs text-muted-foreground">{t("chat.mcp.tools_pick_hint")}</div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

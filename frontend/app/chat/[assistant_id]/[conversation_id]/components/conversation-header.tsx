"use client";

import { useMemo, useState } from "react";
import { Maximize2, Minimize2, PlugZap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

import { useI18n } from "@/lib/i18n-context";
import { useChatLayoutStore } from "@/lib/stores/chat-layout-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { useAssistant } from "@/lib/swr/use-assistants";
import { useProjectChatSettings } from "@/lib/swr/use-project-chat-settings";
import { useSelectableChatModels } from "@/lib/swr/use-selectable-chat-models";

const INHERIT_VALUE = "__inherit__";
const PROJECT_INHERIT_SENTINEL = "__project__";

export function ConversationHeader({
  assistantId,
  conversationId,
  title,
}: {
  assistantId: string;
  conversationId: string;
  title: string | null | undefined;
}) {
  const { t } = useI18n();
  const isImmersive = useChatLayoutStore((s) => s.isImmersive);
  const setIsImmersive = useChatLayoutStore((s) => s.setIsImmersive);
  const isBridgePanelOpen = useChatLayoutStore((s) => s.isBridgePanelOpen);
  const setIsBridgePanelOpen = useChatLayoutStore((s) => s.setIsBridgePanelOpen);

  const {
    conversationModelOverrides,
    setConversationModelOverride,
    selectedProjectId,
    evalStreamingEnabled,
    setEvalStreamingEnabled,
    chatStreamingEnabled,
    setChatStreamingEnabled,
  } = useChatStore();

  const { assistant } = useAssistant(assistantId);
  const { settings: projectSettings } = useProjectChatSettings(selectedProjectId);

  const currentOverride = conversationModelOverrides[conversationId] ?? null;
  const selectedValue = currentOverride ?? INHERIT_VALUE;

  const effectiveAssistantDefaultModel =
    assistant?.default_logical_model === PROJECT_INHERIT_SENTINEL
      ? projectSettings?.default_logical_model || "auto"
      : assistant?.default_logical_model || "auto";

  const { filterOptions } = useSelectableChatModels(
    selectedProjectId,
    {
      extraModels: [currentOverride, effectiveAssistantDefaultModel],
    }
  );
  const [modelSearch, setModelSearch] = useState("");

  const filteredModels = useMemo(
    () => filterOptions(modelSearch),
    [filterOptions, modelSearch]
  );

  const conversationPending =
    useChatStore((s) => s.conversationPending[conversationId]) ?? false;
  const isTitlePending = (!title || !title.trim()) || conversationPending;
  const displayTitle = (title || "").trim() || t("chat.conversation.untitled");

  return (
    <div className="flex items-center justify-between gap-2 md:gap-3 border-b bg-background px-3 md:px-4 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium flex items-center gap-2">
          {isTitlePending ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <span className="text-[11px] text-muted-foreground animate-pulse">
                {t("chat.message.loading")}
              </span>
            </div>
          ) : (
            displayTitle
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground hidden md:block">
          {t("chat.header.model_label")}:{" "}
          {currentOverride || effectiveAssistantDefaultModel}
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/50">
              <span className="text-xs text-muted-foreground hidden md:inline">
                {t("chat.message.streaming_label")}
              </span>
              <Switch
                checked={chatStreamingEnabled}
                onCheckedChange={setChatStreamingEnabled}
                aria-label={t("chat.message.streaming_label")}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("chat.message.streaming_tooltip")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/50">
              <span className="text-xs text-muted-foreground hidden md:inline">
                {t("chat.eval.streaming_label")}
              </span>
              <Switch
                checked={evalStreamingEnabled}
                onCheckedChange={setEvalStreamingEnabled}
                aria-label={t("chat.eval.streaming_label")}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("chat.eval.streaming_tooltip")}
          </TooltipContent>
        </Tooltip>

        {/* 移动端隐藏 Bridge 按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isBridgePanelOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setIsBridgePanelOpen(!isBridgePanelOpen)}
              className="h-8 w-8 md:h-9 md:w-9 hidden md:flex"
            >
              <PlugZap className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("chat.bridge.toggle")}</TooltipContent>
        </Tooltip>
        
        {/* 沉浸模式按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsImmersive(!isImmersive)}
              className="h-8 w-8 md:h-9 md:w-9"
            >
              {isImmersive ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isImmersive
              ? t("chat.action.exit_immersive")
              : t("chat.action.enter_immersive")}
          </TooltipContent>
        </Tooltip>
        
        {/* 模型选择器 - 移动端缩小 */}
        <div className="w-[140px] md:w-[220px]">
          <Select
            value={selectedValue}
            onValueChange={(value) => {
              if (value === INHERIT_VALUE) {
                setConversationModelOverride(conversationId, null);
              } else {
                setConversationModelOverride(conversationId, value);
              }
            }}
            onOpenChange={(open) => {
              if (!open) setModelSearch("");
            }}
          >
            <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
              <SelectValue placeholder={t("chat.header.model_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 pb-1">
                <Input
                  value={modelSearch}
                  onChange={(event) => setModelSearch(event.target.value)}
                  placeholder={t("chat.model.search_placeholder")}
                  className="h-9"
                />
              </div>
              <SelectItem value={INHERIT_VALUE}>
                {t("chat.header.model_inherit")}
                {effectiveAssistantDefaultModel
                  ? ` (${effectiveAssistantDefaultModel})`
                  : ""}
              </SelectItem>
              {filteredModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

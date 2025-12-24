"use client";

import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import {
  User,
  Bot,
  Eye,
  PlugZap,
  Sparkles,
  Plus,
  RotateCw,
  Trash2,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n-context";
import type { Message, RunSummary } from "@/lib/api-types";
import type { ComparisonVariant } from "@/lib/stores/chat-comparison-store";
import { cn } from "@/lib/utils";
import { MessageContent } from "./message-content";
import { MessageBubble } from "./message-bubble";
import { ToolReferences } from "./tool-references";
import { useChatLayoutStore } from "@/lib/stores/chat-layout-store";
import { useChatStore } from "@/lib/stores/chat-store";

export interface MessageItemProps {
  message: Message;
  runs?: RunSummary[]; // 改为 runs 数组
  runSourceMessageId?: string; // runs 所属的 user message_id（用于创建 eval）
  userAvatarUrl?: string | null;
  userDisplayName?: string | null;
  onViewDetails?: (runId: string) => void;
  onTriggerEval?: (messageId: string, runId: string) => void; // 添加 messageId 参数
  showEvalButton?: boolean;
  comparisonVariants?: ComparisonVariant[];
  onAddComparison?: (assistantMessageId: string, sourceUserMessageId: string) => void;
  isLatestAssistant?: boolean;
  enableTypewriter?: boolean;
  typewriterKey?: string;
  onRegenerate?: (assistantMessageId: string, sourceUserMessageId?: string) => void;
  onDeleteMessage?: () => void;
  disableActions?: boolean;
  isRegenerating?: boolean;
  isDeletingMessage?: boolean;
  errorMessage?: string | null;
}

export function MessageItem({
  message,
  runs = [], // 默认为空数组
  runSourceMessageId,
  userAvatarUrl,
  userDisplayName,
  onViewDetails,
  onTriggerEval,
  showEvalButton = true,
  comparisonVariants = [],
  onAddComparison,
  isLatestAssistant = false,
  enableTypewriter = false,
  typewriterKey,
  onRegenerate,
  onDeleteMessage,
  disableActions = false,
  isRegenerating = false,
  isDeletingMessage = false,
  errorMessage = null,
}: MessageItemProps) {
  const { t, language } = useI18n();
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const setIsBridgePanelOpen = useChatLayoutStore((s) => s.setIsBridgePanelOpen);
  const setConversationBridgeAgentIds = useChatStore((s) => s.setConversationBridgeAgentIds);
  const setConversationBridgeActiveReqId = useChatStore((s) => s.setConversationBridgeActiveReqId);
  
  // 获取第一个 run（通常是 baseline run）
  const primaryRun = runs.length > 0 ? runs[0] : undefined;
  const firstInvocation = primaryRun?.tool_invocations?.[0];
  const [activeTab, setActiveTab] = useState<string>("baseline");
  const effectiveTypewriterKey =
    typewriterKey ?? `${message.conversation_id}:${message.created_at}`;
  const primaryStatus = primaryRun?.status;
  const createdMs = new Date(message.created_at).getTime();
  const isAssistantPendingResponse =
    isAssistant &&
    primaryStatus === "running" &&
    (message.content ?? "").trim().length === 0;
  const toolInvocations = primaryRun?.tool_invocations ?? [];
  const groupedInvocations = useMemo(
    () =>
      Array.from(
        toolInvocations.reduce((acc, cur) => {
          const agent = (cur.agent_id || "").trim();
          if (!agent) return acc;
          const entry = acc.get(agent) ?? new Set<string>();
          if (cur.tool_name) entry.add(cur.tool_name);
          acc.set(agent, entry);
          return acc;
        }, new Map<string, Set<string>>())
      ).map(([agent, tools]) => ({
        agent,
        tools: Array.from(tools),
      })),
    [toolInvocations]
  );
  const isRecent = Number.isFinite(createdMs)
    ? Date.now() - createdMs < 90_000
    : false;
  const shouldTypewriter =
    enableTypewriter &&
    isAssistant &&
    isLatestAssistant &&
    (primaryStatus === "running" || primaryStatus === "queued" || isRecent);
  const isActivelyGenerating =
    isAssistant &&
    (primaryStatus === "running" ||
      primaryStatus === "queued" ||
      (shouldTypewriter && isRecent));

  const tabItems = useMemo(() => {
    if (!isAssistant) return [];
    const items: Array<{
      key: string;
      label: string;
      status?: "queued" | "running" | "succeeded" | "failed";
      content?: string;
      errorMessage?: string;
    }> = [];

    const baselineLabel = primaryRun?.requested_logical_model || "Baseline";
    items.push({
      key: "baseline",
      label: baselineLabel,
      status: primaryRun?.status,
      content: message.content,
    });

    for (const v of comparisonVariants) {
      items.push({
        key: v.id,
        label: v.model,
        status: v.status,
        content: v.content,
        errorMessage: v.error_message,
      });
    }

    return items;
  }, [comparisonVariants, isAssistant, message.content, primaryRun?.requested_logical_model, primaryRun?.status]);

  // 格式化时间
  const formattedTime = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
    locale: language === "zh" ? zhCN : enUS,
  });

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* 助手头像（在气泡外） */}
      {isAssistant && (
        <div className="flex-shrink-0 mt-1">
          <Avatar aria-label={t("chat.message.assistant")} className="size-12 ring-2 ring-white/50 shadow-lg">
            <AvatarImage
              src="/images/robot.png"
              alt={t("chat.message.assistant")}
              className="object-cover"
            />
            <AvatarFallback className="text-primary bg-primary/10">
              <Bot className="size-6" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* 消息内容 */}
      <div className={cn("flex flex-col gap-2 max-w-[80%]", isUser && "items-end")}>
        {/* 消息卡片 */}
        <MessageBubble role={message.role}>
          <div className="flex-1 min-w-0">
            {isAssistantPendingResponse ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="size-2.5 rounded-full animate-pulse"
                      style={{
                        background: `hsl(${200 + i * 30}, 70%, 60%)`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '1.2s',
                      }}
                    />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Typing...
                </div>
              </div>
            ) : isAssistant && comparisonVariants.length > 0 ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
                <TabsList className="h-8 px-1">
                  {tabItems.map((item) => (
                    <TabsTrigger
                      key={item.key}
                      value={item.key}
                      className="text-xs px-2 py-1"
                    >
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {tabItems.map((item) => (
                  <TabsContent key={item.key} value={item.key} className="mt-0">
                    {item.status === "running" ? (
                      <div className="text-sm text-muted-foreground">
                        {t("chat.message.add_comparison_generating")}
                      </div>
                    ) : item.status === "failed" ? (
                      <div className="text-sm text-destructive">
                        {item.errorMessage || t("chat.message.add_comparison_failed")}
                      </div>
                    ) : (
                      <MessageContent
                        content={item.content || ""}
                        role="assistant"
                        enableTypewriter={item.key === "baseline" && shouldTypewriter}
                        typewriterKey={effectiveTypewriterKey}
                      />
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
                <>
                  {isAssistant &&
                  isRegenerating &&
                  (message.content ?? "").trim().length === 0 ? (
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {t("chat.message.loading")}
                    </div>
                  ) : (
                    <MessageContent
                      content={message.content}
                      role={message.role}
                      enableTypewriter={shouldTypewriter}
                      typewriterKey={effectiveTypewriterKey}
                    />
                  )}
                </>
              )}
              {isAssistant && errorMessage ? (
                <div className="mt-2 text-xs text-destructive">{errorMessage}</div>
              ) : null}
              {isAssistant && groupedInvocations.length ? (
                <ToolReferences
                  references={groupedInvocations}
                  className="mt-3"
                />
              ) : null}
          </div>
        </MessageBubble>

        {/* 时间和操作按钮 */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {formattedTime}
          </span>
          {isActivelyGenerating ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {t("chat.run.status_running")}
            </span>
          ) : null}

          {/* 助手消息的操作按钮 */}
          {isAssistant && (
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              {/* 重新生成 */}
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={disableActions || isRegenerating}
                  onClick={() => onRegenerate(message.message_id, runSourceMessageId)}
                  title={t("chat.action.retry")}
                  aria-label={t("chat.action.retry")}
                >
                  {isRegenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RotateCw className="size-3.5" />
                  )}
                </Button>
              )}
              {/* 删除消息 */}
              {onDeleteMessage && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={disableActions || isDeletingMessage}
                  onClick={onDeleteMessage}
                  title={t("chat.message.delete")}
                  aria-label={t("chat.message.delete")}
                >
                  {isDeletingMessage ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              )}

              {/* 以下操作依赖基线 run */}
              {primaryRun && (
                <>
                  {firstInvocation?.req_id && firstInvocation?.agent_id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setConversationBridgeAgentIds(message.conversation_id, [firstInvocation.agent_id]);
                        setConversationBridgeActiveReqId(message.conversation_id, firstInvocation.req_id);
                        setIsBridgePanelOpen(true);
                      }}
                      title={t("chat.bridge.toggle")}
                    >
                      <PlugZap className="size-3.5" />
                    </Button>
                  )}
                  {/* 查看详情按钮 */}
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onViewDetails(primaryRun.run_id)}
                      title={t("chat.message.view_details")}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                  )}

                  {/* 添加对比按钮 */}
                  {onAddComparison &&
                    runSourceMessageId &&
                    primaryRun.status === "succeeded" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onAddComparison(message.message_id, runSourceMessageId)}
                        title={t("chat.message.add_comparison")}
                        aria-label={t("chat.message.add_comparison")}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    )}

                  {/* 推荐评测按钮 */}
                  {showEvalButton && onTriggerEval && primaryRun.status === "succeeded" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        onTriggerEval(runSourceMessageId ?? message.message_id, primaryRun.run_id)
                      }
                      title={t("chat.message.trigger_eval")}
                    >
                      <Sparkles className="size-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <Avatar aria-label={userDisplayName || t("chat.message.user")} className="size-10">
            {userAvatarUrl ? (
              <AvatarImage src={userAvatarUrl} alt={userDisplayName || t("chat.message.user")} />
            ) : null}
            <AvatarFallback className="text-muted-foreground">
              <User className="size-5" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}

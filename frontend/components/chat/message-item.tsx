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
import { CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n-context";
import type { Message, RunSummary } from "@/lib/api-types";
import type { ComparisonVariant } from "@/lib/stores/chat-comparison-store";
import { cn } from "@/lib/utils";
import { MessageContent } from "./message-content";
import { AdaptiveCard } from "@/components/cards/adaptive-card";
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
  onDeleteConversation?: () => void;
  disableActions?: boolean;
  isRegenerating?: boolean;
  isDeletingConversation?: boolean;
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
  onDeleteConversation,
  disableActions = false,
  isRegenerating = false,
  isDeletingConversation = false,
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
  const isRecent = Number.isFinite(createdMs)
    ? Date.now() - createdMs < 90_000
    : false;
  const shouldTypewriter =
    enableTypewriter &&
    isAssistant &&
    isLatestAssistant &&
    (primaryStatus === "running" || primaryStatus === "queued" || isRecent);

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

  // 获取状态显示
  const getStatusBadge = (run: RunSummary) => {
    const statusConfig = {
      queued: {
        label: t("chat.run.status_queued"),
        className: "bg-muted text-muted-foreground",
      },
      running: {
        label: t("chat.run.status_running"),
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      },
      succeeded: {
        label: t("chat.run.status_succeeded"),
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      },
      failed: {
        label: t("chat.run.status_failed"),
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      },
    };

    const config = statusConfig[run.status];
    if (!config) return null;

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          config.className
        )}
      >
        {config.label}
      </span>
    );
  };

  const getComparisonStatusBadge = (status: "running" | "succeeded" | "failed") => {
    const statusConfig = {
      running: {
        label: t("chat.run.status_running"),
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      },
      succeeded: {
        label: t("chat.run.status_succeeded"),
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      },
      failed: {
        label: t("chat.run.status_failed"),
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      },
    } as const;

    const config = statusConfig[status];
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          config.className
        )}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* 助手头像 */}
      {isAssistant && (
        <div className="flex-shrink-0 mt-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-4" />
          </div>
        </div>
      )}

      {/* 消息内容 */}
      <div className={cn("flex flex-col gap-2 max-w-[80%]", isUser && "items-end")}>
        {/* 消息卡片 */}
        <AdaptiveCard
          showDecor={false}
          variant="plain"
          hoverScale={false}
          className={cn(
            "py-0 gap-0 shadow-sm",
            isUser ? "bg-primary text-primary-foreground border-0" : "bg-card"
          )}
        >
          <CardContent className="py-3 px-4">
            {isAssistant && comparisonVariants.length > 0 ? (
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
              <MessageContent
                content={message.content}
                role={message.role}
                enableTypewriter={shouldTypewriter}
                typewriterKey={effectiveTypewriterKey}
              />
            )}

            {/* Run 摘要信息 */}
            {isAssistant && (
              <>
                {runs.length === 0 ? (
                  <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    {t("chat.message.no_response")}
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                    {runs.map((run, index) => (
                      <div key={run.run_id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {runs.length > 1 && (
                          <span className="font-medium text-muted-foreground/70">
                            #{index + 1}
                          </span>
                        )}
                        <span className="font-medium">{run.requested_logical_model}</span>
                        {getStatusBadge(run)}
                        {run.latency && (
                          <span>
                            {run.latency}ms
                          </span>
                        )}
                      </div>
                    ))}

                    {comparisonVariants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span className="font-medium">{v.model}</span>
                        {getComparisonStatusBadge(v.status)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </AdaptiveCard>

        {/* 时间和操作按钮 */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {formattedTime}
          </span>

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
              {/* 删除对话 */}
              {onDeleteConversation && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={disableActions || isDeletingConversation}
                  onClick={onDeleteConversation}
                  title={t("chat.conversation.delete")}
                  aria-label={t("chat.conversation.delete")}
                >
                  {isDeletingConversation ? (
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
          <Avatar aria-label={userDisplayName || t("chat.message.user")}>
            {userAvatarUrl ? (
              <AvatarImage src={userAvatarUrl} alt={userDisplayName || t("chat.message.user")} />
            ) : null}
            <AvatarFallback className="text-muted-foreground">
              <User className="size-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageItem } from "./message-item";
import { ErrorAlert } from "./error-alert";
import { useI18n } from "@/lib/i18n-context";
import { useMessages } from "@/lib/swr/use-messages";
import { useCachePreloader } from "@/lib/swr/cache";
import { messageService } from "@/http/message";
import { useAuth } from "@/components/providers/auth-provider";
import type { Message, RunSummary } from "@/lib/api-types";

export interface MessageListProps {
  conversationId: string;
  onViewDetails?: (runId: string) => void;
  onTriggerEval?: (messageId: string, runId: string) => void; // 添加 messageId 参数
  showEvalButton?: boolean;
}

export function MessageList({
  conversationId,
  onViewDetails,
  onTriggerEval,
  showEvalButton = true,
}: MessageListProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { preloadData } = useCachePreloader();
  const [cursor, setCursor] = useState<string | undefined>();
  const [allMessages, setAllMessages] = useState<
    Array<{ message: Message; run?: RunSummary }>
  >([]);
  const parentRef = useRef<HTMLDivElement>(null);

  // 切换会话时重置本地分页/聚合状态
  useEffect(() => {
    setCursor(undefined);
    setAllMessages([]);
  }, [conversationId]);

  // 获取消息列表
  const { messages, nextCursor, isLoading, isError, error } = useMessages(
    conversationId,
    { cursor, limit: 50 }
  );

  // 预加载下一页消息（缓存优化）
  useEffect(() => {
    if (nextCursor && !isLoading) {
      const nextPageKey = {
        url: `/v1/conversations/${conversationId}/messages`,
        params: { cursor: nextCursor, limit: 50 },
      };
      
      // 预加载下一页，但不触发重新验证
      preloadData(
        JSON.stringify(nextPageKey),
        () => messageService.getMessages(conversationId, {
          cursor: nextCursor,
          limit: 50,
        })
      );
    }
  }, [nextCursor, conversationId, isLoading, preloadData]);

  // 合并新消息到列表
  // 注意：后端返回倒序（新消息在前），所以：
  // - 第一次加载：直接使用后端返回的数据
  // - 分页加载旧消息：旧消息在后端是倒序的末尾，应该追加到当前列表末尾
  useEffect(() => {
    if (messages.length > 0) {
      setAllMessages((prev) => {
        // 如果是第一次加载或重置
        if (!cursor) {
          return messages;
        }
        // 追加更早的消息到列表末尾（因为后端倒序，旧消息在后端列表的后面）
        return [...prev, ...messages];
      });
    }
  }, [messages, cursor]);

  // 当会话被“清空历史”后，SWR 返回空列表；这里需要同步清空本地聚合列表
  useEffect(() => {
    if (isLoading || isError) return;
    if (messages.length !== 0) return;

    if (cursor) {
      setCursor(undefined);
    }
    setAllMessages([]);
  }, [cursor, isError, isLoading, messages.length]);

  // 反转消息顺序：后端返回倒序（新消息在前），前端需要正序（旧消息在上，新消息在下）
  const displayMessages = useMemo(() => {
    return [...allMessages].reverse();
  }, [allMessages]);

  // 将 user message 的 run 关联到其后一个 assistant message（便于在回复旁展示，并确保 eval 使用 user message_id）
  const displayRows = useMemo(() => {
    const rows: Array<{
      message: Message;
      runs: RunSummary[];
      runSourceMessageId?: string;
    }> = [];

    let lastUserMessageId: string | undefined;
    let lastUserRuns: RunSummary[] = [];

    for (const item of displayMessages) {
      if (item.message.role === "user") {
        lastUserMessageId = item.message.message_id;
        lastUserRuns = item.run ? [item.run] : [];
        rows.push({ message: item.message, runs: [] });
        continue;
      }

      rows.push({
        message: item.message,
        runs: lastUserRuns,
        runSourceMessageId: lastUserMessageId,
      });
      lastUserRuns = [];
    }

    return rows;
  }, [displayMessages]);

  // 虚拟列表配置
  const rowVirtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // 估计每条消息的高度
    overscan: 5, // 预渲染的消息数量
  });

  // 加载更多消息（向前分页）
  const loadMore = () => {
    if (nextCursor && !isLoading) {
      setCursor(nextCursor);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  };

  // 初始加载完成后滚动到底部（显示最新消息）
  useEffect(() => {
    if (!isLoading && displayRows.length > 0 && !cursor) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isLoading, displayRows.length, cursor]);

  // 空状态
  if (!isLoading && displayRows.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-full text-center p-8"
        role="status"
        aria-live="polite"
      >
        <div className="text-muted-foreground mb-2">
          {t("chat.message.empty")}
        </div>
        <div className="text-sm text-muted-foreground">
          {t("chat.message.empty_description")}
        </div>
      </div>
    );
  }

  // 错误状态
  if (isError) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-full text-center p-8"
        role="alert"
        aria-live="assertive"
      >
        <ErrorAlert error={error} className="mb-4 max-w-md" />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCursor(undefined)}
          aria-label={t("chat.action.retry_load_messages")}
        >
          {t("chat.action.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" role="region" aria-label={t("chat.message.list_label")}>
      {/* 加载更多按钮 */}
      {nextCursor && (
        <div className="flex justify-center p-4 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isLoading}
            aria-label={isLoading ? t("chat.message.loading") : t("chat.message.load_more")}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
                {t("chat.message.loading")}
              </>
            ) : (
              t("chat.message.load_more")
            )}
          </Button>
        </div>
      )}

      {/* 虚拟列表容器 */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        style={{
          contain: "strict",
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const item = displayRows[virtualItem.index];
            if (!item) return null;

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="pb-6">
                  <MessageItem
                    message={item.message}
                    runs={item.runs}
                    runSourceMessageId={item.runSourceMessageId}
                    userAvatarUrl={user?.avatar ?? null}
                    userDisplayName={user?.display_name ?? user?.username ?? null}
                    onViewDetails={onViewDetails}
                    onTriggerEval={onTriggerEval}
                    showEvalButton={showEvalButton}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 初始加载状态 */}
      {isLoading && displayRows.length === 0 && (
        <div 
          className="flex items-center justify-center h-full"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="ml-2 text-muted-foreground">
            {t("chat.message.loading")}
          </span>
        </div>
      )}
    </div>
  );
}

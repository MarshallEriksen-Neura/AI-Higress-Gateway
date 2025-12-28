"use client";

import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, ThumbsUp, ThumbsDown, RotateCw, Trash2 } from "lucide-react";
import { useChatLayoutStore } from "@/lib/stores/chat-layout-store";
import { cn } from "@/lib/utils";

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model?: string;
}

interface MessageListVirtualProps {
  messages: Message[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onRetryAssistantMessage?: (messageId: string) => void;
  onDeleteAssistantMessage?: (messageId: string) => void;
}

export function MessageListVirtual({
  messages,
  hasMore,
  isLoading,
  onLoadMore,
  onRetryAssistantMessage,
  onDeleteAssistantMessage,
}: MessageListVirtualProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isImmersive = useChatLayoutStore((s) => s.isImmersive);

  // 虚拟化配置
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // 预估每条消息高度
    overscan: 5, // 预渲染上下各 5 条
  });

  // 监听滚动到顶部，触发加载更多
  useEffect(() => {
    const [firstItem] = virtualizer.getVirtualItems();
    
    if (!firstItem) return;
    
    // 当滚动到接近顶部时，加载更多历史消息
    if (firstItem.index === 0 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [
    virtualizer.getVirtualItems(),
    hasMore,
    isLoading,
    onLoadMore,
  ]);

  // 自动滚动到底部（新消息到达时）
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: "end",
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      style={{ contain: "strict" }}
    >
      {/* 加载更多指示器 */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 虚拟化列表容器 */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          if (!message) return null;
          
          const isUser = message.role === "user";
          const formattedTime = formatTime(message.timestamp);
          const handleRetry = () => onRetryAssistantMessage?.(message.id);
          const handleDelete = () => onDeleteAssistantMessage?.(message.id);

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div
                className={cn(
                  "w-full py-3",
                  isImmersive ? "mx-auto max-w-4xl px-4" : "px-3 md:px-6"
                )}
              >
                {/* 用户消息 */}
                {isUser ? (
                  <div className="flex gap-3 justify-end items-start group">
                    <div className="flex flex-col items-end gap-2 max-w-[min(800px,85%)] md:max-w-[min(800px,70%)]">
                      <div className="relative bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] text-white rounded-[22px] rounded-tr-[6px] rounded-br-[22px] rounded-bl-[22px] px-5 py-3.5 shadow-[0_8px_24px_rgba(124,58,237,0.25)]">
                        <p className="text-[15px] leading-[1.65] tracking-[0.01em] whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      {formattedTime && (
                        <span className="text-[11px] text-muted-foreground/50 font-light">
                          {formattedTime}
                        </span>
                      )}
                    </div>
                    <Avatar className="w-10 h-10 flex-shrink-0 ring-1 ring-primary/10">
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 to-primary/25 flex items-center justify-center text-xs font-medium text-primary">
                        U
                      </div>
                    </Avatar>
                  </div>
                ) : (
                  /* 助手消息 */
                  <div className="flex gap-3 items-start group">
                    <Avatar className="w-10 h-10 flex-shrink-0 ring-1 ring-border/30">
                      <AvatarImage
                        src="/images/robot.png"
                        alt="Assistant"
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-base">
                        🤖
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 max-w-[min(800px,90%)] md:max-w-[min(800px,75%)]">
                      <div className="group/bubble relative bg-background rounded-[22px] rounded-tl-[6px] px-6 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)]">
                        {/* Markdown 内容区域 - 优化行高和间距 */}
                        <div className="prose prose-sm max-w-none">
                          <div className="text-[15px] leading-[1.7] tracking-[0.01em] whitespace-pre-wrap break-words text-foreground/90">
                            {/* 解析内容中的关键词并高亮 */}
                            {message.content.split('\n').map((line, idx) => {
                              // 检测列表项
                              const isListItem = /^\d+\.\s/.test(line);
                              // 检测关键词（如 docx, pdf 等）
                              const highlightedLine = line.replace(
                                /\b(docx|pdf|API|JSON|HTTP|REST|GraphQL)\b/gi,
                                (match) => `<mark class="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">${match}</mark>`
                              );
                              
                              return (
                                <p 
                                  key={idx} 
                                  className={isListItem ? "mb-2.5 pl-0" : "mb-3"}
                                  dangerouslySetInnerHTML={{ __html: highlightedLine }}
                                />
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* 底部信息栏 */}
                        <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-2.5 text-[11px]">
                          {message.model && (
                            <Badge 
                              variant="secondary" 
                              className="bg-muted/50 text-muted-foreground/70 hover:bg-muted/70 font-normal px-2 py-0.5 text-[10px]"
                            >
                              {message.model}
                            </Badge>
                          )}
                          {formattedTime && (
                            <span className="text-muted-foreground/50 font-light">
                              {formattedTime}
                            </span>
                          )}
                          <div className="flex-1" />
                          {/* 操作按钮 - hover 显示 */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground/80 rounded-lg"
                            >
                              <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground/80 rounded-lg"
                              onClick={handleRetry}
                            >
                              <RotateCw className="h-3.5 w-3.5 stroke-[1.5]" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground/80 rounded-lg"
                              onClick={handleDelete}
                            >
                              <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground/80 rounded-lg"
                            >
                              <ThumbsUp className="h-3.5 w-3.5 stroke-[1.5]" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground/80 rounded-lg"
                            >
                              <ThumbsDown className="h-3.5 w-3.5 stroke-[1.5]" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 没有更多消息提示 */}
      {!hasMore && messages.length > 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground/60">
          已加载全部消息
        </div>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";
import { AdaptiveCard } from "@/components/cards/adaptive-card";
import { CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

export interface MessageBubbleProps {
  /**
   * 消息角色：user（用户）或 assistant（AI助手）
   */
  role: "user" | "assistant";
  /**
   * 气泡内容
   */
  children: ReactNode;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 聊天消息气泡组件
 *
 * 用户消息：蓝色背景，右对齐
 * AI 消息：简洁卡片样式，左对齐
 */
export function MessageBubble({ role, children, className }: MessageBubbleProps) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";

  return (
    <AdaptiveCard
      showDecor={false}
      variant="plain"
      hoverScale={false}
      className={cn(
        "py-0 gap-0 relative",
        isUser && "bg-primary text-primary-foreground border-0 shadow-md",
        isAssistant && "bg-background/95 backdrop-blur-sm border border-border shadow-sm hover:shadow-md transition-shadow",
        className
      )}
    >
      <CardContent className="py-3 px-4">
        {children}
      </CardContent>
    </AdaptiveCard>
  );
}

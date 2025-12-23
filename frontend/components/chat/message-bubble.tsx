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
 * AI 消息：渐变边框 + 毛玻璃效果，左对齐
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
        isUser && "bg-primary text-primary-foreground border-0 shadow-sm",
        isAssistant && "bg-gradient-to-br from-slate-50/50 via-white/95 to-slate-50/30 dark:from-slate-900/50 dark:via-slate-800/95 dark:to-slate-900/30 backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40 shadow-sm",
        isAssistant && "before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-br before:from-slate-200/30 before:via-slate-100/20 before:to-slate-200/20 dark:before:from-slate-700/30 dark:before:via-slate-600/20 dark:before:to-slate-700/20 before:-z-10",
        className
      )}
    >
      <CardContent className="py-3 px-4">
        {children}
      </CardContent>
    </AdaptiveCard>
  );
}

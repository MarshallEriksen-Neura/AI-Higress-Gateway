"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Mic } from "lucide-react";
import { MessageListVirtual, Message } from "./message-list-virtual";
import { useUserPreferencesStore } from "@/lib/stores/user-preferences-store";

// 模拟消息数据（后续替换为真实 API）
const mockMessages: Message[] = Array.from({ length: 100 }, (_, i) => ({
  id: `msg-${i}`,
  role: i % 2 === 0 ? "user" : "assistant",
  content:
    i % 2 === 0
      ? `这是用户消息 ${i + 1}`
      : `这是助手回复 ${i + 1}。优化 API 性能可以从以下几个方面入手：\n1. 使用缓存策略减少数据库查询\n2. 实现分页和懒加载\n3. 优化数据库索引\n4. 使用 CDN 加速静态资源`,
  timestamp: new Date(Date.now() - i * 60000).toISOString(),
  model: i % 2 === 1 ? "claude-4.5-sonnet" : undefined,
}));

export function ChatMain() {
  const [messages, setMessages] = useState<Message[]>(mockMessages.slice(0, 20));
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const { preferences } = useUserPreferencesStore();

  // 加载更多历史消息（向上滚动时触发）
  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // 模拟 API 请求延迟
    setTimeout(() => {
      const currentLength = messages.length;
      const nextBatch = mockMessages.slice(
        currentLength,
        currentLength + 20
      );

      if (nextBatch.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...nextBatch, ...prev]);
      }

      setIsLoading(false);
    }, 1000);
  };

  // 重新生成助手回复
  const handleRetryAssistantMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.role === "assistant"
          ? {
              ...msg,
              content: "重新生成中...",
              timestamp: new Date().toISOString(),
            }
          : msg
      )
    );

    const regeneratedContent =
      "这是重新生成的助手回复，已根据最新上下文更新内容。";

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId && msg.role === "assistant"
            ? {
                ...msg,
                content: regeneratedContent,
                timestamp: new Date().toISOString(),
              }
            : msg
        )
      );
    }, 800);
  };

  // 删除助手回复
  const handleDeleteAssistantMessage = (messageId: string) => {
    setMessages((prev) => {
      const target = prev.find((msg) => msg.id === messageId);
      if (!target || target.role !== "assistant") return prev;
      return prev.filter((msg) => msg.id !== messageId);
    });
  };

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: `msg-new-${Date.now()}`,
      role: "user" as const,
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    // 模拟助手回复
    setTimeout(() => {
      const assistantReply = {
        id: `msg-reply-${Date.now()}`,
        role: "assistant" as const,
        content: "这是助手的回复...",
        timestamp: new Date().toISOString(),
        model: "claude-4.5-sonnet",
      };
      setMessages((prev) => [...prev, assistantReply]);
    }, 1000);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 根据用户偏好设置决定发送方式
    if (preferences.sendShortcut === "enter") {
      // Enter 发送，Shift+Enter 换行
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    } else {
      // Ctrl+Enter 发送，Enter 换行
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background via-muted/30 to-muted/50">
      {/* 顶部：当前助手信息 - 毛玻璃效果 */}
      <div className="backdrop-blur-2xl bg-background/60 border-b border-border/20 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="text-2xl">🎓</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-[15px] truncate tracking-tight">斯坦福教授</h2>
            <p className="text-[11px] text-muted-foreground/50 truncate leading-relaxed font-light">
              claude-4.5-sonnet
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground/50 hidden md:block font-light">
            {messages.length} 条消息
          </div>
        </div>
      </div>

      {/* 中间：虚拟化消息列表 */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center py-12 max-w-md">
            <div className="text-6xl mb-6">👋</div>
            <h3 className="text-2xl font-semibold mb-3">中午好</h3>
            <p className="text-muted-foreground/80 text-sm leading-relaxed">
              我是您的AI智能助手，请问我能帮您做些什么？
            </p>
          </div>
        </div>
      ) : (
        <MessageListVirtual
          messages={messages}
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={handleLoadMore}
          onRetryAssistantMessage={handleRetryAssistantMessage}
          onDeleteAssistantMessage={handleDeleteAssistantMessage}
        />
      )}

      {/* 底部：悬浮式输入框 */}
      <div className="px-4 pb-6 pt-4 md:px-6 md:pb-8">
        <div className="max-w-4xl mx-auto">
          {/* 输入框容器 - 悬浮设计 */}
          <div className="relative bg-background rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-border/40 p-3 transition-shadow duration-200 hover:shadow-[0_12px_48px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)]">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                preferences.sendShortcut === "enter"
                  ? "输入您的消息，按 Enter 键发送..."
                  : "输入您的消息，按 Ctrl + Enter 键发送..."
              }
              className="min-h-[72px] max-h-[200px] border-0 bg-transparent rounded-2xl resize-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-32 text-[15px] leading-[1.65] tracking-[0.01em] placeholder:text-muted-foreground/40"
            />
            {/* 工具栏 */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-9 w-9 hover:bg-muted/40 rounded-full text-muted-foreground/60 hover:text-foreground/80 transition-colors"
              >
                <Paperclip className="h-4 w-4 stroke-[1.5]" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-9 w-9 hover:bg-muted/40 rounded-full text-muted-foreground/60 hover:text-foreground/80 transition-colors"
              >
                <Mic className="h-4 w-4 stroke-[1.5]" />
              </Button>
              <div className="w-px h-5 bg-border/40 mx-1" />
              <Button
                size="icon"
                className="h-10 w-10 rounded-full shadow-[0_4px_12px_rgba(124,58,237,0.3)] bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                onClick={handleSend}
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4 stroke-[2]" />
              </Button>
            </div>
          </div>
          {/* 提示文字 */}
          <div className="mt-3 text-[11px] text-muted-foreground/40 text-center font-light">
            AI 可能会犯错，请核实重要信息
          </div>
        </div>
      </div>
    </div>
  );
}

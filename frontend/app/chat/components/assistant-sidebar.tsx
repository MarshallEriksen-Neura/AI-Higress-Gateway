"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";

export function AssistantSidebar() {
  return (
    <div className="flex h-full flex-col bg-background/50 backdrop-blur-xl border-r border-border/30 shadow-[0_0_24px_rgba(0,0,0,0.03)]">
      {/* 头部：搜索 + 新建 */}
      <div className="border-b border-border/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50 stroke-[1.5]" />
            <Input
              placeholder="搜索助手..."
              className="pl-9 bg-background/60 border-border/40 rounded-xl shadow-sm focus-visible:ring-1 focus-visible:ring-primary/30 text-[14px] h-9"
            />
          </div>
          <Button 
            size="icon" 
            variant="outline" 
            className="h-9 w-9 rounded-xl border-border/40 shadow-sm hover:bg-primary/5 hover:border-primary/30 transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[1.5]" />
          </Button>
        </div>
      </div>

      {/* 助手列表 */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {/* 示例助手项 */}
          {[
            { name: "斯坦福教授", model: "claude-4.5-sonnet", icon: "🎓" },
            { name: "API 文档助手", model: "gpt-4.1-turbo-16k", icon: "📚" },
            { name: "Zustand reducer Expert", model: "gpt-4.1-mini", icon: "⚡" },
            { name: "React Native 编码助手", model: "gpt-4.1-mini", icon: "📱" },
            { name: "编程专家代理", model: "gpt-4.1-mini", icon: "💻" },
            { name: "软件开发入门", model: "gpt-4.1-mini", icon: "🚀" },
            { name: "别墅 TypeScript 建筑专家", model: "gpt-4.1-mini", icon: "🏗️" },
          ].map((assistant, index) => (
            <div
              key={index}
              className="p-3 cursor-pointer rounded-xl bg-background/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-background/80 border border-transparent hover:border-primary/10"
            >
              <div className="flex items-start gap-3">
                <div className="text-xl">{assistant.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px] truncate tracking-tight">
                    {assistant.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground/50 truncate mt-0.5 font-light">
                    {assistant.model}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 底部：查看全部 */}
      <div className="border-t border-border/30 p-4">
        <Button 
          variant="outline" 
          className="w-full rounded-xl border-border/40 shadow-sm hover:bg-primary/5 hover:border-primary/30 text-[13px] h-9 transition-colors" 
          size="sm"
        >
          查看全部助手
        </Button>
      </div>
    </div>
  );
}

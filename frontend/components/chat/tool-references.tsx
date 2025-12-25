"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

export interface ToolReference {
  agent: string;
  tools: string[];
}

export interface ToolReferencesProps {
  references: ToolReference[];
  className?: string;
}

/**
 * 工具引用组件 - 极简胶囊风格
 * 
 * 设计理念：
 * - 弱化技术细节，突出"信任背书"
 * - 类似 Perplexity 的引用源展示
 * - 半透明背景 + 精致图标
 */
export function ToolReferences({ references, className }: ToolReferencesProps) {
  const { t } = useI18n();
  if (!references.length) return null;

  const maxTitleItems = 20;

  const normalized = references
    .map((ref) => {
      const agent = (ref.agent || "").trim();
      const tools = Array.from(new Set((ref.tools || []).map((x) => (x || "").trim()).filter(Boolean)));
      return { agent, tools };
    })
    .filter((ref) => ref.agent && ref.tools.length);
  if (!normalized.length) return null;

  const first = normalized[0];
  if (!first) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 mt-3", className)}>
      {normalized.length === 1 ? (
        <Badge
          variant="secondary"
          className={cn(
            "px-2.5 py-1 rounded-full",
            "bg-background/60 backdrop-blur-sm",
            "border border-border/40",
            "text-xs font-normal text-muted-foreground",
            "hover:bg-background/80 hover:border-border/60",
            "transition-all duration-200",
            "cursor-default"
          )}
          title={
            first.tools.slice(0, maxTitleItems).join(", ") +
            (first.tools.length > maxTitleItems ? `, +${first.tools.length - maxTitleItems}` : "")
          }
        >
          <span>{t("chat.tool_invocations.badge_single", { count: first.tools.length })}</span>
        </Badge>
      ) : (
        normalized.map(({ agent, tools }) => (
          <Badge
            key={agent}
            variant="secondary"
            className={cn(
              "px-2.5 py-1 rounded-full",
              "bg-background/60 backdrop-blur-sm",
              "border border-border/40",
              "text-xs font-normal text-muted-foreground",
              "hover:bg-background/80 hover:border-border/60",
              "transition-all duration-200",
              "cursor-default"
            )}
            title={tools.slice(0, maxTitleItems).join(", ") + (tools.length > maxTitleItems ? `, +${tools.length - maxTitleItems}` : "")}
          >
            <span className="max-w-[220px] truncate">
              {t("chat.tool_invocations.badge_agent", { agent, count: tools.length })}
            </span>
          </Badge>
        ))
      )}
    </div>
  );
}

/**
 * 工具引用组件 - 带 Agent 分组（可选）
 * 当需要显示是哪个 Agent 调用的工具时使用
 */
export function ToolReferencesGrouped({ references, className }: ToolReferencesProps) {
  const { t } = useI18n();
  if (!references.length) return null;

  return (
    <div className={cn("space-y-2 mt-3", className)}>
      {references.map(({ agent, tools }) => {
        const agentName = agent;
        
        return (
          <div key={agent} className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground/60 font-medium">
              {agentName}:
            </span>
            {tools.map((tool) => {
              const label = tool;
              return (
                <Badge
                  key={`${agent}-${tool}`}
                  variant="secondary"
                  className={cn(
                    "group relative",
                    "px-2.5 py-1 rounded-full",
                    "bg-background/60 backdrop-blur-sm",
                    "border border-border/40",
                    "text-xs font-normal text-muted-foreground",
                    "hover:bg-background/80 hover:border-border/60",
                    "transition-all duration-200",
                    "cursor-default"
                  )}
                  title={tool}
                >
                  <span>{label || t("chat.tool_invocations.unknown_tool")}</span>
                </Badge>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

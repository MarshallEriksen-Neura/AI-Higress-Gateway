import { Globe, Search, Database, Code, FileText, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * 工具名称映射配置
 * 将技术性的工具名转换为用户友好的描述
 */
const TOOL_NAME_MAP: Record<string, { label: string; icon: LucideIcon }> = {
  // Tavily 搜索工具
  "tavily_remote_tavily_search": { label: "联网搜索", icon: Globe },
  "tavily_remote_tavily_extract": { label: "网页提取", icon: FileText },
  "tavily_remote_tavily_crawl": { label: "网站爬取", icon: Search },
  "tavily_remote_tavily_map": { label: "网站地图", icon: Search },
  
  // 其他常见工具
  "web_search": { label: "网络搜索", icon: Search },
  "database_query": { label: "数据查询", icon: Database },
  "code_execution": { label: "代码执行", icon: Code },
  "file_read": { label: "文件读取", icon: FileText },
};

/**
 * Agent 名称映射
 * 将技术性的 agent ID 转换为友好名称
 */
const AGENT_NAME_MAP: Record<string, string> = {
  "my-agent": "AI 助手",
  "tavily": "Tavily",
  "search-agent": "搜索助手",
};

/**
 * 获取工具的友好显示信息
 */
function getToolDisplay(toolName: string): { label: string; icon: LucideIcon } {
  // 精确匹配
  if (TOOL_NAME_MAP[toolName]) {
    return TOOL_NAME_MAP[toolName];
  }
  
  // 模糊匹配：包含关键词
  const lowerTool = toolName.toLowerCase();
  if (lowerTool.includes("search") || lowerTool.includes("tavily")) {
    return { label: "联网搜索", icon: Globe };
  }
  if (lowerTool.includes("extract") || lowerTool.includes("fetch")) {
    return { label: "网页提取", icon: FileText };
  }
  if (lowerTool.includes("crawl")) {
    return { label: "网站爬取", icon: Search };
  }
  if (lowerTool.includes("database") || lowerTool.includes("query")) {
    return { label: "数据查询", icon: Database };
  }
  if (lowerTool.includes("code") || lowerTool.includes("execute")) {
    return { label: "代码执行", icon: Code };
  }
  
  // 默认
  return { label: toolName, icon: Zap };
}

/**
 * 获取 Agent 的友好名称
 */
function getAgentName(agentId: string): string {
  return AGENT_NAME_MAP[agentId] || agentId;
}

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
  if (!references.length) return null;

  // 收集所有使用的工具（去重）
  const allTools = new Set<string>();
  references.forEach(ref => {
    ref.tools.forEach(tool => allTools.add(tool));
  });

  const uniqueTools = Array.from(allTools);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 mt-3", className)}>
      {uniqueTools.map((tool) => {
        const { label, icon: Icon } = getToolDisplay(tool);
        
        return (
          <Badge
            key={tool}
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
            <Icon className="size-3 mr-1.5 opacity-60" strokeWidth={2} />
            <span>{label}</span>
          </Badge>
        );
      })}
    </div>
  );
}

/**
 * 工具引用组件 - 带 Agent 分组（可选）
 * 当需要显示是哪个 Agent 调用的工具时使用
 */
export function ToolReferencesGrouped({ references, className }: ToolReferencesProps) {
  if (!references.length) return null;

  return (
    <div className={cn("space-y-2 mt-3", className)}>
      {references.map(({ agent, tools }) => {
        const agentName = getAgentName(agent);
        
        return (
          <div key={agent} className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground/60 font-medium">
              {agentName}:
            </span>
            {tools.map((tool) => {
              const { label, icon: Icon } = getToolDisplay(tool);
              
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
                  <Icon className="size-3 mr-1.5 opacity-60" strokeWidth={2} />
                  <span>{label}</span>
                </Badge>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

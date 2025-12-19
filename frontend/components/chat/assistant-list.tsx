"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { AssistantCard } from "./assistant-card";
import type { Assistant } from "@/lib/api-types";

interface AssistantListProps {
  assistants: Assistant[];
  isLoading?: boolean;
  selectedAssistantId?: string;
  onSelectAssistant?: (assistantId: string) => void;
  onCreateAssistant?: () => void;
  onEditAssistant?: (assistant: Assistant) => void;
  onArchiveAssistant?: (assistantId: string) => void;
  onDeleteAssistant?: (assistantId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function AssistantList({
  assistants,
  isLoading = false,
  selectedAssistantId,
  onSelectAssistant,
  onCreateAssistant,
  onEditAssistant,
  onArchiveAssistant,
  onDeleteAssistant,
  onLoadMore,
  hasMore = false,
}: AssistantListProps) {
  const { t } = useI18n();

  // 加载状态
  if (isLoading && assistants.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("chat.assistant.title")}</h2>
          <Button size="sm" disabled>
            <Plus className="w-4 h-4 mr-1" />
            {t("chat.assistant.create")}
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // 空状态
  if (!isLoading && assistants.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("chat.assistant.title")}</h2>
          <Button size="sm" onClick={onCreateAssistant}>
            <Plus className="w-4 h-4 mr-1" />
            {t("chat.assistant.create")}
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-muted-foreground mb-4">
            <div className="text-lg font-medium mb-2">
              {t("chat.assistant.empty")}
            </div>
            <div className="text-sm">
              {t("chat.assistant.empty_description")}
            </div>
          </div>
          <Button onClick={onCreateAssistant}>
            <Plus className="w-4 h-4 mr-2" />
            {t("chat.assistant.create")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题和创建按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("chat.assistant.title")}</h2>
        <Button size="sm" onClick={onCreateAssistant}>
          <Plus className="w-4 h-4 mr-1" />
          {t("chat.assistant.create")}
        </Button>
      </div>

      {/* 助手列表 */}
      <div className="space-y-3">
        {assistants.map((assistant) => (
          <AssistantCard
            key={assistant.assistant_id}
            assistant={assistant}
            isSelected={selectedAssistantId === assistant.assistant_id}
            onSelect={onSelectAssistant}
            onEdit={onEditAssistant}
            onArchive={onArchiveAssistant}
            onDelete={onDeleteAssistant}
          />
        ))}
      </div>

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? t("chat.assistant.loading") : t("chat.message.load_more")}
          </Button>
        </div>
      )}
    </div>
  );
}

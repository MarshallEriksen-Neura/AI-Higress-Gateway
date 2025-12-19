"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { ConversationItem } from "./conversation-item";
import type { Conversation } from "@/lib/api-types";

interface ConversationListProps {
  conversations: Conversation[];
  isLoading?: boolean;
  selectedConversationId?: string;
  onSelectConversation?: (conversationId: string) => void;
  onCreateConversation?: () => void;
  onArchiveConversation?: (conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * 会话列表组件
 * 显示会话列表（按时间倒序），支持选中会话、分页加载和新建会话
 */
export function ConversationList({
  conversations,
  isLoading = false,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
  onArchiveConversation,
  onDeleteConversation,
  onLoadMore,
  hasMore = false,
}: ConversationListProps) {
  const { t } = useI18n();

  // 加载状态
  if (isLoading && conversations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("chat.conversation.title")}</h2>
          <Button size="sm" disabled>
            <Plus className="w-4 h-4 mr-1" />
            {t("chat.conversation.create")}
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // 空状态
  if (!isLoading && conversations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("chat.conversation.title")}</h2>
          <Button size="sm" onClick={onCreateConversation}>
            <Plus className="w-4 h-4 mr-1" />
            {t("chat.conversation.create")}
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-muted-foreground mb-4">
            <div className="text-lg font-medium mb-2">
              {t("chat.conversation.empty")}
            </div>
            <div className="text-sm">
              {t("chat.conversation.empty_description")}
            </div>
          </div>
          <Button onClick={onCreateConversation}>
            <Plus className="w-4 h-4 mr-2" />
            {t("chat.conversation.create")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题和创建按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("chat.conversation.title")}</h2>
        <Button size="sm" onClick={onCreateConversation}>
          <Plus className="w-4 h-4 mr-1" />
          {t("chat.conversation.create")}
        </Button>
      </div>

      {/* 会话列表 */}
      <div className="space-y-3">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.conversation_id}
            conversation={conversation}
            isSelected={selectedConversationId === conversation.conversation_id}
            onSelect={onSelectConversation}
            onArchive={onArchiveConversation}
            onDelete={onDeleteConversation}
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
            {isLoading ? t("chat.conversation.loading") : t("chat.message.load_more")}
          </Button>
        </div>
      )}
    </div>
  );
}

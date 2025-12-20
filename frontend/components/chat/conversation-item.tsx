"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreVertical, Archive, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import type { Conversation } from "@/lib/api-types";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  onSelect?: (conversationId: string) => void;
  onArchive?: (conversationId: string) => void;
  onDelete?: (conversationId: string) => void;
}

/**
 * 会话列表项组件
 * 显示会话 title 和 last_activity_at，提供归档和删除按钮
 */
export function ConversationItem({
  conversation,
  isSelected = false,
  onSelect,
  onArchive,
  onDelete,
}: ConversationItemProps) {
  const { t } = useI18n();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(conversation.conversation_id);
    }
  };

  const handleArchiveConfirm = () => {
    if (onArchive) {
      onArchive(conversation.conversation_id);
    }
    setShowArchiveDialog(false);
  };


  // 格式化时间显示
  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return t("chat.conversation.just_now") || "刚刚";
    } else if (diffMins < 60) {
      return `${diffMins} ${t("chat.conversation.minutes_ago") || "分钟前"}`;
    } else if (diffHours < 24) {
      return `${diffHours} ${t("chat.conversation.hours_ago") || "小时前"}`;
    } else if (diffDays < 7) {
      return `${diffDays} ${t("chat.conversation.days_ago") || "天前"}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter 或 Space 键选择会话
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${t("chat.conversation.select")} ${conversation.title || t("chat.conversation.untitled")}`}
        aria-pressed={isSelected}
      >
        <CardHeader>
          <CardTitle className="text-base">
            {conversation.title || t("chat.conversation.untitled")}
          </CardTitle>
          <CardDescription>
            {t("chat.conversation.last_activity")}: {formatLastActivity(conversation.last_activity_at)}
          </CardDescription>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon-sm"
                  aria-label={t("chat.conversation.actions")}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowArchiveDialog(true);
                  }}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {t("chat.conversation.archive")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) {
                      onDelete(conversation.conversation_id);
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("chat.conversation.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
      </Card>

      {/* 归档确认对话框 */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent aria-describedby="archive-conversation-dialog-description">
          <DialogHeader>
            <DialogTitle>{t("chat.conversation.archive")}</DialogTitle>
            <DialogDescription id="archive-conversation-dialog-description">
              {t("chat.conversation.archive_confirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
            >
              {t("chat.action.cancel")}
            </Button>
            <Button onClick={handleArchiveConfirm} autoFocus>
              {t("chat.action.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

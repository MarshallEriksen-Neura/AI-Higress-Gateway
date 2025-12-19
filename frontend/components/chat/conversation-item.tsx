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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(conversation.conversation_id);
    }
    setShowDeleteDialog(false);
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

  return (
    <>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={handleCardClick}
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
                <Button variant="ghost" size="icon-sm">
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
                    setShowDeleteDialog(true);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.conversation.archive")}</DialogTitle>
            <DialogDescription>
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
            <Button onClick={handleArchiveConfirm}>
              {t("chat.action.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.conversation.delete")}</DialogTitle>
            <DialogDescription>
              {t("chat.conversation.delete_confirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              {t("chat.action.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t("chat.action.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

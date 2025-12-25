"use client";

import { useState } from "react";
import { AdaptiveCard } from "@/components/cards/adaptive-card";
import { CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { MoreVertical, Edit, Archive, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import type { Assistant } from "@/lib/api-types";

interface AssistantCardProps {
  assistant: Assistant;
  isSelected?: boolean;
  onSelect?: (assistantId: string) => void;
  onEdit?: (assistant: Assistant) => void;
  onArchive?: (assistantId: string) => void;
  onDelete?: (assistantId: string) => void;
}

export function AssistantCard({
  assistant,
  isSelected = false,
  onSelect,
  onEdit,
  onArchive,
  onDelete,
}: AssistantCardProps) {
  const { t } = useI18n();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(assistant.assistant_id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(assistant);
    }
  };

  const handleArchiveConfirm = () => {
    if (onArchive) {
      onArchive(assistant.assistant_id);
    }
    setShowArchiveDialog(false);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(assistant.assistant_id);
    }
    setShowDeleteDialog(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter 或 Space 键选择助手
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <>
      <AdaptiveCard
        showDecor={false}
        selected={isSelected}
        className="cursor-pointer transition-all hover:bg-muted/40 hover:shadow-md hover:scale-100 data-[state=selected]:hover:bg-transparent"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${t("chat.assistant.select")} ${assistant.name}`}
        aria-pressed={isSelected}
      >
        <CardHeader>
          <CardTitle className="text-[15px] leading-snug">{assistant.name}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground/75">
            {t("chat.assistant.default_model")}: {assistant.default_logical_model}
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              {isSelected ? (
                <Badge
                  variant="default"
                  className="h-5 px-2 text-[10px] leading-none"
                >
                  {t("chat.action.selected")}
                </Badge>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon-sm"
                    aria-label={t("chat.assistant.actions")}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t("chat.assistant.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowArchiveDialog(true);
                    }}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {t("chat.assistant.archive")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("chat.assistant.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardAction>
        </CardHeader>
      </AdaptiveCard>

      {/* 归档确认对话框 */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent aria-describedby="archive-dialog-description">
          <DialogHeader>
            <DialogTitle>{t("chat.assistant.archive")}</DialogTitle>
            <DialogDescription id="archive-dialog-description">
              {t("chat.assistant.archive_confirm")}
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

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent aria-describedby="delete-dialog-description">
          <DialogHeader>
            <DialogTitle>{t("chat.assistant.delete")}</DialogTitle>
            <DialogDescription id="delete-dialog-description">
              {t("chat.assistant.delete_confirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              {t("chat.action.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} autoFocus>
              {t("chat.action.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

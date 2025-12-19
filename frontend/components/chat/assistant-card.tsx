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

  return (
    <>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={handleCardClick}
      >
        <CardHeader>
          <CardTitle>{assistant.name}</CardTitle>
          <CardDescription>
            {t("chat.assistant.default_model")}: {assistant.default_logical_model}
          </CardDescription>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon-sm">
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
          </CardAction>
        </CardHeader>
      </Card>

      {/* 归档确认对话框 */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.assistant.archive")}</DialogTitle>
            <DialogDescription>
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
            <DialogTitle>{t("chat.assistant.delete")}</DialogTitle>
            <DialogDescription>
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
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t("chat.action.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

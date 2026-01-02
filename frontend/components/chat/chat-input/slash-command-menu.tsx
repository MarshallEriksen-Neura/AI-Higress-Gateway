"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, MessageSquare, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";
import type { ComposerMode } from "@/lib/chat/composer-modes";
import { composerModeLabelKeys } from "@/lib/chat/composer-modes";

interface SlashCommand {
  id: ComposerMode;
  command: string;
  aliases: string[];
  icon: typeof MessageSquare;
  labelKey: string;
}

const slashCommands: SlashCommand[] = [
  {
    id: "chat",
    command: "/chat",
    aliases: ["/c"],
    icon: MessageSquare,
    labelKey: composerModeLabelKeys.chat,
  },
  {
    id: "image",
    command: "/image",
    aliases: ["/img", "/i"],
    icon: ImageIcon,
    labelKey: composerModeLabelKeys.image,
  },
  {
    id: "speech",
    command: "/audio",
    aliases: ["/voice", "/tts", "/a"],
    icon: Volume2,
    labelKey: composerModeLabelKeys.speech,
  },
];

export interface SlashCommandMenuProps {
  inputText: string;
  onSelectCommand: (mode: ComposerMode) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export function SlashCommandMenu({
  inputText,
  onSelectCommand,
  onClose,
  position,
}: SlashCommandMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 检测输入是否匹配斜杠命令
  const matchingCommands = useMemo(() => {
    const text = inputText.toLowerCase().trim();
    if (!text.startsWith("/")) return [];

    return slashCommands.filter((cmd) => {
      // 匹配主命令
      if (cmd.command.startsWith(text)) return true;
      // 匹配别名
      return cmd.aliases.some((alias) => alias.startsWith(text));
    });
  }, [inputText]);

  const isVisible = matchingCommands.length > 0;

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % matchingCommands.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + matchingCommands.length) % matchingCommands.length);
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          const selected = matchingCommands[selectedIndex];
          if (selected) {
            onSelectCommand(selected.id);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isVisible, matchingCommands, selectedIndex, onSelectCommand, onClose]
  );

  useEffect(() => {
    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown, true);
      return () => document.removeEventListener("keydown", handleKeyDown, true);
    }
    return undefined;
  }, [isVisible, handleKeyDown]);

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [inputText]);

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute z-50 w-56 rounded-lg border bg-popover p-1 shadow-lg",
        "animate-in fade-in-0 zoom-in-95"
      )}
      style={position ? { bottom: "100%", left: position.left, marginBottom: 8 } : { bottom: "100%", left: 0, marginBottom: 8 }}
    >
      <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
        {t("chat.slash_command.title")}
      </div>
      {matchingCommands.map((cmd, index) => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.id}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
            onClick={() => onSelectCommand(cmd.id)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Icon className="size-4 shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-medium">{t(cmd.labelKey)}</div>
              <div className="text-xs text-muted-foreground">
                {cmd.command} {cmd.aliases.length > 0 && `(${cmd.aliases.join(", ")})`}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// 工具函数：检查文本是否是完整的斜杠命令
export function matchSlashCommand(text: string): ComposerMode | null {
  const trimmed = text.toLowerCase().trim();
  for (const cmd of slashCommands) {
    if (cmd.command === trimmed || cmd.aliases.includes(trimmed)) {
      return cmd.id;
    }
  }
  return null;
}

// 工具函数：检查文本是否以斜杠开头（用于显示菜单）
export function isSlashCommandInput(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("/") && !trimmed.includes(" ");
}

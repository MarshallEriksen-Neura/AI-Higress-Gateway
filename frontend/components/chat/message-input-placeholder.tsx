"use client";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n-context";

export function MessageInputPlaceholder({ hint }: { hint?: string }) {
  const { t } = useI18n();

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background">
      <div className="flex-1">
        <Textarea
          disabled
          rows={1}
          placeholder={hint ?? t("chat.welcome.hint1")}
          aria-label={t("chat.message.input_label")}
          className="min-h-10 resize-none"
        />
      </div>
      <Button
        type="button"
        size="icon"
        disabled
        aria-label={t("chat.message.send")}
        title={t("chat.message.send_hint")}
      >
        <Send className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}


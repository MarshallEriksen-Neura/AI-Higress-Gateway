"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorHandler } from "@/lib/errors";
import { useI18n } from "@/lib/i18n-context";
import { useChatLayoutStore } from "@/lib/stores/chat-layout-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { useAssistants } from "@/lib/swr/use-assistants";
import { useCreateConversation } from "@/lib/swr/use-conversations";
import { useSendMessageToConversation } from "@/lib/swr/use-messages";

export function QuickStartChatInput({
  assistantId,
}: {
  assistantId?: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const {
    selectedProjectId,
    selectedAssistantId,
    setSelectedAssistant,
    setSelectedConversation,
  } = useChatStore();
  const setActiveTab = useChatLayoutStore((s) => s.setActiveTab);

  const needsAutoAssistant = !assistantId && !selectedAssistantId;
  const { assistants } = useAssistants(
    needsAutoAssistant && selectedProjectId
      ? { project_id: selectedProjectId, limit: 50 }
      : { project_id: "", limit: 0 }
  );

  const targetAssistantId = useMemo(() => {
    return assistantId ?? selectedAssistantId ?? assistants[0]?.assistant_id ?? null;
  }, [assistantId, selectedAssistantId, assistants]);

  const createConversation = useCreateConversation();
  const sendMessage = useSendMessageToConversation(targetAssistantId);

  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    !!selectedProjectId && !!targetAssistantId && content.trim().length > 0;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!selectedProjectId) {
      toast.error(t("chat.project.not_selected"));
      return;
    }

    if (!targetAssistantId) {
      toast.error(t("chat.assistant.empty"));
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const conversation = await createConversation({
        project_id: selectedProjectId,
        assistant_id: targetAssistantId,
      });

      await sendMessage(conversation.conversation_id, {
        content: trimmed,
      });

      setContent("");
      setSelectedAssistant(targetAssistantId);
      setSelectedConversation(conversation.conversation_id);
      setActiveTab("conversations");
      router.push(`/chat/${targetAssistantId}/${conversation.conversation_id}`);
    } catch (error) {
      console.error("Quick start chat failed:", error);
      const standardError = ErrorHandler.normalize(error);
      const errorMessage = ErrorHandler.getUserMessage(standardError, t);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background">
      <div className="flex-1">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("chat.message.input_placeholder")}
          rows={1}
          aria-label={t("chat.message.input_label")}
          disabled={isSubmitting}
          className="min-h-10 resize-none"
        />
      </div>

      <Button
        type="button"
        size="icon"
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        aria-label={isSubmitting ? t("chat.message.sending") : t("chat.message.send")}
        title={t("chat.message.send_hint")}
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

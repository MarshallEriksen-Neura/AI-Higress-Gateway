"use client";

import { useMemo, useState, useCallback } from "react";
import { Sparkles, MessageSquare, Image as ImageIcon, Zap } from "lucide-react";

import { useI18n } from "@/lib/i18n-context";
import { useChatStore } from "@/lib/stores/chat-store";
import { useAssistants } from "@/lib/swr/use-assistants";
import { SlateChatInput } from "@/components/chat/slate-chat-input";
import { useQuickStartChat } from "@/lib/hooks/use-quick-start-chat";
import type { ComposerMode } from "@/components/chat/chat-input/chat-toolbar";
import type { ImageGenParams } from "@/components/chat/slate-chat-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useChatLayoutStore } from "@/lib/stores/chat-layout-store";

export function ChatHomeClient({ assistantId }: { assistantId?: string | null } = {}) {
  const { t } = useI18n();

  const { selectedProjectId, selectedAssistantId } = useChatStore();
  const setChatVerticalLayout = useChatLayoutStore((s) => s.setChatVerticalLayout);

  const needsAutoAssistant = !assistantId && !selectedAssistantId;
  const { assistants } = useAssistants(
    needsAutoAssistant && selectedProjectId
      ? { project_id: selectedProjectId, limit: 50 }
      : { project_id: "", limit: 0 }
  );

  const targetAssistantId = useMemo(() => {
    return assistantId ?? selectedAssistantId ?? assistants[0]?.assistant_id ?? null;
  }, [assistantId, selectedAssistantId, assistants]);

  const { handleSend, isSubmitting, canSubmit } = useQuickStartChat({
    assistantId: targetAssistantId,
  });

  // 模式切换状态
  const [mode, setMode] = useState<ComposerMode>("chat");
  const [imageGenParams, setImageGenParams] = useState<ImageGenParams>({
    model: "",
    size: "1024x1024",
    n: 1,
  });

  const defaultVerticalLayout = useMemo(() => {
    const storedVerticalLayout = useChatLayoutStore.getState().chatVerticalLayout;
    if (!storedVerticalLayout) return undefined;
    return storedVerticalLayout;
  }, []);

  const handleVerticalLayoutChange = useCallback(
    (layout: number[]) => {
      setChatVerticalLayout(layout);
    },
    [setChatVerticalLayout]
  );

  const featureCards = [
    {
      icon: MessageSquare,
      title: t("chat.welcome.feature_chat_title"),
      description: t("chat.welcome.feature_chat_desc"),
    },
    {
      icon: ImageIcon,
      title: t("chat.welcome.feature_image_title"),
      description: t("chat.welcome.feature_image_desc"),
    },
    {
      icon: Zap,
      title: t("chat.welcome.feature_fast_title"),
      description: t("chat.welcome.feature_fast_desc"),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <ResizablePanelGroup
        id="chat-home-vertical-layout"
        direction="vertical"
        defaultLayout={defaultVerticalLayout}
        onLayoutChange={handleVerticalLayoutChange}
      >
        <ResizablePanel
          id="welcome-content"
          defaultSize="70%"
          minSize="0%"
          maxSize="100%"
        >
          <div className="h-full overflow-y-auto">
            <div className="w-full max-w-4xl mx-auto px-6 py-12 space-y-12">
              {/* 主标题区域 */}
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
                    <div className="relative rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 p-6">
                      <Sparkles className="h-16 w-16 text-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl font-light tracking-tight">
                    {t("chat.welcome.main_title")}
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {t("chat.welcome.main_description")}
                  </p>
                </div>
              </div>

              {/* 功能卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featureCards.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="group relative rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-border hover:bg-card/80 hover:shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="inline-flex rounded-xl bg-primary/10 p-3">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 示例提示 */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {t("chat.welcome.try_asking")}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    className="inline-flex items-center rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground hover:bg-accent/50"
                    onClick={() => {
                      // 可以在这里触发示例问题
                    }}
                  >
                    {t("chat.welcome.example_1")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle aria-orientation="horizontal" />

        <ResizablePanel
          id="welcome-input"
          defaultSize="30%"
          minSize="0%"
          maxSize="100%"
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col justify-end p-4 pb-6">
              <div className="mx-auto w-full max-w-3xl flex flex-col gap-3 min-h-0">
                {/* 模式切换按钮 */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant={mode === "chat" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("chat")}
                    className={cn(
                      "rounded-full transition-all h-8",
                      mode === "chat" && "shadow-md"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    {t("chat.image_gen.mode_chat")}
                  </Button>
                  <Button
                    variant={mode === "image" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("image")}
                    className={cn(
                      "rounded-full transition-all h-8",
                      mode === "image" && "shadow-md"
                    )}
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                    {t("chat.image_gen.mode_image")}
                  </Button>
                </div>

                <div className="flex-1 min-h-0">
                  <SlateChatInput
                    conversationId="welcome"
                    assistantId={targetAssistantId ?? undefined}
                    projectId={selectedProjectId}
                    disabled={!canSubmit || isSubmitting}
                    mode={mode}
                    onModeChange={setMode}
                    imageGenParams={imageGenParams}
                    onImageGenParamsChange={setImageGenParams}
                    onSend={handleSend}
                    hideModeSwitcher={true}
                    className="border-0 h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

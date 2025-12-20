"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useI18n } from "@/lib/i18n-context";
import { useChatStore } from "@/lib/stores/chat-store";
import { useAssistant, useUpdateAssistant } from "@/lib/swr/use-assistants";
import { useLogicalModels } from "@/lib/swr/use-logical-models";
import { useProjectChatSettings, useUpdateProjectChatSettings } from "@/lib/swr/use-project-chat-settings";

const PROJECT_INHERIT_SENTINEL = "__project__";
const DISABLE_VALUE = "__disable__";

export function ChatSettingsPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedAssistantId } = useChatStore();

  const { settings, mutate: mutateProjectSettings } = useProjectChatSettings(selectedProjectId);
  const updateProjectSettings = useUpdateProjectChatSettings();

  const { assistant, mutate: mutateAssistant } = useAssistant(selectedAssistantId);
  const updateAssistant = useUpdateAssistant();

  const { models } = useLogicalModels();

  const availableChatModels = useMemo(() => {
    const modelSet = new Set<string>(["auto"]);
    for (const model of models) {
      if (!model.enabled) continue;
      if (!model.capabilities?.includes("chat")) continue;
      modelSet.add(model.logical_id);
    }
    return ["auto", ...Array.from(modelSet).filter((m) => m !== "auto").sort()];
  }, [models]);

  const availableTitleModels = useMemo(() => {
    const modelSet = new Set<string>();
    for (const model of models) {
      if (!model.enabled) continue;
      if (!model.capabilities?.includes("chat")) continue;
      if (model.logical_id === "auto") continue;
      modelSet.add(model.logical_id);
    }
    return Array.from(modelSet).sort();
  }, [models]);

  const [savingProject, setSavingProject] = useState(false);
  const [savingAssistant, setSavingAssistant] = useState(false);

  const projectDefaultModel = settings?.default_logical_model ?? "auto";
  const projectTitleModelValue = settings?.title_logical_model ?? null;

  const assistantDefaultModel = assistant?.default_logical_model ?? "auto";
  const assistantTitleModelValue = assistant?.title_logical_model ?? null;

  const updateProjectDefaultModel = async (value: string) => {
    if (!selectedProjectId) return;
    setSavingProject(true);
    try {
      await updateProjectSettings(selectedProjectId, { default_logical_model: value });
      await mutateProjectSettings();
      toast.success(t("chat.settings.saved"));
    } catch (error) {
      console.error("Failed to update project chat default model:", error);
      toast.error(t("chat.settings.save_failed"));
    } finally {
      setSavingProject(false);
    }
  };

  const updateProjectTitleModel = async (value: string) => {
    if (!selectedProjectId) return;
    setSavingProject(true);
    try {
      await updateProjectSettings(selectedProjectId, {
        title_logical_model: value === DISABLE_VALUE ? null : value,
      });
      await mutateProjectSettings();
      toast.success(t("chat.settings.saved"));
    } catch (error) {
      console.error("Failed to update project title model:", error);
      toast.error(t("chat.settings.save_failed"));
    } finally {
      setSavingProject(false);
    }
  };

  const updateAssistantDefaultModel = async (value: string) => {
    if (!selectedAssistantId) return;
    setSavingAssistant(true);
    try {
      await updateAssistant(selectedAssistantId, { default_logical_model: value });
      await mutateAssistant();
      toast.success(t("chat.settings.saved"));
    } catch (error) {
      console.error("Failed to update assistant default model:", error);
      toast.error(t("chat.settings.save_failed"));
    } finally {
      setSavingAssistant(false);
    }
  };

  const updateAssistantTitleModel = async (value: string) => {
    if (!selectedAssistantId) return;
    setSavingAssistant(true);
    try {
      await updateAssistant(selectedAssistantId, {
        title_logical_model: value === DISABLE_VALUE ? null : value,
      });
      await mutateAssistant();
      toast.success(t("chat.settings.saved"));
    } catch (error) {
      console.error("Failed to update assistant title model:", error);
      toast.error(t("chat.settings.save_failed"));
    } finally {
      setSavingAssistant(false);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">
          {t("chat.project.not_selected")}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">{t("chat.settings.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("chat.settings.subtitle")}
          </p>
        </div>

        <Tabs defaultValue="project">
          <TabsList className="w-full">
            <TabsTrigger value="project" className="flex-1">
              {t("chat.settings.tab_project")}
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex-1" disabled={!selectedAssistantId}>
              {t("chat.settings.tab_assistant")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("chat.settings.project.title")}</CardTitle>
                <CardDescription>{t("chat.settings.project.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">{t("chat.settings.project.default_model")}</div>
                  <Select
                    value={projectDefaultModel}
                    onValueChange={(value) => void updateProjectDefaultModel(value)}
                  >
                    <SelectTrigger disabled={savingProject}>
                      <SelectValue placeholder={t("chat.header.model_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChatModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    {t("chat.settings.project.default_model_help")}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">{t("chat.settings.project.title_model")}</div>
                  <Select
                    value={projectTitleModelValue ?? DISABLE_VALUE}
                    onValueChange={(value) => void updateProjectTitleModel(value)}
                  >
                    <SelectTrigger disabled={savingProject}>
                      <SelectValue placeholder={t("chat.assistant.title_model_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DISABLE_VALUE}>
                        {t("chat.settings.title_model_disable")}
                      </SelectItem>
                      {availableTitleModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    {t("chat.settings.project.title_model_help")}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" disabled>
                    {t("chat.settings.auto_saved")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assistant" className="mt-4 space-y-4">
            {!selectedAssistantId ? (
              <div className="text-sm text-muted-foreground">
                {t("chat.settings.assistant.not_selected")}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t("chat.settings.assistant.title")}</CardTitle>
                  <CardDescription>{t("chat.settings.assistant.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">{t("chat.settings.assistant.default_model")}</div>
                    <Select
                      value={assistantDefaultModel}
                      onValueChange={(value) => void updateAssistantDefaultModel(value)}
                    >
                      <SelectTrigger disabled={savingAssistant}>
                        <SelectValue placeholder={t("chat.header.model_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PROJECT_INHERIT_SENTINEL}>
                          {t("chat.settings.assistant.follow_project")}
                        </SelectItem>
                        {availableChatModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {t("chat.settings.assistant.default_model_help")}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm font-medium">{t("chat.settings.assistant.title_model")}</div>
                    <Select
                      value={assistantTitleModelValue ?? DISABLE_VALUE}
                      onValueChange={(value) => void updateAssistantTitleModel(value)}
                    >
                      <SelectTrigger disabled={savingAssistant}>
                        <SelectValue placeholder={t("chat.assistant.title_model_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DISABLE_VALUE}>
                          {t("chat.settings.title_model_disable")}
                        </SelectItem>
                        <SelectItem value={PROJECT_INHERIT_SENTINEL}>
                          {t("chat.settings.assistant.follow_project")}
                        </SelectItem>
                        {availableTitleModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {t("chat.settings.assistant.title_model_help")}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" disabled>
                      {t("chat.settings.auto_saved")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


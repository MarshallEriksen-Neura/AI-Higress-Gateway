"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import type { Assistant, CreateAssistantRequest, UpdateAssistantRequest } from "@/lib/api-types";

interface AssistantFormData {
  name: string;
  system_prompt?: string;
  default_logical_model: string;
  title_logical_model?: string;
}

interface AssistantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAssistant?: Assistant | null;
  projectId: string;
  onSubmit: (data: CreateAssistantRequest | UpdateAssistantRequest) => Promise<void>;
  isSubmitting?: boolean;
  availableModels?: string[];
  availableTitleModels?: string[];
}

export function AssistantForm({
  open,
  onOpenChange,
  editingAssistant,
  projectId,
  onSubmit,
  isSubmitting = false,
  availableModels = ["auto"],
  availableTitleModels,
}: AssistantFormProps) {
  const { t } = useI18n();
  const isEditing = Boolean(editingAssistant);
  const PROJECT_INHERIT_SENTINEL = "__project__";

  // 创建表单验证 schema
  const assistantSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t("chat.assistant.name_required"))
          .max(100, "Assistant name must be less than 100 characters"),
        system_prompt: z.string().optional(),
        default_logical_model: z.string().min(1, "Default model is required"),
        title_logical_model: z.string().optional(),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AssistantFormData>({
    resolver: zodResolver(assistantSchema),
    defaultValues: {
      name: "",
      system_prompt: "",
      default_logical_model: "auto",
      title_logical_model: "inherit",
    },
  });

  const selectedModel = watch("default_logical_model");
  const selectedTitleModel = watch("title_logical_model");

  const titleModelOptions = useMemo(() => {
    const candidates = (availableTitleModels && availableTitleModels.length > 0
      ? availableTitleModels
      : availableModels.filter((m) => m !== "auto")
    ).filter(Boolean);

    const set = new Set<string>(candidates.filter((m) => m !== PROJECT_INHERIT_SENTINEL));
    const current = editingAssistant?.title_logical_model ?? null;
    if (current) set.add(current);
    return Array.from(set).sort();
  }, [availableTitleModels, availableModels, editingAssistant?.title_logical_model]);

  // 当编辑助手变化时，更新表单
  useEffect(() => {
    if (editingAssistant) {
      setValue("name", editingAssistant.name);
      setValue("system_prompt", editingAssistant.system_prompt || "");
      setValue("default_logical_model", editingAssistant.default_logical_model);
      setValue("title_logical_model", editingAssistant.title_logical_model || "inherit");
    } else {
      reset({
        name: "",
        system_prompt: "",
        default_logical_model: "auto",
        title_logical_model: "inherit",
      });
    }
  }, [editingAssistant, setValue, reset]);

  const handleFormSubmit = async (data: AssistantFormData) => {
    try {
      const titleModelPayload =
        data.title_logical_model === "inherit" ? null : data.title_logical_model;

      if (isEditing) {
        // 更新助手
        const updateData: UpdateAssistantRequest = {
          name: data.name,
          system_prompt: data.system_prompt || undefined,
          default_logical_model: data.default_logical_model,
          title_logical_model: titleModelPayload,
        };
        await onSubmit(updateData);
      } else {
        // 创建助手
        const createData: CreateAssistantRequest = {
          project_id: projectId,
          name: data.name,
          system_prompt: data.system_prompt || undefined,
          default_logical_model: data.default_logical_model,
          title_logical_model: titleModelPayload,
        };
        await onSubmit(createData);
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Failed to submit assistant form:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("chat.assistant.edit") : t("chat.assistant.create")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the assistant configuration"
              : "Create a new assistant with custom settings"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* 助手名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("chat.assistant.name")}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="name"
              placeholder={t("chat.assistant.name_placeholder")}
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* 系统提示词 */}
          <div className="space-y-2">
            <Label htmlFor="system_prompt">
              {t("chat.assistant.system_prompt")}
            </Label>
            <Textarea
              id="system_prompt"
              placeholder={t("chat.assistant.system_prompt_placeholder")}
              rows={4}
              {...register("system_prompt")}
            />
            {errors.system_prompt && (
              <p className="text-sm text-destructive">
                {errors.system_prompt.message}
              </p>
            )}
          </div>

          {/* 默认模型 */}
          <div className="space-y-2">
            <Label htmlFor="default_logical_model">
              {t("chat.assistant.default_model")}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={selectedModel}
              onValueChange={(value) => setValue("default_logical_model", value)}
            >
              <SelectTrigger id="default_logical_model">
                <SelectValue placeholder={t("chat.assistant.default_model_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PROJECT_INHERIT_SENTINEL}>
                  {t("chat.assistant.default_model_follow_project")}
                </SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.default_logical_model && (
              <p className="text-sm text-destructive">
                {errors.default_logical_model.message}
              </p>
            )}
          </div>

          {/* 标题模型 */}
          <div className="space-y-2">
            <Label htmlFor="title_logical_model">
              {t("chat.assistant.title_model")}
            </Label>
            <Select
              value={selectedTitleModel}
              onValueChange={(value) => setValue("title_logical_model", value)}
            >
              <SelectTrigger id="title_logical_model">
                <SelectValue placeholder={t("chat.assistant.title_model_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">
                  {t("chat.assistant.title_model_inherit")}
                </SelectItem>
                <SelectItem value={PROJECT_INHERIT_SENTINEL}>
                  {t("chat.assistant.title_model_follow_project")}
                </SelectItem>
                {titleModelOptions.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("chat.assistant.title_model_help")}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("chat.action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("chat.action.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

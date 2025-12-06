"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useI18n } from "@/lib/i18n-context";
import {
  providerSubmissionService,
  CreateSubmissionRequest,
} from "@/http/provider-submission";

interface SubmissionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SubmissionFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: SubmissionFormDialogProps) {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateSubmissionRequest>({
    defaultValues: {
      provider_type: "native",
    },
  });

  const providerType = watch("provider_type");

  const onSubmit = async (data: CreateSubmissionRequest) => {
    setIsSubmitting(true);
    try {
      await providerSubmissionService.createSubmission(data);
      toast.success(t("submissions.toast_submit_success"));
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Failed to submit provider:", error);
      const message =
        error.response?.data?.detail ||
        error.message ||
        t("submissions.toast_submit_error");
      
      // 检查是否是权限错误
      if (error.response?.status === 403) {
        toast.error(t("submissions.toast_no_permission"));
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("submissions.submit_dialog_title")}</DialogTitle>
          <DialogDescription>
            {t("submissions.submit_dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Provider Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("submissions.form_name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder={t("submissions.form_name_placeholder")}
              {...register("name", {
                required: "Provider name is required",
                minLength: { value: 1, message: "Name must be at least 1 character" },
                maxLength: { value: 100, message: "Name must be at most 100 characters" },
              })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Provider ID */}
          <div className="space-y-2">
            <Label htmlFor="provider_id">
              {t("submissions.form_provider_id")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="provider_id"
              placeholder={t("submissions.form_provider_id_placeholder")}
              {...register("provider_id", {
                required: "Provider ID is required",
                minLength: { value: 1, message: "Provider ID must be at least 1 character" },
                maxLength: { value: 50, message: "Provider ID must be at most 50 characters" },
                pattern: {
                  value: /^[a-z0-9-_]+$/,
                  message: "Provider ID can only contain lowercase letters, numbers, hyphens and underscores",
                },
              })}
            />
            <p className="text-xs text-muted-foreground">
              {t("submissions.form_provider_id_help")}
            </p>
            {errors.provider_id && (
              <p className="text-sm text-destructive">{errors.provider_id.message}</p>
            )}
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="base_url">
              {t("submissions.form_base_url")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="base_url"
              type="url"
              placeholder={t("submissions.form_base_url_placeholder")}
              {...register("base_url", {
                required: "Base URL is required",
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: "Please enter a valid URL",
                },
              })}
            />
            {errors.base_url && (
              <p className="text-sm text-destructive">{errors.base_url.message}</p>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key">
              {t("submissions.form_api_key")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="api_key"
              type="password"
              placeholder={t("submissions.form_api_key_placeholder")}
              {...register("api_key", {
                required: "API key is required",
              })}
            />
            {errors.api_key && (
              <p className="text-sm text-destructive">{errors.api_key.message}</p>
            )}
          </div>

          {/* Provider Type */}
          <div className="space-y-2">
            <Label htmlFor="provider_type">{t("submissions.form_provider_type")}</Label>
            <Select
              value={providerType}
              onValueChange={(value) => setValue("provider_type", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="native">{t("submissions.type_native")}</SelectItem>
                <SelectItem value="aggregator">{t("submissions.type_aggregator")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("submissions.form_description")}</Label>
            <Textarea
              id="description"
              placeholder={t("submissions.form_description_placeholder")}
              rows={4}
              {...register("description", {
                maxLength: { value: 2000, message: "Description must be at most 2000 characters" },
              })}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("submissions.btn_cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("submissions.btn_submitting") : t("submissions.btn_submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

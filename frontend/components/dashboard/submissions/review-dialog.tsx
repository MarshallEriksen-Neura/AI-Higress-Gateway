"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n-context";
import {
  providerSubmissionService,
  ProviderSubmission,
  ReviewSubmissionRequest,
} from "@/http/provider-submission";
import { formatRelativeTime } from "@/lib/date-utils";
import { useErrorDisplay } from "@/lib/errors";

interface ReviewDialogProps {
  submission: ProviderSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReviewDialog({
  submission,
  open,
  onOpenChange,
  onSuccess,
}: ReviewDialogProps) {
  const { t, language } = useI18n();
  const { showError } = useErrorDisplay();
  const [isReviewing, setIsReviewing] = useState(false);

  const {
    register,
    reset,
    watch,
  } = useForm<ReviewSubmissionRequest>();

  const reviewNotes = watch("review_notes");
  const limitQps = watch("limit_qps");

  const formatDate = (dateString: string) => {
    return formatRelativeTime(dateString, language);
  };

  const handleReview = async (decision: "approved" | "approved_limited" | "rejected") => {
    if (!submission) return;

    if (decision === "rejected" && !reviewNotes?.trim()) {
      toast.error(t("submissions.review_notes_required"));
      return;
    }

    setIsReviewing(true);
    try {
      const data: ReviewSubmissionRequest = {
        decision,
        review_notes: reviewNotes || undefined,
        limit_qps: decision === "approved_limited" && limitQps ? Number(limitQps) : undefined,
      };

      await providerSubmissionService.reviewSubmission(submission.id, data);
      toast.success(t("submissions.toast_review_success"));
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      showError(error, {
        context: t("submissions.toast_review_error"),
        onRetry: () => handleReview(decision),
      });
    } finally {
      setIsReviewing(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("submissions.review_dialog_title")}</DialogTitle>
          <DialogDescription>
            {t("submissions.review_dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 提交信息 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("submissions.review_submitter")}
              </p>
              <p className="text-sm font-mono">{submission.user_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("submissions.review_submitted_at")}
              </p>
              <p className="text-sm">{formatDate(submission.created_at)}</p>
            </div>
          </div>

          {/* 提供商信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {t("submissions.review_provider_info")}
            </h3>
            
            <div className="grid gap-4">
              <div>
                <Label className="text-muted-foreground">
                  {t("submissions.column_name")}
                </Label>
                <p className="text-lg font-medium">{submission.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">
                    {t("submissions.column_provider_id")}
                  </Label>
                  <p className="font-mono text-sm">{submission.provider_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    {t("submissions.column_type")}
                  </Label>
                  <p>
                    <Badge variant="outline">
                      {t(`submissions.type_${submission.provider_type}`)}
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">
                  {t("submissions.column_base_url")}
                </Label>
                <p className="font-mono text-sm break-all">{submission.base_url}</p>
              </div>

              {submission.description && (
                <div>
                  <Label className="text-muted-foreground">
                    {t("submissions.review_description")}
                  </Label>
                  <p className="text-sm whitespace-pre-wrap mt-1 p-3 bg-muted/50 rounded">
                    {submission.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 审核意见 */}
          <div className="space-y-2">
            <Label htmlFor="review_notes">
              {t("submissions.review_notes")}
            </Label>
            <Textarea
              id="review_notes"
              placeholder={t("submissions.review_notes_placeholder")}
              rows={4}
              {...register("review_notes")}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="limit_qps">{t("submissions.limit_qps_optional")}</Label>
                <Input
                  id="limit_qps"
                  type="number"
                  min={1}
                  placeholder="2"
                  {...register("limit_qps", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isReviewing}
          >
            {t("submissions.btn_cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleReview("rejected")}
            disabled={isReviewing}
          >
            {isReviewing ? t("submissions.btn_reviewing") : t("submissions.btn_reject")}
          </Button>
          <Button
            onClick={() => handleReview("approved_limited")}
            variant="secondary"
            disabled={isReviewing}
          >
            {isReviewing ? t("submissions.btn_reviewing") : t("submissions.btn_approve_limited")}
          </Button>
          <Button
            onClick={() => handleReview("approved")}
            disabled={isReviewing}
          >
            {isReviewing ? t("submissions.btn_reviewing") : t("submissions.btn_approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

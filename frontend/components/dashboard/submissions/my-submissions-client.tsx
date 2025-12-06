"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-context";
import {
  providerSubmissionService,
  ProviderSubmission,
  SubmissionStatus,
} from "@/http/provider-submission";
import { SubmissionFormDialog } from "./submission-form-dialog";
import { SubmissionsTable } from "./submissions-table";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MySubmissionsClient() {
  const { t } = useI18n();
  const [formOpen, setFormOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [viewingSubmission, setViewingSubmission] = useState<ProviderSubmission | null>(null);

  // 使用 SWR 获取数据
  const {
    data: submissions = [],
    error,
    isLoading,
    mutate,
  } = useSWR<ProviderSubmission[]>(
    "/providers/submissions/me",
    () => providerSubmissionService.getMySubmissions()
  );

  // 筛选和搜索
  const filteredSubmissions = useMemo(() => {
    let result = submissions;

    // 状态筛选
    if (statusFilter !== "all") {
      result = result.filter((s) => s.approval_status === statusFilter);
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.provider_id.toLowerCase().includes(query) ||
          s.base_url.toLowerCase().includes(query)
      );
    }

    return result;
  }, [submissions, statusFilter, searchQuery]);

  // 统计数据
  const stats = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter((s) => s.approval_status === "pending").length,
      approved: submissions.filter((s) => s.approval_status === "approved").length,
      rejected: submissions.filter((s) => s.approval_status === "rejected").length,
    };
  }, [submissions]);

  const handleCancelClick = (submissionId: string) => {
    setCancellingId(submissionId);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingId) return;

    setIsCancelling(true);
    try {
      await providerSubmissionService.cancelSubmission(cancellingId);
      toast.success(t("submissions.toast_cancel_success"));
      mutate();
    } catch (error: any) {
      console.error("Failed to cancel submission:", error);
      const message =
        error.response?.data?.detail ||
        error.message ||
        t("submissions.toast_cancel_error");
      toast.error(message);
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
      setCancellingId(null);
    }
  };

  const handleView = (submission: ProviderSubmission) => {
    setViewingSubmission(submission);
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("submissions.error_loading")}: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => mutate()}>{t("submissions.retry")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 页面标题和操作 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{t("submissions.my_title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("submissions.my_subtitle")}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("submissions.submit_new")}
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("submissions.stats_total")}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("submissions.stats_pending")}</CardDescription>
            <CardTitle className="text-3xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("submissions.stats_approved")}</CardDescription>
            <CardTitle className="text-3xl">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("submissions.stats_rejected")}</CardDescription>
            <CardTitle className="text-3xl">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Select
          value={statusFilter}
          onValueChange={(value: any) => setStatusFilter(value)}
        >
          <SelectTrigger className="w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("submissions.filter_all")}</SelectItem>
            <SelectItem value="pending">{t("submissions.filter_pending")}</SelectItem>
            <SelectItem value="approved">{t("submissions.filter_approved")}</SelectItem>
            <SelectItem value="rejected">{t("submissions.filter_rejected")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("submissions.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 投稿列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("submissions.my_title")}</CardTitle>
          <CardDescription>
            {filteredSubmissions.length} {t("submissions.stats_total").toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("submissions.loading")}
            </div>
          ) : (
            <SubmissionsTable
              submissions={filteredSubmissions}
              onCancel={handleCancelClick}
              onView={handleView}
            />
          )}
        </CardContent>
      </Card>

      {/* 提交表单对话框 */}
      <SubmissionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => mutate()}
      />

      {/* 取消确认对话框 */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("submissions.cancel_dialog_title")}</DialogTitle>
            <DialogDescription>
              {t("submissions.cancel_dialog_description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              {t("submissions.btn_cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? t("submissions.btn_submitting") : t("submissions.btn_confirm_cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看详情对话框 */}
      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingSubmission?.name}</DialogTitle>
            <DialogDescription>
              {t("submissions.column_provider_id")}: {viewingSubmission?.provider_id}
            </DialogDescription>
          </DialogHeader>
          {viewingSubmission && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t("submissions.column_base_url")}</p>
                <p className="text-sm text-muted-foreground">{viewingSubmission.base_url}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t("submissions.column_type")}</p>
                <p className="text-sm text-muted-foreground">
                  {t(`submissions.type_${viewingSubmission.provider_type}`)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">{t("submissions.column_status")}</p>
                <p className="text-sm text-muted-foreground">
                  {t(`submissions.status_${viewingSubmission.approval_status}`)}
                </p>
              </div>
              {viewingSubmission.description && (
                <div>
                  <p className="text-sm font-medium">{t("submissions.review_description")}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewingSubmission.description}
                  </p>
                </div>
              )}
              {viewingSubmission.review_notes && (
                <div>
                  <p className="text-sm font-medium">{t("submissions.review_notes")}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewingSubmission.review_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

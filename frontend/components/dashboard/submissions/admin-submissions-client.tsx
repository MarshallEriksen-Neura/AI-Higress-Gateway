"use client";

import { useState, useMemo } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import {
  providerSubmissionService,
  ProviderSubmission,
  SubmissionStatus,
} from "@/http/provider-submission";
import { AdminSubmissionsTable } from "./admin-submissions-table";
import { ReviewDialog } from "./review-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useErrorDisplay } from "@/lib/errors";

export function AdminSubmissionsClient() {
  const { t } = useI18n();
  const { showError } = useErrorDisplay();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState<ProviderSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");

  // 使用 SWR 获取数据
  const {
    data: submissions = [],
    error,
    isLoading,
    mutate,
  } = useSWR<ProviderSubmission[]>(
    ["/providers/submissions", statusFilter],
    () => providerSubmissionService.getAllSubmissions(
      statusFilter === "all" ? undefined : statusFilter
    )
  );

  // 搜索筛选
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;

    const query = searchQuery.toLowerCase();
    return submissions.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.provider_id.toLowerCase().includes(query) ||
        s.base_url.toLowerCase().includes(query) ||
        s.user_id.toLowerCase().includes(query)
    );
  }, [submissions, searchQuery]);

  // 统计数据
  const stats = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter((s) => s.approval_status === "pending").length,
      testing: submissions.filter((s) => s.approval_status === "testing").length,
      approved: submissions.filter((s) => s.approval_status === "approved").length,
      approvedLimited: submissions.filter((s) => s.approval_status === "approved_limited").length,
      rejected: submissions.filter((s) => s.approval_status === "rejected").length,
    };
  }, [submissions]);

  const handleReviewClick = (submission: ProviderSubmission) => {
    setReviewingSubmission(submission);
    setReviewDialogOpen(true);
  };

  if (error) {
    showError(error, {
      context: t("submissions.error_loading"),
      onRetry: () => mutate(),
    });
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("submissions.error_loading")}
          </AlertDescription>
        </Alert>
        <Button onClick={() => mutate()}>{t("submissions.retry")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 页面标题 */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">{t("submissions.admin_title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("submissions.admin_subtitle")}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-5 lg:grid-cols-6">
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
            <CardDescription>{t("submissions.stats_testing")}</CardDescription>
            <CardTitle className="text-3xl">{stats.testing}</CardTitle>
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
            <CardDescription>{t("submissions.stats_approved_limited")}</CardDescription>
            <CardTitle className="text-3xl">{stats.approvedLimited}</CardTitle>
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
            <SelectItem value="testing">{t("submissions.filter_testing")}</SelectItem>
            <SelectItem value="approved">{t("submissions.filter_approved")}</SelectItem>
            <SelectItem value="approved_limited">{t("submissions.filter_approved_limited")}</SelectItem>
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
          <CardTitle>{t("submissions.admin_title")}</CardTitle>
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
            <AdminSubmissionsTable
              submissions={filteredSubmissions}
              onReview={handleReviewClick}
            />
          )}
        </CardContent>
      </Card>

      {/* 审核对话框 */}
      <ReviewDialog
        submission={reviewingSubmission}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onSuccess={() => mutate()}
      />
    </div>
  );
}

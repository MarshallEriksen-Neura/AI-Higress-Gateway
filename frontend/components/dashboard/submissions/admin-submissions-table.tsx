"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { ProviderSubmission, SubmissionStatus } from "@/http/provider-submission";
import { formatRelativeTime } from "@/lib/date-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminSubmissionsTableProps {
  submissions: ProviderSubmission[];
  onReview: (submission: ProviderSubmission) => void;
}

export function AdminSubmissionsTable({
  submissions,
  onReview,
}: AdminSubmissionsTableProps) {
  const { t, language } = useI18n();

  const getStatusBadge = (status: SubmissionStatus) => {
    const variants: Record<SubmissionStatus, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "default",
      testing: "outline",
      approved: "secondary",
      approved_limited: "secondary",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status]}>
        {t(`submissions.status_${status}`)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return formatRelativeTime(dateString, language);
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("submissions.empty_admin")}</p>
        <p className="text-sm mt-2">{t("submissions.empty_admin_description")}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("submissions.column_name")}</TableHead>
            <TableHead>{t("submissions.column_provider_id")}</TableHead>
            <TableHead>{t("submissions.column_type")}</TableHead>
            <TableHead>{t("submissions.column_status")}</TableHead>
            <TableHead>{t("submissions.column_submitted_at")}</TableHead>
            <TableHead>{t("submissions.column_reviewed_at")}</TableHead>
            <TableHead className="text-right">{t("submissions.column_actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell className="font-medium">{submission.name}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {submission.provider_id}
              </TableCell>
              <TableCell>{t(`submissions.type_${submission.provider_type}`)}</TableCell>
              <TableCell>{getStatusBadge(submission.approval_status)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(submission.created_at)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {submission.reviewed_at ? formatDate(submission.reviewed_at) : "-"}
              </TableCell>
              <TableCell className="text-right">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={submission.approval_status === "pending" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => onReview(submission)}
                    >
                      {submission.approval_status === "pending" ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t("submissions.action_review")}
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          {t("submissions.action_view")}
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {submission.approval_status === "pending"
                      ? t("submissions.action_review")
                      : t("submissions.action_view")}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

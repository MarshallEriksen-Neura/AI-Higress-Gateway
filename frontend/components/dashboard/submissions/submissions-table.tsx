"use client";

import React from "react";
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
import { Eye, X } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { ProviderSubmission, SubmissionStatus } from "@/http/provider-submission";
import { formatRelativeTime } from "@/lib/date-utils";

interface SubmissionsTableProps {
  submissions: ProviderSubmission[];
  onCancel?: (submissionId: string) => void;
  onView?: (submission: ProviderSubmission) => void;
  showActions?: boolean;
}

export function SubmissionsTable({
  submissions,
  onCancel,
  onView,
  showActions = true,
}: SubmissionsTableProps) {
  const { t, language } = useI18n();

  const getStatusBadge = (status: SubmissionStatus) => {
    const variants: Record<SubmissionStatus, "default" | "secondary" | "destructive"> = {
      pending: "default",
      approved: "secondary",
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
        <p>{t("submissions.empty_my")}</p>
        <p className="text-sm mt-2">{t("submissions.empty_my_description")}</p>
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
            {showActions && <TableHead className="text-right">{t("submissions.column_actions")}</TableHead>}
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
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(submission)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t("submissions.action_view")}
                      </Button>
                    )}
                    {onCancel && submission.approval_status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(submission.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {t("submissions.action_cancel")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

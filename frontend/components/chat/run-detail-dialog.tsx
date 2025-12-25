"use client";

import { Loader2, CheckCircle2, XCircle, Clock, Coins, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n-context";
import { useRun } from "@/lib/swr/use-messages";
import { cn } from "@/lib/utils";

export interface RunDetailDialogProps {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunDetailDialog({
  runId,
  open,
  onOpenChange,
}: RunDetailDialogProps) {
  const { t } = useI18n();
  const { run, isLoading, isError } = useRun(runId);

  // 获取状态图标和颜色
  const getStatusDisplay = () => {
    if (!run) return null;

    const statusConfig = {
      queued: {
        icon: Clock,
        label: t("chat.run.status_queued"),
        className: "text-muted-foreground",
      },
      running: {
        icon: Loader2,
        label: t("chat.run.status_running"),
        className: "text-blue-600 dark:text-blue-400 animate-spin",
      },
      succeeded: {
        icon: CheckCircle2,
        label: t("chat.run.status_succeeded"),
        className: "text-green-600 dark:text-green-400",
      },
      failed: {
        icon: XCircle,
        label: t("chat.run.status_failed"),
        className: "text-red-600 dark:text-red-400",
      },
      canceled: {
        icon: Ban,
        label: t("chat.run.status_canceled"),
        className: "text-muted-foreground",
      },
    };

    const config = statusConfig[run.status];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2">
        <Icon className={cn("size-5", config.className)} />
        <span className="font-medium">{config.label}</span>
      </div>
    );
  };

  // 格式化 JSON
  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        aria-describedby="run-detail-description"
      >
        <DialogHeader>
          <DialogTitle>{t("chat.run.title")}</DialogTitle>
          <DialogDescription id="run-detail-description">
            {runId}
          </DialogDescription>
        </DialogHeader>

        {/* 加载状态 */}
        {isLoading && (
          <div 
            className="flex items-center justify-center py-12"
            role="status"
            aria-live="polite"
            aria-label={t("chat.run.loading")}
          >
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="ml-2 text-muted-foreground">
              {t("chat.run.loading")}
            </span>
          </div>
        )}

        {/* 错误状态 */}
        {isError && (
          <div 
            className="flex items-center justify-center py-12 text-destructive"
            role="alert"
            aria-live="assertive"
          >
            <XCircle className="size-6 mr-2" aria-hidden="true" />
            {t("chat.run.error")}
          </div>
        )}

        {/* Run 详情 */}
        {run && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("chat.run.model")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("chat.run.model")}
                  </span>
                  <span className="font-mono text-sm">
                    {run.requested_logical_model}
                  </span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("chat.run.status")}
                  </span>
                  {getStatusDisplay()}
                </div>

                {run.latency && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("chat.run.latency")}
                      </span>
                      <span className="font-mono text-sm">
                        {run.latency}ms
                      </span>
                    </div>
                  </>
                )}

                {run.error_code && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("chat.run.error")}
                      </span>
                      <span className="font-mono text-sm text-destructive">
                        {run.error_code}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tokens 和成本 */}
            {(run.input_tokens || run.output_tokens || run.cost) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("chat.run.tokens")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {run.input_tokens !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("chat.run.input_tokens")}
                      </span>
                      <span className="font-mono text-sm">
                        {run.input_tokens.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {run.output_tokens !== undefined && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {t("chat.run.output_tokens")}
                        </span>
                        <span className="font-mono text-sm">
                          {run.output_tokens.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}

                  {run.total_tokens !== undefined && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-medium">
                          {t("chat.run.total_tokens")}
                        </span>
                        <span className="font-mono text-sm font-medium">
                          {run.total_tokens.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}

                  {run.cost !== undefined && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Coins className="size-4" />
                          {t("chat.run.cost")}
                        </span>
                        <span className="font-mono text-sm font-medium">
                          {run.cost.toFixed(6)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 输出文本 */}
            {run.output_text && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("chat.run.output")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                    {run.output_text}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 请求详情 */}
            {run.request && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("chat.run.request")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                    <code>{formatJSON(run.request)}</code>
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* 响应详情 */}
            {run.response && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("chat.run.response")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                    <code>{formatJSON(run.response)}</code>
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

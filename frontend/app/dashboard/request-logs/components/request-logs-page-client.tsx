"use client";

import { useMemo, useState } from "react";
import { Clipboard, RefreshCw, ScrollText, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { useRequestLogs } from "@/lib/swr/use-request-logs";
import type { RequestLogEntry, RequestLogAttempt } from "@/lib/api-types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/time-formatter";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

function formatMs(value?: number | null) {
  if (value === undefined || value === null) return "-";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function safeText(value?: string | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "-";
}

function deriveDisplayModel(entry: RequestLogEntry) {
  return safeText(entry.logical_model || entry.requested_model);
}

function deriveDisplayProvider(entry: RequestLogEntry) {
  return safeText(entry.selected_provider_id);
}

function deriveStatus(entry: RequestLogEntry): "ok" | "failed" | "stream_error" {
  const statusCode = entry.status_code ?? null;
  const hasError = Boolean(entry.error_message && String(entry.error_message).trim());
  if (entry.is_stream && hasError) return "stream_error";
  if (statusCode !== null && statusCode < 400 && !hasError) return "ok";
  return "failed";
}

function AttemptLine({ attempt }: { attempt: RequestLogAttempt }) {
  const { t } = useI18n();
  const label = attempt.skipped
    ? t("requestLogs.attempt.skipped")
    : attempt.success
      ? t("requestLogs.attempt.success")
      : t("requestLogs.attempt.failed");

  const badgeVariant = attempt.skipped ? "secondary" : attempt.success ? "default" : "destructive";

  const title = [
    `#${attempt.idx + 1}`,
    safeText(attempt.provider_id),
    attempt.model_id ? `(${attempt.model_id})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const details = [
    attempt.status_code != null ? `${t("requestLogs.attempt.field_status")}=${attempt.status_code}` : null,
    attempt.transport ? `${t("requestLogs.attempt.field_transport")}=${attempt.transport}` : null,
    attempt.error_category ? `${t("requestLogs.attempt.field_category")}=${attempt.error_category}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const ttfb = attempt.ttfb_ms != null ? `${t("requestLogs.attempt.ttfb")}: ${formatMs(attempt.ttfb_ms)}` : null;
  const dur = attempt.duration_ms != null ? `${t("requestLogs.attempt.duration")}: ${formatMs(attempt.duration_ms)}` : null;

  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={badgeVariant}>{label}</Badge>
            <div className="font-medium truncate">{title}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground break-words">
            {details ||
              (attempt.endpoint ? `${t("requestLogs.attempt.field_endpoint")}=${attempt.endpoint}` : "-")}
          </div>
          {attempt.error_message && (
            <div className="mt-2 text-xs text-destructive whitespace-pre-wrap break-words">
              {attempt.error_message}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right text-xs text-muted-foreground">
          <div>{ttfb || " "}</div>
          <div>{dur || " "}</div>
        </div>
      </div>
    </div>
  );
}

export function RequestLogsPageClient({
  initialLimit = 50,
  initialOffset = 0,
}: {
  initialLimit?: number;
  initialOffset?: number;
}) {
  const { t, language } = useI18n();
  const { items, loading, error, refresh } = useRequestLogs(initialLimit, initialOffset);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RequestLogEntry | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = [
        it.request_id,
        it.logical_model,
        it.requested_model,
        it.selected_provider_id,
        it.selected_provider_model,
        it.error_message,
        String(it.upstream_status ?? ""),
        String(it.status_code ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // ignore clipboard errors
    }
  };

  const renderStatusBadge = (entry: RequestLogEntry) => {
    const status = deriveStatus(entry);
    if (status === "ok") {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="size-3.5" />
          {entry.status_code ?? 200} {t("requestLogs.status.ok")}
        </Badge>
      );
    }
    if (status === "stream_error") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="size-3.5" />
          {t("requestLogs.status.stream_error")}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3.5" />
        {entry.status_code ?? 0} {t("requestLogs.status.failed")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-5 text-muted-foreground" />
              {t("requestLogs.title")}
            </CardTitle>
            <CardDescription>{t("requestLogs.subtitle")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => refresh()}>
              <RefreshCw className={cn("mr-2 size-4", loading ? "animate-spin" : "")} />
              {t("common.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("requestLogs.search_placeholder")}
            />
          </div>

          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">{t("requestLogs.column_status")}</TableHead>
                  <TableHead className="w-[160px]">{t("requestLogs.column_time")}</TableHead>
                  <TableHead>{t("requestLogs.column_model")}</TableHead>
                  <TableHead className="text-right w-[120px]">{t("requestLogs.column_latency")}</TableHead>
                  <TableHead className="w-[160px]">{t("requestLogs.column_provider")}</TableHead>
                  <TableHead className="w-[220px]">{t("requestLogs.column_request_id")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-destructive">
                      {String((error as any)?.message ?? error)}
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t("common.no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((it) => {
                    const ts = it.ts || "";
                    const timeText = ts ? formatRelativeTime(ts, language) : "-";
                    const timeTitle = ts ? formatDateTime(ts, language) : "-";
                    const displayId = it.request_id ? it.request_id.slice(-8) : "-";
                    return (
                      <TableRow
                        key={it.request_id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelected(it)}
                      >
                        <TableCell>{renderStatusBadge(it)}</TableCell>
                        <TableCell title={timeTitle} className="text-muted-foreground">
                          {timeText}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{deriveDisplayModel(it)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatMs(it.latency_ms)}</TableCell>
                        <TableCell className="font-mono text-xs">{deriveDisplayProvider(it)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs">{displayId}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (it.request_id) copyText(it.request_id);
                              }}
                              aria-label={t("requestLogs.copy")}
                            >
                              <Clipboard className="size-4" />
                            </Button>
                          </div>
                          {copied === it.request_id && (
                            <div className="mt-1 text-xs text-muted-foreground">{t("requestLogs.copied")}</div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="request-log-detail">
          <DialogHeader>
            <DialogTitle>{t("requestLogs.detail.title")}</DialogTitle>
            <DialogDescription id="request-log-detail" className="font-mono text-xs">
              {selected?.request_id || "-"}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="meta" className="w-full">
              <TabsList>
                <TabsTrigger value="meta">{t("requestLogs.detail.meta")}</TabsTrigger>
                <TabsTrigger value="timeline">{t("requestLogs.detail.timeline")}</TabsTrigger>
                <TabsTrigger value="raw">{t("requestLogs.detail.raw")}</TabsTrigger>
              </TabsList>

              <TabsContent value="meta" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{t("requestLogs.column_status")}</div>
                      <div>{renderStatusBadge(selected)}</div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{t("requestLogs.column_model")}</div>
                      <div className="font-mono text-sm">{deriveDisplayModel(selected)}</div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{t("requestLogs.column_provider")}</div>
                      <div className="font-mono text-sm">{deriveDisplayProvider(selected)}</div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{t("requestLogs.column_latency")}</div>
                      <div className="font-mono text-sm">{formatMs(selected.latency_ms)}</div>
                    </div>
                    {selected.upstream_status != null && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            {t("requestLogs.detail.upstream_status")}
                          </div>
                          <div className="font-mono text-sm">{selected.upstream_status}</div>
                        </div>
                      </>
                    )}
                    {selected.error_message && (
                      <>
                        <Separator />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            {t("requestLogs.detail.error")}
                          </div>
                          <div className="mt-2 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words">
                            {selected.error_message}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-3">
                {(selected.attempts || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t("common.no_data")}</div>
                ) : (
                  <div className="space-y-3">
                    {(selected.attempts || []).map((attempt) => (
                      <AttemptLine key={`${selected.request_id}-${attempt.idx}`} attempt={attempt} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="raw">
                <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <code>{JSON.stringify(selected, null, 2)}</code>
                </pre>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

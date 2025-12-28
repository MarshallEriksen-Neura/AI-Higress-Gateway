"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";
import { useRunToolInvocations } from "@/lib/hooks/use-run-tool-events";
import { cn } from "@/lib/utils";
import type { RunSummary } from "@/lib/api-types";

type ToolInvocation = NonNullable<RunSummary["tool_invocations"]>[number];

function formatDuration(durationMs: number | undefined) {
  if (!Number.isFinite(durationMs)) return "";
  const ms = Math.max(0, Math.floor(durationMs as number));
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m${r}s`;
}

function normalizeState(
  invocation: ToolInvocation,
  runStatus: RunSummary["status"] | undefined
): NonNullable<ToolInvocation["state"]> {
  const s = invocation.state;
  if (s) return s;
  if (runStatus === "queued" || runStatus === "running") return "running";
  if (runStatus === "canceled") return "canceled";
  if (runStatus === "failed") return "failed";
  return "done";
}

function buildStatusDisplay(
  state: NonNullable<ToolInvocation["state"]>,
  t: (key: string, vars?: Record<string, any>) => string
) {
  if (state === "running") {
    return {
      label: t("chat.tool_invocation.status_running"),
      icon: Loader2,
      badgeClass:
        "bg-background/60 text-muted-foreground border-border/50",
      iconClass: "animate-spin",
    };
  }
  if (state === "done") {
    return {
      label: t("chat.tool_invocation.status_done"),
      icon: CheckCircle2,
      badgeClass:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
      iconClass: "",
    };
  }
  if (state === "timeout") {
    return {
      label: t("chat.tool_invocation.status_timeout"),
      icon: Clock,
      badgeClass:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
      iconClass: "",
    };
  }
  if (state === "canceled") {
    return {
      label: t("chat.tool_invocation.status_canceled"),
      icon: Ban,
      badgeClass:
        "bg-background/60 text-muted-foreground border-border/50",
      iconClass: "",
    };
  }
  return {
    label: t("chat.tool_invocation.status_failed"),
    icon: XCircle,
    badgeClass:
      "bg-destructive/10 text-destructive border-destructive/20",
    iconClass: "",
  };
}

function safeStringify(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
}

export function ToolInvocationBubbles({
  runId,
  runStatus,
  seedInvocations,
  className,
}: {
  runId: string | null | undefined;
  runStatus?: RunSummary["status"];
  seedInvocations?: ToolInvocation[] | null;
  className?: string;
}) {
  const { t } = useI18n();
  const normalizedRunId = (runId || "").trim() || null;
  const enabled = !!normalizedRunId && (runStatus === "queued" || runStatus === "running");

  const liveInvocations = useRunToolInvocations(normalizedRunId, {
    enabled,
    seedInvocations: seedInvocations ?? null,
  });

  const invocations = useMemo(() => {
    const base = Array.isArray(seedInvocations) ? seedInvocations : [];
    if (liveInvocations.length) return liveInvocations;
    return base;
  }, [liveInvocations, seedInvocations]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!invocations.length) return null;

  return (
    <div className={cn("mt-3 space-y-2", className)}>
      {invocations.map((inv) => {
        const reqId = (inv.req_id || "").trim();
        if (!reqId) return null;

        const state = normalizeState(inv, runStatus);
        const display = buildStatusDisplay(state, t);
        const StatusIcon = display.icon;

        const agentId = (inv.agent_id || "").trim();
        const toolName = (inv.tool_name || "").trim() || t("chat.tool_invocations.unknown_tool");
        const title = agentId ? `${agentId}: ${toolName}` : toolName;

        const showDetails = !!expanded[reqId];
        const durationLabel = formatDuration(inv.duration_ms);
        const detailText =
          (inv.result_preview && String(inv.result_preview)) ||
          (inv.error ? safeStringify(inv.error) : "");

        return (
          <Card
            key={reqId}
            className={cn(
              "py-3 gap-2",
              "bg-background/60 backdrop-blur-sm",
              "border-border/50 shadow-sm",
              state === "failed" ? "border-destructive/30" : ""
            )}
          >
            <CardContent className="px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t("chat.tool_invocation.req_id")}: <span className="font-mono">{reqId}</span>
                    {durationLabel ? (
                      <span className="ml-2">
                        · {t("chat.tool_invocation.duration")}:{" "}
                        <span className="font-mono">{durationLabel}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={cn("gap-1", display.badgeClass)}>
                    <StatusIcon className={cn("size-3.5", display.iconClass)} />
                    <span>{display.label}</span>
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!detailText}
                    onClick={async () => {
                      if (!detailText) return;
                      try {
                        await navigator.clipboard.writeText(detailText);
                        toast.success(t("chat.tool_invocation.copied"));
                      } catch {
                        toast.error(t("chat.tool_invocation.copy_failed"));
                      }
                    }}
                    title={t("chat.tool_invocation.copy_result")}
                    aria-label={t("chat.tool_invocation.copy_result")}
                  >
                    <Copy className="size-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [reqId]: !prev[reqId] }))
                    }
                    title={t("chat.tool_invocation.toggle_details")}
                    aria-label={t("chat.tool_invocation.toggle_details")}
                  >
                    {showDetails ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {showDetails ? (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    {t("chat.tool_invocation.result_preview")}
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-md border border-border/50 bg-muted/40 p-3">
                    {detailText || "-"}
                  </pre>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

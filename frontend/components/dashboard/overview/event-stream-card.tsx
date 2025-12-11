"use client";

import { AlertCircle, AlertTriangle, Info, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-context";
import { useOverviewEvents } from "@/lib/swr/use-overview-metrics";
import type { OverviewEvent } from "@/lib/api-types";

interface EventStreamCardProps {
  timeRange?: string;
  onRetry?: () => void;
}

/**
 * 事件流卡片
 *
 * 职责：
 * - 显示最近的限流、错误等关键事件
 * - 按时间倒序排列
 * - 为不同事件类型使用不同视觉标记
 *
 * 验证需求：5.2, 5.4
 * 验证属性：Property 14, 15, 16
 */
export function EventStreamCard({
  timeRange = "7d",
  onRetry,
}: EventStreamCardProps) {
  const { t } = useI18n();
  const { events, loading, error, refresh } = useOverviewEvents({
    time_range: timeRange as any,
  });

  // 获取事件类型的图标
  const getEventIcon = (eventType: OverviewEvent["event_type"]) => {
    switch (eventType) {
      case "rate_limit":
        return <Zap className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // 获取事件类型的颜色
  const getEventBadgeVariant = (
    eventType: OverviewEvent["event_type"]
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (eventType) {
      case "rate_limit":
        return "secondary";
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      case "info":
        return "default";
      default:
        return "default";
    }
  };

  // 获取事件类型的标签文本
  const getEventTypeLabel = (eventType: OverviewEvent["event_type"]) => {
    switch (eventType) {
      case "rate_limit":
        return t("event_stream.rate_limit");
      case "error":
        return t("event_stream.error");
      case "warning":
        return t("event_stream.warning");
      case "info":
        return t("event_stream.info");
      default:
        return eventType;
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return t("time.just_now");
    } else if (diffMins < 60) {
      return t("time.minutes_ago", { minutes: diffMins });
    } else if (diffHours < 24) {
      return t("time.hours_ago", { hours: diffHours });
    } else if (diffDays < 7) {
      return t("time.days_ago", { days: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  // 处理重试
  const handleRetry = () => {
    refresh();
    onRetry?.();
  };

  // 加载状态
  if (loading && !events) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("event_stream.title")}</CardTitle>
          <CardDescription>{t("event_stream.recent_events")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" data-testid="skeleton" />
                <Skeleton className="h-4 flex-1" data-testid="skeleton" />
                <Skeleton className="h-4 w-24" data-testid="skeleton" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error && !events) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("event_stream.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("event_stream.error_loading")}
          </p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            {t("consumption.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("event_stream.title")}</CardTitle>
          <CardDescription>{t("event_stream.recent_events")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("event_stream.no_data")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("event_stream.title")}</CardTitle>
        <CardDescription>{t("event_stream.recent_events")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0"
              data-testid={`event-${event.id}`}
            >
              {/* 事件类型图标 */}
              <div className="flex-shrink-0 mt-1">
                <Badge
                  variant={getEventBadgeVariant(event.event_type)}
                  className="flex items-center gap-1"
                >
                  {getEventIcon(event.event_type)}
                  <span className="text-xs">
                    {getEventTypeLabel(event.event_type)}
                  </span>
                </Badge>
              </div>

              {/* 事件内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium truncate">
                      {event.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                </div>

                {/* 事件元数据 */}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {event.provider_id && (
                    <span className="px-2 py-1 bg-muted rounded">
                      {t("event_stream.provider")}: {event.provider_id}
                    </span>
                  )}
                  {event.model_id && (
                    <span className="px-2 py-1 bg-muted rounded">
                      {t("event_stream.model")}: {event.model_id}
                    </span>
                  )}
                </div>
              </div>

              {/* 时间戳 */}
              <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {formatTimestamp(event.timestamp)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

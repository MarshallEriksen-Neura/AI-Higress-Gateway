"use client";

import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n-context";
import { useActiveModels } from "@/lib/swr/use-overview-metrics";

interface ActiveModelsCardProps {
  timeRange?: string;
  onRetry?: () => void;
}

/**
 * 活跃模型卡片
 *
 * 职责：
 * - 显示调用最多和失败最多的模型
 * - 显示调用次数、成功率等指标
 *
 * 验证需求：5.1, 5.3
 * 验证属性：Property 13
 */
export function ActiveModelsCard({
  timeRange = "7d",
  onRetry,
}: ActiveModelsCardProps) {
  const { t } = useI18n();
  const { models, loading, error, refresh } = useActiveModels({ time_range: timeRange as any });

  // 格式化数字
  const formatNumber = (value: number): string => {
    return value.toLocaleString("en-US");
  };

  // 格式化百分比
  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(1);
  };

  // 处理重试
  const handleRetry = () => {
    refresh();
    onRetry?.();
  };

  // 加载状态
  if (loading && !models) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("active_models.title")}</CardTitle>
          <CardDescription>{t("overview.from_last_month")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" data-testid="skeleton" />
                <Skeleton className="h-4 w-20" data-testid="skeleton" />
                <Skeleton className="h-4 w-20" data-testid="skeleton" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error && !models) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("active_models.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("active_models.error")}
          </p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            {t("consumption.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (!models || (models.most_called.length === 0 && models.most_failed.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("active_models.title")}</CardTitle>
          <CardDescription>{t("overview.from_last_month")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("active_models.no_data")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("active_models.title")}</CardTitle>
        <CardDescription>{t("overview.from_last_month")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 调用最多的模型 */}
        {models.most_called.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">
                {t("active_models.most_called")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("active_models.model")}</TableHead>
                    <TableHead className="text-right">
                      {t("active_models.call_count")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("active_models.success_rate")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.most_called.map((model) => (
                    <TableRow key={model.model_id} data-testid={`most-called-${model.model_id}`}>
                      <TableCell className="font-medium">
                        {model.model_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(model.call_count)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            model.success_rate >= 0.95
                              ? "default"
                              : model.success_rate >= 0.9
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {formatPercentage(model.success_rate)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* 失败最多的模型 */}
        {models.most_failed.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold">
                {t("active_models.most_failed")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("active_models.model")}</TableHead>
                    <TableHead className="text-right">
                      {t("active_models.failure_count")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("active_models.success_rate")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.most_failed.map((model) => (
                    <TableRow key={model.model_id} data-testid={`most-failed-${model.model_id}`}>
                      <TableCell className="font-medium">
                        {model.model_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(model.failure_count || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            model.success_rate >= 0.95
                              ? "default"
                              : model.success_rate >= 0.9
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {formatPercentage(model.success_rate)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

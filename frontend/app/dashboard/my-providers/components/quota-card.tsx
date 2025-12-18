"use client";

import { AdaptiveCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/cards/adaptive-card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface QuotaCardProps {
  current: number;
  limit: number;
  isUnlimited?: boolean;
  isLoading?: boolean;
}

export function QuotaCard({
  current,
  limit,
  isUnlimited = false,
  isLoading,
}: QuotaCardProps) {
  const { t } = useI18n();

  const hasLimit = !isUnlimited && limit > 0;
  const percentage = hasLimit ? (current / limit) * 100 : 0;
  const remaining = hasLimit ? Math.max(0, limit - current) : 0;
  const isNearLimit = hasLimit && percentage >= 80;

  if (isLoading) {
    return (
      <AdaptiveCard showDecor={false}>
        <CardHeader>
          <CardTitle>{t("my_providers.quota_title")}</CardTitle>
          <CardDescription>
            {t("providers.loading")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-2 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </AdaptiveCard>
    );
  }

  return (
    <AdaptiveCard showDecor={false}>
      <CardHeader>
        <CardTitle>{t("my_providers.quota_title")}</CardTitle>
        <CardDescription>
          {t("my_providers.quota_used")} {current} 个，
          {hasLimit ? (
            <>
              {t("my_providers.quota_remaining")} {remaining} 个
            </>
          ) : (
            t("my_providers.quota_unlimited")
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("my_providers.quota_used")}</span>
            <span className="font-medium">
              {hasLimit ? `${current} / ${limit}` : current}
            </span>
          </div>
          {hasLimit ? (
            <>
              <Progress value={percentage} className="h-2" />
              {isNearLimit && (
                <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    {t("my_providers.quota_warning")}
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("my_providers.quota_unlimited")}
            </p>
          )}
        </div>
      </CardContent>
    </AdaptiveCard>
  );
}

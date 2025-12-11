"use client";

import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "card" | "alert";
  className?: string;
}

/**
 * 统一的错误提示组件
 *
 * 用于在卡片中显示错误状态，提供重试功能
 *
 * 验证需求：7.4
 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = "Retry",
  variant = "card",
  className,
}: ErrorStateProps) {
  if (variant === "alert") {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>{message}</p>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="mt-2"
            >
              {retryLabel}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`border-destructive/50 bg-destructive/5 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

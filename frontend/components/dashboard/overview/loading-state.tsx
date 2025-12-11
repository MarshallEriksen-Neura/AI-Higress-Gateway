"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  title?: string | boolean;
  rows?: number;
  columns?: number;
  variant?: "card" | "table" | "chart" | "grid";
  className?: string;
}

/**
 * 统一的加载态占位符组件
 *
 * 用于在卡片加载时显示 Skeleton 占位符，避免布局抖动
 *
 * 验证需求：7.4
 */
export function LoadingState({
  title = true,
  rows = 5,
  columns = 4,
  variant = "card",
  className,
}: LoadingStateProps) {
  if (variant === "table") {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <Skeleton className="h-6 w-1/3" data-testid="skeleton" />
            <Skeleton className="h-4 w-2/3 mt-2" data-testid="skeleton" />
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {/* 表头 */}
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={`header-${i}`} className="h-10 flex-1" data-testid="skeleton" />
              ))}
            </div>
            {/* 表格行 */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={`row-${rowIndex}`} className="flex gap-4">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton
                    key={`cell-${rowIndex}-${colIndex}`}
                    className="h-12 flex-1"
                    data-testid="skeleton"
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "chart") {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <Skeleton className="h-6 w-1/4" data-testid="skeleton" />
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {/* 图例 */}
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" data-testid="skeleton" />
              <Skeleton className="h-4 w-20" data-testid="skeleton" />
              <Skeleton className="h-4 w-20" data-testid="skeleton" />
            </div>
            {/* 图表区域 */}
            <Skeleton className="h-64 w-full" data-testid="skeleton" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "grid") {
    return (
      <div className={`grid gap-4 ${className}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-2/3" data-testid="skeleton" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-8 w-1/2" data-testid="skeleton" />
                <Skeleton className="h-4 w-3/4" data-testid="skeleton" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Default card variant
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <Skeleton className="h-6 w-1/3" data-testid="skeleton" />
          <Skeleton className="h-4 w-2/3 mt-2" data-testid="skeleton" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" data-testid="skeleton" />
          <Skeleton className="h-4 w-5/6" data-testid="skeleton" />
          <Skeleton className="h-4 w-4/6" data-testid="skeleton" />
        </div>
      </CardContent>
    </Card>
  );
}

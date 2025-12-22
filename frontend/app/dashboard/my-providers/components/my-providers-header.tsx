"use client";

import { useI18n } from "@/lib/i18n-context";

export function MyProvidersHeader() {
  const { t } = useI18n();

  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold">Provider 管理</h1>
      <p className="text-muted-foreground text-sm">
        管理您的私有提供商、查看共享和公共提供商
      </p>
    </div>
  );
}


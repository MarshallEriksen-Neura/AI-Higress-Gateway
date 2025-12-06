"use client";

import React, { useEffect, useState } from "react";
import { MyProvidersPageClient } from "./my-providers-page-client";
import { Provider, providerService } from "@/http/provider";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";

/**
 * 私有 Provider 页面包装组件
 *
 * - 使用前端 auth store 判断登录态（而不是依赖 Cookie）
 * - 登录后在客户端拉取当前用户的私有 Provider 列表
 * - 未登录时展示登录提示，并唤起全局登录对话框
 */
export function MyProvidersPageWrapper() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);
  const openAuthDialog = useAuthStore((state) => state.openAuthDialog);

  const userId = user?.id ?? null;

  const [initialProviders, setInitialProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    // 未登录时不拉取数据
    if (!isAuthenticated || !userId) return;

    setIsLoadingProviders(true);

    providerService
      .getUserPrivateProviders(userId)
      .then((data) => {
        setInitialProviders(data);
      })
      .catch((error) => {
        console.error("Failed to load private providers on client:", error);
      })
      .finally(() => {
        setIsLoadingProviders(false);
      });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isAuthenticated, userId]);

  if (authLoading || isLoadingProviders) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">
          请先登录以管理您的私有 Provider。
        </p>
        <Button onClick={openAuthDialog}>去登录</Button>
      </div>
    );
  }

  return (
    <MyProvidersPageClient
      initialProviders={initialProviders}
      userId={userId}
    />
  );
}

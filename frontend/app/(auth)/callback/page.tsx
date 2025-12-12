"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { httpClient } from "@/http/client";
import { tokenManager } from "@/lib/auth/token-manager";
import { useAuthStore } from "@/lib/stores/auth-store";
import { oauthRedirect } from "@/lib/auth/oauth-redirect";
import { toast } from "sonner";
import { ErrorHandler } from "@/lib/errors";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 获取 OAuth 回调参数
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        // 检查是否有错误参数
        if (error) {
          console.error("[OAuth] Provider returned error:", error, errorDescription);
          setStatus("error");
          setErrorMessage(errorDescription || error);
          toast.error(t("auth.oauth_provider_error"));
          
          // 3秒后跳转到登录页
          setTimeout(() => {
            router.push(`/login?error=${error}`);
          }, 3000);
          return;
        }

        // 检查必需参数
        if (!code) {
          console.error("[OAuth] Missing authorization code");
          setStatus("error");
          setErrorMessage(t("auth.oauth_missing_code"));
          toast.error(t("auth.oauth_failed"));
          
          setTimeout(() => {
            router.push("/login?error=missing_code");
          }, 3000);
          return;
        }

        console.log("[OAuth] Processing callback with code:", code?.substring(0, 10) + "...");

        // 调用后端 OAuth 验证 API
        const response = await httpClient.post("/auth/oauth/callback", {
          code,
          state,
        });

        const { access_token, refresh_token, user } = response.data;

        // 存储 tokens（OAuth 登录默认记住7天）
        tokenManager.setAccessToken(access_token, { remember: true });
        tokenManager.setRefreshToken(refresh_token, { remember: true });

        // 更新用户状态
        setUser(user);

        console.log("[OAuth] Login successful, user:", user.email);
        setStatus("success");
        toast.success(t("auth.oauth_success"));

        // 获取重定向目标并清除
        const redirectUrl = oauthRedirect.getAndClear("/dashboard");

        // 1秒后跳转到目标页面
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1000);
      } catch (error) {
        console.error("[OAuth] Callback error:", error);
        setStatus("error");

        // 使用标准化错误处理
        const standardError = ErrorHandler.normalize(error);
        const message = ErrorHandler.getUserMessage(standardError, (key) => key);
        setErrorMessage(message);
        toast.error(message);

        // 3秒后跳转到登录页
        setTimeout(() => {
          router.push("/login?error=oauth_failed");
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, t, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        {status === "processing" && (
          <>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
            <p className="text-lg text-muted-foreground">{t("auth.oauth_processing")}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center">
              <div className="rounded-full h-12 w-12 bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-lg text-green-600 dark:text-green-400">{t("auth.oauth_success")}</p>
            <p className="text-sm text-muted-foreground">{t("auth.oauth_redirecting")}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center">
              <div className="rounded-full h-12 w-12 bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="text-lg text-red-600 dark:text-red-400">{t("auth.oauth_failed")}</p>
            {errorMessage && (
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            )}
            <p className="text-sm text-muted-foreground">{t("auth.oauth_redirect_login")}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
            <p className="text-lg text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}

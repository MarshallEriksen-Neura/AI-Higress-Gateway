import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n-context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { SWRProvider } from "@/lib/swr";
import { Toaster } from "@/components/ui/sonner";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { PerformanceMonitor } from "@/components/performance-monitor";


export const metadata: Metadata = {
  title: "AI Higress Frontend",
  description: "Frontend for AI Higress API Gateway",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI HIGRESS GATEWAY",
  },
};

export function generateThemeColor() {
  return "#0066cc";
}

export function generateViewport() {
  return "width=device-width, initial-scale=1, maximum-scale=1";
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="AI HIGRESS GATEWAY" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0066cc" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <SWRProvider>
              <AuthProvider>
                {children}
                {/* 全局登录对话框 - 由 Zustand 状态控制显示 */}
                <Suspense fallback={null}>
                  <AuthDialog />
                </Suspense>
                {/* PWA 安装提示 */}
                <PWAInstallPrompt />
                {/* 性能监控 */}
                <PerformanceMonitor />
              </AuthProvider>
            </SWRProvider>
          </I18nProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}

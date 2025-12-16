"use client";

import { useRouter } from "next/navigation";
import { CreditCard, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";

interface QuickActionsBarProps {
  onNavigate?: (path: string) => void;
}

/**
 * 快捷操作栏组件
 *
 * 职责：
 * - 提供充值、Provider 管理、路由配置快捷按钮
 * - 实现导航功能
 *
 * 验证需求：4.1, 4.2, 4.3, 4.4
 * 验证属性：Property 11, 12
 */
export function QuickActionsBar({ onNavigate }: QuickActionsBarProps) {
  const { t } = useI18n();
  const router = useRouter();

  // 快捷操作列表
  const actions = [
    {
      id: "recharge",
      label: t("quick_actions.recharge"),
      description: t("quick_actions.recharge_description"),
      icon: CreditCard,
      path: "/dashboard/credits",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      id: "manage_providers",
      label: t("quick_actions.manage_providers"),
      description: t("quick_actions.manage_providers_description"),
      icon: Settings,
      path: "/dashboard/my-providers",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      id: "routing_config",
      label: t("quick_actions.routing_config"),
      description: t("quick_actions.routing_config_description"),
      icon: Zap,
      path: "/dashboard/routing",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
  ];

  // 处理导航
  const handleNavigate = (path: string) => {
    onNavigate?.(path);
    router.push(path);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("quick_actions.title")}</CardTitle>
        <CardDescription>
          {t("overview.subtitle")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className={`h-auto p-4 flex flex-col items-start gap-3 hover:shadow-md transition-shadow ${action.bgColor}`}
                onClick={() => handleNavigate(action.path)}
                data-testid={`quick-action-${action.id}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${action.bgColor}`}>
                    <Icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { SystemDashboardClient } from "./_components/system-dashboard-client";
import { PermissionGuard } from "@/components/auth/permission-guard";
import type { Metadata } from "next";

/**
 * 页面元数据
 */
export const metadata: Metadata = {
  title: "Dashboard - 系统监控",
  description: "查看全局系统健康状况、Token 使用情况和 Provider 状态",
};

/**
 * Dashboard 系统页 - 管理员监控页面（服务端组件）
 * 
 * 职责：
 * - 提供页面布局和容器
 * - 实现服务端权限检查（通过 PermissionGuard）
 * - 渲染客户端容器组件
 * - 设置页面元数据
 * 
 * 权限要求：
 * - 只有管理员（is_superuser=true）可以访问
 * - 非管理员用户会看到 403 错误页面
 * 
 * 页面布局：
 * - 顶部工具条：标题 + 健康徽章 + 筛选器
 * - 层级 1：KPI 卡片（4 张）
 * - 层级 2：核心趋势图（2 张大图并排）
 * - 层级 3：Token 使用趋势
 * - 层级 4：热门模型排行榜 + Provider 状态列表
 * 
 * 验证需求：1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1
 */
export default function DashboardSystemPage() {
  return (
    <PermissionGuard requiredPermission="superuser">
      <div className="container mx-auto p-6">
        <SystemDashboardClient />
      </div>
    </PermissionGuard>
  );
}

/**
 * SystemDashboardClient 组件使用示例
 * 
 * 此文件展示了如何在不同场景下使用 SystemDashboardClient 组件
 */

import { PermissionGuard } from "@/components/auth/permission-guard";
import { SystemDashboardClient } from "./system-dashboard-client";

/**
 * 示例 1: 基本用法
 * 
 * 最简单的使用方式，直接渲染系统仪表盘
 */
export function BasicExample() {
  return (
    <div className="container mx-auto p-6">
      <SystemDashboardClient />
    </div>
  );
}

/**
 * 示例 2: 与权限守卫配合使用
 * 
 * 推荐的使用方式，确保只有管理员可以访问
 */
export function WithPermissionGuardExample() {
  return (
    <PermissionGuard requiredPermission="superuser">
      <div className="container mx-auto p-6">
        <SystemDashboardClient />
      </div>
    </PermissionGuard>
  );
}

/**
 * 示例 3: 自定义布局
 * 
 * 在自定义布局中使用系统仪表盘
 */
export function CustomLayoutExample() {
  return (
    <div className="min-h-screen bg-background">
      {/* 自定义头部 */}
      <header className="border-b bg-card">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">系统监控中心</h1>
            <div className="flex items-center gap-4">
              {/* 可以添加其他操作按钮 */}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="container mx-auto p-6">
        <PermissionGuard requiredPermission="superuser">
          <SystemDashboardClient />
        </PermissionGuard>
      </main>

      {/* 自定义页脚 */}
      <footer className="border-t mt-12">
        <div className="container mx-auto p-4 text-center text-sm text-muted-foreground">
          © 2025 AI Gateway System
        </div>
      </footer>
    </div>
  );
}

/**
 * 示例 4: 带侧边栏的布局
 * 
 * 在带侧边栏的布局中使用系统仪表盘
 */
export function WithSidebarExample() {
  return (
    <div className="flex min-h-screen">
      {/* 侧边栏 */}
      <aside className="w-64 border-r bg-card">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">系统管理</h2>
          <nav className="space-y-2">
            <a href="/dashboard/system" className="block p-2 rounded hover:bg-accent">
              系统仪表盘
            </a>
            <a href="/system/providers" className="block p-2 rounded hover:bg-accent">
              Provider 管理
            </a>
            <a href="/system/users" className="block p-2 rounded hover:bg-accent">
              用户管理
            </a>
          </nav>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <PermissionGuard requiredPermission="superuser">
            <SystemDashboardClient />
          </PermissionGuard>
        </div>
      </main>
    </div>
  );
}

/**
 * 示例 5: 完整的页面组件
 * 
 * 这是一个完整的页面组件示例，可以直接用作 page.tsx
 */
export default function SystemDashboardPage() {
  return (
    <PermissionGuard requiredPermission="superuser">
      <div className="container mx-auto p-6">
        <SystemDashboardClient />
      </div>
    </PermissionGuard>
  );
}

"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { NeonSidebar } from "./neon-sidebar";
import { ThemeSidebar } from "./theme-sidebar";

/**
 * 自适应主题侧边栏组件
 * 基于 shadcn/ui Sidebar 封装
 */
export function AdaptiveSidebar(props: React.ComponentProps<typeof NeonSidebar>) {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ThemeSidebar {...props} />;
  }

  switch (theme) {
    case "christmas":
      return <NeonSidebar {...props} />;
    default:
      return <ThemeSidebar {...props} />;
  }
}

// 重新导出 shadcn sidebar 的所有子组件
export {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

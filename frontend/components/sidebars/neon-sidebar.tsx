"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Sidebar,
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

type NeonColor = "red" | "green" | "blue" | "purple" | "orange" | "cyan" | "auto";

interface NeonSidebarProps extends React.ComponentProps<typeof Sidebar> {
  neonColor?: NeonColor;
  neonIntensity?: 1 | 2 | 3;
  enableFrostTexture?: boolean | "auto";
}

/**
 * 霓虹灯玻璃拟态侧边栏组件
 * 基于 shadcn/ui Sidebar 封装
 */
export function NeonSidebar({
  className,
  neonColor = "auto",
  neonIntensity = 2,
  enableFrostTexture = "auto",
  children,
  ...props
}: NeonSidebarProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getAutoNeonColor = (): NeonColor => {
    if (!mounted) return "blue";
    switch (theme) {
      case "christmas": return "red";
      case "dark": return "purple";
      default: return "blue";
    }
  };

  const effectiveColor = neonColor === "auto" ? getAutoNeonColor() : neonColor;

  const shouldEnableFrost = React.useMemo(() => {
    if (enableFrostTexture === true) return true;
    if (enableFrostTexture === false) return false;
    return mounted && theme === "christmas";
  }, [enableFrostTexture, mounted, theme]);

  const neonColors: Record<Exclude<NeonColor, "auto">, { border: string; glowColor: string }> = {
    red: { border: "from-transparent via-red-400 to-transparent", glowColor: "255, 60, 60" },
    green: { border: "from-transparent via-green-400 to-transparent", glowColor: "50, 255, 100" },
    blue: { border: "from-transparent via-blue-400 to-transparent", glowColor: "60, 150, 255" },
    purple: { border: "from-transparent via-purple-400 to-transparent", glowColor: "180, 100, 255" },
    orange: { border: "from-transparent via-orange-400 to-transparent", glowColor: "255, 150, 50" },
    cyan: { border: "from-transparent via-cyan-400 to-transparent", glowColor: "50, 230, 255" },
  };

  const colorConfig = neonColors[effectiveColor as Exclude<NeonColor, "auto">];

  return (
    <div className="relative">
      {/* 霓虹灯和装饰效果层 */}
      <div className="absolute inset-0 pointer-events-none overflow-visible z-0">
        {/* 右侧霓虹流光 */}
        <div className="absolute top-0 right-0 bottom-0 flex items-center">
          <div
            className={cn("h-[70%] w-[2px] bg-gradient-to-b", colorConfig.border)}
            style={{
              filter: `blur(${neonIntensity}px)`,
              boxShadow: `0 0 ${neonIntensity * 8}px rgba(${colorConfig.glowColor}, 0.9), 0 0 ${neonIntensity * 15}px rgba(${colorConfig.glowColor}, 0.6)`,
              opacity: 0.85,
            }}
          />
        </div>

        {/* 冰冻噪点纹理层 */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
            mixBlendMode: "overlay",
          }}
        />

        {/* 冰川纹理效果组 */}
        {shouldEnableFrost && (
          <>
            <div className="absolute inset-0 opacity-25" style={{
              backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.8) 0%, transparent 2%), radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.6) 0%, transparent 1.5%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.7) 0%, transparent 1.8%)`,
              backgroundSize: "100% 100%",
              mixBlendMode: "overlay",
            }} />
            <div className="absolute inset-0 opacity-50" style={{
              background: `linear-gradient(to right, rgba(255, 255, 255, 0.3) 0%, transparent 6%), linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 0%, transparent 6%), linear-gradient(to top, rgba(255, 255, 255, 0.2) 0%, transparent 6%)`,
              mixBlendMode: "overlay",
            }} />
          </>
        )}

        {/* 顶部高光 */}
        <div className="absolute top-0 left-0 right-0 h-1/4" style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%)",
        }} />

        {/* 左上角高光 */}
        <div className="absolute top-0 left-0 w-32 h-32" style={{
          background: "radial-gradient(circle at top left, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.2) 25%, transparent 55%)",
          filter: "blur(8px)",
        }} />

        {/* 圣诞主题装饰 */}
        {shouldEnableFrost && (
          <>
            {/* 顶部圣诞彩球装饰 */}
            <div className="absolute -top-2 left-0 right-0 z-30 overflow-visible">
              <div className="relative w-full h-16">
                <div className="absolute top-0 left-12 w-px h-8 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                <div className="absolute top-0 left-24 w-px h-10 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                <div className="absolute top-0 left-36 w-px h-6 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                <div className="absolute top-0 right-12 w-px h-9 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                
                <div className="absolute top-8 left-12 w-5 h-5 rounded-full -translate-x-1/2" style={{
                  background: "radial-gradient(circle at 30% 30%, #ffd700, #ffb700)",
                  boxShadow: "0 2px 8px rgba(255, 215, 0, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
                <div className="absolute top-10 left-24 w-6 h-6 rounded-full -translate-x-1/2" style={{
                  background: "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)",
                  boxShadow: "0 2px 8px rgba(255, 68, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
                <div className="absolute top-6 left-36 w-4 h-4 rounded-full -translate-x-1/2" style={{
                  background: "radial-gradient(circle at 30% 30%, #44ff44, #00aa00)",
                  boxShadow: "0 2px 8px rgba(68, 255, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
                <div className="absolute top-9 right-12 w-5 h-5 rounded-full translate-x-1/2" style={{
                  background: "radial-gradient(circle at 30% 30%, #ffd700, #ffb700)",
                  boxShadow: "0 2px 8px rgba(255, 215, 0, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>

            {/* 顶部圣诞花环装饰 */}
            <div className="absolute top-0 left-0 right-0 z-30 h-20">
              <img
                src="/theme/chrismas/dashboard.png"
                alt="Christmas decoration"
                className="absolute top-0 left-0 w-full h-auto object-contain"
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
                  opacity: 1,
                  maxHeight: "100px",
                }}
                loading="lazy"
                onError={(e) => e.currentTarget.style.display = "none"}
              />
            </div>

            {/* 底部圣诞花环装饰 */}
            <div className="absolute bottom-0 left-0 right-0 z-30 h-20">
              <img
                src="/theme/chrismas/dashboard.png"
                alt="Christmas decoration"
                className="absolute bottom-0 left-0 w-full h-auto object-contain transform scale-y-[-1]"
                style={{
                  filter: "drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.2))",
                  opacity: 1,
                  maxHeight: "100px",
                }}
                loading="lazy"
                onError={(e) => e.currentTarget.style.display = "none"}
              />
              
              <div className="absolute bottom-12 left-0 right-0">
                <div className="absolute bottom-0 left-8 w-4 h-4 rounded-full" style={{
                  background: "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)",
                  boxShadow: "0 2px 8px rgba(255, 68, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
                <div className="absolute bottom-0 right-8 w-5 h-5 rounded-full" style={{
                  background: "radial-gradient(circle at 30% 30%, #ffd700, #ffb700)",
                  boxShadow: "0 2px 8px rgba(255, 215, 0, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sidebar 主体 */}
      <Sidebar
        className={cn(
          "relative z-10 border-white/20",
          shouldEnableFrost && "[&>[data-slot=sidebar-inner]]:pt-20 [&>[data-slot=sidebar-inner]]:pb-20",
          className
        )}
        style={{
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          background: "rgba(255, 255, 255, 0.08)",
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </Sidebar>
    </div>
  );
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

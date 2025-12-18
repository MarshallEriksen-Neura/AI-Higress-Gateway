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

type ThemeSidebarVariant = "default" | "glass" | "neon";

interface ThemeSidebarProps extends Omit<React.ComponentProps<typeof Sidebar>, 'variant'> {
  themeVariant?: ThemeSidebarVariant;
  themeAware?: boolean;
  neonColor?: "red" | "green" | "blue" | "purple" | "orange" | "cyan" | "auto";
  neonIntensity?: 1 | 2 | 3;
}

/**
 * 主题感知的侧边栏组件
 * 基于 shadcn/ui Sidebar 封装
 */
export function ThemeSidebar({
  className,
  themeVariant,
  themeAware = true,
  neonColor = "auto",
  neonIntensity = 2,
  children,
  ...props
}: ThemeSidebarProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getAutoVariant = (): ThemeSidebarVariant => {
    if (!themeAware || !mounted) return "default";
    if (theme === "christmas") return "neon";
    if (theme === "ocean" || theme === "spring") return "glass";
    return "default";
  };

  const effectiveVariant = themeVariant || getAutoVariant();

  const getAutoNeonColor = () => {
    if (!mounted) return "blue";
    switch (theme) {
      case "christmas": return "red";
      case "dark": return "purple";
      default: return "blue";
    }
  };

  const effectiveNeonColor = neonColor === "auto" ? getAutoNeonColor() : neonColor;

  const neonColors = {
    red: { border: "from-transparent via-red-400 to-transparent", glowColor: "255, 60, 60" },
    green: { border: "from-transparent via-green-400 to-transparent", glowColor: "50, 255, 100" },
    blue: { border: "from-transparent via-blue-400 to-transparent", glowColor: "60, 150, 255" },
    purple: { border: "from-transparent via-purple-400 to-transparent", glowColor: "180, 100, 255" },
    orange: { border: "from-transparent via-orange-400 to-transparent", glowColor: "255, 150, 50" },
    cyan: { border: "from-transparent via-cyan-400 to-transparent", glowColor: "50, 230, 255" },
  } as const;

  type NeonColorKey = keyof typeof neonColors;
  const colorConfig = neonColors[effectiveNeonColor as NeonColorKey] || neonColors.blue;

  const shouldShowChristmasDecor = React.useMemo(() => {
    return mounted && theme === "christmas" && effectiveVariant === "neon";
  }, [mounted, theme, effectiveVariant]);

  const variantStyles: Record<ThemeSidebarVariant, React.CSSProperties | undefined> = {
    default: undefined,
    glass: {
      backdropFilter: "blur(16px) saturate(150%)",
      WebkitBackdropFilter: "blur(16px) saturate(150%)",
      background: "rgba(255, 255, 255, 0.05)",
    },
    neon: {
      backdropFilter: "blur(16px) saturate(150%)",
      WebkitBackdropFilter: "blur(16px) saturate(150%)",
      background: "rgba(255, 255, 255, 0.08)",
    },
  };

  return (
    <div className="relative">
      {/* 装饰效果层 */}
      {effectiveVariant !== "default" && (
        <div className="absolute inset-0 pointer-events-none overflow-visible z-0">
          {effectiveVariant === "neon" && (
            <>
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
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
                backgroundSize: "200px 200px",
                mixBlendMode: "overlay",
              }} />
              {/* 顶部高光 */}
              <div className="absolute top-0 left-0 right-0 h-1/4" style={{
                background: "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%)",
              }} />
            </>
          )}

          {effectiveVariant === "glass" && (
            <div className="absolute inset-0" style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)",
              mixBlendMode: "overlay",
            }} />
          )}

          {/* 圣诞装饰 */}
          {shouldShowChristmasDecor && (
            <>
              <div className="absolute -top-2 left-0 right-0 z-30 overflow-visible">
                <div className="relative w-full h-16">
                  <div className="absolute top-0 left-12 w-px h-8 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                  <div className="absolute top-0 left-24 w-px h-10 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                  <div className="absolute top-0 left-36 w-px h-6 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                  <div className="absolute top-0 right-12 w-px h-9 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                  <div className="absolute top-8 left-12 w-5 h-5 rounded-full -translate-x-1/2" style={{ background: "radial-gradient(circle at 30% 30%, #ffd700, #ffb700)", boxShadow: "0 2px 8px rgba(255, 215, 0, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)" }} />
                  <div className="absolute top-10 left-24 w-6 h-6 rounded-full -translate-x-1/2" style={{ background: "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)", boxShadow: "0 2px 8px rgba(255, 68, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)" }} />
                  <div className="absolute top-6 left-36 w-4 h-4 rounded-full -translate-x-1/2" style={{ background: "radial-gradient(circle at 30% 30%, #44ff44, #00aa00)", boxShadow: "0 2px 8px rgba(68, 255, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)" }} />
                  <div className="absolute top-9 right-12 w-5 h-5 rounded-full translate-x-1/2" style={{ background: "radial-gradient(circle at 30% 30%, #ffd700, #ffb700)", boxShadow: "0 2px 8px rgba(255, 215, 0, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
              <div className="absolute top-0 left-0 right-0 z-30 h-20">
                <img src="/theme/chrismas/dashboard.png" alt="Christmas decoration" className="absolute top-0 left-0 w-full h-auto object-contain" style={{ filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))", opacity: 1, maxHeight: "100px" }} loading="lazy" onError={(e) => e.currentTarget.style.display = "none"} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-30 h-20">
                <img src="/theme/chrismas/dashboard.png" alt="Christmas decoration" className="absolute bottom-0 left-0 w-full h-auto object-contain transform scale-y-[-1]" style={{ filter: "drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.2))", opacity: 1, maxHeight: "100px" }} loading="lazy" onError={(e) => e.currentTarget.style.display = "none"} />
                <div className="absolute bottom-12 left-0 right-0">
                  <div className="absolute bottom-0 left-8 w-4 h-4 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)", boxShadow: "0 2px 8px rgba(255, 68, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)" }} />
                  <div className="absolute bottom-0 right-8 w-5 h-5 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #ffd700, #ffb700)", boxShadow: "0 2px 8px rgba(255, 215, 0, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sidebar 主体 */}
      <Sidebar
        className={cn(
          "relative z-10",
          effectiveVariant === "glass" && "border-white/20",
          effectiveVariant === "neon" && "border-white/20",
          shouldShowChristmasDecor && "[&>[data-slot=sidebar-inner]]:pt-20 [&>[data-slot=sidebar-inner]]:pb-20",
          className
        )}
        style={variantStyles[effectiveVariant]}
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

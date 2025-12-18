"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent as BaseDialogContent,
} from "@/components/ui/dialog";

type NeonColor = "red" | "green" | "blue" | "purple" | "orange" | "cyan" | "auto";

interface NeonDialogContentProps extends React.ComponentProps<typeof BaseDialogContent> {
  neonColor?: NeonColor;
  neonIntensity?: 1 | 2 | 3;
  enableFrostTexture?: boolean | "auto";
}

/**
 * 霓虹灯玻璃拟态对话框内容组件
 */
function NeonDialogContent({
  className,
  neonColor = "auto",
  neonIntensity = 2,
  enableFrostTexture = "auto",
  children,
  ...props
}: NeonDialogContentProps) {
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
    <BaseDialogContent
      className={cn(
        "relative overflow-visible border-white/20",
        shouldEnableFrost && "pt-20 pb-20",
        className
      )}
      style={{
        backdropFilter: "blur(16px) saturate(150%)",
        WebkitBackdropFilter: "blur(16px) saturate(150%)",
        background: "rgba(255, 255, 255, 0.08)",
      } as React.CSSProperties}
      {...props}
    >
      {/* 霓虹灯和装饰效果层 */}
      <div className="absolute inset-0 pointer-events-none overflow-visible z-0 rounded-lg">
        {/* 顶部霓虹流光 */}
        <div className="absolute top-0 left-0 right-0 flex justify-center">
          <div
            className={cn("w-[70%] h-[2px] bg-gradient-to-r", colorConfig.border)}
            style={{
              filter: `blur(${neonIntensity}px)`,
              boxShadow: `0 0 ${neonIntensity * 8}px rgba(${colorConfig.glowColor}, 0.9), 0 0 ${neonIntensity * 15}px rgba(${colorConfig.glowColor}, 0.6)`,
              opacity: 0.85,
            }}
          />
        </div>

        {/* 底部霓虹流光 */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          <div
            className={cn("w-[70%] h-[2px] bg-gradient-to-r", colorConfig.border)}
            style={{
              filter: `blur(${neonIntensity}px)`,
              boxShadow: `0 0 ${neonIntensity * 8}px rgba(${colorConfig.glowColor}, 0.9), 0 0 ${neonIntensity * 15}px rgba(${colorConfig.glowColor}, 0.6)`,
              opacity: 0.85,
            }}
          />
        </div>

        {/* 冰冻噪点纹理层 */}
        {shouldEnableFrost && (
          <div
            className="absolute inset-0 opacity-30 rounded-lg"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: "200px 200px",
              mixBlendMode: "overlay",
            }}
          />
        )}

        {/* 顶部高光 */}
        <div className="absolute top-0 left-0 right-0 h-1/4 rounded-t-lg" style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%)",
        }} />

        {/* 圣诞主题装饰 */}
        {shouldEnableFrost && (
          <>
            {/* 顶部圣诞彩球装饰 */}
            <div className="absolute -top-8 left-0 right-0 z-30">
              <div className="relative w-full h-16">
                <div className="absolute top-0 left-1/4 w-px h-8 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                <div className="absolute top-0 left-1/2 w-px h-10 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                <div className="absolute top-0 right-1/4 w-px h-6 bg-gradient-to-b from-yellow-600/60 to-transparent" />
                
                <div className="absolute top-8 left-1/4 w-5 h-5 rounded-full -translate-x-1/2" style={{
                  background: "radial-gradient(circle at 30% 30%, #ffd700, #ffb700)",
                  boxShadow: "0 2px 8px rgba(255, 215, 0, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
                <div className="absolute top-10 left-1/2 w-6 h-6 rounded-full -translate-x-1/2" style={{
                  background: "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)",
                  boxShadow: "0 2px 8px rgba(255, 68, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
                <div className="absolute top-6 right-1/4 w-4 h-4 rounded-full translate-x-1/2" style={{
                  background: "radial-gradient(circle at 30% 30%, #44ff44, #00aa00)",
                  boxShadow: "0 2px 8px rgba(68, 255, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>

            {/* 顶部圣诞花环装饰 */}
            <div className="absolute -top-8 left-0 right-0 z-30 h-20">
              <img
                src="/theme/chrismas/dashboard.png"
                alt="Christmas decoration"
                className="absolute top-0 left-0 w-full h-auto object-contain"
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
                  opacity: 1,
                  maxHeight: "80px",
                }}
                loading="lazy"
                onError={(e) => e.currentTarget.style.display = "none"}
              />
            </div>

            {/* 底部圣诞花环装饰 */}
            <div className="absolute -bottom-8 left-0 right-0 z-30 h-20">
              <img
                src="/theme/chrismas/dashboard.png"
                alt="Christmas decoration"
                className="absolute bottom-0 left-0 w-full h-auto object-contain transform scale-y-[-1]"
                style={{
                  filter: "drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.2))",
                  opacity: 1,
                  maxHeight: "80px",
                }}
                loading="lazy"
                onError={(e) => e.currentTarget.style.display = "none"}
              />
              
              <div className="absolute -bottom-4 left-0 right-0">
                <div className="absolute bottom-0 left-1/3 w-4 h-4 rounded-full" style={{
                  background: "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)",
                  boxShadow: "0 2px 8px rgba(255, 68, 68, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
                <div className="absolute bottom-0 right-1/3 w-5 h-5 rounded-full" style={{
                  background: "radial-gradient(circle at 30% 30%, #ffd700, #ffb700)",
                  boxShadow: "0 2px 8px rgba(255, 215, 0, 0.6), inset -2px -2px 4px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 内容区域 */}
      <div className="relative z-10">
        {children}
      </div>
    </BaseDialogContent>
  );
}

/**
 * 霓虹灯对话框组件
 */
export function NeonDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props}>{children}</Dialog>;
}

// 重新导出 shadcn dialog 的所有子组件
export {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// 同时导出带 Neon 前缀的版本
export { NeonDialogContent };

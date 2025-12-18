"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent as BaseDialogContent,
} from "@/components/ui/dialog";

type ThemeDialogVariant = "default" | "glass" | "solid";

interface ThemeDialogContentProps extends React.ComponentProps<typeof BaseDialogContent> {
  themeVariant?: ThemeDialogVariant;
  themeAware?: boolean;
}

/**
 * 主题感知的对话框内容组件
 */
function ThemeDialogContent({
  className,
  themeVariant,
  themeAware = true,
  children,
  ...props
}: ThemeDialogContentProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getAutoVariant = (): ThemeDialogVariant => {
    if (!themeAware || !mounted) return "default";
    if (theme === "ocean" || theme === "spring") return "glass";
    return "default";
  };

  const effectiveVariant = themeVariant || getAutoVariant();

  const variantStyles: Record<ThemeDialogVariant, React.CSSProperties | undefined> = {
    default: undefined,
    glass: {
      backdropFilter: "blur(16px) saturate(150%)",
      WebkitBackdropFilter: "blur(16px) saturate(150%)",
      background: "rgba(255, 255, 255, 0.05)",
    },
    solid: {
      background: "hsl(var(--background))",
    },
  };

  return (
    <BaseDialogContent
      className={cn(
        "relative",
        effectiveVariant === "glass" && "border-white/20",
        className
      )}
      style={variantStyles[effectiveVariant]}
      {...props}
    >
      {/* 装饰效果层 */}
      {effectiveVariant === "glass" && (
        <div className="absolute inset-0 pointer-events-none z-0 rounded-lg">
          <div className="absolute inset-0 rounded-lg" style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)",
            mixBlendMode: "overlay",
          }} />
        </div>
      )}

      {/* 内容区域 */}
      <div className="relative z-10">
        {children}
      </div>
    </BaseDialogContent>
  );
}

/**
 * 主题感知对话框组件
 */
export function ThemeDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
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

// 同时导出带 Theme 前缀的版本
export { ThemeDialogContent };

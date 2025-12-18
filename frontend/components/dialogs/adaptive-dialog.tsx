"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { NeonDialog, NeonDialogContent } from "./neon-dialog";
import { ThemeDialog, ThemeDialogContent } from "./theme-dialog";


interface AdaptiveDialogContentProps extends React.ComponentProps<typeof NeonDialogContent> {}

/**
 * 自适应主题对话框内容组件
 */
function AdaptiveDialogContent(props: AdaptiveDialogContentProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ThemeDialogContent {...props} />;
  }

  switch (theme) {
    case "christmas":
      return <NeonDialogContent {...props} />;
    default:
      return <ThemeDialogContent {...props} />;
  }
}

/**
 * 自适应主题对话框组件
 */
export function AdaptiveDialog({ children, ...props }: React.ComponentProps<typeof NeonDialog>) {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ThemeDialog {...props}>{children}</ThemeDialog>;
  }

  switch (theme) {
    case "christmas":
      return <NeonDialog {...props}>{children}</NeonDialog>;
    default:
      return <ThemeDialog {...props}>{children}</ThemeDialog>;
  }
}

// 重新导出所有子组件
export {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// 导出 AdaptiveDialogContent
export { AdaptiveDialogContent };

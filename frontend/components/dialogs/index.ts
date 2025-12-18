/**
 * 对话框组件集合
 * 基于 shadcn/ui Dialog 封装
 */

export { AdaptiveDialog } from "./adaptive-dialog";
export { NeonDialog, NeonDialogContent } from "./neon-dialog";
export { ThemeDialog, ThemeDialogContent } from "./theme-dialog";

// 重新导出 shadcn dialog 的所有子组件
export {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";

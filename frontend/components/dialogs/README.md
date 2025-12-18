# Dialog 主题封装组件

基于 shadcn/ui Dialog 组件封装的主题感知对话框组件集合。

## 组件列表

### 1. AdaptiveDialog - 自适应主题对话框

根据当前主题自动切换样式的对话框。在圣诞主题下使用霓虹灯效果，其他主题使用标准样式。

```tsx
import { AdaptiveDialog, AdaptiveDialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/dialogs/adaptive-dialog";
import { Button } from "@/components/ui/button";

<AdaptiveDialog>
  <DialogTrigger asChild>
    <Button>打开对话框</Button>
  </DialogTrigger>
  <AdaptiveDialogContent>
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
      <DialogDescription>描述文本</DialogDescription>
    </DialogHeader>
    <div>内容区域</div>
    <DialogFooter>
      <Button>确定</Button>
    </DialogFooter>
  </AdaptiveDialogContent>
</AdaptiveDialog>
```

### 2. NeonDialog - 霓虹灯对话框

带有霓虹灯边框、玻璃拟态效果和圣诞装饰的对话框。

**Props:**
- `neonColor?: "red" | "green" | "blue" | "purple" | "orange" | "cyan" | "auto"` - 霓虹灯颜色（默认: "auto"）
- `neonIntensity?: 1 | 2 | 3` - 霓虹灯强度（默认: 2）
- `enableFrostTexture?: boolean | "auto"` - 是否启用冰川纹理和圣诞装饰（默认: "auto"）

```tsx
import { NeonDialog, NeonDialogContent } from "@/components/dialogs/neon-dialog";

<NeonDialog>
  <DialogTrigger asChild>
    <Button>打开霓虹灯对话框</Button>
  </DialogTrigger>
  <NeonDialogContent neonColor="red" neonIntensity={2} enableFrostTexture={true}>
    <DialogHeader>
      <DialogTitle>霓虹灯对话框</DialogTitle>
    </DialogHeader>
    <div>内容</div>
  </NeonDialogContent>
</NeonDialog>
```

**圣诞装饰包含:**
- 顶部：3个悬挂彩球 + 圣诞花环图片
- 底部：2个彩球 + 翻转的花环图片
- 彩球颜色：金色（#ffd700）、红色（#ff4444）、绿色（#44ff44）

### 3. ThemeDialog - 主题感知对话框

支持多种变体的主题感知对话框。

**Props:**
- `themeVariant?: "default" | "glass" | "solid"` - 对话框变体
- `themeAware?: boolean` - 是否自动根据主题切换变体（默认: true）

```tsx
import { ThemeDialog, ThemeDialogContent } from "@/components/dialogs/theme-dialog";

<ThemeDialog>
  <DialogTrigger asChild>
    <Button>打开主题对话框</Button>
  </DialogTrigger>
  <ThemeDialogContent themeVariant="glass" themeAware={false}>
    <DialogHeader>
      <DialogTitle>玻璃拟态对话框</DialogTitle>
    </DialogHeader>
    <div>内容</div>
  </ThemeDialogContent>
</ThemeDialog>
```

## 通用子组件

所有对话框组件都重新导出了 shadcn/ui 的子组件：

```tsx
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/dialogs";
```

## 示例页面

查看 `/theme-demo` 页面可以看到所有对话框组件的实际效果。

## 技术细节

- 所有组件都基于 `@/components/ui/dialog` 封装
- 使用 `next-themes` 进行主题检测
- 支持服务端渲染（SSR）
- 完全兼容 shadcn/ui 的 API

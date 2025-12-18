"use client";

import { useState } from "react";
import { AdaptiveDialog, AdaptiveDialogContent } from "@/components/dialogs/adaptive-dialog";
import { NeonDialog, NeonDialogContent } from "@/components/dialogs/neon-dialog";
import { ThemeDialog, ThemeDialogContent } from "@/components/dialogs/theme-dialog";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Dialog 示例组件
 */
export function DialogExamples() {
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);

  return (
    <div className="space-y-8">
      {/* AdaptiveDialog 示例 */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">自适应主题对话框</h3>
        <p className="text-sm text-muted-foreground">
          根据当前主题自动切换样式（圣诞主题使用霓虹灯效果）
        </p>
        <AdaptiveDialog open={open1} onOpenChange={setOpen1}>
          <DialogTrigger asChild>
            <Button>打开自适应对话框</Button>
          </DialogTrigger>
          <AdaptiveDialogContent>
            <DialogHeader>
              <DialogTitle>自适应主题对话框</DialogTitle>
              <DialogDescription>
                这个对话框会根据当前主题自动调整样式。在圣诞主题下会显示霓虹灯效果和装饰。
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm">
                切换主题可以看到不同的效果！
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen1(false)}>
                取消
              </Button>
              <Button onClick={() => setOpen1(false)}>确定</Button>
            </DialogFooter>
          </AdaptiveDialogContent>
        </AdaptiveDialog>
      </div>

      {/* NeonDialog 示例 */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">霓虹灯对话框（圣诞主题）</h3>
        <p className="text-sm text-muted-foreground">
          玻璃拟态 + 霓虹灯边框 + 圣诞装饰（彩球和花环）
        </p>
        <div className="flex gap-4">
          <NeonDialog open={open2} onOpenChange={setOpen2}>
            <DialogTrigger asChild>
              <Button variant="outline">红色霓虹灯</Button>
            </DialogTrigger>
            <NeonDialogContent neonColor="red" neonIntensity={2} enableFrostTexture={true}>
              <DialogHeader>
                <DialogTitle>红色霓虹灯对话框</DialogTitle>
                <DialogDescription>
                  带有红色霓虹灯边框和圣诞装饰的对话框
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm">
                  这个对话框使用了红色霓虹灯效果，并包含圣诞彩球和花环装饰。
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen2(false)}>关闭</Button>
              </DialogFooter>
            </NeonDialogContent>
          </NeonDialog>
        </div>
      </div>

      {/* ThemeDialog 示例 */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">主题感知对话框</h3>
        <p className="text-sm text-muted-foreground">
          支持 default、glass、solid 三种变体
        </p>
        <div className="flex gap-4">
          <ThemeDialog open={open3} onOpenChange={setOpen3}>
            <DialogTrigger asChild>
              <Button variant="secondary">玻璃拟态对话框</Button>
            </DialogTrigger>
            <ThemeDialogContent themeVariant="glass" themeAware={false}>
              <DialogHeader>
                <DialogTitle>玻璃拟态对话框</DialogTitle>
                <DialogDescription>
                  使用玻璃拟态效果的对话框
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm">
                  这个对话框使用了玻璃拟态效果，背景半透明并带有模糊效果。
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen3(false)}>关闭</Button>
              </DialogFooter>
            </ThemeDialogContent>
          </ThemeDialog>
        </div>
      </div>
    </div>
  );
}

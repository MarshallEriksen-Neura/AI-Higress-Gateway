# Sidebar 主题封装组件

基于 shadcn/ui Sidebar 组件封装的主题感知侧边栏组件集合。

## 组件列表

### 1. AdaptiveSidebar - 自适应主题侧边栏

根据当前主题自动切换样式的侧边栏。在圣诞主题下使用霓虹灯效果，其他主题使用标准样式。

```tsx
import {
  AdaptiveSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/sidebars";
import { Home } from "lucide-react";

<SidebarProvider>
  <AdaptiveSidebar>
    <SidebarHeader>
      <h2>导航</h2>
    </SidebarHeader>
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Home className="h-4 w-4" />
            <span>首页</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  </AdaptiveSidebar>
</SidebarProvider>
```

### 2. NeonSidebar - 霓虹灯侧边栏

带有霓虹灯边框、玻璃拟态效果和圣诞装饰的侧边栏。

**Props:**
- `neonColor?: "red" | "green" | "blue" | "purple" | "orange" | "cyan" | "auto"` - 霓虹灯颜色（默认: "auto"）
- `neonIntensity?: 1 | 2 | 3` - 霓虹灯强度（默认: 2）
- `enableFrostTexture?: boolean | "auto"` - 是否启用冰川纹理和圣诞装饰（默认: "auto"）

```tsx
import { NeonSidebar, SidebarContent, SidebarProvider } from "@/components/sidebars";

<SidebarProvider>
  <NeonSidebar neonColor="red" neonIntensity={2} enableFrostTexture={true}>
    <SidebarContent>
      {/* 侧边栏内容 */}
    </SidebarContent>
  </NeonSidebar>
</SidebarProvider>
```

**圣诞装饰包含:**
- 顶部：4个悬挂彩球 + 圣诞花环图片
- 底部：2个彩球 + 翻转的花环图片
- 右侧：霓虹灯流光效果
- 冰川纹理：噪点纹理 + 冰晶效果

### 3. ThemeSidebar - 主题感知侧边栏

支持多种变体的主题感知侧边栏。

**Props:**
- `themeVariant?: "default" | "glass" | "neon"` - 侧边栏变体
- `themeAware?: boolean` - 是否自动根据主题切换变体（默认: true）
- `neonColor?: "red" | "green" | "blue" | "purple" | "orange" | "cyan" | "auto"` - 霓虹灯颜色（仅 neon 变体）
- `neonIntensity?: 1 | 2 | 3` - 霓虹灯强度（仅 neon 变体）

```tsx
import { ThemeSidebar, SidebarContent, SidebarProvider } from "@/components/sidebars";

<SidebarProvider>
  <ThemeSidebar themeVariant="glass" themeAware={false}>
    <SidebarContent>
      {/* 侧边栏内容 */}
    </SidebarContent>
  </ThemeSidebar>
</SidebarProvider>
```

## 通用子组件

所有侧边栏组件都重新导出了 shadcn/ui 的子组件：

```tsx
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/sidebars";
```

## 使用注意事项

1. **必须使用 SidebarProvider 包裹**
   ```tsx
   <SidebarProvider>
     <AdaptiveSidebar>
       {/* 内容 */}
     </AdaptiveSidebar>
   </SidebarProvider>
   ```

2. **圣诞装饰会增加顶部和底部内边距**
   - 启用圣诞装饰时，侧边栏内容会自动添加 `pt-20` 和 `pb-20` 的内边距
   - 这是为了给顶部和底部的装饰留出空间

3. **响应式支持**
   - 在移动端会自动切换为抽屉式侧边栏
   - 使用 `SidebarTrigger` 组件来控制侧边栏的显示/隐藏

## 示例页面

查看 `/theme-demo` 页面可以看到所有侧边栏组件的实际效果。

## 技术细节

- 所有组件都基于 `@/components/ui/sidebar` 封装
- 使用 `next-themes` 进行主题检测
- 支持服务端渲染（SSR）
- 完全兼容 shadcn/ui 的 API
- 圣诞花环图片路径：`/theme/chrismas/dashboard.png`

# Card 主题封装组件

基于 shadcn/ui Card 组件封装的主题感知卡片组件集合。

## 组件列表

### 1. AdaptiveCard - 自适应主题卡片

根据当前主题自动切换样式的卡片。在圣诞主题下使用霓虹灯效果，其他主题使用标准样式。

```tsx
import { AdaptiveCard, CardContent, CardHeader, CardTitle } from "@/components/cards";

<AdaptiveCard>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    内容会根据主题自动适配样式
  </CardContent>
</AdaptiveCard>
```

### 2. NeonCard - 霓虹灯卡片

带有霓虹灯边框、玻璃拟态效果和圣诞装饰的卡片。

**Props:**
- `neonColor?: "red" | "green" | "blue" | "purple" | "orange" | "cyan" | "auto"` - 霓虹灯颜色（默认: "auto"）
- `enableNeon?: boolean` - 是否启用霓虹灯效果（默认: true）
- `neonIntensity?: 1 | 2 | 3` - 霓虹灯强度（默认: 2）
- `showThemeDecor?: boolean | "auto"` - 是否显示主题装饰（默认: "auto"）
- `enableFrostTexture?: boolean | "auto"` - 是否启用冰川纹理（默认: "auto"）

```tsx
import { NeonCard, CardContent } from "@/components/cards";

<NeonCard neonColor="red" neonIntensity={2} enableFrostTexture={true}>
  <CardContent>
    霓虹灯卡片内容
  </CardContent>
</NeonCard>
```

**圣诞装饰包含:**
- 右上角：圣诞彩灯和雪花装饰
- 左侧：冰霜装饰
- 四个角落：冰晶纹理
- 边框：冰川纹理效果

### 3. ThemeCard - 主题感知卡片

支持多种变体的主题感知卡片。

**Props:**
- `variant?: "default" | "glass" | "solid"` - 卡片变体
- `themeAware?: boolean` - 是否自动根据主题切换变体（默认: true）

```tsx
import { ThemeCard, CardContent } from "@/components/cards";

<ThemeCard variant="glass" themeAware={false}>
  <CardContent>
    玻璃拟态卡片
  </CardContent>
</ThemeCard>
```

## 预设内容组件

### StatCard - 统计卡片

用于显示统计数据的卡片内容组件。

```tsx
import { AdaptiveCard } from "@/components/cards";
import { StatCard } from "@/components/cards";

<AdaptiveCard>
  <StatCard 
    label="当前请求数量" 
    value="249" 
    subtitle="较昨日 +12%" 
    size="lg"
  />
</AdaptiveCard>
```

### MetricCard - 指标卡片

用于显示单个指标的卡片内容组件。

```tsx
import { AdaptiveCard, MetricCard } from "@/components/cards";

<AdaptiveCard>
  <MetricCard label="API 调用" value="17,065" />
</AdaptiveCard>
```

### IntensityCard - 强度展示卡片

用于展示霓虹灯强度的卡片内容组件。

```tsx
import { AdaptiveCard, IntensityCard } from "@/components/cards";

<AdaptiveCard neonIntensity={2}>
  <IntensityCard level={2} />
</AdaptiveCard>
```

## 通用子组件

所有卡片组件都重新导出了 shadcn/ui 的子组件：

```tsx
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/cards";
```

## 示例页面

查看 `/theme-demo` 页面可以看到所有卡片组件的实际效果。

## 技术细节

- 所有组件都基于 `@/components/ui/card` 封装
- 使用 `next-themes` 进行主题检测
- 支持服务端渲染（SSR）
- 完全兼容 shadcn/ui 的 API
- 圣诞装饰图片路径：
  - 右上角：`/theme/chrismas/card.png`
  - 左侧：`/theme/chrismas/frost-left.png`

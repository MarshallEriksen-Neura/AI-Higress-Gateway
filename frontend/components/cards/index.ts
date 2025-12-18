/**
 * 卡片组件集合
 * 
 * 提供各种预设的卡片内容组件，用于快速构建数据展示界面
 */

// 主题卡片组件
export { AdaptiveCard } from "./adaptive-card";
export { NeonCard } from "./neon-card";
export { ThemeCard } from "./theme-card";

// 预设内容组件
export { StatCard } from "./stat-card";
export { MetricCard } from "./metric-card";
export { IntensityCard } from "./intensity-card";

// 重新导出 shadcn card 的所有子组件
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

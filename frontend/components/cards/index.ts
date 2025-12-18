/**
 * 卡片组件集合
 * 
 * 提供各种预设的卡片内容组件，用于快速构建数据展示界面
 */

// 自适应主题卡片组件（唯一的通用卡片）
export { AdaptiveCard } from "./adaptive-card";



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

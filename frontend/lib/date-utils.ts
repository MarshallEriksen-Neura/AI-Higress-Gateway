// @ts-ignore - date-fns v4 类型问题
import { formatDistanceToNow } from "date-fns";
// @ts-ignore - date-fns v4 类型问题
import { zhCN, enUS } from "date-fns/locale";

export function formatRelativeTime(dateString: string, language: "zh" | "en"): string {
  const date = new Date(dateString);
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: language === "zh" ? zhCN : enUS,
  });
}

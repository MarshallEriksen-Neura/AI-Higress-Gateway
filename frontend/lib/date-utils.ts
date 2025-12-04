import { formatDistanceToNow, format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * 格式化日期为相对时间（如：5分钟前、2小时前、1天前等）
 * @param dateString 日期字符串，可以是ISO格式或其他可解析的格式
 * @param addSuffix 是否添加后缀（如"前"），默认为true
 * @returns 格式化后的相对时间字符串
 */
export function formatRelativeTime(
  dateString: string | Date,
  addSuffix: boolean = true
): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return formatDistanceToNow(date, { 
    addSuffix, 
    locale: zhCN 
  });
}

/**
 * 格式化日期为指定格式的字符串
 * @param dateString 日期字符串，可以是ISO格式或其他可解析的格式
 * @param formatStr 格式字符串，默认为 'yyyy-MM-dd HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  dateString: string | Date,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return format(date, formatStr, { locale: zhCN });
}

/**
 * 格式化日期为短日期格式（如：2024-01-01）
 * @param dateString 日期字符串，可以是ISO格式或其他可解析的格式
 * @returns 格式化后的日期字符串
 */
export function formatShortDate(dateString: string | Date): string {
  return formatDate(dateString, 'yyyy-MM-dd');
}

/**
 * 格式化日期为中文日期格式（如：2024年1月1日）
 * @param dateString 日期字符串，可以是ISO格式或其他可解析的格式
 * @returns 格式化后的日期字符串
 */
export function formatChineseDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return format(date, 'yyyy年MM月dd日', { locale: zhCN });
}

/**
 * 格式化日期为中文日期时间格式（如：2024年1月1日 14:30）
 * @param dateString 日期字符串，可以是ISO格式或其他可解析的格式
 * @returns 格式化后的日期时间字符串
 */
export function formatChineseDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
}

/**
 * 格式化日期为友好格式（如果是今天则显示时间，否则显示日期）
 * @param dateString 日期字符串，可以是ISO格式或其他可解析的格式
 * @returns 格式化后的友好日期字符串
 */
export function formatFriendlyDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return format(date, 'HH:mm', { locale: zhCN });
  } else {
    return format(date, 'MM-dd', { locale: zhCN });
  }
}

/**
 * 检查日期是否是今天
 * @param dateString 日期字符串，可以是ISO格式或其他可解析的格式
 * @returns 是否是今天
 */
export function isToday(dateString: string | Date): boolean {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * 检查日期是否是昨天
 * @param dateString 日期字符串，可以是ISO格式或其他可解析的格式
 * @returns 是否是昨天
 */
export function isYesterday(dateString: string | Date): boolean {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}
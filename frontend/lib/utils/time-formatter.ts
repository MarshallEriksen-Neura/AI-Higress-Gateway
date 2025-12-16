/**
 * 格式化相对时间
 * @param dateString ISO 8601 格式的日期字符串
 * @param locale 语言环境
 * @returns 格式化的相对时间字符串
 */
export function formatRelativeTime(dateString: string, locale: 'en' | 'zh' = 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale === 'zh') {
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // English
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化日期时间
 * @param dateString ISO 8601 格式的日期字符串
 * @param locale 语言环境
 * @returns 格式化的日期时间字符串
 */
export function formatDateTime(dateString: string, locale: 'en' | 'zh' = 'en'): string {
  const date = new Date(dateString);
  
  if (locale === 'zh') {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化图表X轴时间标签（简短格式）
 * @param dateString ISO 8601 格式的日期字符串
 * @param locale 语言环境
 * @returns 格式化的简短日期字符串，如 "Dec 12" 或 "12月12日"
 */
export function formatChartDate(dateString: string, locale: 'en' | 'zh' = 'en'): string {
  const date = new Date(dateString);
  // 使用本地时间（用户时区）
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if (locale === 'zh') {
    return `${month}月${day}日`;
  }
  
  // 英文月份简写
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${day}`;
}

/**
 * 格式化图表时间标签（时:分格式）
 * 使用本地时区，显示用户所在地的时间
 * @param dateString ISO 8601 格式的日期字符串
 * @returns 格式化的时间字符串，如 "14:30"
 */
export function formatChartTime(dateString: string): string {
  const date = new Date(dateString);
  // 使用本地时间（用户时区）
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
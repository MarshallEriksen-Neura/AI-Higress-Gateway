/**
 * 性能监控工具
 * 集成 Web Vitals 指标收集和上报
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  timestamp: number;
  url: string;
  userAgent: string;
}

// 性能指标阈值（基于 Web Vitals 标准）
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * 获取指标评级
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 格式化指标数据
 */
function formatMetric(metric: Metric): PerformanceMetric {
  return {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  };
}

/**
 * 性能数据上报函数
 */
export function reportMetric(metric: Metric) {
  const formattedMetric = formatMetric(metric);
  
  // 开发环境：输出到控制台
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    });
  }
  
  // 生产环境：发送到分析服务
  if (process.env.NODE_ENV === 'production') {
    // 使用 sendBeacon API 发送数据（不阻塞页面卸载）
    const body = JSON.stringify({
      metric: formattedMetric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
    
    // 可以发送到自己的分析端点
    const endpoint = '/api/analytics/performance';
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
    } else {
      // 降级方案：使用 fetch
      fetch(endpoint, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(console.error);
    }
  }
  
  // 存储到本地（用于性能监控仪表盘）
  storeMetricLocally(formattedMetric);
}

/**
 * 本地存储性能指标
 */
function storeMetricLocally(metric: PerformanceMetric) {
  try {
    const key = 'performance_metrics';
    const stored = localStorage.getItem(key);
    const metrics: PerformanceMetric[] = stored ? JSON.parse(stored) : [];
    
    // 只保留最近 100 条记录
    metrics.push(metric);
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    localStorage.setItem(key, JSON.stringify(metrics));
  } catch (error) {
    // 忽略存储错误
    console.error('Failed to store metric locally:', error);
  }
}

/**
 * 获取本地存储的性能指标
 */
export function getStoredMetrics(): PerformanceMetric[] {
  try {
    const key = 'performance_metrics';
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to retrieve stored metrics:', error);
    return [];
  }
}

/**
 * 清除本地存储的性能指标
 */
export function clearStoredMetrics() {
  try {
    localStorage.removeItem('performance_metrics');
  } catch (error) {
    console.error('Failed to clear stored metrics:', error);
  }
}

/**
 * 初始化性能监控
 */
export function initPerformanceMonitoring() {
  // 只在浏览器环境中运行
  if (typeof window === 'undefined') return;
  
  // 监听所有 Web Vitals 指标
  onCLS(reportMetric);
  onFCP(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}

/**
 * 获取性能摘要
 */
export function getPerformanceSummary() {
  const metrics = getStoredMetrics();
  
  if (metrics.length === 0) {
    return null;
  }
  
  // 按指标名称分组
  const grouped = metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    const group = acc[metric.name];
    if (group) {
      group.push(metric.value);
    }
    return acc;
  }, {} as Record<string, number[]>);
  
  // 计算每个指标的平均值
  const summary = Object.entries(grouped).map(([name, values]) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return {
      name,
      average: avg,
      min,
      max,
      count: values.length,
      rating: getRating(name, avg),
    };
  });
  
  return summary;
}

/**
 * 创建性能标记
 */
export function mark(name: string) {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function') {
    return;
  }
  try {
    performance.mark(name);
  } catch (error) {
    console.error('Failed to mark performance entry:', error);
  }
}

/**
 * 测量两个标记之间的时间
 */
export function measure(_name: string, startMark: string, endMark: string): number | null {
  if (typeof performance === 'undefined' || typeof performance.measure !== 'function') {
    return null;
  }
  const getLastMarkTime = (markName: string): number | null => {
    try {
      const entries = performance.getEntriesByName(markName, 'mark');
      const time = entries.at(-1)?.startTime;
      return typeof time === 'number' && Number.isFinite(time) ? time : null;
    } catch {
      return null;
    }
  };

  try {
    const startTime = getLastMarkTime(startMark);
    const endTime = getLastMarkTime(endMark);

    if (startTime === null || endTime === null) {
      return null;
    }

    const duration = endTime - startTime;
    if (!Number.isFinite(duration) || duration < 0) {
      return null;
    }

    return duration;
  } catch {
    return null;
  } finally {
    try {
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
    } catch {
      // ignore
    }
  }
}

/**
 * 记录组件渲染时间
 */
export function logComponentRender(componentName: string) {
  const startMark = `${componentName}-render-start-${Date.now()}`;
  const endMark = `${componentName}-render-end-${Date.now()}`;
  mark(startMark);

  return () => {
    mark(endMark);
    const duration = measure(`${componentName}-render`, startMark, endMark);
    if (duration !== null && process.env.NODE_ENV === 'development') {
      console.log(
        `[Performance] ${componentName} rendered in ${duration.toFixed(2)}ms`,
      );
    }
  };
}

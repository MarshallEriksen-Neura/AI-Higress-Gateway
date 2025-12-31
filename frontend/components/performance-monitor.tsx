'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/utils/performance';

/**
 * 性能监控组件
 * 在应用启动时初始化 Web Vitals 监控
 * 通过 NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITOR 环境变量控制启用/禁用
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // 检查是否启用性能监控
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITOR === 'true';

    if (isEnabled) {
      // 初始化性能监控
      initPerformanceMonitoring();
    }
  }, []);

  // 不渲染任何 UI
  return null;
}

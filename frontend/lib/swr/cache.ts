"use client";

import { Cache } from 'swr';
import { useCallback } from 'react';
import { useSWRConfig, mutate } from 'swr';

// 缓存管理工具类
export class SWRCacheManager {
  private cache: Cache<any>;

  constructor(cache: Cache<any>) {
    this.cache = cache;
  }

  // 获取所有缓存键
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 获取缓存值
  getValue(key: string): any {
    return this.cache.get(key);
  }

  // 设置缓存值
  setValue(key: string, value: any): void {
    this.cache.set(key, value);
  }

  // 删除缓存
  deleteKey(key: string): boolean {
    const cacheWithHas = this.cache as Cache<any> & { has?: (key: string) => boolean };
    const existed = typeof cacheWithHas.has === 'function'
      ? cacheWithHas.has(key)
      : this.cache.get(key) !== undefined;
    this.cache.delete(key);
    return !!existed;
  }

  // 清空所有缓存
  clear(): void {
    const cacheAny = this.cache as Cache<any> & { clear?: () => void };
    if (typeof cacheAny.clear === 'function') {
      cacheAny.clear();
      return;
    }
    this.getKeys().forEach(key => {
      this.cache.delete(key);
    });
  }

  // 根据模式匹配缓存键
  getKeysByPattern(pattern: RegExp): string[] {
    return this.getKeys().filter(key => pattern.test(key));
  }

  // 批量删除匹配模式的缓存
  deleteByPattern(pattern: RegExp): number {
    const keysToDelete = this.getKeysByPattern(pattern);
    let deletedCount = 0;
    keysToDelete.forEach(key => {
      if (this.deleteKey(key)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }

  // 获取缓存统计信息
  getStats(): { size: number; keys: string[] } {
    const keys = this.getKeys();
    return {
      size: keys.length,
      keys,
    };
  }
}

// Hook for SWR 缓存管理
export const useSWRCache = () => {
  const { cache } = useSWRConfig();
  const cacheManager = new SWRCacheManager(cache);

  // 刷新特定缓存
  const refreshCache = useCallback((key: string) => {
    return mutate(key);
  }, []);

  // 批量刷新缓存
  const refreshMultipleCaches = useCallback((keys: string[]) => {
    return Promise.all(keys.map(key => mutate(key)));
  }, []);

  // 根据模式刷新缓存
  const refreshCacheByPattern = useCallback((pattern: RegExp) => {
    const keys = cacheManager.getKeysByPattern(pattern);
    return refreshMultipleCaches(keys);
  }, [cacheManager, refreshMultipleCaches]);

  return {
    cacheManager,
    refreshCache,
    refreshMultipleCaches,
    refreshCacheByPattern,
  };
};

// 全局缓存预加载 Hook
export const useCachePreloader = () => {
  const { cache } = useSWRConfig();

  const preloadData = useCallback((key: string, fetcher: () => Promise<any>) => {
    if (!cache.get(key)) {
      mutate(key, fetcher, false);
    }
  }, [cache]);

  return { preloadData };
};

// 缓存策略配置
export const cacheStrategies = {
  // 默认策略
  default: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  },
  // 频繁更新数据策略
  frequent: {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // 30秒
    dedupingInterval: 1000,
  },
  // 静态数据策略
  static: {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
    dedupingInterval: 60000,
  },
  // 实时数据策略
  realtime: {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 5000, // 5秒
    dedupingInterval: 500,
  },
};

// Hook 用于应用缓存策略
export const useCacheStrategy = (strategy: keyof typeof cacheStrategies) => {
  return cacheStrategies[strategy] || cacheStrategies.default;
};

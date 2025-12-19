"use client";

import useSWR, { useSWRConfig } from 'swr';
import { useEffect, useRef, useState } from 'react';
import { evalService } from '@/http/eval';
import { cacheStrategies } from './cache';
import type {
  EvalResponse,
  CreateEvalRequest,
  SubmitRatingRequest,
} from '@/lib/api-types';

interface UseEvalOptions {
  /**
   * 是否启用轮询
   * 默认为 true，当 eval 状态为 ready 或 rated 时自动停止
   */
  enablePolling?: boolean;
}

/**
 * 获取评测状态
 * 支持轮询刷新（递增退避策略：1s → 2s → 3s）
 * 当 status 为 ready 或 rated 时停止轮询
 */
export function useEval(evalId: string | null, options?: UseEvalOptions) {
  const { enablePolling = true } = options || {};
  
  const key = evalId ? `/v1/evals/${evalId}` : null;
  
  // 当前轮询间隔（1s → 2s → 3s）
  const [currentInterval, setCurrentInterval] = useState(1000);
  // 轮询定时器引用
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data, error, isLoading, mutate } = useSWR<EvalResponse>(
    key,
    () => evalService.getEval(evalId!),
    {
      ...cacheStrategies.default,
      // 禁用自动刷新，使用自定义轮询逻辑
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );

  // 判断是否应该停止轮询
  const shouldStopPolling = (evalData?: EvalResponse): boolean => {
    if (!evalData) return false;
    return evalData.status === 'ready' || evalData.status === 'rated';
  };

  // 清除轮询定时器
  const clearPollingTimer = () => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  // 执行轮询
  const poll = () => {
    if (!enablePolling || !evalId) return;

    // 如果已经完成，不再轮询
    if (shouldStopPolling(data)) {
      clearPollingTimer();
      return;
    }

    // 清除旧的定时器
    clearPollingTimer();

    // 设置新的定时器
    pollingTimerRef.current = setTimeout(
      async () => {
        // 触发数据刷新
        await mutate();

        // 递增轮询间隔（1s → 2s → 3s）
        setCurrentInterval((prev) => {
          if (prev === 1000) return 2000;
          if (prev === 2000) return 3000;
          return 3000; // 保持在 3s
        });

        // 继续下一次轮询
        poll();
      },
      currentInterval
    );
  };

  // 启动轮询
  useEffect(() => {
    if (!enablePolling || !evalId || !data) return;

    // 如果已经完成，不启动轮询
    if (shouldStopPolling(data)) {
      clearPollingTimer();
      return;
    }

    // 启动轮询
    poll();

    // 清理函数
    return () => {
      clearPollingTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evalId, enablePolling, data?.status]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      clearPollingTimer();
    };
  }, []);

  return {
    eval: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
    /**
     * 当前轮询间隔（毫秒）
     */
    currentPollingInterval: currentInterval,
    /**
     * 是否正在轮询
     */
    isPolling: !!pollingTimerRef.current,
  };
}

/**
 * 创建评测的 mutation hook
 */
export function useCreateEval() {
  return async (request: CreateEvalRequest) => {
    return await evalService.createEval(request);
  };
}

/**
 * 提交评分的 mutation hook
 * 支持选择最佳模型并提交原因标签
 */
export function useSubmitRating(evalId: string | null) {
  const { mutate: globalMutate } = useSWRConfig();

  return async (request: SubmitRatingRequest) => {
    if (!evalId) {
      throw new Error('Eval ID is required');
    }

    const evalKey = `/v1/evals/${evalId}`;

    try {
      // 提交评分
      const response = await evalService.submitRating(evalId, request);

      // 更新评测状态缓存（将 status 更新为 rated）
      await globalMutate(
        evalKey,
        async (currentData?: EvalResponse) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            status: 'rated' as const,
          };
        },
        { revalidate: true }
      );

      return response;
    } catch (error) {
      // 如果提交失败，重新验证缓存
      await globalMutate(evalKey);
      throw error;
    }
  };
}

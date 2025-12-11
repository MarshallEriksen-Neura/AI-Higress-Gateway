"use client";

import { useCallback, useMemo } from 'react';
import { useApiDelete, useApiGet, useApiPost, useApiPut } from './hooks';
import { creditService } from '@/http/credit';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useI18n } from '@/lib/i18n-context';
import type { 
  CreditAccount, 
  CreditTransaction, 
  TopupRequest,
  TransactionQueryParams,
  CreditAutoTopupBatchRequest,
  CreditAutoTopupBatchResponse,
  CreditAutoTopupConfig,
  CreditAutoTopupConfigInput,
  CreditConsumptionSummary,
  CreditConsumptionProvidersResponse,
} from '@/lib/api-types';

/**
 * 获取当前用户的积分余额
 */
export const useCreditBalance = () => {
  const {
    data,
    error,
    loading,
    refresh
  } = useApiGet<CreditAccount>(
    '/v1/credits/me',
    { strategy: 'frequent' }
  );

  return {
    balance: data,
    loading,
    error,
    refresh
  };
};

/**
 * 获取当前用户的积分流水记录
 * @param params 查询参数（分页、时间范围等）
 */
export const useCreditTransactions = (params: TransactionQueryParams = {}) => {
  // 构建查询字符串
  const queryString = useMemo(() => {
    const searchParams = new URLSearchParams();
    
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);
    
    return searchParams.toString();
  }, [params.limit, params.offset, params.start_date, params.end_date]);

  const {
    data,
    error,
    loading,
    refresh
  } = useApiGet<CreditTransaction[]>(
    `/v1/credits/me/transactions?${queryString}`,
    { strategy: 'frequent' }
  );

  return {
    transactions: data || [],
    loading,
    error,
    refresh
  };
};

/**
 * 管理员充值功能
 */
export const useAdminTopup = () => {
  const user = useAuthStore(state => state.user);
  const isSuperUser = user?.is_superuser === true;
   const { t } = useI18n();

  const topupMutation = useApiPost<CreditAccount, TopupRequest>('');

  const topup = useCallback(
    async (userId: string, data: TopupRequest) => {
      if (!isSuperUser) {
        throw new Error(t("common.error_superuser_required"));
      }

      return await creditService.adminTopup(userId, data);
    },
    [isSuperUser, t]
  );

  return {
    topup,
    submitting: topupMutation.submitting,
    isSuperUser
  };
};

/**
 * 管理员批量配置自动充值规则
 */
export const useAdminAutoTopupBatch = () => {
  const user = useAuthStore(state => state.user);
  const isSuperUser = user?.is_superuser === true;
  const { t } = useI18n();

  const { trigger, submitting, error, data } = useApiPost<
    CreditAutoTopupBatchResponse,
    CreditAutoTopupBatchRequest
  >('/v1/credits/admin/auto-topup/batch');

  const applyBatch = useCallback(
    async (payload: CreditAutoTopupBatchRequest) => {
      if (!isSuperUser) {
        throw new Error(t("common.error_superuser_required"));
      }
      return await trigger(payload);
    },
    [isSuperUser, trigger, t]
  );

  return {
    applyBatch,
    submitting,
    error,
    data,
    isSuperUser,
  };
};

/**
 * 单用户自动充值配置（查询 / 保存 / 停用）
 */
export const useAdminUserAutoTopup = (userId?: string | null) => {
  const user = useAuthStore((state) => state.user);
  const isSuperUser = user?.is_superuser === true;
  const { t } = useI18n();

  const url = userId && isSuperUser ? `/v1/credits/admin/users/${userId}/auto-topup` : null;

  const {
    data,
    error,
    loading,
    refresh,
  } = useApiGet<CreditAutoTopupConfig | null>(url, {
    strategy: 'frequent',
    revalidateOnFocus: false,
  });

  const { trigger: saveTrigger, submitting: saving } = useApiPut<
    CreditAutoTopupConfig,
    CreditAutoTopupConfigInput
  >(url || '', { revalidate: false });

  const { trigger: disableTrigger, submitting: disabling } = useApiDelete<void>(url || '', {
    revalidate: false,
  });

  const save = useCallback(
    async (payload: CreditAutoTopupConfigInput) => {
      if (!isSuperUser) {
        throw new Error(t('common.error_superuser_required'));
      }
      if (!url) {
        throw new Error(t('credits.auto_topup_load_error'));
      }
      const result = await saveTrigger(payload);
      await refresh();
      return result;
    },
    [isSuperUser, refresh, saveTrigger, t, url]
  );

  const disable = useCallback(async () => {
    if (!isSuperUser) {
      throw new Error(t('common.error_superuser_required'));
    }
    if (!url) {
      throw new Error(t('credits.auto_topup_load_error'));
    }
    await disableTrigger(url);
    await refresh();
  }, [disableTrigger, isSuperUser, refresh, t, url]);

  return {
    config: data ?? null,
    loading,
    error,
    refresh,
    save,
    disable,
    saving,
    disabling,
    isSuperUser,
  };
};

/**
 * 获取积分消耗汇总（概览页）
 * @param timeRange 时间范围：today / 7d / 30d / 90d / all
 */
export const useCreditConsumptionSummary = (timeRange: string = '7d') => {
  const {
    data,
    error,
    loading,
    validating,
    refresh,
  } = useApiGet<CreditConsumptionSummary>(
    '/v1/credits/me/consumption/summary',
    {
      strategy: 'static',
      params: {
        time_range: timeRange,
      },
    }
  );

  const consumption = useMemo(() => data, [data]);

  return {
    consumption,
    error,
    loading,
    validating,
    refresh,
  };
};

/**
 * 获取按 Provider 聚合的积分消耗（概览页）
 * @param timeRange 时间范围：today / 7d / 30d / 90d / all
 */
export const useCreditProviderConsumption = (timeRange: string = '7d') => {
  const {
    data,
    error,
    loading,
    validating,
    refresh,
  } = useApiGet<CreditConsumptionProvidersResponse>(
    '/v1/credits/me/consumption/providers',
    {
      strategy: 'static',
      params: {
        time_range: timeRange,
      },
    }
  );

  const providers = useMemo(() => data?.providers || [], [data]);
  const totalConsumption = useMemo(() => data?.total_consumption || 0, [data]);

  return {
    providers,
    totalConsumption,
    error,
    loading,
    validating,
    refresh,
  };
};

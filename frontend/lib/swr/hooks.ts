"use client";

import useSWR, { SWRConfiguration } from 'swr';
import useSWRMutation, { SWRMutationConfiguration } from 'swr/mutation';
import { useState, useCallback } from 'react';
import { swrFetcher } from './fetcher';
import { useCacheStrategy } from './cache';

// 自定义 Hook 选项
export interface UseSWROptions extends SWRConfiguration {
  strategy?: 'default' | 'frequent' | 'static' | 'realtime';
  params?: Record<string, any>;
}

// 基础 GET 请求 Hook
export const useApiGet = <T = any>(
  url: string | null,
  options: UseSWROptions = {}
) => {
  const { strategy = 'default', params, ...restOptions } = options;
  const cacheStrategy = useCacheStrategy(strategy);

  // 构建完整 URL
  const fullUrl = url && params ? `${url}?${new URLSearchParams(params).toString()}` : url;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<T>(
    fullUrl,
    swrFetcher.get,
    {
      ...cacheStrategy,
      ...restOptions,
    }
  );

  return {
    data,
    error,
    loading: isLoading,
    validating: isValidating,
    refresh: mutate,
  };
};

// POST 请求 Mutation Hook
export const useApiPost = <T = any, P = any>(
  url: string,
  options: SWRMutationConfiguration<T, any, string, P> = {}
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    trigger,
    data,
    error,
    isMutating,
    reset,
  } = useSWRMutation<T, any, string, P>(
    url,
    (url: string, { arg }: { arg: P }) => {
      setIsSubmitting(true);
      return swrFetcher.post(url, arg);
    },
    options
  );

  const typedTrigger = trigger as unknown as (arg: P) => Promise<T>;

  const wrappedTrigger = useCallback(async (arg: P) => {
    try {
      const result = await typedTrigger(arg);
      setIsSubmitting(false);
      return result;
    } catch (err) {
      setIsSubmitting(false);
      throw err;
    }
  }, [typedTrigger]);

  return {
    trigger: wrappedTrigger,
    data,
    error,
    submitting: isSubmitting || isMutating,
    reset,
  };
};

// PUT 请求 Mutation Hook
export const useApiPut = <T = any, P = any>(
  url: string,
  options: SWRMutationConfiguration<T, any, string, P> = {}
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    trigger,
    data,
    error,
    isMutating,
    reset,
  } = useSWRMutation<T, any, string, P>(
    url,
    (baseUrl: string, { arg }: { arg: P }) => {
      setIsSubmitting(true);
      const hasIdAndData =
        typeof arg === "object" &&
        arg !== null &&
        "id" in (arg as Record<string, any>) &&
        "data" in (arg as Record<string, any>);
      if (hasIdAndData) {
        const { id, data } = arg as Record<string, any>;
        const targetUrl = `${baseUrl}/${id}`;
        return swrFetcher.put(targetUrl, data);
      }
      return swrFetcher.put(baseUrl, arg);
    },
    options
  );

  const typedTrigger = trigger as unknown as (arg: P) => Promise<T>;

  const wrappedTrigger = useCallback(async (arg: P) => {
    try {
      const result = await typedTrigger(arg);
      setIsSubmitting(false);
      return result;
    } catch (err) {
      setIsSubmitting(false);
      throw err;
    }
  }, [typedTrigger]);

  return {
    trigger: wrappedTrigger,
    data,
    error,
    submitting: isSubmitting || isMutating,
    reset,
  };
};

// DELETE 请求 Mutation Hook
export const useApiDelete = <T = any, P = string | undefined>(
  url: string,
  options: SWRMutationConfiguration<T, any, string, P> = {}
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    trigger,
    data,
    error,
    isMutating,
    reset,
  } = useSWRMutation<T, any, string, P>(
    url,
    (baseUrl: string, { arg }: { arg: P }) => {
      setIsSubmitting(true);
      const target =
        typeof arg === "string" && arg ? arg : baseUrl;
      return swrFetcher.delete(target);
    },
    options
  );

  const typedTrigger = trigger as unknown as (arg: P) => Promise<T>;

  const wrappedTrigger = useCallback(async (arg: P) => {
    try {
      const result = await typedTrigger(arg);
      setIsSubmitting(false);
      return result;
    } catch (err) {
      setIsSubmitting(false);
      throw err;
    }
  }, [typedTrigger]);

  return {
    trigger: wrappedTrigger,
    data,
    error,
    submitting: isSubmitting || isMutating,
    reset,
  };
};

// PATCH 请求 Mutation Hook
export const useApiPatch = <T = any, P = any>(
  url: string,
  options: SWRMutationConfiguration<T, any, string, P> = {}
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    trigger,
    data,
    error,
    isMutating,
    reset,
  } = useSWRMutation<T, any, string, P>(
    url,
    (url: string, { arg }: { arg: P }) => {
      setIsSubmitting(true);
      return swrFetcher.patch(url, arg);
    },
    options
  );

  const typedTrigger = trigger as unknown as (arg: P) => Promise<T>;

  const wrappedTrigger = useCallback(async (arg: P) => {
    try {
      const result = await typedTrigger(arg);
      setIsSubmitting(false);
      return result;
    } catch (err) {
      setIsSubmitting(false);
      throw err;
    }
  }, [typedTrigger]);

  return {
    trigger: wrappedTrigger,
    data,
    error,
    submitting: isSubmitting || isMutating,
    reset,
  };
};

// 分页数据 Hook
export const usePaginatedData = <T = any>(
  url: string,
  options: UseSWROptions = {}
) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { params } = options;
  const fullParams = {
    ...params,
    page,
    page_size: pageSize,
  };

  const {
    data,
    error,
    loading,
    validating,
    refresh,
  } = useApiGet<{ items: T[]; total: number; page: number; page_size: number }>(
    url,
    {
      ...options,
      params: fullParams,
    }
  );

  return {
    data: data?.items || [],
    total: data?.total || 0,
    currentPage: data?.page || page,
    pageSize: data?.page_size || pageSize,
    error,
    loading,
    validating,
    refresh,
    setPage,
    setPageSize,
    hasNextPage: data ? data.page * data.page_size < data.total : false,
    hasPreviousPage: data ? data.page > 1 : false,
  };
};

// 搜索数据 Hook
export const useSearchData = <T = any>(
  url: string,
  options: UseSWROptions = {}
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const { params } = options;
  const fullParams = {
    ...params,
    search: debouncedSearchTerm,
  };

  const {
    data,
    error,
    loading,
    validating,
    refresh,
  } = useApiGet<{ results: T[]; count: number }>(
    url,
    {
      ...options,
      params: fullParams,
    }
  );

  // 使用防抖
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return {
    data: data?.results || [],
    count: data?.count || 0,
    error,
    loading,
    validating,
    refresh,
    searchTerm,
    setSearchTerm: handleSearchChange,
  };
};

// 资源管理 Hook (CRUD 操作)
export const useResource = <T = any, P = any>(
  resourceUrl: string,
  options: UseSWROptions = {}
) => {
  // 获取资源列表
  const getResource = useApiGet<T[]>(resourceUrl, options);
  
  // 创建资源
  const createResource = useApiPost<T, P>(resourceUrl);
  
  // 更新资源
  const updateResource = useApiPut<T, { id: string; data: Partial<P> }>(
    resourceUrl
  );
  
  // 删除资源
  const deleteResource = useApiDelete<T>(resourceUrl);

  // 创建资源的包装函数
  const handleCreate = useCallback(async (data: P) => {
    const result = await createResource.trigger(data);
    // 创建成功后刷新列表
    await getResource.refresh();
    return result;
  }, [createResource, getResource]);

  // 更新资源的包装函数
  const handleUpdate = useCallback(async (id: string, data: Partial<P>) => {
    const result = await updateResource.trigger({ id, data });
    // 更新成功后刷新列表
    await getResource.refresh();
    return result;
  }, [updateResource, getResource]);

  // 删除资源的包装函数
  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteResource.trigger(`${resourceUrl}/${id}`);
    // 删除成功后刷新列表
    await getResource.refresh();
    return result;
  }, [deleteResource, getResource]);

  return {
    ...getResource,
    createResource: handleCreate,
    updateResource: handleUpdate,
    deleteResource: handleDelete,
    creating: createResource.submitting,
    updating: updateResource.submitting,
    deleting: deleteResource.submitting,
  };
};

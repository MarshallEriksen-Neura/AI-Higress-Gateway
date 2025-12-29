"use client";

import { useMemo } from "react";
import { useApiGet } from "@/lib/swr/hooks";
import type { RequestLogsResponse } from "@/lib/api-types";

export function useRequestLogs(limit: number = 50, offset: number = 0) {
  const params = useMemo(() => ({ limit: String(limit), offset: String(offset) }), [limit, offset]);
  const { data, error, loading, refresh } = useApiGet<RequestLogsResponse>("/v1/request-logs", {
    strategy: "frequent",
    params,
    requireAuth: true,
  });

  return {
    items: data?.items ?? [],
    loading,
    error,
    refresh,
  };
}


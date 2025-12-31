"use client";

import { useCallback, useMemo } from "react";

import { useLogicalModels } from "./use-logical-models";

export interface SelectableTtsModelOption {
  value: string;
  label: string;
  description?: string | null;
}

interface UseSelectableTtsModelsOptions {
  /**
   * 强制附加的模型 ID（例如当前选中的值），即使未在可用模型列表中也会展示
   */
  extraModels?: Array<string | null | undefined>;
}

export function useSelectableTtsModels(
  projectId: string | null,
  options?: UseSelectableTtsModelsOptions
) {
  const { models, loading, error, refresh } = useLogicalModels(projectId ?? null);

  const allOptions = useMemo<SelectableTtsModelOption[]>(() => {
    const optionMap = new Map<string, SelectableTtsModelOption>();

    const appendOption = (
      value: string,
      label?: string | null,
      description?: string | null
    ) => {
      if (!value) return;
      if (optionMap.has(value)) return;
      optionMap.set(value, {
        value,
        label: label?.trim() || value,
        description: description ?? null,
      });
    };

    for (const model of models) {
      if (!model.enabled) continue;
      if (!model.capabilities?.includes("audio")) continue;
      appendOption(model.logical_id, model.display_name, model.description);
    }

    for (const extra of options?.extraModels ?? []) {
      if (!extra) continue;
      appendOption(extra);
    }

    return Array.from(optionMap.values()).sort((a, b) => a.value.localeCompare(b.value));
  }, [models, options?.extraModels]);

  const filterOptions = useCallback(
    (keyword: string) => {
      const normalized = keyword.trim().toLowerCase();
      if (!normalized) return allOptions;
      return allOptions.filter(({ value, label, description }) => {
        return (
          value.toLowerCase().includes(normalized) ||
          label.toLowerCase().includes(normalized) ||
          (description?.toLowerCase() ?? "").includes(normalized)
        );
      });
    },
    [allOptions]
  );

  return {
    options: allOptions,
    filterOptions,
    loading,
    error,
    refresh,
  };
}


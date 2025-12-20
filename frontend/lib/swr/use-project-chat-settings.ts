"use client";

import useSWR from "swr";
import { projectChatSettingsService } from "@/http/project-chat-settings";
import { cacheStrategies } from "./cache";
import type { ProjectChatSettings, UpdateProjectChatSettingsRequest } from "@/lib/api-types";

/**
 * 获取项目聊天设置
 * 使用 static 缓存策略（配置变化不频繁）
 */
export function useProjectChatSettings(projectId: string | null) {
  const key = projectId ? `/v1/projects/${projectId}/chat-settings` : null;

  const { data, error, isLoading, mutate } = useSWR<ProjectChatSettings>(
    key,
    () => projectChatSettingsService.getProjectChatSettings(projectId!),
    cacheStrategies.static
  );

  return {
    settings: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * 更新项目聊天设置
 */
export function useUpdateProjectChatSettings() {
  return async (projectId: string, request: UpdateProjectChatSettingsRequest) => {
    return await projectChatSettingsService.updateProjectChatSettings(projectId, request);
  };
}


import { httpClient } from "./client";
import type { ProjectChatSettings, UpdateProjectChatSettingsRequest } from "@/lib/api-types";

/**
 * 项目聊天设置管理服务
 */
export const projectChatSettingsService = {
  /**
   * 获取项目聊天设置
   */
  getProjectChatSettings: async (projectId: string): Promise<ProjectChatSettings> => {
    const { data } = await httpClient.get(`/v1/projects/${projectId}/chat-settings`);
    return data;
  },

  /**
   * 更新项目聊天设置
   */
  updateProjectChatSettings: async (
    projectId: string,
    request: UpdateProjectChatSettingsRequest
  ): Promise<ProjectChatSettings> => {
    const { data } = await httpClient.put(`/v1/projects/${projectId}/chat-settings`, request);
    return data;
  },
};


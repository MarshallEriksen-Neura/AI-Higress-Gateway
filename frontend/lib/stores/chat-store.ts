"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 聊天模块状态管理
 */
interface ChatState {
  // 当前选中的项目（API Key）
  selectedProjectId: string | null;

  // 当前选中的助手和会话
  selectedAssistantId: string | null;
  selectedConversationId: string | null;

  // 评测面板状态
  activeEvalId: string | null;

  // 操作方法
  setSelectedProjectId: (projectId: string | null) => void;
  setSelectedAssistant: (assistantId: string | null) => void;
  setSelectedConversation: (conversationId: string | null) => void;
  setActiveEval: (evalId: string | null) => void;
  
  // 重置状态
  reset: () => void;
}

const initialState = {
  selectedProjectId: null,
  selectedAssistantId: null,
  selectedConversationId: null,
  activeEvalId: null,
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedProjectId: (projectId) =>
        set({
          selectedProjectId: projectId,
          // 切换项目时清空助手和会话选择
          selectedAssistantId: null,
          selectedConversationId: null,
        }),

      setSelectedAssistant: (assistantId) =>
        set({ selectedAssistantId: assistantId }),

      setSelectedConversation: (conversationId) =>
        set({ selectedConversationId: conversationId }),

      setActiveEval: (evalId) =>
        set({ activeEvalId: evalId }),

      reset: () => set(initialState),
    }),
    {
      name: 'chat-store',
      version: 1,
    }
  )
);

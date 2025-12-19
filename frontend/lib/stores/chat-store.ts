"use client";

import { create } from 'zustand';

/**
 * 聊天模块状态管理
 */
interface ChatState {
  // 当前选中的助手和会话
  selectedAssistantId: string | null;
  selectedConversationId: string | null;

  // 评测面板状态
  activeEvalId: string | null;

  // 操作方法
  setSelectedAssistant: (assistantId: string | null) => void;
  setSelectedConversation: (conversationId: string | null) => void;
  setActiveEval: (evalId: string | null) => void;
  
  // 重置状态
  reset: () => void;
}

const initialState = {
  selectedAssistantId: null,
  selectedConversationId: null,
  activeEvalId: null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setSelectedAssistant: (assistantId) =>
    set({ selectedAssistantId: assistantId }),

  setSelectedConversation: (conversationId) =>
    set({ selectedConversationId: conversationId }),

  setActiveEval: (evalId) =>
    set({ activeEvalId: evalId }),

  reset: () => set(initialState),
}));

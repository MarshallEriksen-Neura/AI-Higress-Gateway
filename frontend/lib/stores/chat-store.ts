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

  // 会话级模型覆盖：conversationId -> logical model（null 表示跟随助手默认）
  conversationModelOverrides: Record<string, string>;

  // 会话级 Bridge Agent 选择（可多选）：conversationId -> agent_ids
  conversationBridgeAgentIds: Record<string, string[]>;

  // 会话级 Bridge 面板聚焦的 req_id：conversationId -> req_id
  conversationBridgeActiveReqIds: Record<string, string>;

  // 操作方法
  setSelectedProjectId: (projectId: string | null) => void;
  setSelectedAssistant: (assistantId: string | null) => void;
  setSelectedConversation: (conversationId: string | null) => void;
  setActiveEval: (evalId: string | null) => void;
  setConversationModelOverride: (conversationId: string, logicalModel: string | null) => void;
  clearConversationModelOverrides: () => void;
  setConversationBridgeAgentIds: (conversationId: string, agentIds: string[] | null) => void;
  setConversationBridgeActiveReqId: (conversationId: string, reqId: string | null) => void;
  
  // 重置状态
  reset: () => void;
}

const initialState = {
  selectedProjectId: null,
  selectedAssistantId: null,
  selectedConversationId: null,
  activeEvalId: null,
  conversationModelOverrides: {} as Record<string, string>,
  conversationBridgeAgentIds: {} as Record<string, string[]>,
  conversationBridgeActiveReqIds: {} as Record<string, string>,
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
          conversationModelOverrides: {},
          conversationBridgeAgentIds: {},
          conversationBridgeActiveReqIds: {},
        }),

      setSelectedAssistant: (assistantId) =>
        set({ selectedAssistantId: assistantId }),

      setSelectedConversation: (conversationId) =>
        set({ selectedConversationId: conversationId }),

      setActiveEval: (evalId) =>
        set({ activeEvalId: evalId }),

      setConversationModelOverride: (conversationId, logicalModel) =>
        set((state) => {
          const next = { ...state.conversationModelOverrides };
          if (!logicalModel) {
            delete next[conversationId];
          } else {
            next[conversationId] = logicalModel;
          }
          return { conversationModelOverrides: next };
        }),

      clearConversationModelOverrides: () => set({ conversationModelOverrides: {} }),

      setConversationBridgeAgentIds: (conversationId, agentIds) =>
        set((state) => {
          const next = { ...state.conversationBridgeAgentIds };
          const normalized = (agentIds || []).map((x) => x.trim()).filter(Boolean);
          if (!normalized.length) {
            delete next[conversationId];
          } else {
            next[conversationId] = normalized;
          }
          return { conversationBridgeAgentIds: next };
        }),

      setConversationBridgeActiveReqId: (conversationId, reqId) =>
        set((state) => {
          const next = { ...state.conversationBridgeActiveReqIds };
          if (!reqId) {
            delete next[conversationId];
          } else {
            next[conversationId] = reqId;
          }
          return { conversationBridgeActiveReqIds: next };
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'chat-store',
      version: 5,
      migrate: (persistedState: any) => {
        // v1 -> v2: add conversationModelOverrides
        // v2 -> v3: add conversationBridgeAgentIds
        // v3 -> v4: add conversationBridgeActiveReqIds
        // v4 -> v5: conversationBridgeAgentIds from string -> string[]
        if (persistedState && typeof persistedState === 'object') {
          const rawAgentIds = persistedState.conversationBridgeAgentIds ?? {};
          const nextAgentIds: Record<string, string[]> = {};
          if (rawAgentIds && typeof rawAgentIds === 'object') {
            for (const [k, v] of Object.entries(rawAgentIds)) {
              if (Array.isArray(v)) {
                nextAgentIds[k] = v.map((x) => String(x)).filter(Boolean);
              } else if (typeof v === 'string' && v.trim()) {
                nextAgentIds[k] = [v.trim()];
              }
            }
          }
          return {
            ...persistedState,
            conversationModelOverrides: persistedState.conversationModelOverrides ?? {},
            conversationBridgeAgentIds: nextAgentIds,
            conversationBridgeActiveReqIds: persistedState.conversationBridgeActiveReqIds ?? {},
          };
        }
        return persistedState;
      },
    }
  )
);

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * 用户偏好设置类型
 */
export interface UserPreferences {
  /** 发送消息的快捷键模式 */
  sendShortcut: "enter" | "ctrl-enter";
}

/**
 * 用户偏好设置 Store 状态
 */
interface UserPreferencesState {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

/**
 * 默认用户偏好设置
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  sendShortcut: "ctrl-enter",
};

/**
 * 用户偏好设置 Zustand Store
 * 使用 persist 中间件自动持久化到 localStorage
 */
export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      
      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),
      
      resetPreferences: () =>
        set({ preferences: DEFAULT_PREFERENCES }),
    }),
    {
      name: "user-preferences", // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);

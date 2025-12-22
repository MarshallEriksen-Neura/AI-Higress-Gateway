"use client";

import { useEffect, useState } from "react";

/**
 * 用户偏好设置类型
 */
export interface UserPreferences {
  /** 发送消息的快捷键模式 */
  sendShortcut: "enter" | "ctrl-enter";
}

/**
 * 默认用户偏好设置
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  sendShortcut: "ctrl-enter",
};

const STORAGE_KEY = "user-preferences";

/**
 * 用户偏好设置 Hook
 * 使用 localStorage 持久化存储
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 localStorage 加载偏好设置
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserPreferences>;
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 更新偏好设置
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const newPreferences = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      } catch (error) {
        console.error("Failed to save user preferences:", error);
      }
      return newPreferences;
    });
  };

  // 重置为默认值
  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to reset user preferences:", error);
    }
  };

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    isLoaded,
  };
}

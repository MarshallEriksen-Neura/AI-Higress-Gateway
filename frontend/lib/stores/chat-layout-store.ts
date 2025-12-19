"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Layout } from "react-resizable-panels";

interface ChatLayoutState {
  layout: Layout | null;
  setLayout: (layout: Layout) => void;
  resetLayout: () => void;
}

export const useChatLayoutStore = create<ChatLayoutState>()(
  persist(
    (set) => ({
      layout: null,
      setLayout: (layout) => set({ layout }),
      resetLayout: () => set({ layout: null }),
    }),
    {
      name: "chat-layout",
      version: 1,
    }
  )
);


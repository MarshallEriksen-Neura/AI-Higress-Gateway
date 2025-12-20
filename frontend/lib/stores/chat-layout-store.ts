"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Layout } from "react-resizable-panels";

interface ChatLayoutState {
  layout: Layout | null;
  chatVerticalLayout: Layout | null;
  activeTab: "assistants" | "conversations";
  setLayout: (layout: Layout) => void;
  setChatVerticalLayout: (layout: Layout) => void;
  setActiveTab: (tab: "assistants" | "conversations") => void;
  resetLayout: () => void;
}

export const useChatLayoutStore = create<ChatLayoutState>()(
  persist(
    (set) => ({
      layout: null,
      chatVerticalLayout: null,
      activeTab: "assistants",
      setLayout: (layout) => set({ layout }),
      setChatVerticalLayout: (layout) => set({ chatVerticalLayout: layout }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      resetLayout: () => set({ layout: null, chatVerticalLayout: null, activeTab: "assistants" }),
    }),
    {
      name: "chat-layout",
      version: 2,
    }
  )
);


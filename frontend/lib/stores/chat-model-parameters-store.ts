"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { ModelParameters, TunableModelParameterKey } from "@/components/chat/chat-input/types";
import { DEFAULT_MODEL_PARAMETERS } from "@/components/chat/chat-input/types";

interface ChatModelParametersState {
  parameters: ModelParameters;

  setParameters: (next: ModelParameters) => void;
  setParameterValue: (key: TunableModelParameterKey, value: number) => void;

  reset: () => void;
}

export const useChatModelParametersStore = create<ChatModelParametersState>()(
  persist(
    (set) => ({
      parameters: { ...DEFAULT_MODEL_PARAMETERS },

      setParameters: (next) => set({ parameters: { ...next } }),
      setParameterValue: (key, value) =>
        set((state) => ({ parameters: { ...state.parameters, [key]: value } })),

      reset: () => set({ parameters: { ...DEFAULT_MODEL_PARAMETERS } }),
    }),
    {
      name: "chat-model-parameters",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted) => {
        if (persisted && typeof persisted === "object" && "parameters" in persisted) {
          const params = (persisted as { parameters?: unknown }).parameters;
          if (params && typeof params === "object") {
            return { parameters: params as ModelParameters };
          }
        }
        return { parameters: { ...DEFAULT_MODEL_PARAMETERS } };
      },
    }
  )
);

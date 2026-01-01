"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  VideoAspectRatio,
  VideoResolution,
  VideoGenerationRequest,
  VideoGenerationResponse,
} from "@/lib/api-types";

// ============= 视频生成任务 =============

export interface VideoGenTask {
  id: string;
  status: "pending" | "generating" | "success" | "failed";
  prompt: string;
  params: Omit<VideoGenerationRequest, "prompt">;
  result?: VideoGenerationResponse;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

// ============= 视频配置状态 =============

export interface VideoComposerConfig {
  // 核心输入
  prompt: string;
  referenceImageUrl?: string;

  // 高频配置 (Magic Bar可见)
  aspectRatio: VideoAspectRatio;

  // 低频配置 (Drawer内)
  model: string;
  resolution: VideoResolution;
  duration: number;
  negativePrompt: string;
  seed?: number;
  fps: number;
  enhancePrompt: boolean;
  generateAudio: boolean;
}

// ============= Store 状态 =============

interface VideoComposerState {
  // 配置状态
  config: VideoComposerConfig;

  // UI状态
  isGenerating: boolean;
  isConfigOpen: boolean;

  // 历史记录
  history: VideoGenTask[];

  // 配置操作
  setPrompt: (prompt: string) => void;
  setReferenceImage: (url?: string) => void;
  setAspectRatio: (ratio: VideoAspectRatio) => void;
  setModel: (model: string) => void;
  setResolution: (resolution: VideoResolution) => void;
  setDuration: (duration: number) => void;
  setNegativePrompt: (prompt: string) => void;
  setSeed: (seed?: number) => void;
  setFps: (fps: number) => void;
  setEnhancePrompt: (enhance: boolean) => void;
  setGenerateAudio: (generate: boolean) => void;
  updateConfig: (updates: Partial<VideoComposerConfig>) => void;
  resetConfig: () => void;

  // UI操作
  setIsGenerating: (generating: boolean) => void;
  setIsConfigOpen: (open: boolean) => void;

  // 历史操作
  addTask: (task: VideoGenTask) => void;
  updateTask: (id: string, updates: Partial<VideoGenTask>) => void;
  removeTask: (id: string) => void;
  clearHistory: () => void;

  // 构建请求
  buildRequest: () => VideoGenerationRequest;
}

// ============= 默认配置 =============

const defaultConfig: VideoComposerConfig = {
  prompt: "",
  aspectRatio: "16:9",
  model: "",
  resolution: "720p",
  duration: 5,
  negativePrompt: "",
  fps: 24,
  enhancePrompt: false,
  generateAudio: false,
};

// ============= Store 实现 =============

export const useVideoComposerStore = create<VideoComposerState>()(
  persist(
    (set, get) => ({
      config: { ...defaultConfig },
      isGenerating: false,
      isConfigOpen: false,
      history: [],

      // 配置操作
      setPrompt: (prompt) =>
        set((state) => ({
          config: { ...state.config, prompt },
        })),

      setReferenceImage: (url) =>
        set((state) => ({
          config: { ...state.config, referenceImageUrl: url },
        })),

      setAspectRatio: (ratio) =>
        set((state) => ({
          config: { ...state.config, aspectRatio: ratio },
        })),

      setModel: (model) =>
        set((state) => ({
          config: { ...state.config, model },
        })),

      setResolution: (resolution) =>
        set((state) => ({
          config: { ...state.config, resolution },
        })),

      setDuration: (duration) =>
        set((state) => ({
          config: { ...state.config, duration },
        })),

      setNegativePrompt: (prompt) =>
        set((state) => ({
          config: { ...state.config, negativePrompt: prompt },
        })),

      setSeed: (seed) =>
        set((state) => ({
          config: { ...state.config, seed },
        })),

      setFps: (fps) =>
        set((state) => ({
          config: { ...state.config, fps },
        })),

      setEnhancePrompt: (enhance) =>
        set((state) => ({
          config: { ...state.config, enhancePrompt: enhance },
        })),

      setGenerateAudio: (generate) =>
        set((state) => ({
          config: { ...state.config, generateAudio: generate },
        })),

      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),

      resetConfig: () =>
        set((state) => ({
          config: { ...defaultConfig, model: state.config.model },
        })),

      // UI操作
      setIsGenerating: (generating) => set({ isGenerating: generating }),
      setIsConfigOpen: (open) => set({ isConfigOpen: open }),

      // 历史操作
      addTask: (task) =>
        set((state) => ({
          history: [task, ...state.history].slice(0, 50), // 保留最近50条
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          history: state.history.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      removeTask: (id) =>
        set((state) => ({
          history: state.history.filter((t) => t.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      // 构建请求
      buildRequest: () => {
        const { config } = get();
        const request: VideoGenerationRequest = {
          prompt: config.prompt.trim(),
          model: config.model,
          aspect_ratio: config.aspectRatio,
          resolution: config.resolution,
          seconds: config.duration,
          fps: config.fps,
        };

        if (config.negativePrompt.trim()) {
          request.negative_prompt = config.negativePrompt.trim();
        }

        if (config.seed !== undefined) {
          request.seed = config.seed;
        }

        if (config.enhancePrompt) {
          request.enhance_prompt = true;
        }

        if (config.generateAudio) {
          request.generate_audio = true;
        }

        return request;
      },
    }),
    {
      name: "video-composer-store",
      version: 1,
      partialize: (state) => ({
        config: {
          ...state.config,
          prompt: "", // 不持久化prompt
        },
        history: state.history,
      }),
    }
  )
);

// ============= 选择器 =============

export const selectVideoConfig = (state: VideoComposerState) => state.config;
export const selectVideoHistory = (state: VideoComposerState) => state.history;
export const selectIsGenerating = (state: VideoComposerState) =>
  state.isGenerating;
export const selectIsConfigOpen = (state: VideoComposerState) =>
  state.isConfigOpen;

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n-context";
import { useMessageSpeechAudio } from "@/lib/swr/use-tts";
import { useUserPreferencesStore } from "@/lib/stores/user-preferences-store";
import type { MessageSpeechRequest } from "@/lib/api-types";

declare global {
  interface Window {
    __apiproxy_tts_audio__?: HTMLAudioElement | null;
  }
}

export interface MessageTtsControlProps {
  messageId: string;
  projectId?: string | null;
  fallbackModel?: string | null;
  disabled?: boolean;
}

export function MessageTtsControl({
  messageId,
  projectId = null,
  fallbackModel = null,
  disabled = false,
}: MessageTtsControlProps) {
  const { t } = useI18n();
  const { getAudio, loading } = useMessageSpeechAudio(messageId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const preferredTtsModel = useUserPreferencesStore(
    (s) => (projectId && s.preferences.preferredTtsModelByProject[projectId]) || null
  );
  const effectiveModel = preferredTtsModel || fallbackModel;

  const payload = useMemo<MessageSpeechRequest>(
    () => ({
      model: effectiveModel || undefined,
      voice: "alloy",
      response_format: "wav",
      speed: 1.0,
    }),
    [effectiveModel]
  );

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setIsPlaying(false);
  }, []);

  const play = useCallback(async () => {
    if (disabled) return;
    if (!effectiveModel) {
      toast.error(t("chat.tts.model_not_set"));
      return;
    }

    try {
      if (audioRef.current) {
        // 确保同一时间只有一个音频播放
        if (window.__apiproxy_tts_audio__ && window.__apiproxy_tts_audio__ !== audioRef.current) {
          window.__apiproxy_tts_audio__.pause();
        }
        window.__apiproxy_tts_audio__ = audioRef.current;

        await audioRef.current.play();
        setIsPlaying(true);
        return;
      }

      const result = await getAudio(payload);
      const next = new Audio(result.objectUrl);
      next.preload = "auto";

      next.onended = () => {
        setIsPlaying(false);
      };
      next.onpause = () => {
        setIsPlaying(false);
      };
      next.onplay = () => {
        setIsPlaying(true);
      };

      // 先暂停其他音频再开始播放
      if (window.__apiproxy_tts_audio__ && window.__apiproxy_tts_audio__ !== next) {
        window.__apiproxy_tts_audio__.pause();
      }
      window.__apiproxy_tts_audio__ = next;

      audioRef.current = next;
      await next.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("TTS play failed:", err);
      toast.error(t("chat.tts.failed"));
      stop();
    }
  }, [disabled, effectiveModel, getAudio, payload, stop, t]);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (loading) return;

    const a = audioRef.current;
    if (a && isPlaying) {
      a.pause();
      return;
    }
    void play();
  }, [disabled, isPlaying, loading, play]);

  useEffect(() => {
    return () => {
      // 组件卸载时清理本地 Audio 引用（Object URL 由缓存层统一管理）
      if (window.__apiproxy_tts_audio__ === audioRef.current) {
        window.__apiproxy_tts_audio__ = null;
      }
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const tooltip = loading
    ? t("chat.tts.loading")
    : isPlaying
      ? t("chat.tts.pause")
      : t("chat.tts.play");

  const Icon = loading ? Loader2 : isPlaying ? Pause : Volume2;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled || loading}
            onClick={toggle}
            aria-label={tooltip}
            title={tooltip}
          >
            <Icon className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

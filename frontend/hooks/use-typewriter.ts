"use client";

import { useEffect, useRef, useState } from "react";

interface TypewriterOptions {
  /**
   * 是否启用打字机渲染
   */
  enabled?: boolean;
  /**
   * 每次取字符的基础步长
   */
  baseChunkSize?: number;
  /**
   * 单次追加的最大字符数（用于 backlog 堆积时提速）
   */
  maxChunkSize?: number;
  /**
   * backlog 长度超过该值时按比例加速
   */
  accelerateAt?: number;
  /**
   * 渲染节拍（毫秒）
   */
  tickMs?: number;
  /**
   * 同一消息的稳定标识，用于在 ID 变化（临时 ID -> 实际 ID）时保持进度
   */
  sourceKey?: string;
  /**
   * 初始渲染文本（默认空串）
   */
  initialText?: string;
}

type TypewriterState = {
  text: string;
  isFinished: boolean;
};

/**
 * 将瞬时到达的文本拆成小块按节奏输出，兼容流式与非流式场景
 */
export function useTypewriter(
  content: string,
  {
    enabled = false,
    baseChunkSize = 2,
    maxChunkSize = 12,
    accelerateAt = 48,
    tickMs = 18,
    sourceKey = "__default__",
    initialText = "",
  }: TypewriterOptions = {}
): TypewriterState {
  const normalized = content ?? "";
  const [rendered, setRendered] = useState<string>(() =>
    enabled ? initialText : normalized
  );
  const renderedRef = useRef(rendered);
  const backlogRef = useRef<string>("");
  const fullRef = useRef<string>(enabled ? initialText : normalized);
  const keyRef = useRef<string>(sourceKey);

  // 收集新文本到 backlog
  useEffect(() => {
    const keyChanged = sourceKey !== keyRef.current;
    if (keyChanged) {
      keyRef.current = sourceKey;
      backlogRef.current = "";
      renderedRef.current = enabled ? initialText : normalized;
      fullRef.current = enabled ? initialText : normalized;
      setRendered(enabled ? initialText : normalized);
    }

    if (!enabled) {
      backlogRef.current = "";
      renderedRef.current = normalized;
      fullRef.current = normalized;
      setRendered(normalized);
      return;
    }

    // 如果内容缩短，重置打字机状态
    if (normalized.length < fullRef.current.length) {
      backlogRef.current = normalized;
      fullRef.current = normalized;
      renderedRef.current = "";
      setRendered("");
      return;
    }

    if (normalized !== fullRef.current) {
      const delta = normalized.slice(fullRef.current.length);
      fullRef.current = normalized;
      if (delta) {
        backlogRef.current += delta;
      }
    }
  }, [normalized, enabled, initialText, sourceKey]);

  // 按节拍消费 backlog，形成平滑输出
  useEffect(() => {
    if (!enabled) return;

    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const step = () => {
      if (canceled) return;
      const pending = backlogRef.current.length;

      if (pending === 0) {
        // 无 backlog 时放缓轮询，等待新内容
        timer = setTimeout(step, Math.max(tickMs * 2, 40));
        return;
      }

      const boost = Math.max(0, Math.floor(pending / accelerateAt));
      const chunkSize = Math.min(
        maxChunkSize,
        Math.max(1, baseChunkSize + boost)
      );

      const sliceSize = Math.min(chunkSize, pending);
      const nextChunk = backlogRef.current.slice(0, sliceSize);
      backlogRef.current = backlogRef.current.slice(sliceSize);

      const nextText = renderedRef.current + nextChunk;
      renderedRef.current = nextText;
      setRendered(nextText);

      timer = setTimeout(step, tickMs);
    };

    timer = setTimeout(step, tickMs);
    return () => {
      canceled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, tickMs, baseChunkSize, maxChunkSize, accelerateAt]);

  const isFinished =
    !enabled ||
    (backlogRef.current.length === 0 &&
      renderedRef.current.length >= fullRef.current.length);

  return {
    text: enabled ? rendered : normalized,
    isFinished,
  };
}

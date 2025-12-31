# Technical Design Document: TTS Integration (Chat Read-Aloud)

## 1. Overview

This document outlines the architecture for adding Text-to-Speech (TTS) capabilities to the AI Gateway.
**Core Philosophy:** Build a general-purpose, OpenAI-compatible backend API (`/v1/audio/speech`), and leverage it primarily for a "Read Aloud" feature in the frontend chat interface.

> **落地化原则**: 本方案严格对齐现有项目架构，复用 `ProviderSelector`、`key_pool`、鉴权体系等成熟组件。

## 2. 现有项目架构对齐

### 2.1 后端代码结构
```
backend/app/
├── api/v1/
│   ├── chat_routes.py          # 聊天路由 (API Key鉴权)
│   ├── image_routes.py         # 图像路由 (API Key鉴权) ← 参考
│   ├── assistant_routes.py     # 助手路由 (JWT鉴权)
│   ├── media_routes.py         # 媒体路由 (签名短链)
│   └── chat/
│       └── provider_selector.py # Provider选择器 (复用)
├── services/
│   ├── image_app_service.py    # 图像服务 (1281行) ← 参考
│   ├── image_storage_service.py # 存储服务 ← 参考
│   └── image_generation_chat_service.py # 会话内图生 ← 参考
├── auth.py                     # API Key鉴权
├── jwt_auth.py                 # JWT Token鉴权
└── schemas/
    └── image.py                # 图像Schema ← 参考
```

### 2.2 现有鉴权边界
| 入口类型 | 鉴权方式 | 示例路由 | 适用场景 |
|:--------|:--------|:--------|:--------|
| OpenAI兼容网关 | `require_api_key` | `/v1/chat/completions`, `/v1/images/generations` | 第三方客户端/程序调用 |
| 前端仪表盘/会话 | `require_jwt_token` | `/v1/assistants/*`, `/v1/conversations/*` | 浏览器用户操作 |
| 媒体资源访问 | 签名短链 | `/media/images/{signed_path}` | 仅用于图片等“需要直链”的资源；**本 TTS 方案不使用 OSS/签名短链** |

### 2.3 可复用组件
| 组件 | 位置 | 用途 |
|:-----|:-----|:-----|
| `ProviderSelector` | `api/v1/chat/provider_selector.py` | 多Provider选路、权重、健康检查 |
| `acquire_provider_key` | `provider/key_pool.py` | 上游API Key轮转获取 |
| `image_storage_service` | `services/image_storage_service.py` | 仅用于图片等资源的 OSS 存储 + 签名URL；**TTS 不使用** |
| `metrics_service` | `services/metrics_service.py` | 指标上报 |
| `credit_service` | `services/credit_service.py` | 计费扣费 |

## 3. Security Boundaries

### 3.1 Input Validation
- **Max Input Length:** 4096 characters hard limit (防止DoS和成本失控)
- **Voice Whitelist:** Only allow predefined voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- **Speed Range:** 0.25 - 4.0 (inclusive)
- **Model Whitelist:** `tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`

### 3.2 Rate Limiting
- **Per-User Limit:** 20 requests/minute (configurable)
- **Global Limit:** 1000 requests/minute across all users
- **Separate Quota:** TTS quota independent from chat quota

### 3.3 Authentication (双入口)
| 入口 | 鉴权 | 使用场景 |
|:-----|:-----|:--------|
| `POST /v1/audio/speech` | API Key (`require_api_key`) | 第三方客户端、程序调用 |
| `POST /v1/messages/{id}/speech` | JWT (`require_jwt_token`) | 前端"朗读"按钮 |

## 4. Architecture

### 4.1 Backend (FastAPI)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Routes Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  audio_routes.py                 │  assistant_routes.py          │
│  POST /v1/audio/speech           │  POST /v1/messages/{id}/speech│
│  [API Key Auth]                  │  [JWT Auth]                   │
└──────────────┬───────────────────┴──────────────┬───────────────┘
               │                                   │
               ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TTSAppService                               │
│  (参考 ImageAppService 实现模式)                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. preprocess_text()     - Markdown/HTML清理                    │
│  2. validate_request()    - 长度/voice/speed校验                 │
│  3. ProviderSelector      - 选路 (ModelCapability.AUDIO)         │
│  4. acquire_provider_key  - 获取上游API Key                      │
│  5. call_upstream()       - 调用OpenAI/Gemini                    │
│  6. handle_response()     - 直接流式返回（不落库/不走OSS）         │
│  7. record_metrics()      - 指标/计费                            │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Provider Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI TTS Provider     │  Gemini TTS Provider (P2)            │
│  - Passthrough streaming │  - Base64 inlineData（WAV/PCM）       │
│  - Native MP3 output     │  - 优先支持 WAV 直返；非 WAV 才考虑转码 │
└─────────────────────────────────────────────────────────────────┘
```

**新增文件:**
| 文件 | 职责 |
|:-----|:-----|
| `backend/app/api/v1/audio_routes.py` | OpenAI兼容TTS路由 (API Key) |
| `backend/app/services/tts_app_service.py` | TTS核心服务 (参考ImageAppService) |
| `backend/app/schemas/audio.py` | Pydantic请求/响应模型 |

**修改文件:**
| 文件 | 修改内容 |
|:-----|:---------|
| `backend/app/api/v1/assistant_routes.py` | 新增 `POST /v1/messages/{id}/speech`（JWT） |
| `backend/app/routes.py` | 注册 `audio_routes` |
| `backend/app/schemas/model.py` | `ModelCapability.AUDIO` 已存在；如需支持 TTS，仅需将目标模型能力标记为 `audio` |

### 4.2 Frontend (Next.js)

```
┌─────────────────────────────────────────────────────────────────┐
│                    message-item.tsx                              │
│  [操作栏新增"朗读"按钮]                                           │
└──────────────┬───────────────────────────────────────────────────┘
               │ onClick
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   useAudioPlayer Hook                            │
│  - 单例播放器 (同时只能播放一条消息)                               │
│  - 状态机: idle → loading → playing ⇄ paused → idle             │
│  - HTMLAudioElement 生命周期管理                                  │
└──────────────┬───────────────────────────────────────────────────┘
               │ httpClient (JWT)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   流式播放方案 (无需OSS)                           │
├─────────────────────────────────────────────────────────────────┤
│  httpClient(axios) + JWT → 完整音频 → Blob → URL.createObjectURL │
│  → HTMLAudioElement.play() → 用户听完 → 释放资源                  │
│                                                                  │
│  ✅ 不使用 OSS（音频听完即弃，不需要持久化直链）                    │
│  ✅ 不落库（无历史记录/下载/分享需求）                               │
│  ✅ 必做缓存：前端内存缓存（秒开回放）+ 后端 Redis 缓存（降本与跨刷新复用）│
└─────────────────────────────────────────────────────────────────┘
```

> **设计决策**: TTS朗读是一次性消费场景，用户听完即结束，无需分享/下载/历史记录。
> 因此不做 OSS 存储和数据库落库；但考虑用户会重复播放同一段音频，**必须做缓存**：前端会话内缓存 + 后端 Redis 短期缓存（不是存储依赖）。

**新增文件:**
| 文件 | 职责 |
|:-----|:-----|
| `frontend/http/audio.ts` | TTS API调用封装 |
| `frontend/lib/hooks/use-audio-player.ts` | 音频播放器Hook |

**修改文件:**
| 文件 | 修改内容 |
|:-----|:---------|
| `frontend/components/chat/message-item.tsx` | 操作栏增加"朗读"按钮 |
| `frontend/lib/i18n/chat.ts` | 新增 `chat.message.read_aloud` 等文案 |

## 5. API Specification

### 5.1 OpenAI兼容端点 (API Key)

```http
POST /v1/audio/speech
Authorization: Bearer <api_key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "model": "tts-1",
  "input": "The text to generate audio for.",
  "voice": "alloy",
  "response_format": "mp3",
  "speed": 1.0
}
```

**Validation Rules:**
| Field | Type | Constraint |
|:------|:-----|:-----------|
| `model` | string | Enum: `tts-1`, `tts-1-hd`, `gpt-4o-mini-tts` |
| `input` | string | **Max 4096 chars**, non-empty |
| `voice` | string | Enum: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| `response_format` | string | Enum: `mp3`, `opus`, `aac`, `wav`, `pcm` (default: `mp3`) |
| `speed` | float | Range: `0.25 - 4.0` (default: `1.0`) |

**Response:**
- **Success (200 OK):**
  - `Content-Type`: `audio/mpeg`
  - `Transfer-Encoding`: `chunked`
  - Body: Binary audio stream (直接流式返回，无需存储)

- **Error Responses:**
  - `400 Bad Request`: Invalid input
  - `401 Unauthorized`: Invalid API Key
  - `429 Too Many Requests`: Rate limit exceeded
  - `503 Service Unavailable`: All providers failed

### 5.2 会话内朗读端点 (JWT)

```http
POST /v1/messages/{message_id}/speech
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "voice": "alloy",
  "speed": 1.0
}
```

**Response (流式音频):**
```
Content-Type: audio/mpeg
Transfer-Encoding: chunked
Body: Binary audio stream (直接流式返回，无需存储)
```

> **注意**: 不返回签名URL，直接流式返回音频数据。前端通过 `Blob` 播放（建议复用 `frontend/http/client.ts` 的 `httpClient` 获取 blob）。
> **补充**: 本方案明确 **不接入 OSS/签名短链**，避免引入额外存储与权限边界复杂度。

## 6. Implementation Plan

### Phase 0: 准备工作 (P0)

**0.1 模型能力标记（无需改枚举）**
- `ModelCapability.AUDIO` 已存在于 `backend/app/schemas/model.py`。
- 聚合网关的关键在于“某个 provider+model 是否支持 audio”：建议通过现有接口维护能力覆盖：  
  `PUT /providers/{provider_id}/models/{model_id:path}/capabilities`（实现位置：`backend/app/api/provider_routes.py`）。

**0.2 Schema定义**
```python
# backend/app/schemas/audio.py
from pydantic import BaseModel, Field
from typing import Literal

class SpeechRequest(BaseModel):
    model: Literal["tts-1", "tts-1-hd", "gpt-4o-mini-tts"] = "tts-1"
    input: str = Field(..., min_length=1, max_length=4096)
    voice: Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"] = "alloy"
    response_format: Literal["mp3", "opus", "aac", "wav", "pcm"] = "mp3"
    speed: float = Field(1.0, ge=0.25, le=4.0)

class MessageSpeechRequest(BaseModel):
    """会话内朗读请求 (从message获取文本)"""
    voice: Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"] = "alloy"
    speed: float = Field(1.0, ge=0.25, le=4.0)
```

### Phase 1: Backend Core (P0 - Critical)

**1.1 TTSAppService（参考 ImageAppService 的选路/候选循环模式）**
```python
# backend/app/services/tts_app_service.py
import re
import unicodedata
from typing import AsyncIterator

class TTSAppService:
    """TTS应用服务 - 参考 ImageAppService 实现模式"""

    def __init__(self, client, redis, db, api_key):
        self.client = client
        self.redis = redis
        self.db = db
        self.api_key = api_key
        self.provider_selector = ProviderSelector(client=client, redis=redis, db=db)

    def preprocess_text(self, text: str) -> str:
        """文本预处理: 去除Markdown/HTML/特殊字符"""
        # [link](url) -> link
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        # Remove markdown chars
        text = re.sub(r'[*_`#~]', '', text)
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Normalize unicode
        text = unicodedata.normalize('NFKC', text)
        return text.strip()

    async def generate_speech(
        self,
        request: SpeechRequest
    ) -> AsyncIterator[bytes]:
        """生成语音 (流式返回)"""
        # 1. 文本预处理
        processed_text = self.preprocess_text(request.input)

        # 2. Provider选择（复用现有选路逻辑）
        # - select() 返回的是“逻辑模型 + 有序候选 upstream 列表”
        # - 需要在候选循环中逐个尝试 provider，失败则切换下一家（参考 ImageAppService）
        # - effective_provider_ids 的计算方式：参考 chat_routes.py / image_app_service.py（按用户可访问 provider ∩ API Key 白名单）
        selection = await self.provider_selector.select(
            requested_model=request.model,
            lookup_model_id=request.model,
            api_style="openai",
            effective_provider_ids=effective_provider_ids,
            user_id=self.api_key.user_id,
            is_superuser=bool(self.api_key.is_superuser),
        )

        # 2.1 能力校验：要求 logical_model.capabilities 含 audio
        caps = set(getattr(selection.logical_model, "capabilities", None) or [])
        if ModelCapability.AUDIO not in caps:
            raise HTTPException(400, detail={"message": "该模型不支持音频（audio）能力"})

        # 3. 候选循环：逐个 provider 尝试，失败则切换（参考 image_app_service.py）
        for scored in selection.ordered_candidates:
            cand = scored.upstream
            provider_id = cand.provider_id
            cfg = provider_config.get_provider_config(provider_id, session=self.db)
            if cfg is None:
                continue
            provider_key = await acquire_provider_key(cfg, self.redis)

            # 4. 调用上游 API（OpenAI-compatible: /v1/audio/speech）
            async for chunk in self._call_upstream(
                provider_cfg=cfg,
                provider_model_id=cand.model_id,
                text=processed_text,
                voice=request.voice,
                speed=request.speed,
                response_format=request.response_format,
                api_key=provider_key.key,
            ):
                yield chunk

        # 5. 记录指标/计费
        await self._record_metrics(
            provider=provider_id,
            input_length=len(processed_text),
            model=request.model
        )

    async def _call_upstream(self, ...) -> AsyncIterator[bytes]:
        """调用上游TTS API (OpenAI)"""
        # 实现参考 image_app_service.py 的 call_upstream_http_with_metrics
        pass
```

**1.2 路由实现**
```python
# backend/app/api/v1/audio_routes.py
from fastapi import APIRouter, Depends, Body
from fastapi.responses import StreamingResponse
from app.auth import require_api_key, AuthenticatedAPIKey
from app.schemas.audio import SpeechRequest
from app.services.tts_app_service import TTSAppService

router = APIRouter(tags=["Audio"])

@router.post("/v1/audio/speech")
async def create_speech(
    request: SpeechRequest = Body(...),
    client: httpx.AsyncClient = Depends(get_http_client),
    redis: Redis = Depends(get_redis),
    db: Session = Depends(get_db),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
):
    """OpenAI兼容TTS端点 (API Key鉴权)"""
    service = TTSAppService(client, redis, db, current_key)

    return StreamingResponse(
        service.generate_speech(request),
        media_type=f"audio/{request.response_format}",
        headers={"Transfer-Encoding": "chunked"}
    )
```

**1.3 会话内朗读端点**
```python
# 在 backend/app/api/v1/assistant_routes.py 中新增

@router.post("/v1/messages/{message_id}/speech")
async def message_speech(
    message_id: UUID,
    request: MessageSpeechRequest = Body(...),
    client: httpx.AsyncClient = Depends(get_http_client),
    redis: Redis = Depends(get_redis),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
):
    """会话内消息朗读 (JWT鉴权)"""
    # 1) 获取消息 + 权限校验：参考 chat_history_service.delete_message() 的做法
    # 2) 获取会话绑定的 api_key：参考 image_generation_chat_service.create_image_generation_and_queue_run()
    # 3) 将 DB 的 APIKey 转换为 AuthenticatedAPIKey：参考 image_generation_chat_service._to_authenticated_api_key()

    # 3. 调用TTS服务
    service = TTSAppService(client, redis, db, api_key)
    speech_request = SpeechRequest(
        model="tts-1",
        input=message.content,
        voice=request.voice,
        speed=request.speed
    )

    return StreamingResponse(
        service.generate_speech(speech_request),
        media_type="audio/mpeg"
    )
```

### Phase 2: Frontend Integration (P1 - High)

**2.1 Audio API Client**
```typescript
// frontend/http/audio.ts
import { httpClient } from "@/http/client";

export interface MessageSpeechRequest {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

/**
 * 获取消息朗读音频（JWT 由 httpClient 拦截器自动携带/刷新）
 */
export async function fetchMessageSpeech(
  messageId: string,
  options: MessageSpeechRequest = {}
): Promise<Blob> {
  const res = await httpClient.post(`/v1/messages/${messageId}/speech`, options, {
    responseType: "blob",
  });
  return res.data as Blob;
}
```

**2.2 useAudioPlayer Hook**
```typescript
// frontend/lib/hooks/use-audio-player.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchMessageSpeech, MessageSpeechRequest } from '@/http/audio';

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface UseAudioPlayerReturn {
  state: PlaybackState;
  currentMessageId: string | null;
  play: (messageId: string, options?: MessageSpeechRequest) => Promise<void>;
  pause: () => void;
  stop: () => void;
  error: Error | null;
}

// 全局单例 (确保同时只有一个消息在播放)
let globalAudioElement: HTMLAudioElement | null = null;
let globalCurrentMessageId: string | null = null;

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [state, setState] = useState<PlaybackState>('idle');
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (globalAudioElement) {
      globalAudioElement.pause();
      globalAudioElement.src = '';
      globalAudioElement = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    globalCurrentMessageId = null;
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const play = useCallback(async (
    messageId: string,
    options: MessageSpeechRequest = {}
  ) => {
    try {
      // 如果正在播放其他消息，先停止
      if (globalCurrentMessageId && globalCurrentMessageId !== messageId) {
        cleanup();
      }

      setState('loading');
      setCurrentMessageId(messageId);
      setError(null);
      globalCurrentMessageId = messageId;

      // 获取音频Blob
      const audioBlob = await fetchMessageSpeech(messageId, options);

      // 创建Object URL
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      // 创建或复用Audio元素
      if (!globalAudioElement) {
        globalAudioElement = new Audio();
      }

      globalAudioElement.src = audioUrl;

      // 设置事件监听
      globalAudioElement.onplay = () => setState('playing');
      globalAudioElement.onpause = () => setState('paused');
      globalAudioElement.onended = () => {
        setState('idle');
        setCurrentMessageId(null);
        cleanup();
      };
      globalAudioElement.onerror = (e) => {
        setState('error');
        setError(new Error('Audio playback failed'));
      };

      // 开始播放
      await globalAudioElement.play();

    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err : new Error('Unknown error'));
      cleanup();
    }
  }, [cleanup]);

  const pause = useCallback(() => {
    if (globalAudioElement && state === 'playing') {
      globalAudioElement.pause();
    }
  }, [state]);

  const stop = useCallback(() => {
    cleanup();
    setState('idle');
    setCurrentMessageId(null);
  }, [cleanup]);

  return {
    state,
    currentMessageId,
    play,
    pause,
    stop,
    error,
  };
}
```

**2.3 UI集成 (message-item.tsx)**
```tsx
// 在 message-item.tsx 的操作栏中添加

import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useAudioPlayer } from '@/lib/hooks/use-audio-player';

// 在组件内部
const { state: audioState, currentMessageId, play, stop } = useAudioPlayer();
const isPlaying = currentMessageId === message.id && audioState === 'playing';
const isLoading = currentMessageId === message.id && audioState === 'loading';

// 在操作按钮区域添加
<Button
  variant="ghost"
  size="sm"
  onClick={() => isPlaying ? stop() : play(message.id)}
  disabled={isLoading}
  title={t('chat.message.read_aloud')}
>
  {isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : isPlaying ? (
    <VolumeX className="h-4 w-4" />
  ) : (
    <Volume2 className="h-4 w-4" />
  )}
</Button>
```

**2.4 i18n文案**
```typescript
// frontend/lib/i18n/chat.ts 新增
{
  "chat.message.read_aloud": "Read aloud",
  "chat.message.stop_reading": "Stop reading",
  "chat.message.tts_loading": "Generating audio...",
  "chat.message.tts_error": "Failed to generate audio",
  "chat.settings.tts_voice": "Voice",
  "chat.settings.tts_speed": "Speed",
}
// zh
{
  "chat.message.read_aloud": "朗读",
  "chat.message.stop_reading": "停止朗读",
  "chat.message.tts_loading": "正在生成音频...",
  "chat.message.tts_error": "音频生成失败",
  "chat.settings.tts_voice": "语音",
  "chat.settings.tts_speed": "语速",
}
```

### Phase 3: Caching & Optimization (P1)

**3.1 缓存策略（必须）**

**目标**
- 用户重复播放同一段文本时：尽量做到“秒开”（优先命中前端内存缓存）。
- 用户刷新页面/跨设备重复播放时：尽量避免再次调用上游 TTS（命中后端 Redis 缓存）。

**缓存层次**
- 前端（必做）：`useAudioPlayer` 维护一个全局 `Map<cacheKey, objectUrl>`，命中则直接复用 `URL.createObjectURL(blob)` 的结果，不发请求。
- 后端（必做）：Redis 缓存最终音频 bytes（按用户隔离 + 文本哈希 + 参数），命中则直接流式返回缓存内容。

**注意事项**
- 缓存不是“存储”：不落库、不走 OSS；Redis 仅做短期缓存（TTL）。
- 为避免 Redis 被大对象撑爆：建议只缓存压缩格式（mp3/aac/opus），对 `wav/pcm` 默认不缓存；并设置单条音频最大缓存体积上限（实现时用代码常量控制即可，后续如需配置化再引入 settings/.env.example）。
```python
# 在 tts_app_service.py 中添加缓存逻辑

import hashlib
import asyncio

def generate_cache_key(
    user_id: str,
    text: str,
    voice: str,
    speed: float,
    model: str,
    response_format: str,
) -> str:
    """生成缓存Key（包含用户隔离 + 参数 + 文本哈希）"""
    normalized = text  # 建议传入 preprocess_text() 后的文本
    text_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    content = f"{user_id}:{model}:{voice}:{speed}:{response_format}:{text_hash}"
    return f"tts:cache:{hashlib.sha256(content.encode('utf-8')).hexdigest()}"

async def get_or_generate_speech(self, request: SpeechRequest):
    processed_text = self.preprocess_text(request.input)
    cache_key = generate_cache_key(
        user_id=self.api_key.user_id,
        text=processed_text,
        voice=request.voice,
        speed=request.speed,
        model=request.model,
        response_format=request.response_format,
    )

    # 0) 是否允许缓存：仅缓存压缩格式（避免 wav/pcm 体积过大）
    cacheable = request.response_format in ("mp3", "aac", "opus")

    # 1) 检查缓存
    cached = await self.redis.get(cache_key)
    if cached:
        # 可按块 yield，保持“流式”语义
        for i in range(0, len(cached), 64 * 1024):
            yield cached[i:i + 64 * 1024]
        return

    # 2) 防重复生成锁 (Redis SET NX)
    lock_key = f"tts:lock:{cache_key}"
    acquired = await self.redis.set(lock_key, "1", nx=True, ex=60)

    if not acquired:
        # 等待其他请求完成（避免同一段文本并发重复生成）
        for _ in range(30):
            await asyncio.sleep(1)
            cached = await self.redis.get(cache_key)
            if cached:
                for i in range(0, len(cached), 64 * 1024):
                    yield cached[i:i + 64 * 1024]
                return
        raise HTTPException(503, "TTS generation timeout")

    try:
        # 3) 生成并回传；同时收集分片用于缓存（可设置最大缓存体积上限）
        audio_chunks = []
        async for chunk in self._call_upstream(...):
            audio_chunks.append(chunk)
            yield chunk

        # 4) 写入缓存（TTL 7天）
        #    - 仅在 cacheable=True 时写入
        #    - 实现时建议加“最大缓存体积”上限，超过则跳过写入
        if cacheable:
            full_audio = b"".join(audio_chunks)
            await self.redis.set(cache_key, full_audio, ex=7 * 24 * 3600)
    finally:
        await self.redis.delete(lock_key)
```

### Phase 4: Observability (P2)

**4.1 指标 (复用 metrics_service)**
```python
# 在 TTSAppService 中添加指标上报（示意）
# 参考实现：backend/app/services/metrics_service.py::record_provider_call_metric
from app.services.metrics_service import record_provider_call_metric

def _record_metrics(self, *, provider_id: str, logical_model: str, is_stream: bool, success: bool, latency_ms: float, status_code: int | None):
    record_provider_call_metric(
        self.db,
        provider_id=provider_id,
        logical_model=logical_model,
        transport="http",
        is_stream=bool(is_stream),
        user_id=self.api_key.user_id,
        api_key_id=self.api_key.id,
        success=bool(success),
        latency_ms=float(latency_ms),
        status_code=status_code,
    )
```

## 7. Risks & Mitigation

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **High Cost** | TTS is expensive ($15/1M chars). | **Strict Caching**: Per-user cache with 7-day TTL. **Rate Limits**: 20 req/min per user. **Input Limit**: Max 4096 chars. |
| **Latency** | Audio generation is slower than text. | **Streaming**: Play first chunk immediately. **UI Feedback**: Show loading spinner. |
| **Mobile Auto-play** | iOS blocks auto-play without touch. | **User Initiated**: Only play on explicit click. Use `<audio>` element (not Web Audio API for simplicity). |
| **Markdown in Text** | AI outputs `**Bold**`, `Code`, `[links](url)`. | **Text Normalization**: Multi-stage regex pipeline in `preprocess_text()`. |
| **Cache Pollution** | Malicious user fills cache. | **User Isolation**: Include `user_id` in cache key. **TTL**: 7 days auto-expire. |
| **Concurrent Requests** | Duplicate TTS calls waste resources. | **Redis Lock**: `SET NX` pattern with 60s timeout. |
| **Provider Failure** | Single provider outage. | **ProviderSelector**: Built-in failover to next candidate. |
| **Gemini Format Handling** | 返回格式不一致（WAV vs PCM），或与期望输出格式不匹配。 | **优先支持 WAV**：`audio/wav` 直接回传；`audio/L16` 封装 WAV；仅当需要 mp3/aac/opus 时再引入 ffmpeg。 |
| **Model Discovery** | TTS models not auto-detected. | **Manual Config**: Admin marks model with `AUDIO` capability via UI. |

## 8. Execution Checklist

| # | Task | Priority | Depends On | Status |
|:---:|:---|:---:|:---:|:---:|
| 1 | 标记 TTS 模型 capability=audio（能力覆盖） | P0 | - | ⬜ |
| 2 | Create `schemas/audio.py` | P0 | - | ⬜ |
| 3 | Implement `TTSAppService` | P0 | 1, 2 | ⬜ |
| 4 | Create `audio_routes.py` (API Key) | P0 | 3 | ⬜ |
| 5 | Add `/v1/messages/{id}/speech` (JWT) | P0 | 3 | ⬜ |
| 6 | Register routes in `routes.py` | P0 | 4, 5 | ⬜ |
| 7 | Frontend `http/audio.ts` | P1 | 5 | ⬜ |
| 8 | Frontend `use-audio-player.ts` | P1 | 7 | ⬜ |
| 9 | Update `message-item.tsx` UI | P1 | 8 | ⬜ |
| 10 | Add i18n texts | P1 | 9 | ⬜ |
| 11 | 前端回放缓存（复用 blob URL） | P1 | 8 | ⬜ |
| 12 | 后端 Redis cache + lock | P1 | 3 | ⬜ |
| 13 | Metrics integration | P2 | 3 | ⬜ |
| 14 | Gemini Provider（优先 WAV；仅非 WAV 才转码） | P2 | 3 | ⬜ |

## 9. Provider API Reference

### 9.1 OpenAI TTS API

> 官方文档: https://platform.openai.com/docs/api-reference/audio/createSpeech

**Endpoint:**
```http
POST https://api.openai.com/v1/audio/speech
Authorization: Bearer $OPENAI_API_KEY
Content-Type: application/json
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|:----------|:-----|:--------:|:------------|
| `model` | string | ✅ | TTS模型: `gpt-4o-mini-tts` (推荐，支持instructions), `tts-1`, `tts-1-hd` |
| `input` | string | ✅ | 要转换的文本，最大长度 4096 字符 |
| `voice` | string | ✅ | 语音选项: `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`, `verse` |
| `response_format` | string | ❌ | 输出格式: `mp3`(默认), `opus`, `aac`, `flac`, `wav`, `pcm` |
| `speed` | float | ❌ | 语速: `0.25` - `4.0`，默认 `1.0` |
| `instructions` | string | ❌ | 仅 `gpt-4o-mini-tts` 支持，控制语气/情感/口音 |

**Request Example:**
```json
{
  "model": "gpt-4o-mini-tts",
  "input": "Today is a wonderful day to build something people love!",
  "voice": "coral",
  "instructions": "Speak in a cheerful and positive tone.",
  "response_format": "mp3"
}
```

**Response:**
- `Content-Type`: `audio/mpeg`
- `Transfer-Encoding`: `chunked` (支持流式)
- Body: 二进制音频流

**Streaming Example (Python):**
```python
from openai import OpenAI

client = OpenAI()

with client.audio.speech.with_streaming_response.create(
    model="gpt-4o-mini-tts",
    voice="coral",
    input="Hello world!",
    response_format="mp3"
) as response:
    response.stream_to_file("output.mp3")
```

**Voice Characteristics:**
| Voice | Style |
|:------|:------|
| `alloy` | Neutral |
| `coral` | Warm (推荐) |
| `echo` | Smooth |
| `fable` | Expressive |
| `nova` | Friendly |
| `onyx` | Deep |
| `shimmer` | Clear |

**Pricing:** ~$15 / 1M characters

---

### 9.2 Google Gemini TTS API (P2 - 延后)

> 官方文档: https://ai.google.dev/gemini-api/docs/speech-generation

**注意:** Gemini TTS 返回的是 `inlineData` 的 base64 数据，真实格式以 `mimeType` 为准：
- 常见：`audio/wav`（可直接写成 `out.wav`，浏览器 `<audio>` 可播放，无需 ffmpeg）
- 也可能：`audio/L16;rate=24000`（Linear16 PCM），此时可在网关侧“封装 WAV 头”后返回 `audio/wav`；只有当你坚持输出 `mp3/aac/opus` 时才需要 ffmpeg 转码。

**Endpoint:**
```http
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent
x-goog-api-key: $GEMINI_API_KEY
Content-Type: application/json
```

**Request Example:**
```json
{
  "contents": [{
    "parts": [{
      "text": "Say cheerfully: Have a wonderful day!"
    }]
  }],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {
          "voiceName": "Kore"
        }
      }
    }
  }
}
```

**Response:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "inlineData": {
          "mimeType": "audio/wav",
          "data": "<base64-encoded-wav-bytes>"
        }
      }]
    }
  }]
}
```

**Audio Output Format:**
- 以 `mimeType` 为准：
  - `audio/wav`：可直接解码为 wav 文件/bytes
  - `audio/L16;rate=24000`：PCM（Linear16），可封装成 WAV 后返回 `audio/wav`

**Voice Options (30种):**
`Zephyr`, `Puck`, `Charon`, `Kore`, `Fenrir`, `Leda`, `Orus`, `Aoede`, `Enceladus`, `Achernar`, `Gacrux`, `Sulafat` 等

## 10. Future Expansion

- **Auto-play**: Toggle in settings to automatically read new AI messages.
- **Speech-to-Text (STT)**: Reuse the `audio` route prefix for `transcriptions` endpoint.
- **Custom Voices**: Support OpenAI custom voice API for enterprise users.
- **Multi-Speaker**: Leverage Gemini's multi-speaker capability for dialogue scenarios.

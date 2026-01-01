# 文生视频 (Text-to-Video) 接入方案

## 一、API 文档摘要

### 1. OpenAI Sora API

**模型版本**:
- `sora-2` - 基础版本
- `sora-2-pro` - 专业版，更高质量

**API 端点**: `POST https://api.openai.com/v1/videos`

**支持的生成模式**:
| 模式 | 说明 |
|------|------|
| Text-to-Video | 文本描述生成视频 |
| Image-to-Video | 图片 + 文本生成视频 |
| Video Remix | 基于现有视频生成新视频 |
| Video Extension | 视频延长 |

**请求参数**:

```typescript
interface SoraGenerateRequest {
  // 必填参数
  model: 'sora-2' | 'sora-2-pro';
  prompt: string;                    // 视频描述，最大 2000 字符

  // 可选参数
  aspect_ratio?: '16:9' | '9:16' | '1:1';  // 宽高比，默认 16:9
  duration?: 5 | 10 | 15 | 20 | 25;       // 时长（秒），Pro 最长 25s
  resolution?: '480p' | '720p' | '1080p'; // 分辨率，默认 720p
  quality?: 'standard' | 'high';          // 质量等级

  // Image-to-Video 模式
  image_url?: string;                // 起始帧图片 URL
  image_urls?: string[];             // 多张参考图片

  // 高级选项
  style?: string;                    // 风格提示
  callback_url?: string;             // 生成完成回调 URL
  remove_watermark?: boolean;        // 移除水印（需要付费）
}
```

**响应结构**:

```typescript
// 创建任务响应
interface SoraCreateResponse {
  id: string;                        // 生成任务 ID
  status: 'queued' | 'generating' | 'completed' | 'failed';
  created_at: string;
}

// 查询结果响应
interface SoraResultResponse {
  id: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  video_url?: string;                // 视频下载 URL
  thumbnail_url?: string;            // 缩略图 URL
  duration?: number;                 // 实际时长
  error?: {
    code: string;
    message: string;
  };
}
```

**API 调用流程**:
```
1. POST /v1/videos                 → 创建生成任务，返回 video_id
2. GET  /v1/videos/{video_id}      → 轮询查询状态
3. 状态为 completed 时：
   - GET /v1/videos/{video_id}/content → 下载 MP4（或用 variant 下载 thumbnail/spritesheet）
```

**定价** (ChatGPT Plus/Pro):
- Plus: 50 个生成额度/月，720p，最长 5s
- Pro: 500 个生成额度/月，1080p，最长 20s
- API 定价: ~$0.01-0.05/秒视频

---

### 2. Google Veo API (Vertex AI)

**模型版本**:
- `veo-2` - 基础版本
- `veo-3-generate-preview` - 高质量版本
- `veo-3-fast-preview` - 快速版本（低延迟）
- `veo-3.1-generate-preview` - 最新版本，支持音频

**API 端点**: Vertex AI `generateVideos` 方法

**支持的生成模式**:
| 模式 | 说明 |
|------|------|
| Text-to-Video | 文本描述生成视频 |
| Image-to-Video | 单张图片生成视频 |
| Frame Interpolation | 首尾帧插值生成视频 |
| Video Extension | 视频延长 |

**请求参数**:

```python
# Python SDK 示例
from google.genai import types

config = types.GenerateVideosConfig(
    # 基础参数
    number_of_videos=1,              # 生成数量 (1-4)
    duration_seconds=5,              # 时长: 4, 5, 6, 7, 8 秒

    # 视频规格
    aspect_ratio='16:9',             # '16:9', '9:16', '1:1'
    resolution='720p',               # '720p', '1080p'

    # 增强选项
    enhance_prompt=True,             # 自动优化提示词

    # Veo 3.1 专属
    generate_audio=True,             # 生成配套音频

    # 帧控制 (Image-to-Video)
    # first_frame=image,             # 首帧图片
    # last_frame=image,              # 尾帧图片 (用于插值)
)

operation = client.models.generate_videos(
    model='veo-3.1-generate-preview',
    prompt='A neon hologram of a cat driving at top speed',
    image=first_frame_image,         # 可选：起始帧
    config=config,
)
```

**TypeScript/JavaScript 参数**:

```typescript
interface VeoGenerateRequest {
  // 必填
  model: 'veo-2' | 'veo-3-generate-preview' | 'veo-3-fast-preview' | 'veo-3.1-generate-preview';
  prompt: string;

  // 可选
  config: {
    numberOfVideos?: number;         // 1-4
    durationSeconds?: 4 | 5 | 6 | 7 | 8;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    resolution?: '720p' | '1080p';
    enhancePrompt?: boolean;
    generateAudio?: boolean;         // Veo 3.1+
  };

  // Image-to-Video
  image?: {
    imageBytes?: string;             // Base64 图片数据
    mimeType?: string;               // 'image/png' | 'image/jpeg'
    uri?: string;                    // GCS URI
  };

  // Frame Interpolation (Veo 3.1)
  lastFrame?: {
    imageBytes?: string;
    mimeType?: string;
  };
}
```

**响应结构**:

```typescript
interface VeoOperationResponse {
  name: string;                      // 操作 ID
  done: boolean;                     // 是否完成

  // 完成后
  response?: {
    generatedVideos: Array<{
      video: {
        uri: string;                 // GCS 视频 URI
        mimeType: string;
      };
    }>;
  };

  // 错误信息
  error?: {
    code: number;
    message: string;
  };
}
```

**API 调用流程**:
```
1. generateVideos()              → 创建生成任务，返回 operation
2. operations.get(operation)     → 轮询查询状态
3. operation.done = true 时获取视频 URI
```

**定价** (Vertex AI):
- Veo 2: ~$0.35/秒视频
- Veo 3: ~$0.50/秒视频
- Veo 3.1: ~$0.60/秒视频

---

## 二、API 对比总结

| 特性 | OpenAI Sora 2 | Google Veo 3.1 |
|------|---------------|----------------|
| 最大时长 | 25秒 (Pro) | 8秒 |
| 分辨率 | 1080p | 1080p |
| 宽高比 | 16:9, 9:16, 1:1 | 16:9, 9:16, 1:1 |
| 音频生成 | Sora 2 支持 | ✅ 原生支持 |
| Image-to-Video | ✅ | ✅ |
| 帧插值 | ❌ | ✅ (首尾帧) |
| 视频延长 | ✅ | ✅ |
| API 可用性 | ChatGPT Plus/Pro + API | Vertex AI |
| 生成速度 | 30s-2min | 1-3min |
| 水印 | 有 (可移除) | 有 SynthID |

---

## 二点五、跨厂商统一参数画像（参考 TTS 的分层做法）

目标：在不让厂商 DTO 泄露到业务层的前提下，定义一套“尽可能覆盖主流视频生成”的统一语义参数集合，并允许通过少量 `extra_body` 做差异化补齐。

### 2.5.1 现状：网关已落地的统一字段（最小稳定核）

当前网关侧已实现的“会话内视频生成”入口（JWT）对外实际可用字段等价于：
- `model`：逻辑模型 ID（网关选路）
- `prompt`：文本提示词
- `size`：分辨率（如 `1280x720`）
- `seconds`：视频时长（秒）
- `extra_body`：保留扩展字段容器（建议结构 `{ openai: {...}, google: {...} }`）

这套字段能覆盖：
- OpenAI Sora：`POST /v1/videos`（multipart：`prompt/model/size/seconds`）
- Gemini Veo（Gemini API）：`...:predictLongRunning`（JSON：`instances[].prompt + parameters`）

### 2.5.2 建议：三层参数模型（Core / Standard / Advanced）

参照 `docs/tts-parameter-catalog.md` 的做法，建议把视频生成统一语义拆成三层：

1) **Core（必须）**：任何厂商都应能落地
- `prompt`
- `model`
- `seconds`
- `size`（或 `aspect_ratio + resolution`，二选一，推荐保留 `size` 作为网关“真实落地字段”）

2) **Standard（推荐）**：主流平台普遍具备、且语义可归一
- `aspect_ratio`：`16:9|9:16|1:1|4:3|3:4|21:9`（可由 `size` 推导；或反向映射到 `size`）
- `resolution`：`480p|720p|1080p|2k|4k`（不同厂商支持不同，网关负责降级/映射）
- `negative_prompt`：负向提示词（Veo/Pika/多数平台支持）
- `seed`：随机种子（Runway/豆包等常见；不保证跨厂商完全可复现）
- `fps`：帧率（部分平台支持，如豆包/Pika）
- `num_outputs`：生成数量（Veo 常见 `numberOfVideos`）
- `generate_audio`：是否生成音频（Veo 3.1+）

3) **Advanced（可选）**：覆盖差异较大的“控制/参考/编辑”能力
- `input_image_url` / `input_image_id`：图生视频（首帧/参考图）
- `input_images`：多参考图（Sora 参考图、Veo up to N、Pika ingredient 等）
- `last_frame_url`：首尾帧/插值
- `remix_video_id`：remix（基于已生成视频做局部修改）
- `extend_video_id`：延长（通常要求“必须是同平台生成的视频”）
- `style` / `camera_control` / `motion_strength` / `guidance_scale`：不同平台参数名差异大，优先走 `extra_body` 分流
- `watermark`：水印开关（Runway/部分平台）

建议的统一请求（示意，不代表已全部落地）：
```ts
// 统一入口：SpeechRequest 的视频版本（建议）
export interface VideoRequest {
  // Core
  model: string
  prompt: string
  size?: string            // "1280x720"
  seconds?: number         // 4/6/8/...

  // Standard（可选）
  aspect_ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9"
  resolution?: "480p" | "720p" | "1080p" | "2k" | "4k"
  negative_prompt?: string
  seed?: number
  fps?: number
  num_outputs?: number
  generate_audio?: boolean

  // Advanced（可选）
  input_image_url?: string
  input_images?: string[]
  last_frame_url?: string
  remix_video_id?: string
  extend_video_id?: string
  style?: string
  watermark?: boolean

  // 厂商扩展（推荐保留，避免为每个“怪字段”都改 schema）
  extra_body?: { openai?: Record<string, unknown>; google?: Record<string, unknown> }
}
```

### 2.5.3 统一字段与主流平台映射建议（摘要）

> 规则：网关内部尽量只依赖统一字段；遇到“语义无法归一/字段结构过深”的，收敛进 `extra_body.<vendor>`，并在选路层做能力过滤（类似 TTS 的 `requires_reference_audio` 思路）。

| 统一语义 | OpenAI Sora | Gemini Veo | Runway | Pika | 豆包 |
|---|---|---|---|---|---|
| `prompt` | `prompt` | `instances[].prompt` | `promptText` | `promptText` | `promptText` |
| `seconds` | `seconds` | `durationSeconds` | `duration` | `options.*` | `duration` |
| `size` | `size` | `parameters.resolution + aspectRatio`（映射） | `ratio`（映射） | `options.aspectRatio + frameRate`（映射） | `resolution + ratio`（映射） |
| `negative_prompt` | `extra_body.openai`（若支持） | `parameters.negativePrompt` | - | `options.parameters.negativePrompt` | - |
| `seed` | `extra_body.openai`（若支持） | `extra_body.google`（若支持） | `seed` | - | `seed` |
| `generate_audio` | - | `generateAudio` | - | `pikaffect`（效果侧） | - |
| `input_image_url` | `input_reference`（file/url） | `image` / `first_frame` | `promptImage` | `image` | `image` |
| `last_frame_url` | - | `lastFrame` | - | - | `image_tail` |
| `watermark` | - | - | `watermark` | - | `watermark` |

---

## 三、功能设计

### 3.1 用户交互流程

```
用户视角:
┌─────────────────────────────────────────────────────────────────┐
│  视频生成面板                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 提示词: [一只猫在弹钢琴，背景是星空____________] [✨优化]     ││
│  │                                                             ││
│  │ ┌─────────────┐  ┌─────────────┐                           ││
│  │ │ 📷 上传图片  │  │ 🎬 上传视频  │  (可选参考)               ││
│  │ └─────────────┘  └─────────────┘                           ││
│  │                                                             ││
│  │ 参数设置:                                                    ││
│  │ ├─ 服务商: [OpenAI Sora ▼] [Google Veo ▼]                  ││
│  │ ├─ 时长:   [5秒 ▼]                                         ││
│  │ ├─ 比例:   [16:9 ▼] [9:16] [1:1]                          ││
│  │ ├─ 分辨率: [720p ▼] [1080p]                                ││
│  │ └─ 音频:   [✓] 生成配套音效                                 ││
│  │                                                             ││
│  │            [🎬 生成视频]                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  生成状态:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ⏳ 正在生成... 预计 1-2 分钟                                 ││
│  │ ████████████░░░░░░░░ 60%                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  生成结果:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ┌─────────────────────┐                                    ││
│  │  │                     │                                    ││
│  │  │    🎬 视频预览       │  [▶️ 播放] [⬇️ 下载] [🔄 重新生成] ││
│  │  │                     │                                    ││
│  │  └─────────────────────┘                                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 核心功能

1. **文本生成视频** - 输入描述，生成视频
2. **图片生成视频** - 上传图片作为起始帧
3. **参数配置** - 时长、比例、分辨率、音频
4. **生成状态追踪** - 实时显示进度
5. **结果预览下载** - 播放、下载生成的视频
6. **历史记录** - 保存生成历史

---

## 四、技术架构

### 4.1 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend                                  │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ VideoGenForm   │  │ VideoPreview   │  │ VideoHistory       │  │
│  │ Component      │──│ Component      │──│ Component          │  │
│  └────────────────┘  └────────────────┘  └────────────────────┘  │
│           │                  │                    │               │
│           └──────────────────┼────────────────────┘               │
│                              │                                    │
│                    ┌─────────▼─────────┐                         │
│                    │ Video Gen Service │                         │
│                    │ + WebSocket/SSE   │                         │
│                    └─────────┬─────────┘                         │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                         Backend                                   │
│                    ┌─────────▼─────────┐                         │
│                    │ /v1/video/generate│                         │
│                    │ Video Router      │                         │
│                    └─────────┬─────────┘                         │
│                              │                                    │
│           ┌──────────────────┼──────────────────┐                │
│           │                  │                  │                │
│  ┌────────▼────────┐ ┌───────▼───────┐ ┌───────▼───────┐        │
│  │ OpenAI Sora     │ │ Google Veo    │ │ Task Queue    │        │
│  │ Provider        │ │ Provider      │ │ (Celery/Redis)│        │
│  └─────────────────┘ └───────────────┘ └───────────────┘        │
│                              │                                    │
│                    ┌─────────▼─────────┐                         │
│                    │ Storage Service   │                         │
│                    │ (S3/GCS/MinIO)    │                         │
│                    └───────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 数据流

```
1. 用户提交生成请求
       │
       ▼
2. 前端调用 API
   POST /v1/video/generate
   {
     "prompt": "一只猫在弹钢琴",
     "provider": "openai",
     "duration": 5,
     "aspect_ratio": "16:9",
     "resolution": "720p",
     "image_url": "...",  // 可选
   }
       │
       ▼
3. 后端创建异步任务
   - 保存任务记录到数据库
   - 将任务加入队列
   - 返回 task_id
       │
       ▼
4. 后台 Worker 执行
   - 调用 Sora/Veo API
   - 轮询等待生成完成
   - 下载视频到存储服务
   - 更新任务状态
       │
       ▼
5. 前端轮询/WebSocket 获取状态
   GET /v1/video/tasks/{task_id}
       │
       ▼
6. 完成后返回视频 URL
```

---

## 五、后端实现

### 5.1 API 设计

#### 5.1.1 创建视频生成任务

```
POST /v1/video/generate
```

**请求体**:
```typescript
interface VideoGenerateRequest {
  // 必填
  prompt: string;                        // 视频描述
  provider: 'openai' | 'google';         // 服务商

  // 视频参数
  duration?: number;                     // 时长(秒): 4-25
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  resolution?: '720p' | '1080p';

  // 可选输入
  image_url?: string;                    // 起始帧图片
  image_base64?: string;                 // 或 Base64 图片
  last_frame_url?: string;               // 尾帧图片 (Veo 插值)

  // 高级选项
  enhance_prompt?: boolean;              // 优化提示词
  generate_audio?: boolean;              // 生成音频 (Veo 3.1)
  style?: string;                        // 风格提示

  // 模型选择
  model?: string;                        // 具体模型版本
}
```

**响应**:
```typescript
interface VideoGenerateResponse {
  task_id: string;                       // 任务 ID
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  estimated_time_seconds?: number;       // 预估完成时间
}
```

#### 5.1.2 查询任务状态

```
GET /v1/video/tasks/{task_id}
```

**响应**:
```typescript
interface VideoTaskResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;                     // 0-100

  // 完成后
  video_url?: string;                    // 视频下载 URL
  thumbnail_url?: string;                // 缩略图
  duration?: number;                     // 实际时长

  // 失败时
  error?: {
    code: string;
    message: string;
  };

  // 元数据
  prompt: string;
  provider: string;
  created_at: string;
  completed_at?: string;
}
```

#### 5.1.3 获取生成历史

```
GET /v1/video/history?limit=20&cursor=xxx
```

#### 5.1.4 取消生成任务

```
DELETE /v1/video/tasks/{task_id}
```

### 5.2 数据库模型

```python
# backend/app/models/video_generation.py

from sqlalchemy import Column, String, Integer, DateTime, Text, Enum
from app.db.base import Base
import enum

class VideoTaskStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class VideoGenerationTask(Base):
    __tablename__ = "video_generation_tasks"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False, index=True)

    # 请求参数
    prompt = Column(Text, nullable=False)
    provider = Column(String(20), nullable=False)  # openai, google
    model = Column(String(50))
    duration = Column(Integer, default=5)
    aspect_ratio = Column(String(10), default="16:9")
    resolution = Column(String(10), default="720p")

    # 输入资源
    input_image_url = Column(Text)
    last_frame_url = Column(Text)

    # 选项
    enhance_prompt = Column(Boolean, default=True)
    generate_audio = Column(Boolean, default=False)

    # 状态
    status = Column(Enum(VideoTaskStatus), default=VideoTaskStatus.PENDING)
    progress = Column(Integer, default=0)

    # 外部任务 ID
    external_task_id = Column(String(100))

    # 结果
    video_url = Column(Text)
    thumbnail_url = Column(Text)
    actual_duration = Column(Integer)

    # 错误信息
    error_code = Column(String(50))
    error_message = Column(Text)

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
```

### 5.3 Provider 实现

#### 5.3.1 基类

```python
# backend/app/services/video/base.py

from abc import ABC, abstractmethod
from typing import Optional, AsyncIterator
from dataclasses import dataclass

@dataclass
class VideoGenerationResult:
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None

@dataclass
class VideoGenerationStatus:
    status: str  # pending, processing, completed, failed
    progress: Optional[int] = None
    result: Optional[VideoGenerationResult] = None
    error: Optional[str] = None

class VideoProvider(ABC):
    """视频生成 Provider 基类"""

    @abstractmethod
    async def create_generation(
        self,
        prompt: str,
        duration: int = 5,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        image_url: Optional[str] = None,
        **kwargs
    ) -> str:
        """创建生成任务，返回外部任务 ID"""
        pass

    @abstractmethod
    async def get_status(self, external_task_id: str) -> VideoGenerationStatus:
        """查询任务状态"""
        pass

    @abstractmethod
    async def cancel(self, external_task_id: str) -> bool:
        """取消任务"""
        pass
```

#### 5.3.2 OpenAI Sora Provider

```python
# backend/app/services/video/openai_sora.py

from openai import AsyncOpenAI
from .base import VideoProvider, VideoGenerationStatus, VideoGenerationResult

class OpenAISoraProvider(VideoProvider):
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.default_model = "sora-2-pro"

    async def create_generation(
        self,
        prompt: str,
        duration: int = 5,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        image_url: Optional[str] = None,
        **kwargs
    ) -> str:
        request_params = {
            "model": kwargs.get("model", self.default_model),
            "prompt": prompt,
            "duration": duration,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
        }

        if image_url:
            request_params["image_url"] = image_url

        response = await self.client.video.generations.create(**request_params)
        return response.id

    async def get_status(self, external_task_id: str) -> VideoGenerationStatus:
        response = await self.client.video.generations.retrieve(external_task_id)

        if response.status == "completed":
            return VideoGenerationStatus(
                status="completed",
                progress=100,
                result=VideoGenerationResult(
                    video_url=response.video_url,
                    thumbnail_url=response.thumbnail_url,
                    duration=response.duration,
                )
            )
        elif response.status == "failed":
            return VideoGenerationStatus(
                status="failed",
                error=response.error.message if response.error else "Unknown error"
            )
        else:
            # queued, generating
            return VideoGenerationStatus(
                status="processing",
                progress=50 if response.status == "generating" else 10
            )

    async def cancel(self, external_task_id: str) -> bool:
        try:
            await self.client.video.generations.cancel(external_task_id)
            return True
        except Exception:
            return False
```

#### 5.3.3 Google Veo Provider

```python
# backend/app/services/video/google_veo.py

from google import genai
from google.genai import types
from .base import VideoProvider, VideoGenerationStatus, VideoGenerationResult

class GoogleVeoProvider(VideoProvider):
    def __init__(self, api_key: str = None, project_id: str = None):
        if project_id:
            # Vertex AI
            self.client = genai.Client(vertexai=True, project=project_id)
        else:
            # Google AI
            self.client = genai.Client(api_key=api_key)

        self.default_model = "veo-3.1-generate-preview"

    async def create_generation(
        self,
        prompt: str,
        duration: int = 5,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        image_url: Optional[str] = None,
        last_frame_url: Optional[str] = None,
        generate_audio: bool = False,
        enhance_prompt: bool = True,
        **kwargs
    ) -> str:
        # 构建配置
        config = types.GenerateVideosConfig(
            number_of_videos=1,
            duration_seconds=min(duration, 8),  # Veo 最长 8 秒
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            enhance_prompt=enhance_prompt,
        )

        # 如果是 Veo 3.1，支持音频
        if "3.1" in kwargs.get("model", self.default_model):
            config.generate_audio = generate_audio

        generation_params = {
            "model": kwargs.get("model", self.default_model),
            "prompt": prompt,
            "config": config,
        }

        # 添加起始帧
        if image_url:
            image_data = await self._fetch_image(image_url)
            generation_params["image"] = types.Image(
                image_bytes=image_data,
                mime_type="image/png"
            )

        # 添加结束帧（帧插值）
        if last_frame_url:
            last_image_data = await self._fetch_image(last_frame_url)
            config.last_frame = types.Image(
                image_bytes=last_image_data,
                mime_type="image/png"
            )

        operation = self.client.models.generate_videos(**generation_params)
        return operation.name

    async def get_status(self, external_task_id: str) -> VideoGenerationStatus:
        operation = self.client.operations.get(name=external_task_id)

        if operation.done:
            if operation.error:
                return VideoGenerationStatus(
                    status="failed",
                    error=operation.error.message
                )

            video = operation.response.generated_videos[0].video
            return VideoGenerationStatus(
                status="completed",
                progress=100,
                result=VideoGenerationResult(
                    video_url=video.uri,
                )
            )
        else:
            return VideoGenerationStatus(
                status="processing",
                progress=50
            )

    async def cancel(self, external_task_id: str) -> bool:
        try:
            self.client.operations.cancel(name=external_task_id)
            return True
        except Exception:
            return False

    async def _fetch_image(self, url: str) -> bytes:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            return response.content
```

### 5.4 异步任务处理

```python
# backend/app/tasks/video_generation.py

from celery import shared_task
from app.services.video import get_video_provider
from app.models.video_generation import VideoGenerationTask, VideoTaskStatus
from app.db.session import SessionLocal
import asyncio
import time

@shared_task(bind=True, max_retries=3)
def process_video_generation(self, task_id: str):
    """处理视频生成任务"""
    db = SessionLocal()

    try:
        task = db.query(VideoGenerationTask).filter_by(id=task_id).first()
        if not task:
            return

        # 更新状态为处理中
        task.status = VideoTaskStatus.PROCESSING
        task.started_at = datetime.utcnow()
        db.commit()

        # 获取 Provider
        provider = get_video_provider(task.provider)

        # 创建外部任务
        external_id = asyncio.run(provider.create_generation(
            prompt=task.prompt,
            duration=task.duration,
            aspect_ratio=task.aspect_ratio,
            resolution=task.resolution,
            image_url=task.input_image_url,
            last_frame_url=task.last_frame_url,
            generate_audio=task.generate_audio,
            enhance_prompt=task.enhance_prompt,
            model=task.model,
        ))

        task.external_task_id = external_id
        db.commit()

        # 轮询等待完成
        max_wait_time = 300  # 最长等待 5 分钟
        poll_interval = 10   # 每 10 秒查询一次
        elapsed = 0

        while elapsed < max_wait_time:
            status = asyncio.run(provider.get_status(external_id))

            task.progress = status.progress or task.progress
            db.commit()

            if status.status == "completed":
                # 下载视频到存储服务
                video_url = await download_and_store_video(
                    status.result.video_url,
                    task_id
                )

                task.status = VideoTaskStatus.COMPLETED
                task.video_url = video_url
                task.thumbnail_url = status.result.thumbnail_url
                task.actual_duration = status.result.duration
                task.completed_at = datetime.utcnow()
                db.commit()
                return

            elif status.status == "failed":
                task.status = VideoTaskStatus.FAILED
                task.error_message = status.error
                task.completed_at = datetime.utcnow()
                db.commit()
                return

            time.sleep(poll_interval)
            elapsed += poll_interval

        # 超时
        task.status = VideoTaskStatus.FAILED
        task.error_message = "Generation timeout"
        db.commit()

    except Exception as e:
        task.status = VideoTaskStatus.FAILED
        task.error_message = str(e)
        db.commit()
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()
```

### 5.5 路由实现

```python
# backend/app/api/v1/video_routes.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.video_generation import VideoGenerationTask, VideoTaskStatus
from app.tasks.video_generation import process_video_generation
from .schemas import VideoGenerateRequest, VideoGenerateResponse, VideoTaskResponse
import uuid

router = APIRouter(prefix="/v1/video", tags=["Video Generation"])

@router.post("/generate", response_model=VideoGenerateResponse)
async def generate_video(
    request: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """创建视频生成任务"""

    # 验证参数
    if request.provider == "google" and request.duration > 8:
        raise HTTPException(400, "Google Veo 最长支持 8 秒视频")

    # 创建任务记录
    task = VideoGenerationTask(
        id=str(uuid.uuid4()),
        user_id=str(current_user.id),
        prompt=request.prompt,
        provider=request.provider,
        model=request.model,
        duration=request.duration,
        aspect_ratio=request.aspect_ratio,
        resolution=request.resolution,
        input_image_url=request.image_url,
        last_frame_url=request.last_frame_url,
        enhance_prompt=request.enhance_prompt,
        generate_audio=request.generate_audio,
        status=VideoTaskStatus.PENDING,
    )

    db.add(task)
    db.commit()

    # 启动异步任务
    process_video_generation.delay(task.id)

    return VideoGenerateResponse(
        task_id=task.id,
        status="pending",
        created_at=task.created_at.isoformat(),
        estimated_time_seconds=120,
    )

@router.get("/tasks/{task_id}", response_model=VideoTaskResponse)
async def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """查询任务状态"""
    task = db.query(VideoGenerationTask).filter_by(
        id=task_id,
        user_id=str(current_user.id)
    ).first()

    if not task:
        raise HTTPException(404, "Task not found")

    return VideoTaskResponse(
        task_id=task.id,
        status=task.status.value,
        progress=task.progress,
        video_url=task.video_url,
        thumbnail_url=task.thumbnail_url,
        duration=task.actual_duration,
        error={"code": task.error_code, "message": task.error_message} if task.error_message else None,
        prompt=task.prompt,
        provider=task.provider,
        created_at=task.created_at.isoformat(),
        completed_at=task.completed_at.isoformat() if task.completed_at else None,
    )

@router.delete("/tasks/{task_id}")
async def cancel_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """取消生成任务"""
    task = db.query(VideoGenerationTask).filter_by(
        id=task_id,
        user_id=str(current_user.id)
    ).first()

    if not task:
        raise HTTPException(404, "Task not found")

    if task.status not in [VideoTaskStatus.PENDING, VideoTaskStatus.PROCESSING]:
        raise HTTPException(400, "Task cannot be cancelled")

    # 尝试取消外部任务
    if task.external_task_id:
        provider = get_video_provider(task.provider)
        await provider.cancel(task.external_task_id)

    task.status = VideoTaskStatus.CANCELLED
    db.commit()

    return {"message": "Task cancelled"}

@router.get("/history")
async def get_history(
    limit: int = 20,
    cursor: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """获取生成历史"""
    query = db.query(VideoGenerationTask).filter_by(
        user_id=str(current_user.id)
    ).order_by(VideoGenerationTask.created_at.desc())

    if cursor:
        query = query.filter(VideoGenerationTask.created_at < cursor)

    tasks = query.limit(limit + 1).all()

    has_more = len(tasks) > limit
    tasks = tasks[:limit]

    return {
        "items": [task_to_response(t) for t in tasks],
        "next_cursor": tasks[-1].created_at.isoformat() if has_more else None,
    }
```

---

## 六、前端实现

### 6.1 目录结构

```
frontend/
├── lib/
│   ├── services/
│   │   └── video-service.ts        # 视频生成 API
│   ├── hooks/
│   │   └── use-video-generation.ts # 视频生成 Hook
│   └── stores/
│       └── video-store.ts          # 视频生成状态
├── components/
│   └── video/
│       ├── video-generation-form.tsx    # 生成表单
│       ├── video-generation-status.tsx  # 状态显示
│       ├── video-preview.tsx            # 视频预览
│       └── video-history.tsx            # 历史记录
```

### 6.2 核心代码

#### lib/services/video-service.ts

```typescript
import { httpClient } from '@/http/client';

export interface VideoGenerateRequest {
  prompt: string;
  provider: 'openai' | 'google';
  duration?: number;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  resolution?: '720p' | '1080p';
  image_url?: string;
  last_frame_url?: string;
  enhance_prompt?: boolean;
  generate_audio?: boolean;
  model?: string;
}

export interface VideoTask {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error?: { code: string; message: string };
  prompt: string;
  provider: string;
  created_at: string;
  completed_at?: string;
}

export const videoService = {
  /**
   * 创建视频生成任务
   */
  generate: async (request: VideoGenerateRequest): Promise<{ task_id: string }> => {
    const { data } = await httpClient.post('/v1/video/generate', request);
    return data;
  },

  /**
   * 查询任务状态
   */
  getTaskStatus: async (taskId: string): Promise<VideoTask> => {
    const { data } = await httpClient.get(`/v1/video/tasks/${taskId}`);
    return data;
  },

  /**
   * 取消任务
   */
  cancelTask: async (taskId: string): Promise<void> => {
    await httpClient.delete(`/v1/video/tasks/${taskId}`);
  },

  /**
   * 获取历史记录
   */
  getHistory: async (params?: { limit?: number; cursor?: string }): Promise<{
    items: VideoTask[];
    next_cursor?: string;
  }> => {
    const { data } = await httpClient.get('/v1/video/history', { params });
    return data;
  },
};
```

#### lib/hooks/use-video-generation.ts

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { videoService, VideoGenerateRequest, VideoTask } from '@/lib/services/video-service';

interface UseVideoGenerationOptions {
  onComplete?: (task: VideoTask) => void;
  onError?: (error: Error) => void;
  pollInterval?: number;
}

export function useVideoGeneration(options: UseVideoGenerationOptions = {}) {
  const { onComplete, onError, pollInterval = 5000 } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<VideoTask | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 清理轮询
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 开始轮询
  const startPolling = useCallback((taskId: string) => {
    stopPolling();

    const poll = async () => {
      try {
        const task = await videoService.getTaskStatus(taskId);
        setCurrentTask(task);

        if (task.status === 'completed') {
          stopPolling();
          setIsGenerating(false);
          onComplete?.(task);
        } else if (task.status === 'failed' || task.status === 'cancelled') {
          stopPolling();
          setIsGenerating(false);
          if (task.error) {
            onError?.(new Error(task.error.message));
          }
        }
      } catch (error) {
        stopPolling();
        setIsGenerating(false);
        onError?.(error as Error);
      }
    };

    // 立即执行一次
    poll();

    // 设置定时轮询
    pollingRef.current = setInterval(poll, pollInterval);
  }, [stopPolling, pollInterval, onComplete, onError]);

  // 生成视频
  const generate = useCallback(async (request: VideoGenerateRequest) => {
    try {
      setIsGenerating(true);
      setCurrentTask(null);

      const { task_id } = await videoService.generate(request);

      setCurrentTask({
        task_id,
        status: 'pending',
        progress: 0,
        prompt: request.prompt,
        provider: request.provider,
        created_at: new Date().toISOString(),
      });

      // 开始轮询状态
      startPolling(task_id);

      return task_id;
    } catch (error) {
      setIsGenerating(false);
      onError?.(error as Error);
      throw error;
    }
  }, [startPolling, onError]);

  // 取消生成
  const cancel = useCallback(async () => {
    if (!currentTask) return;

    try {
      await videoService.cancelTask(currentTask.task_id);
      stopPolling();
      setIsGenerating(false);
      setCurrentTask((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [currentTask, stopPolling, onError]);

  // 清理
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    generate,
    cancel,
    isGenerating,
    currentTask,
    progress: currentTask?.progress ?? 0,
  };
}
```

#### components/video/video-generation-form.tsx

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Upload, Wand2, Video, Loader2 } from 'lucide-react';
import { useVideoGeneration } from '@/lib/hooks/use-video-generation';
import { VideoGenerationStatus } from './video-generation-status';
import { VideoPreview } from './video-preview';

const formSchema = z.object({
  prompt: z.string().min(1, '请输入视频描述').max(2000),
  provider: z.enum(['openai', 'google']),
  duration: z.number().min(4).max(25),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1']),
  resolution: z.enum(['720p', '1080p']),
  enhance_prompt: z.boolean(),
  generate_audio: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function VideoGenerationForm() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const {
    generate,
    cancel,
    isGenerating,
    currentTask,
    progress,
  } = useVideoGeneration({
    onComplete: (task) => {
      console.log('Video generated:', task.video_url);
    },
    onError: (error) => {
      console.error('Generation failed:', error);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      provider: 'openai',
      duration: 5,
      aspect_ratio: '16:9',
      resolution: '720p',
      enhance_prompt: true,
      generate_audio: false,
    },
  });

  const provider = form.watch('provider');
  const maxDuration = provider === 'google' ? 8 : 25;

  const onSubmit = async (data: FormData) => {
    await generate({
      ...data,
      image_url: imageUrl || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 提示词输入 */}
          <div className="space-y-2">
            <Label>视频描述</Label>
            <div className="relative">
              <Textarea
                {...form.register('prompt')}
                placeholder="描述你想要生成的视频内容，例如：一只橘猫在月光下的屋顶上优雅地行走，背景是繁星点点的夜空..."
                rows={4}
                disabled={isGenerating}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                disabled={isGenerating}
              >
                <Wand2 className="h-4 w-4 mr-1" />
                优化
              </Button>
            </div>
          </div>

          {/* 图片上传 */}
          <div className="space-y-2">
            <Label>参考图片 (可选)</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                disabled={isGenerating}
                onClick={() => {/* 上传逻辑 */}}
              >
                <Upload className="h-4 w-4 mr-2" />
                上传起始帧
              </Button>
              {imageUrl && (
                <img src={imageUrl} alt="起始帧" className="h-20 rounded" />
              )}
            </div>
          </div>

          {/* 参数设置 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Provider */}
            <div className="space-y-2">
              <Label>服务商</Label>
              <Select
                value={form.watch('provider')}
                onValueChange={(v) => form.setValue('provider', v as any)}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI Sora</SelectItem>
                  <SelectItem value="google">Google Veo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 时长 */}
            <div className="space-y-2">
              <Label>时长</Label>
              <Select
                value={String(form.watch('duration'))}
                onValueChange={(v) => form.setValue('duration', Number(v))}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7, 8, 10, 15, 20, 25]
                    .filter((d) => d <= maxDuration)
                    .map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} 秒
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 宽高比 */}
            <div className="space-y-2">
              <Label>宽高比</Label>
              <Select
                value={form.watch('aspect_ratio')}
                onValueChange={(v) => form.setValue('aspect_ratio', v as any)}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 横屏</SelectItem>
                  <SelectItem value="9:16">9:16 竖屏</SelectItem>
                  <SelectItem value="1:1">1:1 方形</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 分辨率 */}
            <div className="space-y-2">
              <Label>分辨率</Label>
              <Select
                value={form.watch('resolution')}
                onValueChange={(v) => form.setValue('resolution', v as any)}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 高级选项 */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch('enhance_prompt')}
                onCheckedChange={(v) => form.setValue('enhance_prompt', v)}
                disabled={isGenerating}
              />
              <Label>自动优化提示词</Label>
            </div>

            {provider === 'google' && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.watch('generate_audio')}
                  onCheckedChange={(v) => form.setValue('generate_audio', v)}
                  disabled={isGenerating}
                />
                <Label>生成配套音频</Label>
              </div>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isGenerating} className="flex-1">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  生成视频
                </>
              )}
            </Button>

            {isGenerating && (
              <Button type="button" variant="outline" onClick={cancel}>
                取消
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* 生成状态 */}
      {currentTask && (
        <VideoGenerationStatus task={currentTask} progress={progress} />
      )}

      {/* 视频预览 */}
      {currentTask?.status === 'completed' && currentTask.video_url && (
        <VideoPreview
          videoUrl={currentTask.video_url}
          thumbnailUrl={currentTask.thumbnail_url}
        />
      )}
    </div>
  );
}
```

#### components/video/video-generation-status.tsx

```tsx
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { VideoTask } from '@/lib/services/video-service';

interface VideoGenerationStatusProps {
  task: VideoTask;
  progress: number;
}

export function VideoGenerationStatus({ task, progress }: VideoGenerationStatusProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      text: '排队中...',
      color: 'text-yellow-500',
    },
    processing: {
      icon: Loader2,
      text: '正在生成...',
      color: 'text-blue-500',
      animate: true,
    },
    completed: {
      icon: CheckCircle,
      text: '生成完成',
      color: 'text-green-500',
    },
    failed: {
      icon: XCircle,
      text: '生成失败',
      color: 'text-red-500',
    },
    cancelled: {
      icon: XCircle,
      text: '已取消',
      color: 'text-gray-500',
    },
  };

  const config = statusConfig[task.status];
  const Icon = config.icon;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <Icon
          className={`h-5 w-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
        />
        <span className="font-medium">{config.text}</span>
        {task.status === 'processing' && (
          <span className="text-sm text-muted-foreground">
            预计 1-2 分钟
          </span>
        )}
      </div>

      {(task.status === 'pending' || task.status === 'processing') && (
        <Progress value={progress} className="h-2" />
      )}

      {task.status === 'failed' && task.error && (
        <p className="text-sm text-red-500 mt-2">{task.error.message}</p>
      )}
    </Card>
  );
}
```

#### components/video/video-preview.tsx

```tsx
import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, RefreshCw, Maximize } from 'lucide-react';

interface VideoPreviewProps {
  videoUrl: string;
  thumbnailUrl?: string;
}

export function VideoPreview({ videoUrl, thumbnailUrl }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = async () => {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          className="w-full h-full object-contain"
          onEnded={() => setIsPlaying(false)}
        />

        {/* 播放按钮覆盖层 */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-8 w-8 text-black ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* 控制栏 */}
      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={togglePlay}>
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          下载
        </Button>

        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          重新生成
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => videoRef.current?.requestFullscreen()}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
```

---

## 七、与聊天集成

### 7.1 在聊天中触发视频生成

可以通过识别用户意图，在聊天中触发视频生成：

```typescript
// 聊天消息处理
const handleAssistantResponse = (message: Message) => {
  // 检测是否包含视频生成请求
  if (message.metadata?.video_generation) {
    const { prompt, ...params } = message.metadata.video_generation;

    // 触发视频生成
    videoGeneration.generate({
      prompt,
      provider: 'openai',
      ...params,
    });
  }
};
```

### 7.2 聊天气泡中显示视频

```tsx
// 在消息气泡中嵌入视频预览
function MessageBubble({ message }) {
  return (
    <div className="message-bubble">
      <div className="message-content">
        {message.content}
      </div>

      {/* 如果消息包含视频 */}
      {message.video_url && (
        <div className="mt-3">
          <VideoPreview
            videoUrl={message.video_url}
            thumbnailUrl={message.video_thumbnail}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 八、实施计划

### Phase 1: 后端基础 (2-3天)
- [ ] 创建数据库模型和迁移
- [ ] 实现 OpenAI Sora Provider
- [ ] 实现 Google Veo Provider
- [ ] 创建 API 路由
- [ ] 配置 Celery 异步任务

### Phase 2: 前端基础 (2-3天)
- [ ] 创建 Video Service API 调用
- [ ] 实现 useVideoGeneration Hook
- [ ] 创建视频生成表单组件
- [ ] 创建状态显示和预览组件

### Phase 3: 功能完善 (2天)
- [ ] 添加历史记录功能
- [ ] 实现图片上传和 Image-to-Video
- [ ] 添加视频下载功能
- [ ] 错误处理和重试机制

### Phase 4: 集成和优化 (1-2天)
- [ ] 与聊天功能集成
- [ ] 添加用量统计和配额限制
- [ ] 性能优化和缓存
- [ ] 测试和文档

---

## 九、注意事项

1. **费用控制**
   - 视频生成成本较高，建议设置用户配额
   - 提供生成预估费用显示
   - 考虑按使用量计费

2. **生成时间**
   - 视频生成需要 1-3 分钟，需要良好的等待体验
   - 考虑使用 WebSocket 实时推送状态
   - 支持后台生成，完成后通知

3. **存储管理**
   - 生成的视频需要存储到 S3/GCS
   - 设置过期时间，自动清理旧视频
   - 考虑视频压缩和转码

4. **内容审核**
   - 两个 API 都有内容安全过滤
   - 添加敏感词检测
   - 记录生成日志用于审计

5. **API 可用性**
   - OpenAI Sora API 目前需要 ChatGPT Plus/Pro
   - Google Veo 通过 Vertex AI 访问，需要 GCP 账户
   - 建议同时支持两个 Provider，互为备份


主流AI视频生成平台API参数差异对比

1. Runway ML
核心API参数
参数名称	类型	必填	描述	可选值/范围
promptImage	string	否	输入图片URL或Base64编码，支持设置首帧、尾帧或多图	图片URL / Base64字符串
seed	int	否	随机种子，控制生成结果一致性	0-4294967295
model	enum	否	模型版本	gen3aturbo、gen4turbo
promptText	string	否	文本提示词，描述期望的视频动态效果	1000字符以内
watermark	bool	否	是否添加RunwayML水印	默认false
duration	enum	否	视频时长（秒）	5、10
ratio	enum	否	视频画面比例，不同模型支持不同	gen3aturbo: 1280:768 / 768:1280<br>gen4turbo: 1280:720 / 720:1280 / 1:1 / 4:3 / 3:4 / 21:9

2. Pika Labs
核心API参数
参数名称	类型	必填	描述	可选值/范围
pikaffect	string	否	官方视频效果，可添加配音和特效	Levitate、Decapitate、Eye-pop等
promptText	string	是	视频描述提示词	不限长度
model	string	是	模型版本	1.0、1.5、2.0、2.2
image	string	否	输入图片URL或Base64（图生视频时必填）	有效的图片URL或Base64编码
ingredient	array	否	多图生成时的图片列表（model需为2.0）	图片URL数组
options	object	否	视频设置选项	aspectRatio、frameRate、camera、parameters、extend
options.aspectRatio	float	否	宽高比	如16:9对应1.7777777777777777
options.frameRate	int	否	帧率	24
options.parameters.guidanceScale	int	否	引导系数	12
options.parameters.motion	int	否	动态强度	1
options.parameters.negativePrompt	string	否	负向提示词	描述不希望出现的内容

3. OpenAI Sora
核心API参数
参数名称	类型	必填	描述	可选值/范围
model	string	否	模型版本	sora-2、sora-2-pro
prompt	string	是	视频描述提示词	1-32000字符
input_reference	string	否	参考图片URL（多部分表单上传）	二进制文件
seconds	enum	否	视频时长（秒）	4、8、12
size	enum	否	视频分辨率	720x1280、1280x720、1024x1792、1792x1024

Remix功能参数
参数名称	类型	必填	描述	可选值/范围
video_id	string	是	已完成视频的ID	视频任务唯一标识符
prompt	string	是	更新的文本提示词，指导 remix 生成	1-32000字符

4. 字节跳动豆包
基础API参数
参数名称	类型	必填	描述	可选值/范围
model	string	是	模型ID	doubao-seedance-1-0-lite / doubao-seedance-1-0-pro等
promptText	string	是	视频描述提示词，可追加--参数名 参数值格式的配置项	500字符以内，支持--rs（分辨率）、--dur（时长）、--cf（固定摄像头）等

结构化配置参数
参数名称	类型	必填	描述	可选值/范围
resolution	string	否	视频分辨率	480p、720p、1080p
ratio	string	否	视频宽高比	16:9、4:3、1:1、9:16、3:4、21:9等
duration	int	否	视频时长（秒）	Seedance: 3-12秒 / Wan2.1: 5秒
fps	int	否	视频帧率	16、24
watermark	bool	否	是否添加水印	true/false
seed	int	否	随机种子	-1到2^31-1
camera_fixed	bool	否	是否固定摄像头	true/false

图生视频扩展参数
参数名称	类型	必填	描述	可选值/范围
image	string	是	首帧图像URL或Base64	有效的图片URL或Base64编码
image_tail	string	否	尾帧图像URL或Base64（首尾帧图生视频时必填）	有效的图片URL或Base64编码
image_role	string	否	首帧图片角色	first_frame
image_tail_role	string	否	尾帧图片角色	last_frame

5. 百度文心一言
视频脚本生成API参数
参数名称	类型	必填	描述	可选值/范围
text_input	string	是	用户自然语言指令	任意文本
target_duration	int	否	视频总时长（秒）	推荐15-60秒
output_format	string	否	输出格式	shot_list（结构化分镜）
style_preference	string	否	风格偏好	warmromantic、scientificillustration等
temperature	float	否	控制生成内容随机性	0-2，默认0.8
top_p	float	否	核采样概率阈值	0-1，默认0.9

视频生成API参数
参数名称	类型	必填	描述	可选值/范围
prompt	string	是	视频描述提示词	500字符以内
negative_prompt	string	否	负向提示词，排除不希望出现的内容	200字符以内
cfg_scale	float	否	生成视频自由度	0-1，值越大相关性越强
mode	string	否	生成模式	std（高性能）、pro（高表现）
camera_control	object	否	控制摄像机运动	包含horizontal、vertical、pan、tilt、roll、zoom等字段
aspect_ratio	string	否	视频宽高比	16:9、9:16、1:1
duration	int	否	视频时长（秒）	5、10

6. 阿里通义千问（wan2.2-s2v）
核心API参数
参数名称	类型	必填	描述	可选值/范围
model	string	是	模型ID	wan2.2-s2v
input.image_url	string	是	输入图片URL	支持JPG、JPEG、PNG、BMP、WEBP格式，分辨率400-7000像素
input.audio_url	string	否	输入音频URL（需包含清晰语音）	支持WAV、MP3格式，文件大小≤15MB，时长≤20秒
parameters.resolution	string	否	视频分辨率	480P（默认）、720P

---
name: codemap-video-generation-page
description: Code flow mapping for AI Video Generation Page feature (located at /data/AI-Higress-Gateway). Load this SKILL when analyzing, tracing, or understanding video generation page execution flow, especially when no relevant context exists in memory.
version: 1.0.0
generated_at: 2026-01-01T12:00:00.000Z
---
# Code Flow Map: AI Video Generation Page

## Feature: `AI Video Generation Page`

**Analysis Date**: 2026-01-01
**Tool Used**: claude-opus-4.5 (direct analysis)
**Files Analyzed**: 11

## Summary

AI视频生成页面采用"Less is More"设计理念，实现中央悬浮创作岛UI。核心架构包括：

- **Frontend**: Next.js App Router + React 19 + Zustand状态管理 + SWR数据获取
- **Backend**: FastAPI + SQLAlchemy + Redis异步处理
- **Storage**: 本地/阿里OSS/AWS S3 多后端支持
- **Upstream**: OpenAI Sora + Google Veo 多provider适配

## Progressive Loading

### Level 0: Quick Overview (~2K tokens)
- [Architecture Flow](./architecture-flow.md) - High-level module interactions

### Level 1: Core Flows (~10K tokens)
- [Architecture Flow](./architecture-flow.md) - Module architecture
- [Function Calls](./function-calls.md) - Function call chains

### Level 2: Complete Analysis (~20K tokens)
- [Architecture Flow](./architecture-flow.md)
- [Function Calls](./function-calls.md)
- [Data Flow](./data-flow.md) - Data transformations

### Level 3: Deep Dive (~30K tokens)
- [Architecture Flow](./architecture-flow.md)
- [Function Calls](./function-calls.md)
- [Data Flow](./data-flow.md)
- [Conditional Paths](./conditional-paths.md) - Branches and error handling
- [Complete Flow](./complete-flow.md) - Integrated comprehensive view

## Usage

Load this SKILL package when:
- Analyzing AI Video Generation Page implementation
- Tracing execution flow for debugging
- Understanding code dependencies
- Planning refactoring or enhancements
- Implementing new video generation features
- Debugging video generation issues

## Key Components

### Frontend (待创建)

| Component | File | Description |
|-----------|------|-------------|
| VideoGenerationPage | `frontend/app/video/page.tsx` | 主页面组件 |
| VideoComposerStore | `frontend/lib/stores/video-composer-store.ts` | Zustand状态管理 |
| useVideoGenerations | `frontend/lib/swr/use-video-generations.ts` | SWR数据Hook |
| VideoConfigSheet | `frontend/components/video/video-config-sheet.tsx` | 配置抽屉 |
| VideoFilmstrip | `frontend/components/video/video-filmstrip.tsx` | 历史胶卷 |

### Backend (已存在)

| Component | File | Description |
|-----------|------|-------------|
| VideoGenerationRequest | `backend/app/schemas/video.py:6-68` | 请求模型 |
| VideoAppService | `backend/app/services/video_app_service.py:285-693` | 核心服务 |
| VideoStorageService | `backend/app/services/video_storage_service.py` | 存储服务 |

## Analysis Summary

- **Modules Traced**: 12
- **Functions Traced**: 28
- **Files Analyzed**: 11
- **Patterns Discovered**: 8

## Mermaid Diagrams Included

- Architecture flow diagram (graph TD) - 模块架构
- Function call sequence diagram (sequenceDiagram) - 调用序列
- Data transformation flowchart (flowchart LR) - 数据流
- Conditional decision tree (flowchart TD) - 决策树
- Complete integrated diagram (graph TB) - 完整流程

## Design Patterns

| Pattern | Description |
|---------|-------------|
| Zustand Store | 配置状态持久化，跨组件共享 |
| SWR Mutation | API调用、加载状态、错误处理 |
| Provider Selector | 多候选负载均衡和故障转移 |
| Adapter Pattern | 统一接口适配不同上游 |
| Repository Pattern | 抽象存储后端 |
| Polling Pattern | 异步长时任务轮询 |
| Circuit Breaker | 故障冷却期保护 |
| Glassmorphism UI | 毛玻璃视觉效果 |

## API Reference

```
POST /v1/videos/generations
  Request: VideoGenerationRequest
  Response: VideoGenerationResponse

GET /media/videos/{object_key}?expires=&sig=
  Response: video/mp4 binary
```

## Quick Start

1. **理解架构**: 先阅读 [Architecture Flow](./architecture-flow.md)
2. **跟踪调用**: 查看 [Function Calls](./function-calls.md) 了解调用链
3. **数据结构**: 参考 [Data Flow](./data-flow.md) 理解数据转换
4. **错误处理**: 查阅 [Conditional Paths](./conditional-paths.md) 了解分支逻辑
5. **完整视图**: 最后阅读 [Complete Flow](./complete-flow.md) 获得全貌

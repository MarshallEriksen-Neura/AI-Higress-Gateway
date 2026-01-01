---
feature: AI Video Generation Page
level: complete
detail: integrated multi-level view
---
# Complete Flow: AI Video Generation Page

## Integrated Flow Diagram

```mermaid
graph TB
    subgraph User["👤 User Interaction"]
        InputPrompt[输入Prompt]
        SelectRatio[选择比例]
        OpenDrawer[打开高级设置]
        ClickGenerate[点击Generate]
        ViewHistory[查看历史]
    end

    subgraph FrontendComponents["🎨 Frontend Components"]
        MagicBar[Magic Bar 输入框]
        QuickToolbar[快捷工具栏]
        ConfigSheet[配置抽屉Sheet]
        Filmstrip[底部胶卷]
        LoadingState[加载状态]
    end

    subgraph StateManagement["📦 State Management"]
        VideoStore[VideoComposerStore]
        SWRMutation[SWR Mutation]
        HistoryPersist[History Persist]
    end

    subgraph APILayer["🔌 API Layer"]
        HTTPClient[HTTP Client]
        VideoAPI[/v1/videos/generations]
    end

    subgraph BackendServices["⚙️ Backend Services"]
        VideoAppSvc[VideoAppService]
        ProviderSelector[ProviderSelector]
        RoutingState[RoutingStateService]
        VideoStorage[VideoStorageService]
    end

    subgraph UpstreamProviders["☁️ Upstream Providers"]
        OpenAISora[OpenAI Sora]
        GoogleVeo[Google Veo]
        OtherProviders[其他提供商]
    end

    subgraph StorageBackend["💾 Storage Backend"]
        LocalFS[Local Filesystem]
        AliyunOSS[Aliyun OSS]
        AWSS3[AWS S3/R2]
    end

    %% User interactions
    InputPrompt --> MagicBar
    SelectRatio --> QuickToolbar
    OpenDrawer --> ConfigSheet
    ClickGenerate --> SWRMutation
    ViewHistory --> Filmstrip

    %% Component to state
    MagicBar --> VideoStore
    QuickToolbar --> VideoStore
    ConfigSheet --> VideoStore

    %% State to API
    SWRMutation --> HTTPClient
    HTTPClient --> VideoAPI

    %% Backend flow
    VideoAPI --> VideoAppSvc
    VideoAppSvc --> ProviderSelector
    ProviderSelector --> RoutingState
    VideoAppSvc --> VideoStorage

    %% Provider routing
    ProviderSelector --> OpenAISora
    ProviderSelector --> GoogleVeo
    ProviderSelector --> OtherProviders

    %% Storage routing
    VideoStorage --> LocalFS
    VideoStorage --> AliyunOSS
    VideoStorage --> AWSS3

    %% Response flow
    VideoStorage -.-> VideoAppSvc
    VideoAppSvc -.-> VideoAPI
    VideoAPI -.-> SWRMutation
    SWRMutation -.-> LoadingState
    SWRMutation -.-> HistoryPersist
    HistoryPersist -.-> Filmstrip
```

## Complete Trace

### Phase 1: 用户输入 (Frontend)

1. **用户打开页面** → `/video` 路由加载 `VideoGenerationPage`
2. **初始化Store** → `useVideoComposerStore` 从localStorage恢复状态
3. **用户输入Prompt** → `onChange` 更新 `store.prompt`
4. **选择比例** → 点击图标切换 `store.aspectRatio`
5. **打开高级设置** → `Sheet` 组件滑入，展示完整配置表单
6. **调整参数** → 更新 `store.model`, `store.duration`, `store.seed` 等

### Phase 2: 触发生成 (Frontend → API)

1. **点击Generate按钮** → 触发 `handleGenerate()`
2. **前端验证** → 检查 prompt非空, model已选
3. **构建请求** → `buildVideoRequest()` 从store提取参数
4. **SWR Mutation** → `generateVideo(request)` 发起POST请求
5. **显示加载态** → `isGenerating=true`, 按钮禁用, 加载动画

### Phase 3: 后端处理 (API → Services)

1. **路由处理** → `POST /v1/videos/generations` 接收请求
2. **认证验证** → 从Bearer token提取 `AuthenticatedAPIKey`
3. **账户检查** → `ensure_account_usable()` 验证积分
4. **Provider选择** → `ProviderSelector.select()` 获取候选列表
5. **能力验证** → 检查 `ModelCapability.VIDEO_GENERATION`

### Phase 4: 上游调用 (Services → Providers)

1. **遍历候选** → 按评分顺序尝试每个provider
2. **冷却检查** → `get_failure_cooldown_status()` 跳过故障provider
3. **获取Key** → `acquire_provider_key()` 从连接池获取
4. **类型检测** → 根据base_url判断OpenAI/Google
5. **构建Payload** → 适配器转换为上游格式
6. **发起请求** → `httpx.AsyncClient.post()` 异步调用
7. **轮询状态** → 每2-5秒检查生成进度
8. **下载视频** → 获取视频二进制内容

### Phase 5: 存储处理 (Services → Storage)

1. **存储模式** → `get_effective_video_storage_mode()` 判断local/oss
2. **生成Key** → `_build_object_key()` 创建唯一路径
3. **写入存储** → `store_video_bytes()` 上传到后端
4. **签名URL** → `build_signed_video_url()` 生成临时访问链接

### Phase 6: 响应返回 (API → Frontend)

1. **构建响应** → `VideoGenerationResponse(created, data)`
2. **HTTP响应** → JSON格式返回给客户端
3. **SWR更新** → mutation callback更新本地状态
4. **UI刷新** → 隐藏加载态, 显示视频预览
5. **历史记录** → 添加到store.history, 持久化到localStorage
6. **胶卷更新** → Filmstrip组件重新渲染

## Design Patterns Identified

| Pattern | Location | Description |
|---------|----------|-------------|
| **Zustand Store** | `video-composer-store.ts` | 集中式状态管理，配合persist中间件实现本地持久化 |
| **SWR Mutation** | `use-video-generations.ts` | 声明式数据获取，自动处理loading/error状态 |
| **Provider Selector** | `VideoAppService` | 策略模式实现多候选负载均衡和故障转移 |
| **Adapter Pattern** | `_call_openai_videos`, `_call_google_veo` | 统一内部接口适配不同上游API规范 |
| **Repository Pattern** | `VideoStorageService` | 抽象存储后端，支持local/OSS/S3无缝切换 |
| **Polling Pattern** | Video status check | 异步长时任务通过轮询获取最终结果 |
| **Circuit Breaker** | `RoutingStateService` | 故障累积触发冷却期，避免持续重试失败provider |
| **Glassmorphism UI** | Magic Bar | 毛玻璃效果营造高级感，`backdrop-blur-xl` |

## Recommendations

### 前端实现建议

1. **性能优化**
   - 使用 `React.memo` 包裹 `Filmstrip` 子组件避免不必要渲染
   - 视频预览使用 `<video preload="metadata">` 只加载元数据
   - 历史记录超过50条时自动清理旧数据

2. **用户体验**
   - Magic Bar 使用 `autofocus` 让用户直接开始输入
   - 生成中显示进度百分比（如果上游支持）
   - 支持 `Ctrl+Enter` 快捷键提交

3. **状态管理**
   - 分离 `videoComposerStore` (配置) 和 `videoHistoryStore` (历史)
   - 使用 `immer` 中间件简化深层状态更新

### 后端优化建议

1. **缓存策略**
   - 相同prompt+params的请求可返回缓存结果
   - 视频签名URL缓存到Redis，避免重复计算

2. **错误处理**
   - 实现指数退避重试策略
   - 记录详细的请求日志便于调试

3. **扩展性**
   - 预留 WebSocket 通道支持实时进度推送
   - 考虑异步任务队列（Celery/Dramatiq）处理耗时生成

## Cross-References

- [Architecture Flow](./architecture-flow.md) - 高级模块结构
- [Function Calls](./function-calls.md) - 详细调用链
- [Data Flow](./data-flow.md) - 数据转换阶段
- [Conditional Paths](./conditional-paths.md) - 决策树和错误处理

## Files Analyzed

### Backend Files
| File | Lines | Description |
|------|-------|-------------|
| `backend/app/schemas/video.py` | 79 | 请求/响应模型定义 |
| `backend/app/services/video_app_service.py` | 693 | 核心视频生成服务 |
| `backend/app/services/video_generation_chat_service.py` | 211 | 对话集成服务 |
| `backend/app/services/video_storage_service.py` | 345 | 存储服务 |

### Frontend Reference Files
| File | Lines | Description |
|------|-------|-------------|
| `frontend/lib/stores/image-generation-store.ts` | 59 | 图片生成store参考 |
| `frontend/lib/stores/chat-composer-store.ts` | 202 | 聊天composer参考 |
| `frontend/lib/swr/use-image-generations.ts` | 17 | 图片生成hook参考 |
| `frontend/components/ui/sheet.tsx` | 140 | Sheet组件 |
| `frontend/components/ui/drawer.tsx` | 136 | Drawer组件 |

### Config Files
| File | Description |
|------|-------------|
| `frontend/components.json` | shadcn/ui配置 |
| `docs/video-generation-plan.md` | 设计方案文档 |

# APIProxy - AI 网关

[English README](README.md)

APIProxy 是一个基于 FastAPI 构建的高性能 AI 代理网关。它为上游 AI 服务提供了统一、兼容 OpenAI 标准的接口，并内置了多提供商路由、模型缓存、会话管理、格式转换和跨厂商故障转移等能力，帮助你在一个出口下接入多家大模型服务。
---

## 功能特性

- **兼容 OpenAI 的 API**  
  提供 `/v1/chat/completions`、`/v1/responses` 和 `/models` 端点，以便您可以重用现有的 OpenAI SDK 和工具。

- **动态多提供商路由**  
  - **逻辑模型**: 将多个物理提供商模型映射到单个逻辑模型（例如，“fast-model” -> OpenAI 的 `gpt-3.5-turbo`、Gemini 的 `gemini-pro`）。
  - **零配置模型路由**: 如果请求的模型未被显式映射，网关会自动发现支持该模型的提供商，并动态创建路由组。
  - **基于权重和指标的调度**: 根据配置的权重和运行时性能指标分配流量。

- **跨提供商故障转移**  
  在流式和非流式请求中，当遇到可重试的错误（例如 429、5xx）时，自动在另一家提供商上重试请求。

- **请求格式适配器**  
  - 自动将不同的请求格式转换为统一的 OpenAI 风格的 `messages` 结构。
  - 支持 Gemini 风格的 `input`、Claude 风格的请求以及 OpenAI Responses API (`/v1/responses`)。
  - 当客户端直接访问 `/v1/responses` 时，请求会以 Responses 原生格式贯穿全链路：路由层会将流量转发至上游的 `/v1/responses` 端点，使得仅支持 Responses API 的模型（例如 `gpt-5.1-codex`）无需额外适配即可调用。
  - 处理带前缀的模型名称（例如 `my-provider/some-model`），以简化路由逻辑。

- **会话粘性**  
  通过 `X-Session-Id` 头将对话绑定到首次选择的提供商，以在多消息对话中保持上下文。

- **模型列表聚合与缓存**  
  从所有已配置的提供商处获取模型列表，将其规范化为 OpenAI 风格的 `/models` 响应，并缓存在 Redis 中。

- **支持流式与非流式响应**  
  通过 `stream: true` 或 `Accept: text/event-stream` 头自动检测客户端对流式响应的需求。

- **会话上下文存储**  
  使用 `X-Session-Id` 头将请求/响应片段持久化到 Redis，以便通过 HTTP 端点检查简单的对话历史。

- **灵活配置**  
  上游地址、API 密钥、Redis URL、提供商权重和故障转移行为都通过环境变量进行控制。

- **Docker 友好**  
  包含一个 `docker-compose.yml` 文件，可通过单个命令启动 API 网关和 Redis。

---

## 技术栈

- Web 框架：FastAPI
- ASGI 服务器：Uvicorn
- HTTP 客户端：HTTPX
- 缓存与存储：Redis
- 配置管理：Pydantic Settings
- 依赖管理：uv / pip

---



## 测试

项目使用 `pytest` 和 `pytest-asyncio` 进行测试。  
推荐本地执行：

```bash
pytest
```

或仅运行某个测试文件：

```bash
pytest tests/test_chat_greeting.py
```

---

## 贡献

欢迎通过 Issue 和 Pull Request 参与贡献。请在提交前：

- 为新增功能补充或更新测试；
- 本地运行 `pytest` 确认测试通过；
- 遵循现有的提交信息风格（中英文均可，如 `添加跨厂商故障转移` 或 `Add cross-provider failover`）。

---

## 许可证

本项目使用 MIT 许可证，详情参见 `LICENSE` 文件。

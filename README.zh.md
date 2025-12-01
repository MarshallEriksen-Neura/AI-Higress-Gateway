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

## 🚀 快速开始

推荐优先使用 Docker 进行部署，保证本地与服务器环境一致。

### 先决条件

- Docker 与 Docker Compose
- Git

### 1. 使用 Docker 部署（推荐）

1. 克隆项目：

   ```bash
   git clone https://github.com/MarshallEriksen-shaomingyang/ai-higress.git
   cd APIProxy
   ```

2. 创建并配置 `.env`：

   ```bash
   cp .env.example .env
   ```

3. 在数据库中写入提供商/模型配置：

   现在所有提供商与模型元数据都保存在 PostgreSQL 的 `providers`、`provider_api_keys`、`provider_models` 表中。执行 Alembic 迁移后，可通过管理 API（开发中）或一段简短脚本初始化数据。下面示例创建一个 OpenAI 提供商及其 API Key：

   ```bash
   uv run python - <<'PY'
from uuid import uuid4

from app.db.session import SessionLocal
from app.models import Provider, ProviderAPIKey
from app.services.encryption import encrypt_secret

session = SessionLocal()
provider = Provider(
    id=uuid4(),
    provider_id="openai",
    name="OpenAI",
    base_url="https://api.openai.com",
    transport="http",
    models_path="/v1/models",
    messages_path="/v1/messages",
    weight=1.0,
)
session.add(provider)
session.flush()
session.add(
    ProviderAPIKey(
        provider_uuid=provider.id,
        encrypted_key=encrypt_secret("sk-你的OpenAI密钥"),  # 整个过程不会落盘明文
        label="default",
        max_qps=50,
    )
)
session.commit()
session.close()
PY
   ```

   其他厂商、静态模型、权重/QPS 等都通过更新数据库记录完成，不再依赖 `LLM_PROVIDER_*` 环境变量。

   生成并填入 `SECRET_KEY`（用于派生 Fernet/HMAC 密钥，加密后的密钥才会写入数据库）：

   ```bash
   bash scripts/generate_secret_key.sh
   ```

   将输出的随机字符串填入 `.env` 中的 `SECRET_KEY`。

4. 🔑 初始化用户与密钥（非常重要！）：

   通过 `/users` 以及 `/users/{user_id}/api-keys` 管理接口创建用户并生成密钥。API 只会返回一次明文密钥，请立刻保存，并在调用网关时携带 `Authorization: Bearer <base64(token)>`（可用 `uv run scripts/encode_token.py <token>` 重新编码）。首个管理员账户/密钥可由运维流程（SQL、管理后台等）提前注入。

5. 启动服务：

   ```bash
   docker-compose up -d
   ```

   服务将在 `http://localhost:8000` 上启动。

6. 使用curl测试：

   ```bash
   curl -X POST "http://localhost:8000/v1/chat/completions" \
     -H "Authorization: Bearer dGltZWxpbmU=" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "gpt-3.5-turbo",
       "messages": [{"role": "user", "content": "你好！"}]
     }'
   ```

7. 查看日志（可选）：

   ```bash
   docker-compose logs -f api
   ```

8. 停止服务：

   ```bash
   docker-compose down
   ```

### 2. 本地开发环境

1. 克隆项目并安装依赖：

   ```bash
   git clone <https://github.com/MarshallEriksen-shaomingyang/ai-higress.git>
   cd APIProxy
   python -m venv .venv
   source .venv/bin/activate
   pip install .
   ```

2. 配置 `.env`：

   ```bash
   cp .env.example .env
   ```

   - 将 `REDIS_URL`、`DATABASE_URL` 指向本地服务；
   - 配置 `SECRET_KEY`（`bash scripts/generate_secret_key.sh`）以便派生 Fernet/HMAC 密钥；
   - 通过 `/users` 与 `/users/{user_id}/api-keys`（或其他运维流程）创建管理员账号和密钥，并在请求里携带 `Authorization: Bearer <base64(token)>`；
   - 直接在数据库中新增/修改 `providers`、`provider_api_keys`、`provider_models` 行，以设置权重、SDK 连接方式、重试状态码等信息。

3. 启动开发服务器：

   ```bash
   apiproxy
   # 或
   uvicorn main:app --reload
   ```

   默认监听 `http://localhost:8000`。

---

## 配置说明

基础设施仍通过 `.env` 控制，但提供商/模型的核心配置改为存储在数据库中。详见 `docs/configuration.md`。

常用环境变量：

| 变量名           | 说明                                                                  | 默认值                                                |
| ---------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | 主库 SQLAlchemy 连接串                                                | `postgresql+psycopg://postgres:postgres@localhost:5432/apiproxy` |
| `REDIS_URL`      | Redis 连接字符串                                                      | `redis://redis:6379/0`                                |
| `SECRET_KEY`     | 用于派生 Fernet/HMAC 密钥的随机串（使用 `bash scripts/generate_secret_key.sh` 生成） | `please-change-me`                                    |
| `MODELS_CACHE_TTL` | 模型列表缓存过期时间（秒）                                          | `300`                                                 |
| `MASK_AS_BROWSER` | 是否伪装为浏览器                                                     | `True`                                                |
| `MASK_USER_AGENT` | 伪装为浏览器时使用的 User-Agent                                      | 见 `.env.example`                                     |
| `MASK_ORIGIN`    | 可选，伪装为浏览器时附加的 Origin                                    | `None`                                                |
| `MASK_REFERER`   | 可选，伪装为浏览器时附加的 Referer                                   | `None`                                                |
| `LOG_LEVEL`      | 网关日志级别                                                         | `INFO`                                                |
| `LOG_TIMEZONE`   | 日志时间戳使用的时区（如 `Asia/Shanghai`，缺省为系统本地时区）       | 系统本地时区                                          |

### 数据库与迁移

- 所有 Pydantic schema 已迁移到 `app/schemas`，`app/models` 现在专门存放 SQLAlchemy ORM（目前包含 `User`、`Identity`、`Permission` 三张表）。
- 在 `.env` 中配置 `DATABASE_URL` 指向 Postgres（仓库附带的 `docker-compose.yml` 已提供一套默认的 Postgres 服务与环境变量）。
- 使用 Alembic 管理数据库迁移：

  ```bash
  # 先激活虚拟环境并安装依赖
  alembic upgrade head
  ```

  该命令会执行 `alembic/versions/0001_create_auth_tables.py`，创建初始的「用户 / 身份 / 权限」三张表。后续若新增数据表，也按相同流程新增 revision。

---

## 主要 API

网关对外暴露的主要端点包括：

### 基础网关接口

- `GET /health`：健康检查。
- `GET /models`：聚合后的模型列表（OpenAI 兼容格式，需要认证）。
- `POST /v1/chat/completions`：统一聊天补全端点（需要认证），支持：
  - OpenAI 风格请求；
  - Claude 风格请求；
  - Gemini 风格 `input` 自动转换；
  - 流式与非流式模式；
  - 多提供商智能路由与跨厂商故障转移。
- `POST /v1/responses`：OpenAI Responses API 兼容端点，自动将 `instructions`/`input` 映射到 `messages`，并复用上述路由/流式能力。
- `GET /context/{session_id}`：查询指定会话的历史上下文（需要认证）。

### 如何使用 `/v1/responses`

- 当客户端直接调用 `/v1/responses` 时，APIProxy 会在内部标记该请求，使路由层选择上游的 `/v1/responses` 端点，而不是 `/v1/chat/completions`，从而保持 Responses 原生格式。
- 若使用动态模型发现，只要入口是 `/v1/responses` 就会自动沿用；若你自己在 Redis 中维护逻辑模型，请把对应 `PhysicalModel.endpoint` 配置为提供商的 `/v1/responses` URL，以满足只支持 Responses API 的上游。
- 流式调用会透传 `response.*` SSE 事件，便于官方 SDK 正常解析；如果仍需 OpenAI Chat 式的 chunk，可以继续访问 `/v1/chat/completions`。
- 像 `gpt-5.1-codex` 这类已经拒绝 `/v1/chat/completions` 的新模型，必须通过 `/v1/responses` 才能成功调用。

### 多提供商管理与路由接口

- `GET /providers`：查看所有已配置的提供商。
- `GET /providers/{provider_id}`：查看某个提供商的配置。
- `GET /providers/{provider_id}/models`：查看某个提供商的模型列表（从缓存或上游刷新）。
- `GET /providers/{provider_id}/health`：对单个提供商做轻量健康检查。
- `GET /providers/{provider_id}/metrics`：查看某个提供商的路由统计指标。
- `GET /logical-models`：列出所有逻辑模型。
- `GET /logical-models/{logical_model_id}`：查看单个逻辑模型。
- `GET /logical-models/{logical_model_id}/upstreams`：查看逻辑模型对应的物理上游列表。
- `POST /routing/decide`：对某个逻辑模型计算一次路由决策，返回选中的上游及候选得分。
- `GET /routing/sessions/{conversation_id}`：查看某个会话与提供商/模型的绑定关系。
- `DELETE /routing/sessions/{conversation_id}`：删除会话绑定（取消会话粘连）。

更多字段与数据结构说明见 `specs/001-model-routing/data-model.md`。

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

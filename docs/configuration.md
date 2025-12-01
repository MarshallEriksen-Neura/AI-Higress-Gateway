多提供商网关配置指南
====================

APIProxy 的基础依赖（Redis、Postgres、日志级别等）仍通过环境变量配置，但提供商与模型信息已经迁移到数据库中统一管理。本指南介绍如何在数据库中落盘配置、加密 API Key，以及如何验证配置是否生效。


1. 基本步骤
-----------

1. 复制 `.env` 模板并根据部署环境调整基础配置（`REDIS_URL`、`DATABASE_URL`、`LOG_LEVEL` 等）：

   ```bash
   cp .env.example .env
   ```

2. 生成 `SECRET_KEY`，供 Fernet/HMAC 使用（所有敏感信息都依赖该密钥加密）：

   ```bash
   bash scripts/generate_secret_key.sh
   ```

   将输出写入 `.env` 中的 `SECRET_KEY`。

3. 运行 Alembic 迁移，创建 `providers`、`provider_api_keys`、`provider_models` 等表：

   ```bash
   alembic upgrade head
   ```

4. 使用管理 API（开发中）或临时脚本向数据库写入提供商/模型/密钥。下面示例脚本创建一个 OpenAI 提供商、一个加权 API Key，并演示如何追加静态模型：

   ```bash
   uv run python - <<'PY'
from uuid import uuid4

from app.db.session import SessionLocal
from app.models import Provider, ProviderAPIKey, ProviderModel
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
    retryable_status_codes=[429, 500, 502, 503, 504],
)
session.add(provider)
session.flush()

session.add(
    ProviderAPIKey(
        provider_uuid=provider.id,
        encrypted_key=encrypt_secret("sk-your-openai-key"),
        label="default",
        max_qps=50,
        weight=2.0,
    )
)

session.add(
    ProviderModel(
        provider_id=provider.id,
        model_id="gpt-4o",
        family="gpt-4",
        display_name="GPT-4 Omni",
        context_length=128000,
        capabilities=["chat"],
        pricing={"input": 0.01, "output": 0.03},
    )
)

session.commit()
session.close()
PY
   ```

   - **永远不要**直接在数据库中写入明文 API Key。请使用 `app.services.encryption.encrypt_secret()` 生成密文。  
   - `provider_models` 可选，用于没有 `/models` 接口的提供商；`capabilities` 是任意字符串数组（chat/completion/embedding 等）。  
   - 多个 API Key 只需新增多行 `provider_api_keys`，权重/QPS/标签均可按列配置。

5. 通过 `/users/{user_id}/api-keys` 或运维脚本创建管理员账号与调用密钥，调用 API 时带上 `Authorization: Bearer <base64(token)>`。


2. 数据库字段速览
----------------

| 表 | 关键字段 | 说明 |
|----|----------|------|
| `providers` | `provider_id`、`name`、`base_url`、`transport`、`models_path`、`messages_path`、`weight`、`retryable_status_codes`、`max_qps`、`custom_headers` | 描述一个上游提供商。`transport` 支持 `http` / `sdk`。`custom_headers` 用于附加 HTTP 头。 |
| `provider_api_keys` | `provider_uuid`、`encrypted_key`、`weight`、`max_qps`、`label`、`status` | 每行表示一个加密后的 API Key，`status != 'active'` 的记录会被忽略。 |
| `provider_models` | `provider_id`、`model_id`、`display_name`、`context_length`、`capabilities`、`pricing`、`meta_hash` | 可选的静态模型列表。当某个提供商没有 `/models` 接口或需要手动指定模型能力时使用。 |

> 更多字段含义可参考 `specs/003-db-provider-model-config/data-model.md`。


3. 验证配置
-----------

当数据库写入完成后，可通过以下接口确认配置是否生效：

1. 列出所有提供商：

   ```bash
   curl -X GET "http://localhost:8000/providers" \
     -H "Authorization: Bearer <base64(API_KEY)>"
   ```

   返回中应包含数据库里配置的所有 `provider_id`。

2. 查看某个提供商的模型列表（会先读缓存，命中失败时刷新）：

   ```bash
   curl -X GET "http://localhost:8000/providers/openai/models" \
     -H "Authorization: Bearer <base64(API_KEY)>"
   ```

   - 如果提供商有 `/models` 接口，会实时抓取并写入 Redis 缓存；  
   - 如果只配置了 `provider_models`（静态模型），会直接返回该列表。

3. 进行健康检查：

   ```bash
   curl -X GET "http://localhost:8000/providers/openai/health" \
     -H "Authorization: Bearer <base64(API_KEY)>"
   ```

4. 查看路由指标：

   ```bash
   curl -X GET "http://localhost:8000/providers/openai/metrics" \
     -H "Authorization: Bearer <base64(API_KEY)>"
   ```


4. 逻辑模型与路由
-----------------

逻辑模型数据仍存放在 Redis（键名 `llm:logical:{logical_model}`），结构参考 `app/models/logical_model.py`。配置方式与之前一致：

1. 在管理脚本中构造 `LogicalModel`，调用 `app/storage/redis_service.set_logical_model()` 写入；
2. 或在开发环境中直接用 `redis-cli SET llm:logical:gpt-4 '<json>'` 进行调试。

验证逻辑模型：

```bash
# 列出所有逻辑模型
curl -X GET "http://localhost:8000/logical-models" \
  -H "Authorization: Bearer <base64(API_KEY)>"

# 查看某个逻辑模型
curl -X GET "http://localhost:8000/logical-models/gpt-4" \
  -H "Authorization: Bearer <base64(API_KEY)>"

# 查看逻辑模型关联的上游
curl -X GET "http://localhost:8000/logical-models/gpt-4/upstreams" \
  -H "Authorization: Bearer <base64(API_KEY)>"
```

当逻辑模型缺失时，网关会尝试动态构建：根据 `/models` 缓存查找所有包含请求模型 ID 的提供商，自动拼接成临时的逻辑模型，实现跨厂商回退。


5. 常见问题
-----------

- **如何更新权重/SDK/自定义 Header？**  
  直接更新 `providers` 中对应字段。网关在下一次查询时会自动生效。

- **如何轮换 API Key？**  
  新 Key：向 `provider_api_keys` 插入新行并设置 `status='active'`；旧 Key：将 `status` 标记为 `disabled`，网关会自动忽略。  
  注意每行的 `encrypted_key` 必须通过 `encrypt_secret` 生成。

- **如何导入旧的环境变量配置？**  
  可编写一次性脚本读取 `.env`（或 `settings`），映射到三张表。`specs/003-db-provider-model-config/tasks.md` 中的 Phase 5/6 也提供了导入器的设计草案。

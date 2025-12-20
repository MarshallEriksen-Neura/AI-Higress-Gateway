# Assistants / Conversations / Messages API

> 认证：JWT（`Authorization: Bearer <access_token>`）

## Assistants

### GET `/v1/assistants`

查询当前用户的助手列表（支持按项目过滤）。

Query:
- `project_id` (optional): UUID（MVP: project_id == api_key_id）
- `cursor` (optional): string（当前实现为 offset 游标）
- `limit` (optional): 1-100

Response:
```json
{
  "items": [
    {
      "assistant_id": "uuid",
      "project_id": "uuid",
      "name": "默认助手",
      "system_prompt": "你是一个严谨的助手",
      "default_logical_model": "gpt-4.1",
      "title_logical_model": "gpt-4.1",
      "created_at": "2025-12-19T00:00:00Z",
      "updated_at": "2025-12-19T00:00:00Z"
    }
  ],
  "next_cursor": "30"
}
```

### POST `/v1/assistants`

创建助手。

说明：
- `default_logical_model` 支持设置为 `"auto"`：表示由 Bandit（Thompson Sampling）在项目配置的 `candidate_logical_models` 中选择一个模型作为本次 baseline 的实际模型（单路执行，不并行）。
- 若项目未配置 `candidate_logical_models`，则 `"auto"` 会返回 400。
- `project_id`（MVP: project_id == api_key_id）可为空；若传入，则后端会校验该项目是否存在且归属当前用户。
- `default_logical_model` 也支持设置为 `"__project__"`：表示跟随项目级默认模型（见 Project Chat Settings）。

Request:
```json
{
  "project_id": "uuid",
  "name": "默认助手",
  "system_prompt": "你是一个严谨的助手",
  "default_logical_model": "gpt-4.1",
  "title_logical_model": "gpt-4.1",
  "model_preset": {"temperature": 0.2}
}
```

说明：
- `title_logical_model`（可选）：会话标题生成模型。
  - 当创建会话时不传 `title`，并且在该会话发送第一条用户消息后，后端会使用该模型基于“首问”自动生成 `Conversation.title`（尽力而为，不影响主聊天流程）。
  - 若不传该字段，则不会自动生成标题（保持 `title` 为空，前端可按无标题展示）。
  - 传 `"__project__"`：跟随项目级标题模型（见 Project Chat Settings）。

Errors:
- `404 not_found`：项目不存在或无权访问（`project_id` 传错）

### GET `/v1/assistants/{assistant_id}`

获取助手详情。

### PUT `/v1/assistants/{assistant_id}`

更新助手（支持归档 `archived=true`）。

可选字段（部分）：
- `title_logical_model`: string | null
  - 传具体模型：开启会话首问自动命名。
  - 传 `null`：关闭自动命名（恢复为跟随/不启用）。

### DELETE `/v1/assistants/{assistant_id}`

删除助手（硬删除，会级联删除该助手下的会话与消息历史）。

## Conversations

### POST `/v1/conversations`

创建会话（按助手分组）。

Request:
```json
{
  "assistant_id": "uuid",
  "project_id": "uuid",
  "title": "可选标题"
}
```

Errors:
- `404 not_found`：项目不存在或无权访问（`project_id` 传错）
- `403 forbidden`：助手不属于当前项目

Response（摘要）:
```json
{
  "conversation_id": "uuid",
  "assistant_id": "uuid",
  "project_id": "uuid",
  "title": "可选标题",
  "last_activity_at": "datetime",
  "archived_at": null
}
```

### GET `/v1/conversations?assistant_id=...`

按助手查询会话列表（摘要）。

Query:
- `assistant_id` (required): UUID
- `cursor` (optional): string
- `limit` (optional): 1-100
- `archived` (optional): bool，默认为 `false`（仅返回未归档会话）；传 `true` 返回已归档会话

### PUT `/v1/conversations/{conversation_id}`

更新会话（支持归档/取消归档）。

Request:
```json
{
  "title": "可选新标题",
  "archived": true
}
```

说明：
- 归档后会话不会出现在会话列表中，但仍可通过 messages 接口读取历史。

### DELETE `/v1/conversations/{conversation_id}`

删除会话（硬删除，会级联删除会话消息与 run/eval 数据）。

## Project Chat Settings

### GET `/v1/projects/{project_id}/chat-settings`

获取项目级聊天设置（MVP: `project_id == api_key_id`）。

Response:
```json
{
  "project_id": "uuid",
  "default_logical_model": "auto",
  "title_logical_model": "gpt-4.1"
}
```

说明：
- `default_logical_model`：项目默认聊天模型；当助手的 `default_logical_model` 设置为 `"__project__"` 时生效。
- `title_logical_model`：项目默认标题模型；当助手的 `title_logical_model` 设置为 `"__project__"` 时生效；为空表示不自动命名。

### PUT `/v1/projects/{project_id}/chat-settings`

更新项目级聊天设置（只更新传入字段）。

Request:
```json
{
  "default_logical_model": "auto",
  "title_logical_model": "gpt-4.1"
}
```

说明：
- 传 `null` 可清空对应字段（恢复默认行为）。

## Messages / Runs

### POST `/v1/conversations/{conversation_id}/messages`

发送一条用户消息并同步执行 baseline（non-stream）。

Request:
```json
{
  "content": "你好",
  "override_logical_model": "gpt-4.1",
  "model_preset": {"temperature": 0.2}
}
```

Response:
```json
{
  "message_id": "uuid",
  "baseline_run": {
    "run_id": "uuid",
    "requested_logical_model": "gpt-4.1",
    "status": "succeeded",
    "output_preview": "…"
  }
}
```

### GET `/v1/conversations/{conversation_id}/messages`

分页返回消息列表（默认只返回 run 摘要；assistant 正文在 message.content）。

### GET `/v1/runs/{run_id}`

惰性加载 run 详情（包含 request/response payload 与 output_text）。

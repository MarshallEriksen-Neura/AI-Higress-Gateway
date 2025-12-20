# Bridge / MCP API

> 认证：JWT（`Authorization: Bearer <access_token>`）

本页描述 Web 侧与 Bridge（Tunnel Gateway / Agent）交互的 API（云端后端对前端暴露）。

## Agents

### GET `/v1/bridge/agents`

列出在线 Agent。

Errors（标准错误体）:
- `503 service_unavailable`: Gateway 不可用/调用失败（`details.code=bridge_gateway_error`，`details.reason` 可能为 `ConnectError/ReadTimeout/...`）

Response:
```json
{
  "agents": [
    {
      "agent_id": "aws-dev-server",
      "status": "online",
      "last_seen_at": 1712345678,
      "connected_at": 1712345600
    }
  ]
}
```

### GET `/v1/bridge/agents/{agent_id}/tools`

获取某个 Agent 的工具列表（工具名已命名空间化：`{server}__{tool}`）。

Errors（标准错误体）:
- `404 not_found`: Agent 离线（`details.code=agent_offline`）
- `503 service_unavailable`: Gateway 不可用/调用失败（`details.code=bridge_gateway_error`，`details.reason` 可能为 `ConnectError/ReadTimeout/...`）

Response:
```json
{
  "agent_id": "aws-dev-server",
  "tools": [
    {
      "name": "filesystem__readFile",
      "description": "Read a file",
      "input_schema": { "type": "object", "properties": {} },
      "meta": { "server": "filesystem" }
    }
  ]
}
```

## Invoke / Cancel

## Agent Token（配置辅助）

### POST `/v1/bridge/agent-token`

为当前登录用户签发 Bridge Agent 连接 Tunnel Gateway 用的 token（JWT HS256）。

说明：
- 该 token **不包含用户 MCP 密钥**（MCP 密钥仍只存在用户本地 `config.yaml` / env）。
- 若 Tunnel Gateway 启用了 `--agent-token-secret`，则 Agent 连接时必须发送该 token（AUTH），否则会被拒绝。
- token 默认不落库（MVP）；后续如需吊销/轮换，可引入 revocation 机制。

Request:
```json
{ "agent_id": "my-agent" }
```

Response:
```json
{
  "agent_id": "my-agent",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
  "expires_at": "2026-01-01T00:00:00+00:00"
}
```

### POST `/v1/bridge/invoke`

下发一次工具调用（会返回 `req_id` 用于关联事件流）。

Request:
```json
{
  "req_id": "req_optional",
  "agent_id": "aws-dev-server",
  "tool_name": "bridge__echo",
  "arguments": { "lines": ["hello"] },
  "timeout_ms": 60000,
  "stream": true
}
```

Response（接受）:
```json
{ "req_id": "req_xxx", "status": "accepted" }
```

Errors（标准错误体）:
- `400 bad_request`: 缺少必要字段
- `404 not_found`: Agent 离线（`details.code=agent_offline`）
- `503 service_unavailable`: Gateway 不可用/调用失败（`details.code=bridge_gateway_error`，`details.reason` 可能为 `ConnectError/ReadTimeout/...`）

### POST `/v1/bridge/cancel`

请求取消某个 `req_id`。

Errors（标准错误体）:
- `400 bad_request`: 缺少必要字段
- `404 not_found`: Agent 离线（`details.code=agent_offline`）
- `503 service_unavailable`: Gateway 不可用/调用失败（`details.code=bridge_gateway_error`，`details.reason` 可能为 `ConnectError/ReadTimeout/...`）

Request:
```json
{ "req_id": "req_xxx", "agent_id": "aws-dev-server", "reason": "user_cancel" }
```

Response:
```json
{ "req_id": "req_xxx", "status": "sent" }
```

## Events（SSE）

### GET `/v1/bridge/events`

原样透传 Tunnel Gateway 的 Envelope SSE 流（调试用途）。

### GET `/v1/bridge/tool-events`

将 Envelope 流转换为前端约定的 tool_* SSE 事件。

事件：
- `tool_status`：
```json
{ "req_id": "req_xxx", "agent_id": "aws-dev-server", "state": "sent|acked|running|canceled|done|error", "message": "" }
```

- `tool_log`：
```json
{ "req_id": "req_xxx", "agent_id": "aws-dev-server", "channel": "stdout|stderr", "data": "...", "dropped_bytes": 0, "dropped_lines": 0 }
```

- `tool_result`：
```json
{ "req_id": "req_xxx", "agent_id": "aws-dev-server", "ok": true, "exit_code": 0, "canceled": false, "result_json": {}, "error": null }
```

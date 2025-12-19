# Evals API（推荐评测：baseline + challengers）

> 认证：JWT（`Authorization: Bearer <access_token>`）

## POST `/v1/evals`

基于已存在的 baseline_run 触发推荐评测，创建 challenger runs（默认最多 2 个）并异步执行。

Request:
```json
{
  "project_id": "uuid",
  "assistant_id": "uuid",
  "conversation_id": "uuid",
  "message_id": "uuid",
  "baseline_run_id": "uuid"
}
```

Response:
```json
{
  "eval_id": "uuid",
  "status": "running",
  "baseline_run_id": "uuid",
  "challengers": [
    {
      "run_id": "uuid",
      "requested_logical_model": "gpt-4.1-mini",
      "status": "queued",
      "output_preview": null
    }
  ],
  "explanation": {
    "summary": "…",
    "evidence": {
      "policy_version": "ts-v1",
      "exploration": true
    }
  }
}
```

说明：
- 若项目配置启用 `project_ai_enabled=true` 且设置了 `project_ai_provider_model`，后端会尝试调用该模型生成解释；失败会自动降级为规则解释（不会影响评测主流程）。

Errors:
- `403 forbidden` + `detail.error = "forbidden"`：项目未启用推荐评测
- `429` + `detail.error = "PROJECT_EVAL_COOLDOWN"`：触发过于频繁

## GET `/v1/evals/{eval_id}`

查询评测状态与 challenger 列表（用于轮询刷新）。

## POST `/v1/evals/{eval_id}/rating`

提交 winner + 原因标签（winner 必须属于 baseline/challengers）。

Request:
```json
{
  "winner_run_id": "uuid",
  "reason_tags": ["accurate", "complete"]
}
```

Response:
```json
{
  "eval_id": "uuid",
  "winner_run_id": "uuid",
  "reason_tags": ["accurate"],
  "created_at": "2025-12-19T00:00:00Z"
}
```

# Project Eval Config API（项目级推荐评测配置）

> 认证：JWT（`Authorization: Bearer <access_token>`）
>
> MVP：`project_id == api_key_id`（无团队模式）。

## GET `/v1/projects/{project_id}/eval-config`

读取项目配置；不存在时返回默认值（不会自动落库）。

## PUT `/v1/projects/{project_id}/eval-config`

更新/创建项目配置。

说明：
- `project_ai_enabled=true` 且 `project_ai_provider_model` 非空时，`/v1/evals` 会尝试调用 Project AI 生成解释。
- `project_ai_provider_model` 格式为 `"provider_id/model_id"`，例如 `"provider-1/gpt-4.1-mini"`。

Request:
```json
{
  "enabled": true,
  "max_challengers": 2,
  "provider_scopes": ["private", "shared", "public"],
  "candidate_logical_models": ["gpt-4.1", "gpt-4.1-mini"],
  "cooldown_seconds": 120,
  "budget_per_eval_credits": 5,
  "rubric": "更偏好准确/可执行的建议，避免编造",
  "project_ai_enabled": false,
  "project_ai_provider_model": null
}
```

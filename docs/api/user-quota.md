# GET /users/{user_id}/quota

获取指定用户当前的私有 Provider 配额信息。

## 鉴权

- 需要带上 JWT 访问令牌：
  - `Authorization: Bearer <access_token>`
- 权限规则：
  - 普通用户只能查询自己的配额（`user_id == token.sub`）；
  - 超级管理员可以查询任意用户的配额。

## 请求

- 方法：`GET`
- 路径：`/users/{user_id}/quota`
- 路径参数：
  - `user_id`：用户 ID（UUID 字符串）

## 响应

`200 OK` 时返回 JSON：

```json
{
  "private_provider_limit": 10,
  "private_provider_count": 2,
  "is_unlimited": false
}
```

- `private_provider_limit`：当前用于展示的私有 Provider 数量上限。
  - 对于无限制账号，该值会使用系统上限 `MAX_USER_PRIVATE_PROVIDER_LIMIT` 作为推荐展示值；
  - 真正的硬性限制仍由后端 `UserPermissionService.get_provider_limit` 控制。
- `private_provider_count`：当前用户已创建的私有 Provider 数量。
- `is_unlimited`：
  - `true`：后端不会对该用户的私有 Provider 数量做硬性限制（例如超级管理员或拥有 `unlimited_providers` 权限的用户）；
  - `false`：受 `private_provider_limit` 所表示的上限约束。

## 错误码

- `401 Unauthorized`：缺少或携带了无效的 JWT。
- `403 Forbidden`：
  - 普通用户尝试查询其他用户的配额。
- `404 Not Found`：
  - `user_id` 对应的用户不存在或已被删除。

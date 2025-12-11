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


---

## 与仪表盘概览页的关系

`GET /users/{user_id}/quota` 接口主要用于**私有 Provider 配额管理**，与仪表盘概览页的关系如下：

### 概览页中的使用场景

1. **Provider 管理快捷入口**
   - 概览页的"Provider 管理"快捷按钮导航到 Provider 管理页面
   - Provider 管理页面使用本接口检查用户的私有 Provider 配额

2. **配额提示**
   - 当用户已创建的私有 Provider 数量接近上限时，可在概览页显示提示
   - 提示用户升级账号或删除不用的 Provider

### 前端集成示例

```typescript
// 在 Provider 管理页面检查配额
const { data: quota } = useSWR(`/users/${userId}/quota`, fetcher);

if (quota && !quota.is_unlimited && quota.private_provider_count >= quota.private_provider_limit) {
  return <QuotaExceededAlert />;
}
```

---

## 错误处理指南

### 常见错误场景

1. **用户不存在**
   ```
   404 Not Found
   {
     "detail": "User not found"
   }
   ```
   - 前端应显示"用户不存在"错误提示

2. **权限不足**
   ```
   403 Forbidden
   {
     "detail": "You don't have permission to view this user's quota"
   }
   ```
   - 普通用户尝试查询其他用户的配额时返回

3. **未认证**
   ```
   401 Unauthorized
   {
     "detail": "Not authenticated"
   }
   ```
   - JWT 缺失或无效时返回

### 前端错误处理

```typescript
const handleQuotaError = (error: any) => {
  if (error.status === 401) {
    // 重定向到登录页
    router.push('/auth/login');
  } else if (error.status === 403) {
    // 显示权限错误
    showError('You do not have permission to view this quota');
  } else if (error.status === 404) {
    // 显示用户不存在错误
    showError('User not found');
  } else {
    // 显示通用错误
    showError('Failed to load quota information');
  }
};
```

---

## 性能优化建议

### 缓存策略

建议在前端使用 SWR 缓存用户配额信息：

```typescript
// 使用 SWR 缓存，TTL 5 分钟
const { data: quota } = useSWR(
  `/users/${userId}/quota`,
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 分钟
  }
);
```

### 何时刷新缓存

- 用户创建新的私有 Provider 后
- 用户删除私有 Provider 后
- 用户升级账号后

```typescript
const handleProviderCreated = async () => {
  // 创建 Provider 后刷新配额
  await mutate(`/users/${userId}/quota`);
};
```

---

## 相关 API

- `GET /v1/private-providers`：获取用户的私有 Provider 列表
- `POST /v1/private-providers`：创建新的私有 Provider（会影响配额）
- `DELETE /v1/private-providers/{provider_id}`：删除私有 Provider（会释放配额）

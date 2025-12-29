# HTTP Client 封装文档

这个 HTTP 客户端封装基于 axios，提供了对 AI Higress API 的完整支持，包括认证、错误处理和自动 token 管理。

## 目录结构

```
http/
├── client.ts          # axios 实例和拦截器
├── auth.ts            # 认证相关 API
├── user.ts            # 用户管理 API
├── api-key.ts         # API密钥管理 API
├── provider.ts        # 提供商管理 API
├── logical-model.ts   # 逻辑模型管理 API
├── routing.ts         # 路由管理 API
├── system.ts          # 系统管理 API
├── index.ts           # 统一导出
└── README.md          # 文档
```

## 基本用法

### 1. 导入服务

```typescript
import { 
  authService, 
  userService, 
  apiKeyService,
  providerService,
  logicalModelService,
  routingService,
  systemService 
} from '@/http';
```

### 2. 认证流程

#### 用户登录

```typescript
import { authService } from '@/http';

try {
  const response = await authService.login({
    username: 'your-username',
    password: 'your-password',
  });
  
  // 保存token到localStorage（拦截器会自动使用）
  localStorage.setItem('access_token', response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);
  
  console.log('登录成功');
} catch (error) {
  console.error('登录失败', error);
}
```

#### 用户注册

```typescript
try {
  const user = await authService.register({
    username: 'newuser',
    email: 'user@example.com',
    password: 'password123',
    display_name: 'New User',
  });
  
  console.log('注册成功', user);
} catch (error) {
  console.error('注册失败', error);
}
```

#### 获取当前用户信息

```typescript
try {
  const user = await authService.getCurrentUser();
  console.log('当前用户', user);
} catch (error) {
  console.error('获取用户信息失败', error);
}
```

#### 刷新Token

```typescript
try {
  const refreshToken = localStorage.getItem('refresh_token');
  if (refreshToken) {
    const response = await authService.refreshToken({ refresh_token: refreshToken });
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
  }
} catch (error) {
  console.error('刷新token失败', error);
}
```

### 3. 用户管理

```typescript
// 创建用户
const newUser = await userService.createUser({
  username: 'testuser',
  email: 'test@example.com',
  password: 'securepassword',
  display_name: 'Test User',
});

// 更新用户信息
await userService.updateUser(userId, {
  display_name: 'Updated Name',
  email: 'newemail@example.com',
});

// 更新用户状态
await userService.updateUserStatus(userId, {
  is_active: false,
});
```

### 4. API密钥管理

```typescript
// 获取用户的API密钥列表
const apiKeys = await apiKeyService.getApiKeys(userId);

// 创建新的API密钥
const newKey = await apiKeyService.createApiKey(userId, {
  name: 'My API Key',
  expiry: 'month',
  allowed_provider_ids: ['provider1', 'provider2'],
});

// 更新API密钥
await apiKeyService.updateApiKey(userId, keyId, {
  name: 'Updated Key Name',
  expiry: 'year',
});

// 设置API密钥允许的提供商
await apiKeyService.setAllowedProviders(userId, keyId, {
  allowed_provider_ids: ['provider3'],
});

// 删除API密钥
await apiKeyService.deleteApiKey(userId, keyId);
```

### 5. 提供商管理

```typescript
// 获取所有提供商
const { providers, total } = await providerService.getProviders();

// 获取特定提供商信息
const provider = await providerService.getProvider(providerId);

// 获取提供商支持的模型
const { models } = await providerService.getProviderModels(providerId);

// 检查提供商健康状态
const health = await providerService.checkProviderHealth(providerId);

// 获取提供商指标
const { metrics } = await providerService.getProviderMetrics(providerId, 'gpt-4');
```

### 6. 逻辑模型管理

```typescript
// 获取所有逻辑模型
const { models, total } = await logicalModelService.getLogicalModels();

// 获取特定逻辑模型
const model = await logicalModelService.getLogicalModel(modelId);

// 获取逻辑模型的上游
const { upstreams } = await logicalModelService.getLogicalModelUpstreams(modelId);
```

### 7. 路由管理

```typescript
// 获取路由决策
const decision = await routingService.makeRoutingDecision({
  logical_model: 'gpt-4',
  strategy: 'latency_first',
});
```

### 8. 系统管理

```typescript
// 生成系统主密钥
const { secret_key } = await systemService.generateSecretKey({ length: 64 });

// 初始化系统管理员（仅返回凭证，API Key 需登录后另行创建）
const admin = await systemService.initAdmin({
  username: 'admin',
  email: 'admin@example.com',
  display_name: 'System Administrator',
});

// 验证密钥强度
const { is_valid, message } = await systemService.validateKey({
  key: 'some-secret-key',
});

// 获取系统状态
const { status, message } = await systemService.getSystemStatus();
```

## 自动特性

### 1. 自动认证

HTTP 客户端会自动从 localStorage 读取认证信息并添加到请求头中：

- 如果存在 `access_token`，会添加 `Authorization: Bearer <token>` 头
- 如果存在 `api_key`，会添加 `X-API-Key: <key>` 头

### 2. 自动错误处理

客户端会自动处理常见的 HTTP 错误：

- 401: 清除认证信息并重定向到登录页
- 403: 显示权限错误提示
- 404: 显示资源不存在提示
- 429: 显示请求频率限制提示
- 500/503: 显示服务器错误提示

### 3. Toast 提示

所有错误都会通过 Toast 组件显示给用户，提供友好的错误反馈。

## 环境变量

可以通过设置 `NEXT_PUBLIC_API_BASE_URL` 环境变量来指定 API 基础 URL：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

如果不设置，默认使用 `http://localhost:8000`。

## 类型支持

所有 API 请求和响应都有完整的 TypeScript 类型定义，提供完整的代码提示和类型检查：

```typescript
import type { 
  LoginRequest, 
  AuthResponse, 
  UserInfo,
  Provider,
  LogicalModel 
} from '@/http';
```

## 最佳实践

1. **错误处理**：始终使用 try-catch 块处理 API 调用
2. **认证状态**：在应用启动时检查 localStorage 中的 token
3. **Token 刷新**：在 API 调用失败时尝试刷新 token
4. **加载状态**：在 API 调用期间显示加载指示器
5. **类型安全**：充分利用 TypeScript 类型定义

## 示例页面

可以访问 `/api-example` 页面查看完整的 API 使用示例。

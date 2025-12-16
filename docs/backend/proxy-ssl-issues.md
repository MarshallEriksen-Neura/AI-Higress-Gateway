# 代理 SSL 握手问题排查指南

## 问题描述

某些上游 API（如 moonshot）在通过 HTTP/HTTPS 代理访问时，可能会在 SSL/TLS 握手阶段失败，错误信息为：

```
OpenSSL SSL_connect: SSL_ERROR_SYSCALL in connection to api.moonshot.cn:443
```

日志中表现为：
```
[WARNING] Upstream streaming error for https://api.moonshot.cn/v1/chat/completions 
(provider=moonshot-ai-xxx, model=kimi-k2-turbo-preview, status=None); retryable=True
```

## 根本原因

1. **代理连接成功**：HTTP CONNECT 隧道建立正常
2. **SSL 握手失败**：在 CONNECT 隧道内进行 SSL 握手时出现系统级错误
3. **直连可用**：不使用代理时，SSL 握手完全正常

可能的原因：
- 代理服务器配置了 SSL 拦截但证书验证失败
- 代理服务器对特定域名有限制
- 网络不稳定导致握手超时
- 代理服务器不完全支持 HTTPS CONNECT 方法

## 解决方案

### 方案 1：配置 no_proxy（推荐）

在 `.env` 文件中添加需要直连的域名到 `no_proxy` 列表：

```bash
# 同时设置小写和大写版本，确保兼容性
no_proxy=localhost,127.0.0.1,::1,api.moonshot.cn
NO_PROXY=localhost,127.0.0.1,::1,api.moonshot.cn
```

网关的上游 HTTP 客户端（默认使用 `CurlCffiClient`，配置了 `trust_env=True`）会自动读取这些环境变量，对列表中的域名使用直连而不走代理。

### 方案 2：检查代理服务器配置

如果需要通过代理访问，检查代理服务器（如 clash/v2ray/shadowsocks）的配置：

1. 查看代理服务器日志，确认是否有 SSL 相关错误
2. 检查是否配置了 SSL 拦截（MITM）
3. 确认代理服务器支持 HTTPS CONNECT 方法
4. 测试代理是否对其他 HTTPS 网站正常工作

### 方案 3：调整超时时间

如果是超时问题，可以在 `.env` 中增加超时时间：

```bash
UPSTREAM_TIMEOUT=900  # 默认 600 秒
```

## 排查步骤

### 1. 测试直连

```bash
# 取消代理环境变量
unset HTTPS_PROXY
unset HTTP_PROXY

# 测试直连
curl -v https://api.moonshot.cn/v1/models
```

如果直连成功（返回 401 或正常响应），说明问题在代理。

### 2. 测试代理连接

```bash
# 设置代理
export HTTPS_PROXY=http://192.168.31.105:7890

# 测试通过代理访问
curl -v https://api.moonshot.cn/v1/models
```

观察 SSL 握手阶段是否失败。

### 3. 测试代理对其他网站的支持

```bash
curl -x http://192.168.31.105:7890 -v https://www.google.com
curl -x http://192.168.31.105:7890 -v https://api.openai.com
```

如果其他网站可以但特定 API 不行，说明代理对该域名有限制。

## 代码实现

所有创建上游 HTTP 客户端的地方都已配置 `trust_env=True`，支持读取环境变量：

```python
async with CurlCffiClient(
    timeout=settings.upstream_timeout,
    trust_env=True,  # 启用环境变量代理支持
) as client:
    # ...
```

涉及的文件：
- `backend/app/deps.py` - 主要 HTTP 客户端依赖
- `backend/app/tasks/provider_health.py` - 健康检查
- `backend/app/tasks/upstream_proxy_pool.py` - 代理池
- `backend/app/services/metrics_service.py` - 指标服务
- `backend/app/services/provider_validation_service.py` - 提供商验证
- `backend/app/services/provider_audit_service.py` - 提供商审计
- `backend/app/services/user_probe_service.py` - 用户探针调度

## 应用修改

修改 `.env` 后需要重启服务：

```bash
# Docker 开发环境
docker compose -f docker-compose.develop.yml restart api celery_worker celery_beat

# 或完全重启
docker compose -f docker-compose.develop.yml down
IMAGE_TAG=latest docker compose -f docker-compose.develop.yml --env-file .env up -d
```

## 验证

重启后查看日志，确认 moonshot 请求成功：

```bash
# 查看今天的日志
tail -f logs/$(date +%Y-%m-%d)/provider.log
tail -f logs/$(date +%Y-%m-%d)/upstream.log
```

成功的日志应该显示：
```
[INFO] Health check for provider moonshot-ai-xxx at https://api.moonshot.cn/v1/models
[INFO] provider=moonshot-ai-xxx key=default health=ok
```

# 安全中间件

本目录包含 FastAPI 应用的安全中间件，用于防护自动化扫描攻击和常见 Web 安全威胁。

## 中间件列表

### 1. SecurityHeadersMiddleware

添加安全响应头，防护常见 Web 攻击。

**防护的攻击类型**：
- MIME 类型嗅探攻击
- 点击劫持（Clickjacking）
- XSS 攻击
- 信息泄露

**使用示例**：
```python
from app.middleware import SecurityHeadersMiddleware

app.add_middleware(
    SecurityHeadersMiddleware,
    enable_hsts=True,
    hsts_max_age=31536000,
)
```

**添加的响应头**：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: default-src 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=()`
- `Strict-Transport-Security: max-age=31536000` (可选)

### 2. RateLimitMiddleware

限流中间件，防止暴力破解和 DDoS 攻击。

**特性**：
- 基于 IP 的滑动窗口限流
- 支持路径级别的自定义限流规则
- 内存或 Redis 存储（分布式部署）
- 自动添加 X-RateLimit 响应头

**使用示例**：
```python
from app.middleware import RateLimitMiddleware

app.add_middleware(
    RateLimitMiddleware,
    redis_client=None,
    default_max_requests=100,
    default_window_seconds=60,
    path_limits={
        "/auth/login": (5, 60),
        "/v1/chat/completions": (60, 60),
    },
)
```

### 3. RequestValidatorMiddleware

请求验证中间件，检测并阻止恶意请求。

**检测的攻击模式**：
- SQL 注入
- XSS 攻击
- 路径遍历
- 命令注入
- 扫描工具识别

**使用示例**：
```python
from app.middleware import RequestValidatorMiddleware

app.add_middleware(
    RequestValidatorMiddleware,
    enable_sql_injection_check=True,
    enable_xss_check=True,
    enable_path_traversal_check=True,
    enable_command_injection_check=True,
    log_suspicious_requests=True,
    # 生产环境建议按需开启请求体扫描，当前默认关闭以避免大包体/文件上传误判
    inspect_body=False,
    inspect_body_max_length=None,  # 可选：设置上限后超出直接拒绝；默认为无限制
    ban_ip_on_detection=True,  # 命中规则后自动封禁 IP
    ban_ttl_seconds=900,  # 封禁 15 分钟，可通过 Redis 共享
    allowed_ips={"10.0.0.9"},  # 可选：跳过校验的白名单 IP（如内网健康检查）
)
```

**增强功能**：
- 可选解析请求体，对 POST/PUT/PATCH/DELETE 的 JSON 或表单内容做注入/XSS 检测；
- 支持命中规则后自动封禁来源 IP，默认使用内存存储，可传入 Redis 客户端以共享封禁名单；
- 返回体中追加 `reason` 字段，便于定位阻断原因（如 `sql_injection_in_body`、`ip_blocked`）。
- 支持白名单 IP / 路径前缀跳过检测；扫描请求体时可限制最大大小并仅处理文本类 Content-Type，降低 DoS 风险。
- 可通过环境变量 `ENABLE_SECURITY_MIDDLEWARE` 显式开启/关闭整组安全中间件（默认跟随 `APP_ENV=production`）。

## 测试

运行安全中间件测试：

```bash
pytest backend/tests/test_security_middleware.py -v
```

## 相关文档

- [安全加固指南](../../../docs/backend/security-hardening.md)
- [API 文档](../../../docs/backend/API_Documentation.md)

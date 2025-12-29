# CLI 配置 API 文档

## 概述

提供动态生成 CLI 配置脚本的功能，支持 Claude CLI、Codex CLI、Gemini CLI 在 Windows、macOS、Linux 平台的一键配置。

## 端点

### 1. 获取安装脚本

**端点**: `GET /api/v1/cli/install`

**描述**: 动态生成 CLI 配置脚本，用户可通过 `curl | bash` 或 `irm | iex` 方式直接执行。脚本会在终端提示输入密钥（不回显），避免把密钥拼进 URL。

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| client | string | 是 | CLI 客户端类型：`claude` / `codex` / `gemini` |
| platform | string | 是 | 操作系统平台：`windows`、`mac` 或 `linux` |
| url | string | 否 | API 服务器地址（默认使用环境变量 `API_BASE_URL`） |

**使用示例**:

```bash
# macOS/Linux - Claude CLI
curl -fsSL "https://your-domain.com/api/v1/cli/install?client=claude&platform=mac" | bash

# macOS/Linux - Codex CLI
curl -fsSL "https://your-domain.com/api/v1/cli/install?client=codex&platform=linux" | bash

# macOS/Linux - Gemini CLI
curl -fsSL "https://your-domain.com/api/v1/cli/install?client=gemini&platform=linux" | bash

# Windows - Claude CLI (PowerShell)
irm "https://your-domain.com/api/v1/cli/install?client=claude&platform=windows" | iex
```

**响应**: 返回可执行的 Shell 脚本（Bash 或 PowerShell）

**配置文件位置**:

- **Claude Code CLI** (用户级配置):
  - macOS/Linux: `~/.claude/settings.json`
  - Windows: `C:/Users/你的用户名/.claude/settings.json`

- **Codex CLI** (用户级配置):
  - macOS/Linux: `~/.codex/auth.json` 和 `~/.codex/config.toml`
  - Windows: `C:/Users/你的用户名/.codex/auth.json` 和 `C:/Users/你的用户名/.codex/config.toml`

- **Gemini CLI** (用户级配置):
  - macOS/Linux: `~/.gemini/.env`
  - Windows: `C:/Users/你的用户名/.gemini/.env`

**注意**: Windows 下路径使用正斜杠 `/` 而非反斜杠 `\`

**配置文件格式**:

**Claude Code CLI** (`settings.json`):
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
    "ANTHROPIC_BASE_URL": "https://your-domain.com"
  }
}
```

**Codex CLI**:

`auth.json`:
```json
{
  "OPENAI_API_KEY": "your-api-key"
}
```

`config.toml`:
```toml
model_provider = "custom_provider"

[model_providers.custom_provider]
name = "custom_provider"
base_url = "https://your-domain.com"
wire_api = "responses"
requires_openai_auth = true
```

**Gemini CLI** (`~/.gemini/.env`):
```bash
GEMINI_API_KEY="your-gemini-api-key"
```

**配置合并策略**:

脚本会智能处理现有配置：
- **Claude Code CLI**: 只更新 `env.ANTHROPIC_AUTH_TOKEN` 和 `env.ANTHROPIC_BASE_URL` 字段
- **Codex CLI**: 更新 `auth.json`，并在 `config.toml` 中追加新的 provider 配置
- **Gemini CLI**: 只更新/追加 `.env` 中的 `GEMINI_API_KEY` 行
- 保留其他已有配置（如主题、快捷键、MCP 服务器等）
- 如果配置文件不存在，创建新的配置文件

---

### 2. 获取安装命令

**端点**: `GET /api/v1/cli/install-command`

**描述**: 返回格式化的安装命令，供前端界面展示。

**查询参数**: 与 `/api/v1/cli/install` 相同（不包含 `key`）

**响应示例**:

```json
{
  "client": "claude",
  "platform": "mac",
  "command": "curl -fsSL \"https://your-domain.com/api/v1/cli/install?client=claude&platform=mac&url=https%3A%2F%2Fyour-domain.com\" | bash",
  "script_url": "https://your-domain.com/api/v1/cli/install?client=claude&platform=mac&url=https%3A%2F%2Fyour-domain.com"
}
```

---

### 3. 获取 CLI 配置元信息（需登录）

**端点**: `GET /api/v1/cli/config/{api_key_id}`

**描述**: 返回生成安装命令所需的网关 URL 与 API Key 元信息（名称/前缀）。该接口用于前端弹窗展示与提示用户填写完整密钥。

**鉴权**: 需要 JWT 访问令牌（与用户管理/密钥管理接口一致）。

**请求头**:

| Header | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | `Bearer <access_token>` |

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| api_key_id | uuid | 是 | API Key 的 ID |

**响应示例**:

```json
{
  "api_url": "https://your-domain.com",
  "key_name": "my-key",
  "key_prefix": "timeline****"
}
```

**重要说明**:

- 系统数据库仅保存 `key_hash/key_prefix`，不会存储完整 API Key，因此该接口不会（也无法）返回完整 `api_key` 字段。
- 如用户遗失完整 API Key，请在“API 密钥管理”中重新创建新的 API Key。

---

## 安全考虑

1. **密钥避免出现在 URL/日志**:
   - 安装命令不再包含密钥参数，脚本会在终端交互式提示输入（不回显）。
   - 建议使用 HTTPS，避免中间人攻击。

2. **配置文件权限**:
   - Unix 系统上配置文件权限设置为 `600`（仅所有者可读写）
   - Windows 系统存储在用户目录下

3. **密钥有效性**:
   - 网关不会在 `/api/v1/cli/install` 中接收或校验明文密钥；脚本会进行最小长度检查，实际有效性由 CLI 调用时验证。

---

## 错误处理

**422 Unprocessable Entity**（缺少必填参数或参数值不合法）:

**401 Unauthorized**（/config 需要登录）:
```json
{
  "detail": "Missing Authorization or X-Auth-Token header"
}
```

**404 Not Found**（/config 无权访问或不存在）:
```json
{
  "detail": "API Key 不存在或无权访问"
}
```

**常见错误**:
- API Key 格式不正确（长度过短）
- 缺少必填参数
- 不支持的 client 或 platform 值

---

## 前端集成

前端可使用 `CliConfigDialog` 组件展示配置界面（弹窗会先拉取 `api_url/key_prefix`，并提示用户在终端按脚本提示输入完整 API Key）：

```tsx
import { CliConfigDialog } from "@/components/dashboard/cli-config-dialog"

<CliConfigDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  apiKeyId={apiKeyId}
/>
```

组件功能：
- 选择 CLI 客户端（Claude/Codex）
- 选择操作系统平台
- 自动生成安装命令
- 一键复制命令
- 显示使用说明

---

## 测试

使用测试脚本验证功能：

```bash
# 设置测试环境
export API_URL=http://localhost:8000
export API_KEY=test-key-12345

# 运行测试
bash scripts/test_cli_config.sh
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| API_BASE_URL | API 服务器基础 URL | `http://localhost:8000` |

在 `.env` 文件中配置：

```bash
API_BASE_URL=https://your-domain.com
```

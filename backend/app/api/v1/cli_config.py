"""
CLI 配置脚本动态生成端点
为 Claude CLI、Codex CLI、Gemini CLI 提供一键配置脚本
"""
import os
import shlex
from typing import Literal
from uuid import UUID
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.deps import get_db
from app.jwt_auth import AuthenticatedUser, require_jwt_token

router = APIRouter(prefix="/api/v1/cli", tags=["CLI Configuration"])


def generate_claude_config_script(
    api_url: str,
    platform: Literal["windows", "mac", "linux"]
) -> str:
    """生成 Claude Code CLI 配置脚本（用户级配置）"""

    safe_api_url_bash = shlex.quote(api_url)
    safe_api_url_ps = api_url.replace("'", "''")

    if platform == "windows":
        # PowerShell 脚本
        # Windows 路径: C:/Users/用户名/.claude (使用正斜杠)
        return f"""# Claude Code CLI 配置脚本 (Windows)
Write-Host "正在配置 Claude Code CLI..." -ForegroundColor Green

# Windows 下使用正斜杠路径: C:/Users/用户名/.claude
$configDir = "$env:USERPROFILE/.claude" -replace '\\\\', '/'
$configFile = "$configDir/settings.json"
$apiUrl = '{safe_api_url_ps}'

# 输入 API Key（不回显）
$secureApiKey = Read-Host "请输入 API Key（不会回显）" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureApiKey)
$apiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if (-not $apiKey -or $apiKey.Length -lt 10) {{
    Write-Host "❌ 无效的 API Key（长度过短）" -ForegroundColor Red
    exit 1
}}

# 创建配置目录
if (!(Test-Path $configDir)) {{
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "已创建配置目录: $configDir" -ForegroundColor Green
}}

# 读取现有配置（如果存在）
$config = @{{}}
if (Test-Path $configFile) {{
    try {{
        $config = Get-Content $configFile -Raw | ConvertFrom-Json -AsHashtable
        Write-Host "检测到现有配置，将合并更新..." -ForegroundColor Yellow
    }} catch {{
        Write-Host "现有配置文件格式错误，将创建新配置..." -ForegroundColor Yellow
        $config = @{{}}
    }}
}}

# 确保 env 对象存在
if (-not $config.ContainsKey("env")) {{
    $config["env"] = @{{}}
}}

# 更新 env 中的 API 配置
$config["env"]["ANTHROPIC_AUTH_TOKEN"] = $apiKey
$config["env"]["ANTHROPIC_BASE_URL"] = $apiUrl

# 写入配置
$config | ConvertTo-Json -Depth 10 | Set-Content -Path $configFile -Encoding UTF8

Write-Host "✓ Claude Code CLI 配置完成！" -ForegroundColor Green
Write-Host "配置文件位置: $configFile" -ForegroundColor Cyan
Write-Host "已更新字段: env.ANTHROPIC_AUTH_TOKEN, env.ANTHROPIC_BASE_URL" -ForegroundColor Cyan
"""
    else:
        # Bash 脚本 (Mac/Linux)
        return f"""#!/bin/bash
# Claude Code CLI 配置脚本 ({platform.upper()})

	set -e

	echo "正在配置 Claude Code CLI..."

	CONFIG_DIR="$HOME/.claude"
	CONFIG_FILE="$CONFIG_DIR/settings.json"
	API_URL={safe_api_url_bash}

	read -r -s -p "请输入 API Key（不会回显）: " API_KEY
	echo
	if [ -z "$API_KEY" ] || [ "${{#API_KEY}}" -lt 10 ]; then
	    echo "❌ 无效的 API Key（长度过短）"
	    exit 1
	fi

	# 创建配置目录
	mkdir -p "$CONFIG_DIR"

# 读取现有配置并合并更新
if [ -f "$CONFIG_FILE" ]; then
    echo "检测到现有配置，将合并更新..."
    # 使用 jq 合并配置（如果没有 jq，则使用 Python）
	    if command -v jq &> /dev/null; then
	        # 使用 jq 合并 env 对象
	        jq --arg token "$API_KEY" --arg url "$API_URL" \\
	           '.env.ANTHROPIC_AUTH_TOKEN = $token | .env.ANTHROPIC_BASE_URL = $url' \\
	           "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
	    elif command -v python3 &> /dev/null; then
	        # 使用 Python 合并
	        API_KEY="$API_KEY" API_URL="$API_URL" python3 << 'PYTHON_SCRIPT'
	import json
	import os

config_file = os.path.expanduser("~/.claude/settings.json")
try:
    with open(config_file, 'r') as f:
        config = json.load(f)
except:
    config = {{}}

# 确保 env 对象存在
if 'env' not in config:
    config['env'] = {{}}

	config['env']['ANTHROPIC_AUTH_TOKEN'] = os.environ.get("API_KEY", "")
	config['env']['ANTHROPIC_BASE_URL'] = os.environ.get("API_URL", "")

with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)
PYTHON_SCRIPT
	    else
	        # 如果没有 jq 或 python，直接覆盖（保留警告）
	        echo "警告: 未找到 jq 或 python3，将创建新配置文件（可能覆盖现有配置）"
	        cat > "$CONFIG_FILE" << EOF
	{{
	  "env": {{
	    "ANTHROPIC_AUTH_TOKEN": "$API_KEY",
	    "ANTHROPIC_BASE_URL": "$API_URL"
	  }}
	}}
	EOF
	    fi
	else
	    # 创建新配置
	    cat > "$CONFIG_FILE" << EOF
	{{
	  "env": {{
	    "ANTHROPIC_AUTH_TOKEN": "$API_KEY",
	    "ANTHROPIC_BASE_URL": "$API_URL"
	  }}
	}}
	EOF
	fi

chmod 600 "$CONFIG_FILE"

echo "✓ Claude Code CLI 配置完成！"
echo "配置文件位置: $CONFIG_FILE"
echo "已更新字段: env.ANTHROPIC_AUTH_TOKEN, env.ANTHROPIC_BASE_URL"
"""


def generate_codex_config_script(
    api_url: str,
    platform: Literal["windows", "mac", "linux"]
) -> str:
    """生成 Codex CLI 配置脚本（用户级配置）
    
    Codex 使用两个文件：
    - auth.json: 存储 OPENAI_API_KEY
    - config.toml: 存储 model_providers 配置
    """

    # 从 URL 中提取 provider 名称（简化处理）
    provider_name = "custom_provider"
    safe_api_url_ps = api_url.replace("'", "''")
    safe_api_url_toml = api_url.replace('"', '\\"')

    if platform == "windows":
        # PowerShell 脚本
        # Windows 路径: C:/Users/用户名/.codex (使用正斜杠)
        return f"""# Codex CLI 配置脚本 (Windows)
Write-Host "正在配置 Codex CLI..." -ForegroundColor Green

	# Windows 下使用正斜杠路径: C:/Users/用户名/.codex
	$configDir = "$env:USERPROFILE/.codex" -replace '\\\\', '/'
	$authFile = "$configDir/auth.json"
	$configFile = "$configDir/config.toml"
	$apiUrl = '{safe_api_url_ps}'

	# 输入 API Key（不回显）
	$secureApiKey = Read-Host "请输入 API Key（不会回显）" -AsSecureString
	$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureApiKey)
	$apiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
	[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

	if (-not $apiKey -or $apiKey.Length -lt 10) {{
	    Write-Host "❌ 无效的 API Key（长度过短）" -ForegroundColor Red
	    exit 1
	}}

# 创建配置目录
if (!(Test-Path $configDir)) {{
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "已创建配置目录: $configDir" -ForegroundColor Green
}}

	# 更新 auth.json
	$auth = @{{
	    "OPENAI_API_KEY" = $apiKey
	}}
	$auth | ConvertTo-Json | Set-Content -Path $authFile -Encoding UTF8

Write-Host "✓ 已更新 auth.json" -ForegroundColor Green

# 更新 config.toml（追加 provider 配置）
$providerConfig = @"

	[model_providers.{provider_name}]
	name = "{provider_name}"
	base_url = "$apiUrl"
	wire_api = "responses"
	requires_openai_auth = true
	"@

if (Test-Path $configFile) {{
    # 检查是否已存在该 provider
    $content = Get-Content $configFile -Raw
    if ($content -notmatch "\\[model_providers\\.{provider_name}\\]") {{
        Add-Content -Path $configFile -Value $providerConfig
        Write-Host "✓ 已添加 provider 配置到 config.toml" -ForegroundColor Green
    }} else {{
        Write-Host "⚠ Provider {provider_name} 已存在于 config.toml，请手动更新" -ForegroundColor Yellow
    }}
}} else {{
    # 创建新的 config.toml
    $newConfig = @"
model_provider = "{provider_name}"
$providerConfig
"@
    Set-Content -Path $configFile -Value $newConfig -Encoding UTF8
    Write-Host "✓ 已创建 config.toml" -ForegroundColor Green
}}

Write-Host "✓ Codex CLI 配置完成！" -ForegroundColor Green
Write-Host "配置文件位置:" -ForegroundColor Cyan
Write-Host "  - $authFile" -ForegroundColor Cyan
Write-Host "  - $configFile" -ForegroundColor Cyan
Write-Host "提示: 请在 config.toml 中设置 model_provider = `"{provider_name}`"" -ForegroundColor Yellow
"""
    else:
        # Bash 脚本 (Mac/Linux)
        return f"""#!/bin/bash
# Codex CLI 配置脚本 ({platform.upper()})

set -e

echo "正在配置 Codex CLI..."

	CONFIG_DIR="$HOME/.codex"
	AUTH_FILE="$CONFIG_DIR/auth.json"
	CONFIG_FILE="$CONFIG_DIR/config.toml"

	read -r -s -p "请输入 API Key（不会回显）: " API_KEY
	echo
		if [ -z "$API_KEY" ] || [ "${{#API_KEY}}" -lt 10 ]; then
		    echo "❌ 无效的 API Key（长度过短）"
		    exit 1
		fi

	# 创建配置目录
	mkdir -p "$CONFIG_DIR"

	# 更新 auth.json
	printf '{{\n  "OPENAI_API_KEY": "%s"\n}}\n' "$API_KEY" > "$AUTH_FILE"

	chmod 600 "$AUTH_FILE"
	echo "✓ 已更新 auth.json"

# 更新 config.toml（追加 provider 配置）
	PROVIDER_CONFIG='
	[model_providers.{provider_name}]
	name = "{provider_name}"
	base_url = "{safe_api_url_toml}"
	wire_api = "responses"
	requires_openai_auth = true
	'

if [ -f "$CONFIG_FILE" ]; then
    # 检查是否已存在该 provider
    if ! grep -q "\\[model_providers\\.{provider_name}\\]" "$CONFIG_FILE"; then
        echo "$PROVIDER_CONFIG" >> "$CONFIG_FILE"
        echo "✓ 已添加 provider 配置到 config.toml"
    else
        echo "⚠ Provider {provider_name} 已存在于 config.toml，请手动更新"
    fi
else
    # 创建新的 config.toml
    cat > "$CONFIG_FILE" << 'EOF'
model_provider = "{provider_name}"

	[model_providers.{provider_name}]
	name = "{provider_name}"
	base_url = "{safe_api_url_toml}"
	wire_api = "responses"
	requires_openai_auth = true
	EOF
    chmod 600 "$CONFIG_FILE"
    echo "✓ 已创建 config.toml"
fi

echo "✓ Codex CLI 配置完成！"
echo "配置文件位置:"
echo "  - $AUTH_FILE"
echo "  - $CONFIG_FILE"
	echo "提示: 请在 config.toml 中设置 model_provider = \\"{provider_name}\\""
"""


def generate_gemini_config_script(platform: Literal["windows", "mac", "linux"]) -> str:
    """
    生成 Gemini CLI 配置脚本（用户级配置）。

    该脚本将把用户输入的 GEMINI_API_KEY 写入 ~/.gemini/.env（Windows: %USERPROFILE%/.gemini/.env），
    并保留该 .env 文件中的其他配置行。
    """

    if platform == "windows":
        return r"""# Gemini CLI 配置脚本 (Windows)
Write-Host "正在配置 Gemini CLI..." -ForegroundColor Green

# Windows 下使用正斜杠路径: C:/Users/用户名/.gemini
$configDir = "$env:USERPROFILE/.gemini" -replace '\\', '/'
$envFile = "$configDir/.env"

# 输入 Gemini API Key（不回显）
$secureApiKey = Read-Host "请输入 Gemini API Key（不会回显）" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureApiKey)
$apiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if (-not $apiKey -or $apiKey.Length -lt 10) {
    Write-Host "❌ 无效的 Gemini API Key（长度过短）" -ForegroundColor Red
    exit 1
}

if (!(Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "已创建配置目录: $configDir" -ForegroundColor Green
}

$lines = @()
if (Test-Path $envFile) {
    $lines = Get-Content $envFile
}

$out = New-Object System.Collections.Generic.List[string]
$found = $false
foreach ($line in $lines) {
    if ($line -match '^\s*GEMINI_API_KEY\s*=') {
        $out.Add("GEMINI_API_KEY=`"$apiKey`"")
        $found = $true
    } else {
        $out.Add($line)
    }
}

if (-not $found) {
    $out.Add("GEMINI_API_KEY=`"$apiKey`"")
}

$out | Set-Content -Path $envFile -Encoding UTF8

Write-Host "✓ Gemini CLI 配置完成！" -ForegroundColor Green
Write-Host "配置文件位置: $envFile" -ForegroundColor Cyan
Write-Host "提示: 运行 gemini 后选择 'Use Gemini API key'（如有提示）" -ForegroundColor Yellow
"""

    return r"""#!/bin/bash
# Gemini CLI 配置脚本 (MAC/LINUX)

set -e

echo "正在配置 Gemini CLI..."

CONFIG_DIR="$HOME/.gemini"
ENV_FILE="$CONFIG_DIR/.env"

read -r -s -p "请输入 Gemini API Key（不会回显）: " GEMINI_API_KEY
echo
if [ -z "$GEMINI_API_KEY" ] || [ "${#GEMINI_API_KEY}" -lt 10 ]; then
    echo "❌ 无效的 Gemini API Key（长度过短）"
    exit 1
fi

mkdir -p "$CONFIG_DIR"
touch "$ENV_FILE"

# 只更新/追加 GEMINI_API_KEY 行，其它配置保留
awk -v key="$GEMINI_API_KEY" '
BEGIN { found = 0 }
/^[[:space:]]*GEMINI_API_KEY[[:space:]]*=/ {
  print "GEMINI_API_KEY=\"" key "\""
  found = 1
  next
}
{ print }
END {
  if (!found) print "GEMINI_API_KEY=\"" key "\""
}
' "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"

chmod 600 "$ENV_FILE"

echo "✓ Gemini CLI 配置完成！"
echo "配置文件位置: $ENV_FILE"
echo "提示: 运行 gemini 后选择 'Use Gemini API key'（如有提示）"
"""


@router.get("/install", response_class=PlainTextResponse)
async def get_install_script(
    client: Literal["claude", "codex", "gemini"] = Query(..., description="CLI 客户端类型"),
    platform: Literal["windows", "mac", "linux"] = Query(..., description="操作系统平台"),
    url: str = Query(None, description="API URL (可选，默认使用当前服务器)")
):
    """
    动态生成 CLI 配置脚本
    
    使用方式:
    - Mac/Linux: curl "https://your-domain.com/api/v1/cli/install?client=claude&platform=mac" | bash
    - Windows: irm "https://your-domain.com/api/v1/cli/install?client=claude&platform=windows" | iex
    """

    # 如果没有提供 URL，使用环境变量或默认值
    if not url:
        url = os.getenv("API_BASE_URL", "http://localhost:8000")

    # 生成对应的配置脚本
    if client == "claude":
        script = generate_claude_config_script(url, platform)
    elif client == "codex":
        script = generate_codex_config_script(url, platform)
    else:
        script = generate_gemini_config_script(platform)

    return script


@router.get("/install-command")
async def get_install_command(
    client: Literal["claude", "codex", "gemini"] = Query(..., description="CLI 客户端类型"),
    platform: Literal["windows", "mac", "linux"] = Query(..., description="操作系统平台"),
    url: str = Query(None, description="API URL (可选)")
):
    """
    生成安装命令（供前端展示）
    """

    if not url:
        url = os.getenv("API_BASE_URL", "http://localhost:8000")

    params = {"client": client, "platform": platform, "url": url}
    script_url = f"{url}/api/v1/cli/install?{urlencode(params)}"

    if platform == "windows":
        command = f'irm "{script_url}" | iex'
    else:
        command = f'curl -fsSL "{script_url}" | bash'

    return {
        "client": client,
        "platform": platform,
        "command": command,
        "script_url": script_url
    }


@router.get("/config/{api_key_id}")
async def get_cli_config_info(
    api_key_id: UUID,
    current_user: AuthenticatedUser = Depends(require_jwt_token),
    db: Session = Depends(get_db),
):
    """
    获取 CLI 配置所需的信息（API Key 和 URL）
    
    需要用户认证，只能获取自己的 API Key 信息
    """
    from app.models import APIKey as APIKeyModel
    from app.models import GatewayConfig as GatewayConfigModel

    # 查询 API Key
    api_key = (
        db.query(APIKeyModel)
        .filter(
            APIKeyModel.id == api_key_id,
            APIKeyModel.user_id == UUID(current_user.id),
        )
        .first()
    )

    if not api_key:
        raise HTTPException(status_code=404, detail="API Key 不存在或无权访问")

    # 从数据库获取 gateway config 中的 api_base_url
    gateway_config = db.query(GatewayConfigModel).first()
    if gateway_config is not None:
        api_url = gateway_config.api_base_url
    else:
        # 如果数据库中没有配置，使用环境变量作为后备
        api_url = os.getenv("API_BASE_URL", "http://localhost:8000")

    # 注意：系统不会（也无法从 hash 中）恢复完整 API Key；
    # 仅返回 key_prefix 用于提示用户填写完整密钥。
    return {
        "api_url": api_url,
        "key_name": api_key.name,
        "key_prefix": api_key.key_prefix,
    }

from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from app.settings import settings


def _is_absolute_url(value: str) -> bool:
    """Return True if the string already represents an absolute URL."""

    if value.startswith("//"):
        return True
    parsed = urlparse(value)
    return bool(parsed.scheme and parsed.netloc)


def _is_root_relative_path(value: str) -> bool:
    """
    判断是否为以 / 开头的站点内相对路径，例如 /media/avatars/xxx.png。

    对于这类值，我们认为前端可以直接使用，不再二次拼接前缀。
    """

    return value.startswith("/")


def _normalize_base_url(value: str | None) -> str:
    """
    去除基础 URL 末尾的斜杠，避免后续重复的双斜杠。
    """

    if not value:
        return ""
    return value.rstrip("/")


def _resolve_api_base_url(request_base_url: str | None) -> str:
    """
    计算用于拼接头像 URL 的基础域名。

    - 如果调用方提供了请求实际的 base_url，则优先使用该值；
      这样在未配置 GATEWAY_API_BASE_URL 时，也能返回匹配当前访问域名的完整 URL。
    - 否则回退到配置项 settings.gateway_api_base_url。
    """

    if request_base_url:
        return _normalize_base_url(request_base_url)
    return _normalize_base_url(settings.gateway_api_base_url)


def build_avatar_url(
    avatar_value: str | None,
    *,
    request_base_url: str | None = None,
) -> str | None:
    """
    根据数据库中存储的 avatar 值构造对前端友好的访问 URL。

    设计约定：
    - 数据库存储的是「key」或相对路径，例如：avatars/<user_id>/<uuid>.png
    - 头像存储模式由 AVATAR_STORAGE_MODE 控制：
      - OSS/S3 模式：返回 <AVATAR_OSS_BASE_URL>/<key>（用于前端直链）；
      - 本地模式：返回 <AVATAR_LOCAL_BASE_URL>/<key>（默认 /media/avatars）。

    兼容策略：
    - 如果 avatar_value 本身已经是完整 URL（http/https 或 // 开头），直接返回；
    - 如果 avatar_value 是以 / 开头的站点相对路径，也直接返回；
      这样可以兼容已有数据或手动配置的头像 URL。
    """

    if not avatar_value:
        return None

    # 已经是完整 URL，直接透传
    if _is_absolute_url(avatar_value):
        return avatar_value

    # 形如 /media/avatars/xxx.png 的路径，视为网关下的相对路径，
    # 需要补上 GATEWAY_API_BASE_URL 前缀，方便前端直接使用完整 URL。
    if _is_root_relative_path(avatar_value):
        base = _resolve_api_base_url(request_base_url)
        return f"{base}{avatar_value}"

    key = avatar_value.lstrip("/")

    storage_mode = str(getattr(settings, "avatar_storage_mode", "auto") or "auto").strip().lower()
    env = str(getattr(settings, "environment", "") or "").strip().lower()

    def _avatar_oss_is_configured() -> bool:
        required = (
            getattr(settings, "avatar_oss_endpoint", None) or getattr(settings, "oss_endpoint", None) or getattr(settings, "image_oss_endpoint", None),
            getattr(settings, "avatar_oss_bucket", None) or getattr(settings, "oss_public_bucket", None),
            getattr(settings, "avatar_oss_access_key_id", None) or getattr(settings, "oss_access_key_id", None) or getattr(settings, "image_oss_access_key_id", None),
            getattr(settings, "avatar_oss_access_key_secret", None) or getattr(settings, "oss_access_key_secret", None) or getattr(settings, "image_oss_access_key_secret", None),
        )
        return all(bool(str(v or "").strip()) for v in required)

    use_oss = storage_mode == "oss" or (storage_mode == "auto" and env == "production" and _avatar_oss_is_configured())

    if use_oss:
        base = str(settings.avatar_oss_base_url or settings.oss_public_base_url or "").strip().rstrip("/")
        if base:
            return f"{base}/{key}"
        # OSS 模式但未配置可访问域名时，宁愿不返回（前端显示默认头像），避免返回错误 URL。
        return None

    # 默认走本地静态目录：<GATEWAY_API_BASE_URL>/<AVATAR_LOCAL_BASE_URL>/<key>
    base_path = settings.avatar_local_base_url or "/media/avatars"
    if not base_path.startswith("/"):
        base_path = "/" + base_path
    base_path = base_path.rstrip("/")
    api_base = _resolve_api_base_url(request_base_url)
    return f"{api_base}{base_path}/{key}"


def get_avatar_file_path(avatar_key: str) -> Path:
    """
    将头像 key 映射到本地磁盘路径。

    - 基础目录由 AVATAR_LOCAL_DIR 控制，默认 backend/media/avatars。
    - key 可以包含子目录，例如 <user_id>/<uuid>.png。
    """

    base_dir = Path(settings.avatar_local_dir)
    return base_dir / avatar_key.lstrip("/")


def ensure_avatar_storage_dir() -> Path:
    """
    确保本地头像存储目录存在，并返回该目录的 Path。

    该函数可在应用启动时调用（例如挂载 StaticFiles 之前），
    避免因为目录不存在导致 FastAPI 启动失败。
    """

    base_dir = Path(settings.avatar_local_dir)
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


__all__ = [
    "build_avatar_url",
    "ensure_avatar_storage_dir",
    "get_avatar_file_path",
]

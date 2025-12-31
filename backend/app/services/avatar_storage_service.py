from __future__ import annotations

from typing import Literal

import anyio

from app.logging_config import logger
from app.services.avatar_service import get_avatar_file_path
from app.settings import settings


class AvatarStorageNotConfigured(RuntimeError):
    pass


def _resolve_avatar_base_url() -> str:
    return str(settings.avatar_oss_base_url or settings.oss_public_base_url or "").strip()


def _resolve_avatar_bucket() -> str:
    return str(settings.avatar_oss_bucket or settings.oss_public_bucket or "").strip()


def _resolve_avatar_endpoint() -> str:
    # Backward-compat: if user only configured IMAGE_OSS_*, reuse it for avatar uploads.
    return str(settings.avatar_oss_endpoint or settings.oss_endpoint or settings.image_oss_endpoint or "").strip()


def _resolve_avatar_region() -> str:
    return str(settings.avatar_oss_region or settings.oss_region or settings.image_oss_region or "").strip()


def _resolve_avatar_access_key_id() -> str:
    return str(
        settings.avatar_oss_access_key_id
        or settings.oss_access_key_id
        or settings.image_oss_access_key_id
        or ""
    ).strip()


def _resolve_avatar_access_key_secret() -> str:
    return str(
        settings.avatar_oss_access_key_secret
        or settings.oss_access_key_secret
        or settings.image_oss_access_key_secret
        or ""
    ).strip()


def _avatar_oss_is_configured() -> bool:
    required = (
        _resolve_avatar_endpoint(),
        _resolve_avatar_bucket(),
        _resolve_avatar_access_key_id(),
        _resolve_avatar_access_key_secret(),
    )
    return all(bool(str(v or "").strip()) for v in required)


def get_effective_avatar_storage_mode() -> Literal["local", "oss"]:
    mode = str(getattr(settings, "avatar_storage_mode", "auto") or "auto").strip().lower()
    if mode == "local":
        return "local"
    if mode == "oss":
        return "oss"
    if mode != "auto":
        logger.warning("Unknown AVATAR_STORAGE_MODE=%s; fallback to auto", mode)

    env = str(getattr(settings, "environment", "") or "").strip().lower()
    if env != "production":
        return "local"
    return "oss" if _avatar_oss_is_configured() else "local"


def _avatar_backend_kind() -> Literal["aliyun_oss", "s3"]:
    # Prefer shared provider if shared endpoint is configured.
    if str(settings.oss_endpoint or "").strip():
        kind = str(settings.oss_provider or settings.avatar_storage_provider or "aliyun_oss").strip().lower()
    elif str(settings.avatar_oss_endpoint or "").strip():
        kind = str(settings.avatar_storage_provider or "aliyun_oss").strip().lower()
    elif str(settings.image_oss_endpoint or "").strip():
        kind = str(settings.oss_provider or settings.image_storage_provider or settings.avatar_storage_provider or "aliyun_oss").strip().lower()
    else:
        kind = str(settings.avatar_storage_provider or "aliyun_oss").strip().lower()
    if kind not in ("aliyun_oss", "s3"):
        raise AvatarStorageNotConfigured(f"unsupported storage provider: {kind}")
    return kind  # type: ignore[return-value]


def _create_oss_bucket():
    if not _avatar_oss_is_configured():
        raise AvatarStorageNotConfigured("AVATAR_OSS_* 未配置，无法启用 OSS 头像存储")

    try:
        import oss2  # type: ignore
    except ImportError as exc:  # pragma: no cover - import guard
        raise AvatarStorageNotConfigured(
            "缺少依赖 oss2，请安装后端依赖（backend/pyproject.toml）。"
        ) from exc

    endpoint = _resolve_avatar_endpoint()
    bucket_name = _resolve_avatar_bucket()
    auth = oss2.Auth(
        _resolve_avatar_access_key_id(),
        _resolve_avatar_access_key_secret(),
    )
    return oss2.Bucket(auth, endpoint, bucket_name)


def _create_s3_client():
    if not _avatar_oss_is_configured():
        raise AvatarStorageNotConfigured("AVATAR_OSS_* 未配置，无法启用 S3/R2 头像存储")
    try:
        import boto3  # type: ignore
        from botocore.config import Config  # type: ignore
    except ImportError as exc:  # pragma: no cover - import guard
        raise AvatarStorageNotConfigured(
            "缺少依赖 boto3，请安装后端依赖（backend/pyproject.toml）。"
        ) from exc

    session = boto3.session.Session()
    return session.client(
        "s3",
        endpoint_url=_resolve_avatar_endpoint() or None,
        region_name=_resolve_avatar_region() or None,
        aws_access_key_id=_resolve_avatar_access_key_id() or None,
        aws_secret_access_key=_resolve_avatar_access_key_secret() or None,
        config=Config(signature_version="s3v4"),
    )


async def store_avatar_bytes(
    data: bytes,
    *,
    avatar_key: str,
    content_type: str,
) -> None:
    if not data:
        raise ValueError("empty avatar bytes")
    if not avatar_key or not str(avatar_key).strip():
        raise ValueError("empty avatar key")

    mode = get_effective_avatar_storage_mode()
    normalized_key = str(avatar_key).lstrip("/")

    def _put_local() -> None:
        path = get_avatar_file_path(normalized_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def _put_oss() -> None:
        bucket = _create_oss_bucket()
        bucket.put_object(normalized_key, data, headers={"Content-Type": content_type})

    def _put_s3() -> None:
        client = _create_s3_client()
        client.put_object(
            Bucket=_resolve_avatar_bucket(),
            Key=normalized_key,
            Body=data,
            ContentType=str(content_type or "").strip() or "application/octet-stream",
        )

    if mode == "local":
        await anyio.to_thread.run_sync(_put_local)
        return

    if not _resolve_avatar_base_url():
        raise AvatarStorageNotConfigured(
            "启用 OSS/S3 头像存储时必须配置 AVATAR_OSS_BASE_URL（或 OSS_PUBLIC_BASE_URL）"
        )

    kind = _avatar_backend_kind()
    if kind == "aliyun_oss":
        await anyio.to_thread.run_sync(_put_oss)
    else:
        await anyio.to_thread.run_sync(_put_s3)


__all__ = [
    "AvatarStorageNotConfigured",
    "get_effective_avatar_storage_mode",
    "store_avatar_bytes",
]

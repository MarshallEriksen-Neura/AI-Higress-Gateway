from __future__ import annotations

from typing import Literal

import anyio

from app.logging_config import logger
from app.services.avatar_service import get_avatar_file_path
from app.settings import settings


class AvatarStorageNotConfigured(RuntimeError):
    pass


def _avatar_oss_is_configured() -> bool:
    required = (
        settings.avatar_oss_endpoint,
        settings.avatar_oss_bucket,
        settings.avatar_oss_access_key_id,
        settings.avatar_oss_access_key_secret,
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

    endpoint = str(settings.avatar_oss_endpoint).strip()
    bucket_name = str(settings.avatar_oss_bucket).strip()
    auth = oss2.Auth(
        str(settings.avatar_oss_access_key_id).strip(),
        str(settings.avatar_oss_access_key_secret).strip(),
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
        endpoint_url=str(settings.avatar_oss_endpoint).strip() or None,
        region_name=str(settings.avatar_oss_region or "").strip() or None,
        aws_access_key_id=str(settings.avatar_oss_access_key_id).strip() or None,
        aws_secret_access_key=str(settings.avatar_oss_access_key_secret).strip() or None,
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
            Bucket=str(settings.avatar_oss_bucket).strip(),
            Key=normalized_key,
            Body=data,
            ContentType=str(content_type or "").strip() or "application/octet-stream",
        )

    if mode == "local":
        await anyio.to_thread.run_sync(_put_local)
        return

    if not str(settings.avatar_oss_base_url or "").strip():
        raise AvatarStorageNotConfigured("启用 OSS/S3 头像存储时必须配置 AVATAR_OSS_BASE_URL")

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


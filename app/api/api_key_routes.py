from __future__ import annotations

import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedAPIKey, require_api_key
from app.deps import get_db
from app.errors import bad_request, forbidden, not_found
from app.logging_config import logger
from app.redis_client import get_redis_client
from app.schemas import (
    APIKeyCreateRequest,
    APIKeyCreateResponse,
    APIKeyResponse,
    APIKeyUpdateRequest,
)
from app.services.api_key_cache import (
    build_cache_entry,
    cache_api_key,
    invalidate_cached_api_key,
)
from app.services.api_key_service import (
    APIKeyNameAlreadyExistsError,
    create_api_key,
    delete_api_key,
    get_api_key_by_id,
    list_api_keys_for_user,
    update_api_key,
)
from app.services.user_service import get_user_by_id

router = APIRouter(tags=["api-keys"])


def _ensure_can_manage(current: AuthenticatedAPIKey, target_user_id: UUID) -> None:
    if current.is_superuser:
        return
    if current.user_id != target_user_id:
        raise forbidden("无权管理其他用户的密钥")


def _ensure_user_exists(session: Session, user_id: UUID):
    user = get_user_by_id(session, user_id)
    if user is None:
        raise not_found(f"User {user_id} not found")
    return user


@router.get(
    "/users/{user_id}/api-keys",
    response_model=list[APIKeyResponse],
)
def list_api_keys_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
) -> list[APIKeyResponse]:
    user = _ensure_user_exists(db, user_id)
    _ensure_can_manage(current_key, user.id)

    keys = list_api_keys_for_user(db, user.id)
    return [APIKeyResponse.model_validate(item) for item in keys]


@router.post(
    "/users/{user_id}/api-keys",
    response_model=APIKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_api_key_endpoint(
    user_id: UUID,
    payload: APIKeyCreateRequest,
    db: Session = Depends(get_db),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
) -> APIKeyCreateResponse:
    user = _ensure_user_exists(db, user_id)
    _ensure_can_manage(current_key, user.id)

    try:
        api_key, token = create_api_key(db, user=user, payload=payload)
    except APIKeyNameAlreadyExistsError:
        raise bad_request("密钥名称已存在")
    _cache_api_key_sync(api_key)

    return APIKeyCreateResponse(
        **APIKeyResponse.model_validate(api_key).model_dump(),
        token=token,
    )


@router.put(
    "/users/{user_id}/api-keys/{key_id}",
    response_model=APIKeyResponse,
)
def update_api_key_endpoint(
    user_id: UUID,
    key_id: UUID,
    payload: APIKeyUpdateRequest,
    db: Session = Depends(get_db),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
) -> APIKeyResponse:
    user = _ensure_user_exists(db, user_id)
    _ensure_can_manage(current_key, user.id)

    api_key = get_api_key_by_id(db, key_id, user_id=user.id)
    if api_key is None:
        raise not_found(f"API key {key_id} not found")

    try:
        updated = update_api_key(db, api_key=api_key, payload=payload)
    except APIKeyNameAlreadyExistsError:
        raise bad_request("密钥名称已存在")
    _cache_api_key_sync(updated)

    return APIKeyResponse.model_validate(updated)


@router.delete(
    "/users/{user_id}/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_api_key_endpoint(
    user_id: UUID,
    key_id: UUID,
    db: Session = Depends(get_db),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
) -> None:
    user = _ensure_user_exists(db, user_id)
    _ensure_can_manage(current_key, user.id)

    api_key = get_api_key_by_id(db, key_id, user_id=user.id)
    if api_key is None:
        raise not_found(f"API key {key_id} not found")

    _invalidate_api_key_sync(api_key.key_hash)
    delete_api_key(db, api_key)


def _cache_api_key_sync(api_key) -> None:
    try:
        redis = get_redis_client()
        entry = build_cache_entry(api_key)
        asyncio.run(cache_api_key(redis, api_key.key_hash, entry))
    except Exception:  # pragma: no cover - logging best-effort
        logger.exception("Failed to cache API key %s", api_key.id)


def _invalidate_api_key_sync(key_hash: str) -> None:
    try:
        redis = get_redis_client()
        asyncio.run(invalidate_cached_api_key(redis, key_hash))
    except Exception:  # pragma: no cover - logging best-effort
        logger.exception("Failed to invalidate API key cache for %s", key_hash)


__all__ = ["router"]

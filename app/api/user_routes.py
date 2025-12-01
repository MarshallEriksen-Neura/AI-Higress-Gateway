from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedAPIKey, require_api_key
from app.deps import get_db, get_redis
from app.errors import bad_request, forbidden, not_found
from app.schemas import (
    UserCreateRequest,
    UserResponse,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)
from app.services.user_service import (
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
    create_user,
    get_user_by_id,
    set_user_active,
    update_user,
)
from app.services.api_key_cache import invalidate_cached_api_key

router = APIRouter(
    tags=["users"],
    dependencies=[Depends(require_api_key)],
)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user_endpoint(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Register a new user with hashed password storage."""

    try:
        user = create_user(db, payload)
    except UsernameAlreadyExistsError:
        raise bad_request("用户名已存在")
    except EmailAlreadyExistsError:
        raise bad_request("邮箱已被使用")
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: UUID,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update editable user profile fields and password."""

    user = get_user_by_id(db, user_id)
    if user is None:
        raise not_found(f"User {user_id} not found")

    try:
        updated = update_user(db, user, payload)
    except EmailAlreadyExistsError:
        raise bad_request("邮箱已被使用")
    return UserResponse.model_validate(updated)


async def _invalidate_user_api_keys(redis, key_hashes: list[str]) -> None:
    for key_hash in key_hashes:
        await invalidate_cached_api_key(redis, key_hash)


@router.put("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status_endpoint(
    user_id: UUID,
    payload: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
) -> UserResponse:
    """Allow superusers to禁用/恢复用户，立即撤销其 API 密钥缓存。"""

    if not current_key.is_superuser:
        raise forbidden("只有超级管理员可以封禁用户")

    user = get_user_by_id(db, user_id)
    if user is None:
        raise not_found(f"User {user_id} not found")

    updated, key_hashes = set_user_active(db, user, is_active=payload.is_active)
    await _invalidate_user_api_keys(redis, key_hashes)

    return UserResponse.model_validate(updated)


__all__ = ["router"]

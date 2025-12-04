"""
用户管理路由 - V2版本，使用JWT认证
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_redis
from app.errors import bad_request, forbidden, not_found
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.schemas import (
    UserCreateRequest,
    UserResponse,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)
from app.services.api_key_cache import invalidate_cached_api_key
from app.services.role_service import RoleCodeAlreadyExistsError, RoleService
from app.services.user_permission_service import UserPermissionService
from app.services.user_service import (
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
    create_user,
    get_user_by_id,
    set_user_active,
    update_user,
)

router = APIRouter(
    tags=["users"],
    dependencies=[Depends(require_jwt_token)],
)


DEFAULT_USER_ROLE_CODE = "default_user"


def _assign_default_role(db: Session, user_id: UUID) -> None:
    """为新用户分配默认角色（若不存在则自动创建）。"""

    service = RoleService(db)
    role = service.get_role_by_code(DEFAULT_USER_ROLE_CODE)
    if role is None:
        try:
            role = service.create_role(
                code=DEFAULT_USER_ROLE_CODE,
                name="默认用户",
                description="系统默认普通用户角色",
            )
        except RoleCodeAlreadyExistsError:
            # 并发场景下如果已经被其他进程创建，则重新查询
            role = service.get_role_by_code(DEFAULT_USER_ROLE_CODE)
    if role is None:
        return

    # 对于新用户，直接设置为该默认角色即可
    service.set_user_roles(user_id, [role.id])


def _build_user_response(db: Session, user_id: UUID) -> UserResponse:
    """聚合用户基础信息 + 角色 + 能力标记列表，构造 UserResponse。"""

    user = get_user_by_id(db, user_id)
    if user is None:
        raise not_found(f"User {user_id} not found")

    role_service = RoleService(db)
    perm_service = UserPermissionService(db)

    roles = role_service.get_user_roles(user.id)
    role_codes = [r.code for r in roles]
    # 只暴露关键能力布尔值，通过列表封装，细粒度权限仍由后端校验
    can_create_private_provider = perm_service.has_permission(
        user.id, "create_private_provider"
    )
    can_submit_shared_provider = perm_service.has_permission(
        user.id, "submit_shared_provider"
    )
    permission_flags = [
        {
            "key": "can_create_private_provider",
            "value": bool(can_create_private_provider),
        },
        {
            "key": "can_submit_shared_provider",
            "value": bool(can_submit_shared_provider),
        },
    ]

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        avatar=user.avatar,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        role_codes=role_codes,
        permission_flags=permission_flags,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user_endpoint(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> UserResponse:
    """注册一个新用户并存储哈希密码。"""

    try:
        user = create_user(db, payload)
    except UsernameAlreadyExistsError:
        raise bad_request("用户名已存在")
    except EmailAlreadyExistsError:
        raise bad_request("邮箱已被使用")

    # 为新用户分配默认角色
    _assign_default_role(db, user.id)

    return _build_user_response(db, user.id)


@router.get("/users/me", response_model=UserResponse)
def get_current_user_endpoint(
    current_user: AuthenticatedUser = Depends(require_jwt_token),
    db: Session = Depends(get_db),
) -> UserResponse:
    """获取当前认证用户的信息。"""
    return _build_user_response(db, UUID(current_user.id))


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: UUID,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> UserResponse:
    """更新可编辑的用户资料字段和密码。"""
    
    # 检查权限：用户只能更新自己的信息，除非是超级用户
    if not current_user.is_superuser and current_user.id != str(user_id):
        raise forbidden("无权修改其他用户信息")

    user = get_user_by_id(db, user_id)
    if user is None:
        raise not_found(f"User {user_id} not found")

    try:
        updated = update_user(db, user, payload)
    except EmailAlreadyExistsError:
        raise bad_request("邮箱已被使用")
    return _build_user_response(db, updated.id)


async def _invalidate_user_api_keys(redis, key_hashes: list[str]) -> None:
    for key_hash in key_hashes:
        await invalidate_cached_api_key(redis, key_hash)


@router.put("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status_endpoint(
    user_id: UUID,
    payload: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> UserResponse:
    """允许超级用户禁用/恢复用户，立即撤销其 API 密钥缓存。"""

    if not current_user.is_superuser:
        raise forbidden("只有超级管理员可以封禁用户")

    user = get_user_by_id(db, user_id)
    if user is None:
        raise not_found(f"User {user_id} not found")

    updated, key_hashes = set_user_active(db, user, is_active=payload.is_active)
    await _invalidate_user_api_keys(redis, key_hashes)

    return _build_user_response(db, updated.id)


__all__ = ["router"]

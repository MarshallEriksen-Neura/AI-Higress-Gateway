from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.deps import get_db
from app.errors import bad_request, forbidden, not_found
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.schemas import (
    UserProviderCreateRequest,
    UserProviderResponse,
    UserProviderUpdateRequest,
    UserQuotaResponse,
)
from app.services.user_permission_service import UserPermissionService
from app.services.user_provider_service import (
    UserProviderNotFoundError,
    UserProviderServiceError,
    count_user_private_providers,
    create_private_provider,
    list_private_providers,
    update_private_provider,
)
from app.settings import settings

router = APIRouter(
    tags=["user-providers"],
    dependencies=[Depends(require_jwt_token)],
)


def _ensure_can_manage_user(current: AuthenticatedUser, target_user_id: UUID) -> None:
    if current.is_superuser:
        return
    if current.id != str(target_user_id):
        raise forbidden("无权管理其他用户的私有提供商")


@router.get(
    "/users/{user_id}/quota",
    response_model=UserQuotaResponse,
)
def get_user_quota_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> UserQuotaResponse:
    """
    获取指定用户的私有 Provider 配额信息。

    - 仅支持本人或超级管理员查询；
    - `private_provider_limit` 为展示用上限值；
    - 对于超级管理员或拥有 `unlimited_providers` 权限的用户，会返回 `is_unlimited=True`，
      此时 `private_provider_limit` 仅作为前端展示建议值，后端不会做硬性限制。
    """

    _ensure_can_manage_user(current_user, user_id)

    perm = UserPermissionService(db)
    raw_limit = perm.get_provider_limit(user_id)
    is_unlimited = raw_limit is None
    # 对于无限制用户，给出一个合理的展示上限，避免前端进度条失真
    display_limit = (
        settings.max_user_private_provider_limit
        if is_unlimited
        else int(raw_limit)
    )

    current_count = count_user_private_providers(db, user_id)

    return UserQuotaResponse(
        private_provider_limit=display_limit,
        private_provider_count=current_count,
        is_unlimited=is_unlimited,
    )


@router.post(
    "/users/{user_id}/private-providers",
    response_model=UserProviderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_private_provider_endpoint(
    user_id: UUID,
    payload: UserProviderCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> UserProviderResponse:
    """为指定用户创建一个私有提供商，仅该用户的 API Key 可选择使用。"""

    _ensure_can_manage_user(current_user, user_id)

    perm = UserPermissionService(db)
    if not perm.has_permission(user_id, "create_private_provider"):
        raise forbidden("当前用户未被授予创建私有提供商的权限")

    limit = perm.get_provider_limit(user_id)
    if limit is not None:
        current_count = count_user_private_providers(db, user_id)
        if current_count >= limit:
            raise forbidden(f"已达到私有提供商数量限制（{limit}）")

    try:
        provider = create_private_provider(db, user_id, payload)
    except UserProviderServiceError as exc:
        raise bad_request(str(exc))

    return UserProviderResponse.model_validate(provider)


@router.get(
    "/users/{user_id}/private-providers",
    response_model=list[UserProviderResponse],
)
def list_private_providers_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> list[UserProviderResponse]:
    """获取用户的私有提供商列表。"""

    _ensure_can_manage_user(current_user, user_id)
    providers = list_private_providers(db, user_id)
    return [UserProviderResponse.model_validate(p) for p in providers]


@router.put(
    "/users/{user_id}/private-providers/{provider_id}",
    response_model=UserProviderResponse,
)
def update_private_provider_endpoint(
    user_id: UUID,
    provider_id: str,
    payload: UserProviderUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> UserProviderResponse:
    """更新用户的私有提供商配置。"""

    _ensure_can_manage_user(current_user, user_id)

    try:
        provider = update_private_provider(db, user_id, provider_id, payload)
    except UserProviderNotFoundError:
        raise not_found(f"Private provider '{provider_id}' not found")
    except UserProviderServiceError as exc:
        raise bad_request(str(exc))

    return UserProviderResponse.model_validate(provider)


__all__ = ["router"]

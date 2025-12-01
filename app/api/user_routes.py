from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import require_api_key
from app.deps import get_db
from app.errors import bad_request, not_found
from app.schemas import UserCreateRequest, UserResponse, UserUpdateRequest
from app.services.user_service import (
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
    create_user,
    get_user_by_id,
    update_user,
)

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


__all__ = ["router"]

from __future__ import annotations

import hashlib
import hmac
import uuid
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import User
from app.schemas.user import UserCreateRequest, UserUpdateRequest
from app.settings import settings


class UserServiceError(Exception):
    """Base error for the user service layer."""


class UsernameAlreadyExistsError(UserServiceError):
    """Raised when the username is already taken."""


class EmailAlreadyExistsError(UserServiceError):
    """Raised when the email already belongs to another user."""


def hash_user_password(raw_password: str) -> str:
    """Derive a deterministic hash for user passwords using the shared SECRET_KEY."""

    secret = settings.secret_key.encode("utf-8")
    message = raw_password.encode("utf-8")
    return hmac.new(secret, message, hashlib.sha256).hexdigest()


def _record_exists(
    session: Session,
    stmt: Select[tuple[User]],
) -> bool:
    return session.execute(stmt).scalars().first() is not None


def _username_exists(
    session: Session, username: str, *, exclude_user_id: UUID | None = None
) -> bool:
    stmt = select(User).where(User.username == username)
    if exclude_user_id is not None:
        stmt = stmt.where(User.id != exclude_user_id)
    return _record_exists(session, stmt)


def _email_exists(
    session: Session, email: str, *, exclude_user_id: UUID | None = None
) -> bool:
    stmt = select(User).where(User.email == email)
    if exclude_user_id is not None:
        stmt = stmt.where(User.id != exclude_user_id)
    return _record_exists(session, stmt)


def get_user_by_id(session: Session, user_id: UUID | str) -> User | None:
    """Return a user by primary key."""

    if isinstance(user_id, str):
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return None
    else:
        user_uuid = user_id
    return session.get(User, user_uuid)


def create_user(session: Session, payload: UserCreateRequest) -> User:
    """Create a new user after checking for unique username/email."""

    if _username_exists(session, payload.username):
        raise UsernameAlreadyExistsError("username already taken")
    if _email_exists(session, payload.email):
        raise EmailAlreadyExistsError("email already in use")

    user = User(
        username=payload.username,
        email=payload.email,
        display_name=payload.display_name,
        avatar=payload.avatar,
        hashed_password=hash_user_password(payload.password),
    )

    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:  # pragma: no cover - safety net for rare races
        session.rollback()
        raise UserServiceError("Failed to create user") from exc
    session.refresh(user)
    return user


def update_user(session: Session, user: User, payload: UserUpdateRequest) -> User:
    """Update mutable profile fields and password for a user."""

    if payload.email is not None and payload.email != user.email:
        if _email_exists(session, payload.email, exclude_user_id=user.id):
            raise EmailAlreadyExistsError("email already in use")
        user.email = payload.email

    if payload.display_name is not None:
        user.display_name = payload.display_name

    if payload.avatar is not None:
        user.avatar = payload.avatar

    if payload.password is not None:
        user.hashed_password = hash_user_password(payload.password)

    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:  # pragma: no cover - safety net for rare races
        session.rollback()
        raise UserServiceError("Failed to update user") from exc
    session.refresh(user)
    return user


__all__ = [
    "EmailAlreadyExistsError",
    "UserServiceError",
    "UsernameAlreadyExistsError",
    "create_user",
    "get_user_by_id",
    "hash_user_password",
    "update_user",
]

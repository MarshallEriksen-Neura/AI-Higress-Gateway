from __future__ import annotations

from uuid import UUID

from app.settings import settings


def _normalize_user_id_hex(user_id: UUID | str) -> str:
    """
    Normalize user_id into a stable, collection-name-safe suffix.

    We use UUID hex (32 lowercase chars, no dashes) to avoid surprises with
    collection name validation rules across Qdrant versions.
    """
    if isinstance(user_id, UUID):
        return user_id.hex
    return UUID(str(user_id)).hex


def get_kb_system_collection_name() -> str:
    return str(getattr(settings, "qdrant_kb_system_collection", "kb_system") or "kb_system").strip()


def get_kb_user_collection_name(user_id: UUID | str) -> str:
    """
    Per-user KB collection name.

    Naming convention:
      <QDRANT_KB_USER_COLLECTION>_<user_id_hex>
    """
    prefix = str(getattr(settings, "qdrant_kb_user_collection", "kb_user") or "kb_user").strip()
    if not prefix:
        prefix = "kb_user"
    return f"{prefix}_{_normalize_user_id_hex(user_id)}"


__all__ = [
    "get_kb_system_collection_name",
    "get_kb_user_collection_name",
]


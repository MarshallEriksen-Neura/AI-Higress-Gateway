from __future__ import annotations

from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.deps import get_db, get_qdrant
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.models import KBAttribute
from app.schemas.user_memory import (
    UserAttributeResponse,
    UserMemoryItemResponse,
    UserMemoryListResponse,
)
from app.settings import settings
from app.storage.qdrant_kb_store import delete_points, scroll_points

router = APIRouter(prefix="/v1/user", tags=["user-memory"], dependencies=[Depends(require_jwt_token)])


@router.get("/memories", response_model=UserMemoryListResponse)
async def list_user_memories(
    project_id: Optional[UUID] = Query(None, description="可选：按项目 ID 过滤"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    qdrant=Depends(get_qdrant),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> UserMemoryListResponse:
    """
    列出当前用户的所有记忆（向量记忆 + 结构化属性）。
    """
    user_id = UUID(str(current_user.id))

    # 1. Fetch structured attributes from Postgres
    attr_stmt = select(KBAttribute).where(KBAttribute.owner_user_id == user_id)
    if project_id:
        attr_stmt = attr_stmt.where(KBAttribute.project_id == project_id)
    else:
        # Also include project-scoped attributes if they are owned by this user
        # In current logic, project attributes might not have owner_user_id set if they are strictly project-level.
        # But for "user side governance", we usually want everything they "own".
        # If project_id is not provided, we only return those explicitly owned by user_id.
        pass

    attr_stmt = attr_stmt.order_by(KBAttribute.updated_at.desc()).limit(limit)
    attributes = list(db.execute(attr_stmt).scalars().all())

    # 2. Fetch vector memories from Qdrant
    collection_name = str(getattr(settings, "qdrant_kb_user_shared_collection", "kb_shared_v1") or "kb_shared_v1")
    
    # Build Qdrant filter
    must_filters = [
        {"key": "owner_user_id", "match": {"value": str(user_id)}},
        {"key": "scope", "match": {"value": "user"}},
    ]
    if project_id:
        must_filters.append({"key": "project_id", "match": {"value": str(project_id)}})
        
    query_filter = {"must": must_filters}
    
    points, _next_offset = await scroll_points(
        qdrant,
        collection_name=collection_name,
        limit=limit,
        query_filter=query_filter,
        with_payload=True,
    )

    memories = []
    for p in points:
        payload = p.get("payload", {})
        memories.append(
            UserMemoryItemResponse(
                id=str(p["id"]),
                content=payload.get("text") or "",
                categories=payload.get("categories"),
                keywords=payload.get("keywords"),
                created_at=payload.get("created_at"),
                source_conversation_id=payload.get("source_id"),
                scope=payload.get("scope", "user"),
            )
        )

    return UserMemoryListResponse(
        memories=memories,
        attributes=[
            UserAttributeResponse(
                id=UUID(str(a.id)),
                scope=a.scope,
                category=a.category,
                key=a.key,
                value=a.value,
                updated_at=a.updated_at,
                project_id=a.project_id,
            )
            for a in attributes
        ],
    )


@router.delete("/memories/{point_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_memory(
    point_id: str,
    qdrant=Depends(get_qdrant),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
):
    """
    删除指定的向量记忆。
    """
    user_id = str(current_user.id)
    collection_name = str(getattr(settings, "qdrant_kb_user_shared_collection", "kb_shared_v1") or "kb_shared_v1")

    # To ensure security, we use a filter to delete only if it belongs to the user.
    query_filter = {
        "must": [
            {"key": "owner_user_id", "match": {"value": user_id}},
            {"key": "scope", "match": {"value": "user"}},
        ]
    }
    
    # Qdrant's delete points by ID also accepts a filter.
    await delete_points(
        qdrant,
        collection_name=collection_name,
        points_ids=[point_id],
        query_filter=query_filter,
        wait=True,
    )


@router.delete("/attributes/{attribute_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_attribute(
    attribute_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
):
    """
    删除指定的结构化属性。
    """
    user_id = UUID(str(current_user.id))
    
    stmt = select(KBAttribute).where(KBAttribute.id == attribute_id)
    attr = db.execute(stmt).scalars().first()
    
    if not attr:
        raise HTTPException(status_code=404, detail="Attribute not found")
    
    # Check ownership
    # If it's a project attribute, the user must have permission to manage the project.
    # For now, we strictly check owner_user_id for simplicity, 
    # OR if it's project-scoped, we check if the user is the owner of the project (APIKey).
    
    if attr.owner_user_id and attr.owner_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this attribute")
        
    if not attr.owner_user_id and attr.project_id:
        # Check if user owns the project
        from app.models import APIKey
        proj = db.get(APIKey, attr.project_id)
        if not proj or proj.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this project attribute")

    db.delete(attr)
    db.commit()


@router.get("/memories/export")
async def export_user_memories(
    db: Session = Depends(get_db),
    qdrant=Depends(get_qdrant),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
):
    """
    导出当前用户的所有记忆数据为 JSON。
    """
    # Simply reuse the list logic but without limit for a full export
    data = await list_user_memories(limit=10000, db=db, qdrant=qdrant, current_user=current_user)
    
    import json
    from datetime import datetime
    
    content = data.model_dump(mode="json")
    filename = f"memories_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    return JSONResponse(
        content=content,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

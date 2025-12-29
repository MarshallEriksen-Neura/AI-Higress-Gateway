from __future__ import annotations

from fastapi import APIRouter, Depends, Query

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - type placeholder when redis is missing
    Redis = object  # type: ignore[misc,assignment]

from app.deps import get_redis
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.schemas.request_logs import RequestLogsResponse
from app.services.request_log_service import list_request_logs

router = APIRouter(
    tags=["request_logs"],
    prefix="/v1/request-logs",
)


@router.get("", response_model=RequestLogsResponse)
async def list_request_logs_endpoint(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    redis: Redis = Depends(get_redis),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> RequestLogsResponse:
    items = await list_request_logs(redis, user_id=str(current_user.id), limit=limit, offset=offset)
    return RequestLogsResponse(items=items)


__all__ = ["router"]

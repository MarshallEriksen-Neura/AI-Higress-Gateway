from __future__ import annotations

import datetime
import re
import uuid
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session
from jose import jwt

from app.models import BridgeAgentToken
from app.redis_client import redis_set_json
from app.settings import settings

_AGENT_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$")

_REDIS_KEY_TEMPLATE = "bridge:agent_token_version:{user_id}:{agent_id}"


@dataclass
class BridgeAgentTokenResult:
    token: str
    expires_at: datetime.datetime
    version: int


def normalize_agent_id(value: str | None) -> str:
    agent_id = (value or "").strip()
    return agent_id


def generate_agent_id() -> str:
    return "agent_" + uuid.uuid4().hex[:10]


def validate_agent_id(agent_id: str) -> None:
    if not agent_id:
        raise ValueError("missing agent_id")
    if not _AGENT_ID_RE.fullmatch(agent_id):
        raise ValueError("invalid agent_id")


def create_bridge_agent_token(
    *,
    user_id: str,
    agent_id: str,
    version: int,
    issued_at: datetime.datetime | None = None,
    expires_at: datetime.datetime | None = None,
) -> tuple[str, datetime.datetime, datetime.datetime]:
    """
    Create a signed JWT token used by Bridge Agent to authenticate to Tunnel Gateway.

    Claims (HS256):
    - type=bridge_agent
    - sub=<user_id>
    - agent_id=<agent_id>
    - iat/exp/ver
    """
    validate_agent_id(agent_id)
    if int(version or 0) <= 0:
        raise ValueError("invalid token version")

    now = issued_at or datetime.datetime.now(datetime.UTC)
    expire = expires_at or now + datetime.timedelta(days=int(settings.bridge_agent_token_expire_days))

    secret = (settings.secret_key or "").strip()
    if not secret:
        raise RuntimeError("missing SECRET_KEY")

    payload: dict[str, Any] = {
        "type": "bridge_agent",
        "sub": str(user_id),
        "agent_id": agent_id,
        "ver": int(version),
        "iat": now,
        "exp": expire,
        "iss": "ai-higress",
    }
    return jwt.encode(payload, secret, algorithm="HS256"), now, expire


class BridgeAgentTokenService:
    """
    管理 Bridge Agent token 的版本与签发。
    - version 单活：同一个 user+agent 只有当前版本有效。
    - 复用：未过期且未 reset 时返回同一个 token，避免重复复制。
    - Redis 缓存 version，Gateway 校验时可快速比对。
    """

    def __init__(self, *, db: Session, redis) -> None:  # redis type kept generic for tests
        self.db = db
        self.redis = redis

    @staticmethod
    def _redis_key(*, user_id: UUID, agent_id: str) -> str:
        return _REDIS_KEY_TEMPLATE.format(user_id=str(user_id), agent_id=agent_id)

    async def _cache_version(self, *, user_id: UUID, agent_id: str, version: int, expires_at: datetime.datetime) -> None:
        """
        Cache current version in Redis for Gateway verification. Ignore failures gracefully.
        """
        # SQLite 等后端可能会把 timezone=True 的 DateTime 读成 naive datetime；
        # 为避免 offset-naive/aware 运算异常，这里统一按 UTC 处理。
        exp = expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=datetime.UTC)

        ttl_seconds = int((exp - datetime.datetime.now(datetime.UTC)).total_seconds())
        if ttl_seconds <= 0:
            ttl_seconds = 1
        payload = {"version": int(version), "expires_at": exp.isoformat()}
        try:
            await redis_set_json(self.redis, self._redis_key(user_id=user_id, agent_id=agent_id), payload, ttl_seconds=ttl_seconds)
        except Exception:
            # 缓存写入失败不应阻断主流程；Gateway 将在缺失时拒绝旧 token，提示用户重置。
            pass

    def _fetch_record(self, *, user_id: UUID, agent_id: str) -> BridgeAgentToken | None:
        stmt = select(BridgeAgentToken).where(
            BridgeAgentToken.user_id == user_id,
            BridgeAgentToken.agent_id == agent_id,
        )
        return self.db.execute(stmt).scalars().first()

    @staticmethod
    def _as_utc(dt: datetime.datetime) -> datetime.datetime:
        """
        Normalize datetime values to timezone-aware UTC.

        Note: SQLite 等数据库在读取 timezone=True 字段时可能返回 naive datetime，
        这里统一做兼容，避免 naive/aware 比较与运算异常。
        """
        if dt.tzinfo is None:
            return dt.replace(tzinfo=datetime.UTC)
        return dt.astimezone(datetime.UTC)

    async def issue_token(
        self,
        *,
        user_id: UUID,
        agent_id: str,
        reset: bool = False,
    ) -> BridgeAgentTokenResult:
        """
        返回当前有效 token；支持 reset 强制版本递增。
        """
        validate_agent_id(agent_id)
        now = datetime.datetime.now(datetime.UTC)
        record = self._fetch_record(user_id=user_id, agent_id=agent_id)

        if record is not None:
            record.issued_at = self._as_utc(record.issued_at)
            record.expires_at = self._as_utc(record.expires_at)

        is_expired = bool(record and record.expires_at <= now)
        should_rotate = reset or is_expired or record is None

        if not should_rotate and record is not None:
            token, _, _ = create_bridge_agent_token(
                user_id=str(user_id),
                agent_id=agent_id,
                version=record.version,
                issued_at=record.issued_at,
                expires_at=record.expires_at,
            )
            await self._cache_version(user_id=user_id, agent_id=agent_id, version=record.version, expires_at=record.expires_at)
            return BridgeAgentTokenResult(token=token, expires_at=record.expires_at, version=record.version)

        next_version = 1 if record is None else int(record.version) + 1
        issued_at = now
        expires_at = issued_at + datetime.timedelta(days=int(settings.bridge_agent_token_expire_days))

        token, issued_at, expires_at = create_bridge_agent_token(
            user_id=str(user_id),
            agent_id=agent_id,
            version=next_version,
            issued_at=issued_at,
            expires_at=expires_at,
        )

        if record is None:
            record = BridgeAgentToken(
                user_id=user_id,
                agent_id=agent_id,
                version=next_version,
                issued_at=issued_at,
                expires_at=expires_at,
            )
        else:
            record.version = next_version
            record.issued_at = issued_at
            record.expires_at = expires_at

        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        record.issued_at = self._as_utc(record.issued_at)
        record.expires_at = self._as_utc(record.expires_at)

        await self._cache_version(user_id=user_id, agent_id=agent_id, version=record.version, expires_at=record.expires_at)

        # 重新签一次，避免依赖任何存储的 token 内容。
        token, _, _ = create_bridge_agent_token(
            user_id=str(user_id),
            agent_id=agent_id,
            version=record.version,
            issued_at=record.issued_at,
            expires_at=record.expires_at,
        )

        return BridgeAgentTokenResult(token=token, expires_at=record.expires_at, version=record.version)

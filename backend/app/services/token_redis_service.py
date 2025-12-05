"""
JWT Token Redis 存储服务
提供 token 的存储、验证、撤销等功能
"""

import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    Redis = object  # type: ignore[misc,assignment]

from app.redis_client import redis_delete, redis_get_json, redis_set_json
from app.schemas.token import (
    DeviceInfo,
    TokenBlacklistEntry,
    TokenRecord,
    UserSession,
)

# Redis 键模板
ACCESS_TOKEN_KEY = "auth:access_token:{token_id}"
REFRESH_TOKEN_KEY = "auth:refresh_token:{token_id}"
USER_SESSIONS_KEY = "auth:user:{user_id}:sessions"
TOKEN_BLACKLIST_KEY = "auth:blacklist:{jti}"
REFRESH_TOKEN_FAMILY_KEY = "auth:refresh_family:{family_id}"
JTI_TO_TOKEN_ID_KEY = "auth:jti_map:{jti}"


class TokenRedisService:
    """Token Redis 存储服务"""

    def __init__(self, redis: Redis):
        self.redis = redis

    async def store_access_token(
        self,
        token_id: str,
        user_id: str,
        jti: str,
        expires_in: int,
        device_info: Optional[DeviceInfo] = None,
    ) -> None:
        """
        存储 access token 到 Redis

        Args:
            token_id: Token 唯一标识符
            user_id: 用户 ID
            jti: JWT ID
            expires_in: 过期时间（秒）
            device_info: 设备信息
        """
        # 使用带时区的 UTC 时间，避免 datetime.utcnow() 的弃用警告
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=expires_in)

        token_record = TokenRecord(
            token_id=token_id,
            user_id=user_id,
            token_type="access",
            jti=jti,
            issued_at=now,
            expires_at=expires_at,
            device_info=device_info,
        )

        # 存储 token 记录
        key = ACCESS_TOKEN_KEY.format(token_id=token_id)
        await redis_set_json(
            self.redis, key, token_record.model_dump(mode="json"), ttl_seconds=expires_in
        )

        # 存储 JTI 到 token_id 的映射（用于快速查找）
        jti_key = JTI_TO_TOKEN_ID_KEY.format(jti=jti)
        await redis_set_json(
            self.redis,
            jti_key,
            {"token_id": token_id, "token_type": "access"},
            ttl_seconds=expires_in,
        )

    async def store_refresh_token(
        self,
        token_id: str,
        user_id: str,
        jti: str,
        family_id: str,
        expires_in: int,
        parent_jti: Optional[str] = None,
        device_info: Optional[DeviceInfo] = None,
    ) -> None:
        """
        存储 refresh token 到 Redis

        Args:
            token_id: Token 唯一标识符
            user_id: 用户 ID
            jti: JWT ID
            family_id: Token 家族 ID
            expires_in: 过期时间（秒）
            parent_jti: 父 token 的 JTI
            device_info: 设备信息
        """
        # 使用带时区的 UTC 时间
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=expires_in)

        token_record = TokenRecord(
            token_id=token_id,
            user_id=user_id,
            token_type="refresh",
            jti=jti,
            issued_at=now,
            expires_at=expires_at,
            device_info=device_info,
            family_id=family_id,
            parent_jti=parent_jti,
            revoked=False,
        )

        # 存储 token 记录
        key = REFRESH_TOKEN_KEY.format(token_id=token_id)
        await redis_set_json(
            self.redis, key, token_record.model_dump(mode="json"), ttl_seconds=expires_in
        )

        # 存储 JTI 到 token_id 的映射
        jti_key = JTI_TO_TOKEN_ID_KEY.format(jti=jti)
        await redis_set_json(
            self.redis,
            jti_key,
            {"token_id": token_id, "token_type": "refresh"},
            ttl_seconds=expires_in,
        )

        # 将 token 添加到家族中
        family_key = REFRESH_TOKEN_FAMILY_KEY.format(family_id=family_id)
        family_data = await redis_get_json(self.redis, family_key)
        if family_data is None:
            family_data = {"family_id": family_id, "tokens": []}

        family_data["tokens"].append(
            {"jti": jti, "token_id": token_id, "issued_at": now.isoformat()}
        )
        await redis_set_json(self.redis, family_key, family_data, ttl_seconds=expires_in)

        # 更新用户会话
        await self._add_user_session(user_id, token_id, jti, device_info, expires_in)

    async def _add_user_session(
        self,
        user_id: str,
        token_id: str,
        refresh_token_jti: str,
        device_info: Optional[DeviceInfo],
        ttl_seconds: int,
    ) -> None:
        """添加用户会话"""
        now = datetime.now(timezone.utc)
        session = UserSession(
            session_id=token_id,
            refresh_token_jti=refresh_token_jti,
            created_at=now,
            last_used_at=now,
            device_info=device_info,
        )

        sessions_key = USER_SESSIONS_KEY.format(user_id=user_id)
        sessions_data = await redis_get_json(self.redis, sessions_key)

        if sessions_data is None:
            sessions_data = {"user_id": user_id, "sessions": []}

        sessions_data["sessions"].append(session.model_dump(mode="json"))
        await redis_set_json(self.redis, sessions_key, sessions_data, ttl_seconds=ttl_seconds)

    async def verify_access_token(self, jti: str) -> Optional[TokenRecord]:
        """
        验证 access token 是否有效

        Args:
            jti: JWT ID

        Returns:
            TokenRecord 如果有效，否则 None
        """
        # 检查黑名单
        if await self.is_token_blacklisted(jti):
            return None

        # 通过 JTI 查找 token_id
        jti_key = JTI_TO_TOKEN_ID_KEY.format(jti=jti)
        jti_data = await redis_get_json(self.redis, jti_key)
        if not jti_data or jti_data.get("token_type") != "access":
            return None

        token_id = jti_data.get("token_id")
        key = ACCESS_TOKEN_KEY.format(token_id=token_id)
        data = await redis_get_json(self.redis, key)

        if not data:
            return None

        return TokenRecord.model_validate(data)

    async def verify_refresh_token(self, jti: str) -> Optional[TokenRecord]:
        """
        验证 refresh token 是否有效

        Args:
            jti: JWT ID

        Returns:
            TokenRecord 如果有效，否则 None
        """
        # 检查黑名单
        if await self.is_token_blacklisted(jti):
            return None

        # 通过 JTI 查找 token_id
        jti_key = JTI_TO_TOKEN_ID_KEY.format(jti=jti)
        jti_data = await redis_get_json(self.redis, jti_key)
        if not jti_data or jti_data.get("token_type") != "refresh":
            return None

        token_id = jti_data.get("token_id")
        key = REFRESH_TOKEN_KEY.format(token_id=token_id)
        data = await redis_get_json(self.redis, key)

        if not data:
            return None

        token_record = TokenRecord.model_validate(data)

        # 检查是否已被撤销
        if token_record.revoked:
            return None

        return token_record

    async def revoke_token(
        self, jti: str, reason: str = "user_logout", grace_period_seconds: int = 0
    ) -> bool:
        """
        撤销单个 token

        Args:
            jti: JWT ID
            reason: 撤销原因
            grace_period_seconds: 宽限期（秒），在此期间 token 仍然有效

        Returns:
            是否成功撤销
        """
        # 查找 token
        jti_key = JTI_TO_TOKEN_ID_KEY.format(jti=jti)
        jti_data = await redis_get_json(self.redis, jti_key)
        if not jti_data:
            return False

        token_id = jti_data.get("token_id")
        token_type = jti_data.get("token_type")

        # 获取 token 记录以获取用户 ID 和过期时间
        if token_type == "access":
            key = ACCESS_TOKEN_KEY.format(token_id=token_id)
        else:
            key = REFRESH_TOKEN_KEY.format(token_id=token_id)

        data = await redis_get_json(self.redis, key)
        if not data:
            return False

        token_record = TokenRecord.model_validate(data)

        # 计算剩余 TTL（使用带时区的 UTC 时间）
        now = datetime.now(timezone.utc)
        remaining_seconds = int((token_record.expires_at - now).total_seconds())
        if remaining_seconds <= 0:
            return False

        # 如果有宽限期，延迟添加到黑名单
        if grace_period_seconds > 0:
            # 计算实际撤销时间
            revoke_at = now + timedelta(seconds=grace_period_seconds)
            blacklist_entry = TokenBlacklistEntry(
                jti=jti, user_id=token_record.user_id, revoked_at=revoke_at, reason=reason
            )

            # 黑名单的 TTL 需要考虑宽限期
            blacklist_ttl = remaining_seconds + grace_period_seconds
            blacklist_key = TOKEN_BLACKLIST_KEY.format(jti=jti)
            
            # 存储黑名单条目，但在验证时会检查 revoked_at 时间
            await redis_set_json(
                self.redis,
                blacklist_key,
                blacklist_entry.model_dump(mode="json"),
                ttl_seconds=blacklist_ttl,
            )
        else:
            # 立即添加到黑名单
            blacklist_entry = TokenBlacklistEntry(
                jti=jti, user_id=token_record.user_id, revoked_at=now, reason=reason
            )

            blacklist_key = TOKEN_BLACKLIST_KEY.format(jti=jti)
            await redis_set_json(
                self.redis,
                blacklist_key,
                blacklist_entry.model_dump(mode="json"),
                ttl_seconds=remaining_seconds,
            )

        # 如果是 refresh token，标记为已撤销
        if token_type == "refresh":
            token_record.revoked = True
            await redis_set_json(
                self.redis,
                key,
                token_record.model_dump(mode="json"),
                ttl_seconds=remaining_seconds,
            )

            # 从用户会话中移除
            await self._remove_user_session(token_record.user_id, token_id)

        return True

    async def _remove_user_session(self, user_id: str, session_id: str) -> None:
        """从用户会话列表中移除指定会话"""
        sessions_key = USER_SESSIONS_KEY.format(user_id=user_id)
        sessions_data = await redis_get_json(self.redis, sessions_key)

        if not sessions_data:
            return

        sessions = sessions_data.get("sessions", [])
        sessions_data["sessions"] = [s for s in sessions if s.get("session_id") != session_id]

        if sessions_data["sessions"]:
            await redis_set_json(self.redis, sessions_key, sessions_data, ttl_seconds=None)
        else:
            await redis_delete(self.redis, sessions_key)

    async def revoke_user_tokens(self, user_id: str, reason: str = "user_logout_all") -> int:
        """
        撤销用户所有 token

        Args:
            user_id: 用户 ID
            reason: 撤销原因

        Returns:
            撤销的 token 数量
        """
        count = 0

        # 获取用户所有会话
        sessions = await self.get_user_sessions(user_id)

        for session in sessions:
            # 撤销 refresh token
            if await self.revoke_token(session.refresh_token_jti, reason):
                count += 1

        # 清空用户会话
        sessions_key = USER_SESSIONS_KEY.format(user_id=user_id)
        await redis_delete(self.redis, sessions_key)

        return count

    async def revoke_token_family(
        self, family_id: str, reason: str = "token_reuse_detected"
    ) -> int:
        """
        撤销 token 家族（检测到重放攻击时使用）

        Args:
            family_id: Token 家族 ID
            reason: 撤销原因

        Returns:
            撤销的 token 数量
        """
        count = 0

        # 获取家族中的所有 token
        family_key = REFRESH_TOKEN_FAMILY_KEY.format(family_id=family_id)
        family_data = await redis_get_json(self.redis, family_key)

        if not family_data:
            return 0

        tokens = family_data.get("tokens", [])

        for token_info in tokens:
            jti = token_info.get("jti")
            if jti and await self.revoke_token(jti, reason):
                count += 1

        # 删除家族记录
        await redis_delete(self.redis, family_key)

        return count

    async def get_user_sessions(self, user_id: str) -> List[UserSession]:
        """
        获取用户所有活跃会话

        Args:
            user_id: 用户 ID

        Returns:
            用户会话列表
        """
        sessions_key = USER_SESSIONS_KEY.format(user_id=user_id)
        sessions_data = await redis_get_json(self.redis, sessions_key)

        if not sessions_data:
            return []

        sessions = []
        for session_data in sessions_data.get("sessions", []):
            try:
                sessions.append(UserSession.model_validate(session_data))
            except Exception:
                continue

        return sessions

    async def is_token_blacklisted(self, jti: str) -> bool:
        """
        检查 token 是否在黑名单中

        Args:
            jti: JWT ID

        Returns:
            是否在黑名单中
        """
        blacklist_key = TOKEN_BLACKLIST_KEY.format(jti=jti)
        data = await redis_get_json(self.redis, blacklist_key)
        
        if data is None:
            return False
        
        # 检查是否在宽限期内
        try:
            entry = TokenBlacklistEntry.model_validate(data)
            now = datetime.now(timezone.utc)
            
            # 如果撤销时间还未到，token 仍然有效
            if entry.revoked_at > now:
                return False
            
            return True
        except Exception:
            # 如果解析失败，保守地认为已被撤销
            return True

    async def update_session_last_used(self, user_id: str, refresh_token_jti: str) -> None:
        """
        更新会话的最后使用时间

        Args:
            user_id: 用户 ID
            refresh_token_jti: Refresh token 的 JTI
        """
        sessions_key = USER_SESSIONS_KEY.format(user_id=user_id)
        sessions_data = await redis_get_json(self.redis, sessions_key)

        if not sessions_data:
            return

        # 使用带时区的 UTC 时间
        now = datetime.now(timezone.utc)
        sessions = sessions_data.get("sessions", [])

        for session in sessions:
            if session.get("refresh_token_jti") == refresh_token_jti:
                session["last_used_at"] = now.isoformat()
                break

        sessions_data["sessions"] = sessions
        await redis_set_json(self.redis, sessions_key, sessions_data, ttl_seconds=None)


__all__ = ["TokenRedisService"]

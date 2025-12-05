"""
Request validation middleware to detect and block malicious requests.
"""
import re
import time
from typing import Callable, Pattern

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    Redis = object  # type: ignore[misc,assignment]


class InMemoryBanStore:
    """简单的内存封禁存储，带过期时间。"""

    def __init__(self) -> None:
        self._banned: dict[str, float] = {}

    async def ban(self, ip: str, ttl_seconds: int) -> None:
        self._banned[ip] = time.time() + ttl_seconds

    async def is_banned(self, ip: str) -> bool:
        expire_at = self._banned.get(ip)
        if not expire_at:
            return False

        if expire_at < time.time():
            self._banned.pop(ip, None)
            return False

        return True


class RedisBanStore:
    """基于 Redis 的封禁存储，便于多实例共享。"""

    def __init__(self, redis_client: Redis) -> None:
        self.redis = redis_client

    async def ban(self, ip: str, ttl_seconds: int) -> None:
        await self.redis.setex(f"banlist:{ip}", ttl_seconds, "1")

    async def is_banned(self, ip: str) -> bool:
        return bool(await self.redis.exists(f"banlist:{ip}"))


class RequestValidatorMiddleware(BaseHTTPMiddleware):
    """
    请求验证中间件，检测并阻止恶意请求。

    防护：
    - SQL 注入攻击
    - XSS 攻击
    - 路径遍历攻击
    - 命令注入
    - 可疑 User-Agent
    """

    # SQL 注入特征模式
    SQL_INJECTION_PATTERNS: list[Pattern] = [
        re.compile(r"(\bunion\b.*\bselect\b)", re.IGNORECASE),
        re.compile(r"(\bselect\b.*\bfrom\b)", re.IGNORECASE),
        re.compile(r"(\binsert\b.*\binto\b)", re.IGNORECASE),
        re.compile(r"(\bdelete\b.*\bfrom\b)", re.IGNORECASE),
        re.compile(r"(\bdrop\b.*\btable\b)", re.IGNORECASE),
        re.compile(r"(\bupdate\b.*\bset\b)", re.IGNORECASE),
        re.compile(r"(--|#|/\*|\*/|;)", re.IGNORECASE),
        re.compile(r"(\bor\b\s+\d+\s*=\s*\d+)", re.IGNORECASE),
        re.compile(r"(\band\b\s+\d+\s*=\s*\d+)", re.IGNORECASE),
        re.compile(r"('|\")(\s*or\s*|\s*and\s*)('|\")", re.IGNORECASE),
    ]

    # XSS 攻击特征模式
    XSS_PATTERNS: list[Pattern] = [
        re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL),
        re.compile(r"javascript:", re.IGNORECASE),
        re.compile(r"on\w+\s*=", re.IGNORECASE),  # onclick, onerror, etc.
        re.compile(r"<iframe[^>]*>", re.IGNORECASE),
        re.compile(r"<embed[^>]*>", re.IGNORECASE),
        re.compile(r"<object[^>]*>", re.IGNORECASE),
    ]

    # 路径遍历攻击模式
    PATH_TRAVERSAL_PATTERNS: list[Pattern] = [
        re.compile(r"\.\./"),
        re.compile(r"%2e%2e/", re.IGNORECASE),
        re.compile(r"\.\.\\"),
    ]

    # 命令注入模式
    COMMAND_INJECTION_PATTERNS: list[Pattern] = [
        re.compile(r"[;&|`$]"),
        re.compile(r"\$\(.*\)"),
        re.compile(r"`.*`"),
    ]

    # 可疑的扫描工具 User-Agent
    SUSPICIOUS_USER_AGENTS: list[Pattern] = [
        re.compile(r"sqlmap", re.IGNORECASE),
        re.compile(r"nikto", re.IGNORECASE),
        re.compile(r"nmap", re.IGNORECASE),
        re.compile(r"masscan", re.IGNORECASE),
        re.compile(r"acunetix", re.IGNORECASE),
        re.compile(r"nessus", re.IGNORECASE),
        re.compile(r"openvas", re.IGNORECASE),
        re.compile(r"metasploit", re.IGNORECASE),
        re.compile(r"burp", re.IGNORECASE),
        re.compile(r"w3af", re.IGNORECASE),
        re.compile(r"dirbuster", re.IGNORECASE),
        re.compile(r"gobuster", re.IGNORECASE),
        re.compile(r"wfuzz", re.IGNORECASE),
        re.compile(r"havij", re.IGNORECASE),
    ]

    def __init__(
        self,
        app: ASGIApp,
        enable_sql_injection_check: bool = True,
        enable_xss_check: bool = True,
        enable_path_traversal_check: bool = True,
        enable_command_injection_check: bool = True,
        enable_user_agent_check: bool = True,
        log_suspicious_requests: bool = True,
        inspect_body: bool = False,
        inspect_body_max_length: int = 10_240,
        allowed_body_content_types: tuple[str, ...] = (
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data",
            "text/plain",
        ),
        ban_ip_on_detection: bool = False,
        ban_ttl_seconds: int = 900,
        allowed_ips: set[str] | list[str] | None = None,
        allowed_path_prefixes: set[str] | list[str] | None = None,
        redis_client: Redis | None = None,
        get_client_ip: Callable[[Request], str] | None = None,
    ):
        super().__init__(app)
        self.enable_sql_injection_check = enable_sql_injection_check
        self.enable_xss_check = enable_xss_check
        self.enable_path_traversal_check = enable_path_traversal_check
        self.enable_command_injection_check = enable_command_injection_check
        self.enable_user_agent_check = enable_user_agent_check
        self.log_suspicious_requests = log_suspicious_requests
        self.inspect_body = inspect_body
        self.inspect_body_max_length = inspect_body_max_length
        self.allowed_body_content_types = allowed_body_content_types
        self.ban_ip_on_detection = ban_ip_on_detection
        self.ban_ttl_seconds = ban_ttl_seconds
        self.allowed_ips = set(allowed_ips) if allowed_ips else set()
        self.allowed_path_prefixes = (
            set(allowed_path_prefixes) if allowed_path_prefixes else set()
        )
        self.get_client_ip = get_client_ip or self._default_get_client_ip

        if self.ban_ip_on_detection or redis_client:
            self.ban_store = RedisBanStore(redis_client) if redis_client else InMemoryBanStore()
        else:
            self.ban_store = None

    def _default_get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

        if request.client:
            return request.client.host

        return "unknown"

    def _check_patterns(self, text: str, patterns: list[Pattern]) -> bool:
        """检查文本是否匹配任何恶意模式"""
        if not text:
            return False
        return any(pattern.search(text) for pattern in patterns)

    def _is_suspicious_request(self, request: Request, body_text: str = "") -> tuple[bool, str]:
        """
        检查请求是否可疑。

        Returns:
            (is_suspicious, reason)
        """
        if self.enable_user_agent_check:
            user_agent = request.headers.get("user-agent", "")
            if self._check_patterns(user_agent, self.SUSPICIOUS_USER_AGENTS):
                return True, "suspicious_user_agent"

        path = request.url.path
        query = str(request.url.query)

        if self.enable_path_traversal_check:
            if self._check_patterns(path, self.PATH_TRAVERSAL_PATTERNS):
                return True, "path_traversal_attempt"
            if self._check_patterns(query, self.PATH_TRAVERSAL_PATTERNS):
                return True, "path_traversal_in_query"

        if self.enable_sql_injection_check:
            if self._check_patterns(query, self.SQL_INJECTION_PATTERNS):
                return True, "sql_injection_in_query"
            if body_text and self._check_patterns(body_text, self.SQL_INJECTION_PATTERNS):
                return True, "sql_injection_in_body"

        if self.enable_xss_check:
            if self._check_patterns(query, self.XSS_PATTERNS):
                return True, "xss_in_query"
            if body_text and self._check_patterns(body_text, self.XSS_PATTERNS):
                return True, "xss_in_body"

        if self.enable_command_injection_check:
            if self._check_patterns(query, self.COMMAND_INJECTION_PATTERNS):
                return True, "command_injection_in_query"
            if body_text and self._check_patterns(body_text, self.COMMAND_INJECTION_PATTERNS):
                return True, "command_injection_in_body"

        return False, ""

    async def _get_body_text(self, request: Request) -> tuple[str, Request | None]:
        body = await request.body()

        if self.inspect_body_max_length and len(body) > self.inspect_body_max_length:
            return "__payload_too_large__", None

        async def receive() -> dict[str, bytes | bool]:
            return {"type": "http.request", "body": body, "more_body": False}

        refreshed_request = Request(request.scope, receive=receive)
        body_text = body.decode(errors="ignore")
        return body_text, refreshed_request

    async def dispatch(self, request: Request, call_next):
        client_ip = self.get_client_ip(request)
        path = request.url.path

        if (self.allowed_ips and client_ip in self.allowed_ips) or (
            self.allowed_path_prefixes
            and any(path.startswith(prefix) for prefix in self.allowed_path_prefixes)
        ):
            return await call_next(request)

        if self.ban_store and await self.ban_store.is_banned(client_ip):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "forbidden",
                    "message": "请求被拒绝",
                    "reason": "ip_blocked",
                },
            )

        body_text = ""
        current_request = request

        if self.inspect_body and request.method.upper() in {"POST", "PUT", "PATCH", "DELETE"}:
            content_type = request.headers.get("content-type", "")
            if not any(content_type.startswith(prefix) for prefix in self.allowed_body_content_types):
                current_request = request
            else:
                body_text, refreshed_request = await self._get_body_text(request)
                if body_text == "__payload_too_large__":
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "error": "payload_too_large",
                            "message": "请求体过大，已被拒绝",
                        },
                    )
                if refreshed_request is not None:
                    current_request = refreshed_request

        is_suspicious, reason = self._is_suspicious_request(current_request, body_text)

        if is_suspicious:
            if self.ban_store and self.ban_ip_on_detection and client_ip != "unknown":
                await self.ban_store.ban(client_ip, self.ban_ttl_seconds)

            if self.log_suspicious_requests:
                import logging

                logger = logging.getLogger("apiproxy")
                logger.warning(
                    f"Blocked suspicious request: {reason} | "
                    f"IP: {client_ip} | "
                    f"Path: {request.url.path} | "
                    f"User-Agent: {request.headers.get('user-agent', 'none')}"
                )

            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "forbidden",
                    "message": "请求被拒绝",
                    "reason": reason,
                },
            )

        return await call_next(current_request)

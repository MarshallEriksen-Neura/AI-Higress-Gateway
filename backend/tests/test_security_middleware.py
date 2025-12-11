"""
Tests for security middleware.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware import (
    RateLimitMiddleware,
    RequestValidatorMiddleware,
    SecurityHeadersMiddleware,
)


@pytest.fixture
def app_with_security_headers():
    """Create a test app with security headers middleware."""
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware, enable_hsts=False)

    @app.get("/test")
    async def test_endpoint():
        return {"message": "ok"}

    return app


@pytest.fixture
def app_with_rate_limit():
    """Create a test app with rate limit middleware."""
    app = FastAPI()
    app.add_middleware(
        RateLimitMiddleware,
        redis_client=None,  # Use in-memory storage for tests
        default_max_requests=5,
        default_window_seconds=60,
    )

    @app.get("/test")
    async def test_endpoint():
        return {"message": "ok"}

    return app


@pytest.fixture
def app_with_request_validator():
    """Create a test app with request validator middleware."""
    app = FastAPI()
    app.add_middleware(
        RequestValidatorMiddleware,
        enable_sql_injection_check=True,
        enable_xss_check=True,
        enable_path_traversal_check=True,
        log_suspicious_requests=False,  # Disable logging in tests
    )

    @app.get("/test")
    async def test_endpoint():
        return {"message": "ok"}

    return app


@pytest.fixture
def app_with_request_validator_body_and_ban():
    """Create a test app with body inspection and IP ban enabled."""
    app = FastAPI()
    app.add_middleware(
        RequestValidatorMiddleware,
        enable_sql_injection_check=True,
        enable_xss_check=True,
        enable_path_traversal_check=True,
        inspect_body=True,
        ban_ip_on_detection=True,
        ban_ttl_seconds=60,
        log_suspicious_requests=False,  # Disable logging in tests
    )

    @app.post("/submit")
    async def submit(payload: dict):
        return payload

    return app


@pytest.fixture
def app_with_request_validator_allowlist():
    """Create app that skips validation for allowlisted IPs."""
    app = FastAPI()
    app.add_middleware(
        RequestValidatorMiddleware,
        enable_sql_injection_check=True,
        enable_xss_check=True,
        enable_path_traversal_check=True,
        inspect_body=True,
        ban_ip_on_detection=True,
        allowed_ips={"10.0.0.9"},
        log_suspicious_requests=False,
    )

    @app.get("/submit")
    async def submit():
        return {"message": "ok"}

    return app


@pytest.fixture
def app_with_request_validator_body_limit():
    """Create app that enforces a body size limit during inspection."""
    app = FastAPI()
    app.add_middleware(
        RequestValidatorMiddleware,
        inspect_body=True,
        inspect_body_max_length=20,
        log_suspicious_requests=False,
    )

    @app.post("/payload")
    async def payload(data: dict):
        return data

    return app


class TestSecurityHeadersMiddleware:
    """Test security headers middleware."""

    def test_security_headers_added(self, app_with_security_headers):
        """Test that security headers are added to responses."""
        client = TestClient(app_with_security_headers)
        response = client.get("/test")

        assert response.status_code == 200
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"
        assert "X-XSS-Protection" in response.headers
        assert "Content-Security-Policy" in response.headers
        assert "Referrer-Policy" in response.headers

    def test_hsts_not_enabled_in_dev(self, app_with_security_headers):
        """Test that HSTS is not enabled when explicitly disabled."""
        client = TestClient(app_with_security_headers)
        response = client.get("/test")

        assert "Strict-Transport-Security" not in response.headers


class TestRateLimitMiddleware:
    """Test rate limit middleware."""

    def test_rate_limit_allows_normal_requests(self, app_with_rate_limit):
        """Test that normal requests are allowed."""
        client = TestClient(app_with_rate_limit)

        # Make 3 requests (under the limit of 5)
        for _ in range(3):
            response = client.get("/test")
            assert response.status_code == 200
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers

    def test_rate_limit_blocks_excessive_requests(self, app_with_rate_limit):
        """Test that excessive requests are blocked."""
        client = TestClient(app_with_rate_limit)

        # Make 5 successful requests
        for i in range(5):
            response = client.get("/test")
            assert response.status_code == 200

        # 6th request should be rate limited
        response = client.get("/test")
        assert response.status_code == 429
        assert response.json()["error"] == "rate_limit_exceeded"
        assert "Retry-After" in response.headers

    def test_rate_limit_headers_present(self, app_with_rate_limit):
        """Test that rate limit headers are present."""
        client = TestClient(app_with_rate_limit)
        response = client.get("/test")

        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers


class TestRequestValidatorMiddleware:
    """Test request validator middleware."""

    def test_normal_requests_allowed(self, app_with_request_validator):
        """Test that normal requests are allowed."""
        client = TestClient(app_with_request_validator)
        response = client.get("/test")
        assert response.status_code == 200

    def test_sql_injection_blocked(self, app_with_request_validator):
        """Test that SQL injection attempts are blocked."""
        client = TestClient(app_with_request_validator)

        # Test various SQL injection patterns
        sql_patterns = [
            "/test?id=1' OR '1'='1",
            "/test?id=1 UNION SELECT * FROM users",
            "/test?id=1; DROP TABLE users--",
        ]

        for pattern in sql_patterns:
            response = client.get(pattern)
            assert response.status_code == 403
            assert response.json()["error"] == "forbidden"

    def test_xss_blocked(self, app_with_request_validator):
        """Test that XSS attempts are blocked."""
        client = TestClient(app_with_request_validator)

        # Test various XSS patterns
        xss_patterns = [
            "/test?name=<script>alert('xss')</script>",
            "/test?name=javascript:alert(1)",
            "/test?name=<img src=x onerror=alert(1)>",
        ]

        for pattern in xss_patterns:
            response = client.get(pattern)
            assert response.status_code == 403

    def test_path_traversal_blocked(self, app_with_request_validator):
        """Test that path traversal attempts are blocked."""
        client = TestClient(app_with_request_validator)

        # Test various path traversal patterns
        traversal_patterns = [
            "/test/../../../etc/passwd",
            "/test?file=../../config.ini",
        ]

        for pattern in traversal_patterns:
            response = client.get(pattern)
            assert response.status_code == 403

    def test_command_injection_blocked(self, app_with_request_validator):
        """命令注入符号出现在参数值时应被拦截。"""
        client = TestClient(app_with_request_validator)

        response = client.get("/test?cmd=1|ls")

        assert response.status_code == 403
        assert response.json()["reason"] == "command_injection_in_query"

    def test_normal_query_not_blocked_by_command_injection(self, app_with_request_validator):
        """正常多参数查询不应因为 & 分隔符被误判。"""
        client = TestClient(app_with_request_validator)

        response = client.get("/test?time_range=7d&transport=all&is_stream=all")

        assert response.status_code == 200

    def test_sql_injection_in_body_blocked(self, app_with_request_validator_body_and_ban):
        """Test that SQL injection payloads in request body are blocked."""
        client = TestClient(app_with_request_validator_body_and_ban)

        response = client.post(
            "/submit",
            json={"name": "test'; DROP TABLE users;--"},
        )

        assert response.status_code == 403
        assert response.json()["reason"] == "sql_injection_in_body"

    def test_attack_ip_is_banned_after_detection(self, app_with_request_validator_body_and_ban):
        """Test that an IP triggering detection is banned for subsequent requests."""
        client = TestClient(app_with_request_validator_body_and_ban)
        headers = {"X-Real-IP": "10.0.0.8"}

        first_response = client.get("/submit?id=1' OR '1'='1", headers=headers)
        assert first_response.status_code == 403

        second_response = client.post(
            "/submit",
            json={"name": "normal"},
            headers=headers,
        )

        assert second_response.status_code == 403
        assert second_response.json()["reason"] == "ip_blocked"

    def test_suspicious_user_agent_blocked(self, app_with_request_validator):
        """Test that suspicious user agents are blocked."""
        client = TestClient(app_with_request_validator)

        # Test various scanning tool user agents
        suspicious_agents = [
            "sqlmap/1.0",
            "nikto/2.1.6",
            "nmap scripting engine",
        ]

        for agent in suspicious_agents:
            response = client.get("/test", headers={"User-Agent": agent})
            assert response.status_code == 403

    def test_allowlisted_ip_bypasses_detection(self, app_with_request_validator_allowlist):
        """Requests from allowlisted IPs should bypass validation and banning."""
        client = TestClient(app_with_request_validator_allowlist)
        headers = {"X-Real-IP": "10.0.0.9"}

        response = client.get("/submit?id=1' OR '1'='1", headers=headers)

        assert response.status_code == 200
        assert response.json()["message"] == "ok"

    def test_large_body_allowed_without_limit(self, app_with_request_validator_body_and_ban):
        """When no body limit is configured, large payloads should pass."""
        client = TestClient(app_with_request_validator_body_and_ban)

        response = client.post(
            "/submit",
            json={"data": "x" * 50_000},
        )

        assert response.status_code == 200
        assert response.json()["data"].startswith("x")

    def test_large_body_rejected_during_inspection(self, app_with_request_validator_body_limit):
        """Oversized bodies should be rejected before inspection to avoid DoS."""
        client = TestClient(app_with_request_validator_body_limit)

        response = client.post("/payload", json={"data": "x" * 30})

        assert response.status_code == 413
        assert response.json()["error"] == "payload_too_large"


class TestMiddlewareIntegration:
    """Test middleware integration."""

    def test_all_middleware_together(self):
        """Test that all middleware work together correctly."""
        app = FastAPI()

        # Add all middleware
        app.add_middleware(SecurityHeadersMiddleware, enable_hsts=False)
        app.add_middleware(
            RateLimitMiddleware,
            redis_client=None,
            default_max_requests=10,
            default_window_seconds=60,
        )
        app.add_middleware(
            RequestValidatorMiddleware,
            log_suspicious_requests=False,
        )

        @app.get("/test")
        async def test_endpoint():
            return {"message": "ok"}

        client = TestClient(app)

        # Normal request should work
        response = client.get("/test")
        assert response.status_code == 200

        # Should have security headers
        assert "X-Content-Type-Options" in response.headers

        # Should have rate limit headers
        assert "X-RateLimit-Limit" in response.headers

        # Malicious request should be blocked
        response = client.get("/test?id=1' OR '1'='1")
        assert response.status_code == 403

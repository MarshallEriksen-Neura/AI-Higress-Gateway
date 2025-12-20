"""
Bridge gateway unavailable error mapping tests.
"""

from __future__ import annotations

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.services.bridge_gateway_client import BridgeGatewayClient
from tests.utils import jwt_auth_headers


def _connect_error(url: str) -> httpx.ConnectError:
    req = httpx.Request("GET", url)
    return httpx.ConnectError("All connection attempts failed", request=req)


def test_bridge_list_agents_connect_error_returns_503(
    client: TestClient,
    db_session: Session,
    monkeypatch,
):
    user = db_session.execute(select(User)).scalars().first()
    assert user is not None

    async def _stub(self) -> dict:
        raise _connect_error("http://127.0.0.1:8088/internal/bridge/agents")

    monkeypatch.setattr(BridgeGatewayClient, "list_agents", _stub)

    resp = client.get("/v1/bridge/agents", headers=jwt_auth_headers(str(user.id)))
    assert resp.status_code == 503
    body = resp.json()
    assert body["detail"]["error"] == "service_unavailable"
    assert body["detail"]["details"]["code"] == "bridge_gateway_error"
    assert body["detail"]["details"]["reason"] == "ConnectError"


def test_bridge_list_tools_connect_error_returns_503(
    client: TestClient,
    db_session: Session,
    monkeypatch,
):
    user = db_session.execute(select(User)).scalars().first()
    assert user is not None

    async def _stub(self, agent_id: str) -> dict:
        _ = agent_id
        raise _connect_error("http://127.0.0.1:8088/internal/bridge/agents/x/tools")

    monkeypatch.setattr(BridgeGatewayClient, "list_tools", _stub)

    resp = client.get(
        "/v1/bridge/agents/aws-dev-server/tools",
        headers=jwt_auth_headers(str(user.id)),
    )
    assert resp.status_code == 503
    body = resp.json()
    assert body["detail"]["error"] == "service_unavailable"
    assert body["detail"]["details"]["code"] == "bridge_gateway_error"
    assert body["detail"]["details"]["reason"] == "ConnectError"


def test_bridge_invoke_connect_error_returns_503(
    client: TestClient,
    db_session: Session,
    monkeypatch,
):
    user = db_session.execute(select(User)).scalars().first()
    assert user is not None

    async def _stub(
        self,
        *,
        req_id: str,
        agent_id: str,
        tool_name: str,
        arguments: dict,
        timeout_ms: int = 60000,
        stream: bool = True,
    ) -> dict:
        _ = (req_id, agent_id, tool_name, arguments, timeout_ms, stream)
        raise _connect_error("http://127.0.0.1:8088/internal/bridge/invoke")

    monkeypatch.setattr(BridgeGatewayClient, "invoke", _stub)

    resp = client.post(
        "/v1/bridge/invoke",
        headers=jwt_auth_headers(str(user.id)),
        json={
            "agent_id": "aws-dev-server",
            "tool_name": "bridge__echo",
            "arguments": {"lines": ["hello"]},
        },
    )
    assert resp.status_code == 503
    body = resp.json()
    assert body["detail"]["error"] == "service_unavailable"
    assert body["detail"]["details"]["code"] == "bridge_gateway_error"
    assert body["detail"]["details"]["reason"] == "ConnectError"


def test_bridge_cancel_connect_error_returns_503(
    client: TestClient,
    db_session: Session,
    monkeypatch,
):
    user = db_session.execute(select(User)).scalars().first()
    assert user is not None

    async def _stub(self, *, req_id: str, agent_id: str, reason: str = "user_cancel") -> dict:
        _ = (req_id, agent_id, reason)
        raise _connect_error("http://127.0.0.1:8088/internal/bridge/cancel")

    monkeypatch.setattr(BridgeGatewayClient, "cancel", _stub)

    resp = client.post(
        "/v1/bridge/cancel",
        headers=jwt_auth_headers(str(user.id)),
        json={"req_id": "req_xxx", "agent_id": "aws-dev-server", "reason": "user_cancel"},
    )
    assert resp.status_code == 503
    body = resp.json()
    assert body["detail"]["error"] == "service_unavailable"
    assert body["detail"]["details"]["code"] == "bridge_gateway_error"
    assert body["detail"]["details"]["reason"] == "ConnectError"


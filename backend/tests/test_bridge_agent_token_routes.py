"""
Bridge Agent token routes tests.
"""

from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.settings import settings
from tests.utils import jwt_auth_headers


def test_issue_agent_token_ok(client: TestClient, db_session: Session):
    user = db_session.execute(select(User)).scalars().first()
    assert user is not None

    resp1 = client.post(
        "/v1/bridge/agent-token",
        headers=jwt_auth_headers(str(user.id)),
        json={"agent_id": "my-agent"},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["agent_id"] == "my-agent"
    assert data1["version"] == 1
    assert isinstance(data1["token"], str) and data1["token"]
    assert "expires_at" in data1

    claims = jwt.decode(data1["token"], settings.secret_key, algorithms=["HS256"])
    assert claims["type"] == "bridge_agent"
    assert claims["sub"] == str(user.id)
    assert claims["agent_id"] == "my-agent"
    assert claims["ver"] == 1

    # 再次请求应复用同一 token（同一版本）
    resp2 = client.post(
        "/v1/bridge/agent-token",
        headers=jwt_auth_headers(str(user.id)),
        json={"agent_id": "my-agent"},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["version"] == 1
    assert data2["token"] == data1["token"]
    assert data2["expires_at"] == data1["expires_at"]


def test_issue_agent_token_invalid_agent_id(client: TestClient, db_session: Session):
    user = db_session.execute(select(User)).scalars().first()
    assert user is not None

    resp = client.post(
        "/v1/bridge/agent-token",
        headers=jwt_auth_headers(str(user.id)),
        json={"agent_id": "bad id"},
    )
    assert resp.status_code == 400
    data = resp.json()
    assert "detail" in data


def test_issue_agent_token_reset_increments_version(client: TestClient, db_session: Session):
    user = db_session.execute(select(User)).scalars().first()
    assert user is not None

    first = client.post(
        "/v1/bridge/agent-token",
        headers=jwt_auth_headers(str(user.id)),
        json={"agent_id": "reset-me"},
    ).json()
    reset = client.post(
        "/v1/bridge/agent-token",
        headers=jwt_auth_headers(str(user.id)),
        json={"agent_id": "reset-me", "reset": True},
    ).json()

    assert reset["version"] == first["version"] + 1
    assert reset["token"] != first["token"]
    claims = jwt.decode(reset["token"], settings.secret_key, algorithms=["HS256"])
    assert claims["ver"] == reset["version"]

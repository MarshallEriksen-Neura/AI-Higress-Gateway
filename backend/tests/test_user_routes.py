from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.deps import get_db, get_redis
from app.models import Base, User
from app.routes import create_app
from tests.utils import InMemoryRedis, auth_headers, jwt_auth_headers, seed_user_and_key


def _jwt_auth_headers(user_id: str) -> dict[str, str]:
    """生成 JWT 认证头（用于用户管理路由）"""
    return jwt_auth_headers(user_id)


@pytest.fixture()
def client_with_db() -> tuple[TestClient, sessionmaker[Session]]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    fake_redis = InMemoryRedis()

    app.dependency_overrides[get_db] = override_get_db
    async def override_get_redis():
        return fake_redis

    app.dependency_overrides[get_redis] = override_get_redis

    # 创建测试用的超级用户
    admin_user = None
    with TestingSessionLocal() as session:
        admin_user, _ = seed_user_and_key(session, token_plain="timeline")

    with TestClient(app, base_url="http://test") as client:
        yield client, TestingSessionLocal, str(admin_user.id)

    Base.metadata.drop_all(bind=engine)


def test_register_user_persists_record(client_with_db):
    client, session_factory, admin_id = client_with_db
    payload = {
        "username": "alice",
        "email": "alice@example.com",
        "password": "Secret123!",
        "display_name": "Alice",
        "avatar": "https://img.local/alice.png",
    }

    resp = client.post("/users", json=payload, headers=_jwt_auth_headers(admin_id))

    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == payload["username"]
    assert data["email"] == payload["email"]

    with session_factory() as session:
        saved = session.execute(
            select(User).where(User.username == payload["username"])
        ).scalars().first()
        assert saved is not None
        assert saved.hashed_password != payload["password"]


def test_register_user_duplicate_username_returns_400(client_with_db):
    client, _, admin_id = client_with_db
    base_payload = {
        "username": "bob",
        "email": "bob@example.com",
        "password": "Secret123!",
    }
    resp = client.post("/users", json=base_payload, headers=_jwt_auth_headers(admin_id))
    assert resp.status_code == 201

    resp_dup = client.post(
        "/users",
        json={**base_payload, "email": "bob-2@example.com"},
        headers=_jwt_auth_headers(admin_id),
    )
    assert resp_dup.status_code == 400
    assert resp_dup.json()["detail"]["message"] == "用户名已存在"


def test_update_user_changes_profile_and_password(client_with_db):
    client, session_factory, admin_id = client_with_db
    payload = {
        "username": "charlie",
        "email": "charlie@example.com",
        "password": "Secret123!",
    }
    resp = client.post("/users", json=payload, headers=_jwt_auth_headers(admin_id))
    assert resp.status_code == 201
    user_id = resp.json()["id"]

    with session_factory() as session:
        before_hash = session.get(User, uuid.UUID(user_id)).hashed_password

    update_payload = {
        "display_name": "Charlie 2",
        "avatar": "https://img.local/charlie.png",
        "password": "NewSecret456!",
    }
    resp_update = client.put(
        f"/users/{user_id}",
        json=update_payload,
        headers=_jwt_auth_headers(admin_id),
    )
    assert resp_update.status_code == 200
    data = resp_update.json()
    assert data["display_name"] == update_payload["display_name"]
    assert data["avatar"] == update_payload["avatar"]

    with session_factory() as session:
        updated = session.get(User, uuid.UUID(user_id))
        assert updated is not None
        assert updated.display_name == update_payload["display_name"]
        assert updated.hashed_password != before_hash


def test_update_missing_user_returns_404(client_with_db):
    client, _, admin_id = client_with_db
    resp = client.put(
        "/users/00000000-0000-0000-0000-000000000000",
        json={"display_name": "n/a"},
        headers=_jwt_auth_headers(admin_id),
    )
    assert resp.status_code == 404


def test_superuser_can_ban_user_and_revoke_access(client_with_db):
    client, _, admin_id = client_with_db

    create_payload = {
        "username": "diana",
        "email": "diana@example.com",
        "password": "Secret123!",
    }
    resp_user = client.post("/users", json=create_payload, headers=_jwt_auth_headers(admin_id))
    assert resp_user.status_code == 201
    user_id = resp_user.json()["id"]

    resp_key = client.post(
        f"/users/{user_id}/api-keys",
        json={"name": "diana-key", "expiry": "never"},
        headers=_jwt_auth_headers(admin_id),
    )
    assert resp_key.status_code == 201
    # 使用新创建用户的 JWT token
    user_headers = _jwt_auth_headers(user_id)

    resp_cache = client.put(
        f"/users/{user_id}",
        json={"display_name": "Diana"},
        headers=user_headers,
    )
    assert resp_cache.status_code == 200

    ban_resp = client.put(
        f"/users/{user_id}/status",
        json={"is_active": False},
        headers=_jwt_auth_headers(admin_id),
    )
    assert ban_resp.status_code == 200
    assert ban_resp.json()["is_active"] is False

    resp_after_ban = client.put(
        f"/users/{user_id}",
        json={"display_name": "Diana 2"},
        headers=user_headers,
    )
    assert resp_after_ban.status_code == 403
    assert resp_after_ban.json()["detail"] == "User account is disabled"


def test_non_superuser_cannot_ban_user(client_with_db):
    client, session_factory, admin_id = client_with_db

    target_payload = {
        "username": "eve",
        "email": "eve@example.com",
        "password": "Secret123!",
    }
    resp_user = client.post("/users", json=target_payload, headers=_jwt_auth_headers(admin_id))
    assert resp_user.status_code == 201
    target_id = resp_user.json()["id"]

    with session_factory() as session:
        worker_user, _ = seed_user_and_key(
            session,
            token_plain="worker",
            username="worker",
            email="worker@example.com",
            is_superuser=False,
        )

    worker_headers = _jwt_auth_headers(str(worker_user.id))
    resp_ban = client.put(
        f"/users/{target_id}/status",
        json={"is_active": False},
        headers=worker_headers,
    )

    assert resp_ban.status_code == 403

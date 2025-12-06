from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from app.routes import create_app
from app.settings import settings
from tests.utils import install_inmemory_db, jwt_auth_headers, seed_user_and_key


def _get_single_user(session: Session) -> User:
    return session.query(User).first()


def test_get_quota_for_normal_user_uses_default_limit():
    """普通用户应返回默认的私有 Provider 配额上限。"""
    app = create_app()
    SessionLocal = install_inmemory_db(app)

    # 创建一个普通用户（非超级管理员）
    with SessionLocal() as session:
        user, _ = seed_user_and_key(
            session,
            token_plain="user-token",
            username="normal-user",
            email="normal@example.com",
            is_superuser=False,
        )
        user_id = str(user.id)

    headers = jwt_auth_headers(user_id)

    with TestClient(app, base_url="http://testserver") as client:
        resp = client.get(f"/users/{user_id}/quota", headers=headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["private_provider_count"] == 0
    assert data["private_provider_limit"] == settings.default_user_private_provider_limit
    assert data["is_unlimited"] is False


def test_get_quota_forbidden_for_other_user_when_not_superuser():
    """普通用户不能查看其他用户的配额信息。"""
    app = create_app()
    SessionLocal = install_inmemory_db(app)

    with SessionLocal() as session:
        # 安装时会预置一个超级管理员
        admin = _get_single_user(session)
        assert admin is not None

        # 再创建一个普通用户
        normal_user, _ = seed_user_and_key(
            session,
            token_plain="user-token-2",
            username="normal-user-2",
            email="normal2@example.com",
            is_superuser=False,
        )

        admin_id = str(admin.id)
        normal_id = str(normal_user.id)

    # 普通用户尝试查看管理员的配额
    headers = jwt_auth_headers(normal_id)

    with TestClient(app, base_url="http://testserver") as client:
        resp = client.get(f"/users/{admin_id}/quota", headers=headers)

    assert resp.status_code == 403


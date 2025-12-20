from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import APIKey, User
from tests.utils import jwt_auth_headers


def test_list_assistants_includes_system_prompt(client: TestClient, db_session: Session):
    user = db_session.execute(select(User).where(User.email == "admin@example.com")).scalars().first()
    assert user is not None
    headers = jwt_auth_headers(str(user.id))

    api_key = db_session.execute(select(APIKey).where(APIKey.user_id == user.id)).scalars().first()
    assert api_key is not None
    project_id = str(api_key.id)

    create_resp = client.post(
        "/v1/assistants",
        headers=headers,
        json={
            "project_id": project_id,
            "name": "Assistant With Prompt",
            "system_prompt": "You are a test bot.",
            "default_logical_model": "gpt-4o",
        },
    )
    assert create_resp.status_code == 201, create_resp.text

    list_resp = client.get(f"/v1/assistants?project_id={project_id}", headers=headers)
    assert list_resp.status_code == 200, list_resp.text

    data = list_resp.json()
    assert isinstance(data.get("items"), list)
    assert any(it.get("system_prompt") == "You are a test bot." for it in data["items"])


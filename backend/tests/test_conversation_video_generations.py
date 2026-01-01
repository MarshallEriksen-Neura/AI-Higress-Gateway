from __future__ import annotations

from fastapi.testclient import TestClient

from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.models import APIKey, Provider, ProviderAPIKey, User
from app.services.encryption import encrypt_secret


def _seed_provider_with_video_model(db_session, *, provider_id: str, model_id: str, base_url: str) -> None:
    provider = Provider(
        provider_id=provider_id,
        name="Video Provider",
        base_url=base_url,
        transport="http",
        chat_completions_path="/v1/chat/completions",
        static_models=[
            {
                "id": model_id,
                "display_name": model_id,
                "family": model_id,
                "context_length": 8192,
                "capabilities": ["video_generation"],
            }
        ],
    )
    db_session.add(provider)
    db_session.flush()
    db_session.add(
        ProviderAPIKey(
            provider_uuid=provider.id,
            encrypted_key=encrypt_secret("upstream-key"),
            weight=1.0,
            status="active",
        )
    )
    db_session.commit()


def test_conversation_video_generation_persists_object_key_and_hydrates_signed_url(
    client: TestClient, db_session, monkeypatch
):
    user = db_session.query(User).first()
    api_key = db_session.query(APIKey).first()
    assert user is not None
    assert api_key is not None

    _seed_provider_with_video_model(
        db_session,
        provider_id="google-native",
        model_id="veo-3.1-generate-preview",
        base_url="https://generativelanguage.googleapis.com",
    )

    client.app.dependency_overrides[require_jwt_token] = lambda: AuthenticatedUser(
        id=str(user.id),
        username=user.username,
        email=user.email,
        is_superuser=bool(user.is_superuser),
        is_active=True,
    )

    expected_object_key = "generated-images/videos/2026/01/01/test.mp4"

    async def _fake_google_call(self, **kwargs):
        from app.schemas.video import VideoGenerationResponse, VideoObject

        return VideoGenerationResponse(
            created=1700000000,
            data=[
                VideoObject(
                    object_key=expected_object_key,
                    url=f"https://gateway.example.com/media/videos/{expected_object_key}?expires=1&sig=x",
                )
            ],
        )

    monkeypatch.setattr(
        "app.services.video_app_service.VideoAppService._call_google_veo_predict_long_running",
        _fake_google_call,
    )
    monkeypatch.setattr(
        "app.api.v1.assistant_routes.build_signed_video_url",
        lambda object_key, **_kwargs: f"https://signed.example.com/{object_key}",
    )

    resp = client.post(
        "/v1/assistants",
        json={
            "project_id": str(api_key.id),
            "name": "默认助手",
            "system_prompt": "你是一个测试助手",
            "default_logical_model": "veo-3.1-generate-preview",
        },
    )
    assert resp.status_code == 201
    assistant_id = resp.json()["assistant_id"]

    resp = client.post(
        "/v1/conversations",
        json={"assistant_id": assistant_id, "project_id": str(api_key.id), "title": "test"},
    )
    assert resp.status_code == 201
    conversation_id = resp.json()["conversation_id"]

    resp = client.post(
        f"/v1/conversations/{conversation_id}/video-generations",
        json={
            "prompt": "a lion",
            "model": "veo-3.1-generate-preview",
            "streaming": False,
        },
    )
    assert resp.status_code == 200

    resp = client.get(f"/v1/conversations/{conversation_id}/messages")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert isinstance(items, list)

    found = None
    for it in items:
        content = it.get("content") if isinstance(it, dict) else None
        if isinstance(content, dict) and content.get("type") == "video_generation":
            found = content
            break

    assert isinstance(found, dict)
    videos = found.get("videos")
    assert isinstance(videos, list) and videos
    assert videos[0]["object_key"] == expected_object_key
    assert videos[0]["url"] == f"https://signed.example.com/{expected_object_key}"

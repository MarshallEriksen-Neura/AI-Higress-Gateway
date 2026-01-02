from __future__ import annotations

import json
from urllib.parse import quote
from uuid import UUID

from fastapi.testclient import TestClient

from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.models import APIKey, User
from app.services import audio_storage_service as storage


def _auth_as(client: TestClient, user: User) -> None:
    client.app.dependency_overrides[require_jwt_token] = lambda: AuthenticatedUser(
        id=str(user.id),
        username=user.username,
        email=user.email,
        is_superuser=bool(user.is_superuser),
        is_active=True,
    )


def _create_assistant_and_conversation(
    client: TestClient, *, project_id: str, default_logical_model: str = "test-model"
) -> str:
    resp = client.post(
        "/v1/assistants",
        json={
            "project_id": project_id,
            "name": "默认助手",
            "system_prompt": "你是一个测试助手",
            "default_logical_model": default_logical_model,
        },
    )
    assert resp.status_code == 201, resp.text
    assistant_id = resp.json()["assistant_id"]

    resp = client.post(
        "/v1/conversations",
        json={"assistant_id": assistant_id, "project_id": project_id, "title": "test"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["conversation_id"]


def _create_text_message_and_get_id(client: TestClient, *, conversation_id: str) -> str:
    with client.stream(
        "POST",
        f"/v1/conversations/{conversation_id}/messages",
        json={"content": "hi", "streaming": True},
        headers={"Accept": "text/event-stream"},
    ) as response:
        assert response.status_code == 200, response.text
        created: dict | None = None
        for line in response.iter_lines():
            if not line:
                continue
            line_str = line.decode("utf-8") if isinstance(line, (bytes, bytearray)) else str(line)
            if not line_str.startswith("data: "):
                continue
            data_str = line_str[len("data: ") :]
            if data_str == "[DONE]":
                continue
            evt = json.loads(data_str)
            if evt.get("type") == "message.created":
                created = evt
        assert created is not None
        message_id = created["user_message_id"]
        UUID(message_id)
        return message_id


def test_message_speech_accepts_prompt_audio_id_and_sets_reference_audio_url(
    client: TestClient, db_session, tmp_path, monkeypatch
):
    user = db_session.query(User).first()
    api_key = db_session.query(APIKey).first()
    assert user is not None
    assert api_key is not None

    _auth_as(client, user)

    # Patch streaming executor to avoid real upstream calls.
    async def _fake_execute_run_stream(db, **kwargs):
        run = kwargs["run"]
        yield {"type": "run.delta", "delta": "Hello"}
        run.status = "succeeded"
        run.output_text = "Hello"
        run.output_preview = "Hello"
        db.add(run)
        db.commit()

    monkeypatch.setattr("app.services.chat_app_service.execute_run_stream", _fake_execute_run_stream)

    # Patch TTS generator to avoid real upstream calls and capture request.
    captured: dict[str, object] = {}

    async def _fake_generate_speech_bytes(self, request):  # noqa: ANN001
        captured["request"] = request
        return b"OK"

    monkeypatch.setattr(
        "app.api.v1.assistant_routes.TTSAppService.generate_speech_bytes",
        _fake_generate_speech_bytes,
    )

    original_mode = getattr(storage.settings, "image_storage_mode", "auto")
    original_local_dir = getattr(storage.settings, "image_local_dir", None)
    original_prefix = getattr(storage.settings, "image_oss_prefix", "")
    try:
        storage.settings.image_storage_mode = "local"
        storage.settings.image_local_dir = str(tmp_path)
        storage.settings.image_oss_prefix = "generated-images"

        conversation_id = _create_assistant_and_conversation(client, project_id=str(api_key.id))
        msg_id = _create_text_message_and_get_id(client, conversation_id=conversation_id)

        raw = b"RIFF....WAVEfmt "
        resp = client.post(
            f"/v1/conversations/{conversation_id}/audio-uploads",
            files={"file": ("ref.wav", raw, "audio/wav")},
        )
        assert resp.status_code == 201, resp.text
        uploaded = resp.json()
        audio_id = uploaded["audio_id"]
        object_key = uploaded["object_key"]
        assert isinstance(audio_id, str) and audio_id
        assert isinstance(object_key, str) and object_key

        resp = client.post(
            f"/v1/messages/{msg_id}/speech",
            json={
                "model": "test-model",
                "voice": "alloy",
                "response_format": "mp3",
                "speed": 1.0,
                "prompt_audio_id": audio_id,
            },
        )
        assert resp.status_code == 200, resp.text
        assert resp.content == b"OK"

        req = captured.get("request")
        assert req is not None
        ref_url = getattr(req, "reference_audio_url", None)
        assert ref_url is not None
        ref_url_str = str(ref_url)
        assert "/media/audio/" in ref_url_str
        assert "expires=" in ref_url_str and "sig=" in ref_url_str
        assert quote(object_key, safe="/") in ref_url_str
    finally:
        storage.settings.image_storage_mode = original_mode
        if original_local_dir is None:
            try:
                delattr(storage.settings, "image_local_dir")
            except Exception:
                pass
        else:
            storage.settings.image_local_dir = original_local_dir
        storage.settings.image_oss_prefix = original_prefix


def test_message_speech_rejects_private_prompt_audio_id_from_other_user(
    client: TestClient, db_session, tmp_path, monkeypatch
):
    owner = db_session.query(User).first()
    owner_api_key = db_session.query(APIKey).first()
    assert owner is not None
    assert owner_api_key is not None

    # Create another user + API key
    other = User(
        username="u2",
        email="u2@example.com",
        hashed_password="x",
        is_active=True,
        is_superuser=False,
    )
    db_session.add(other)
    db_session.commit()
    db_session.refresh(other)

    from app.services.api_key_service import APIKeyExpiry, build_api_key_prefix, derive_api_key_hash

    other_api_key = APIKey(
        user_id=other.id,
        name="u2-key",
        key_hash=derive_api_key_hash("u2-token"),
        key_prefix=build_api_key_prefix("u2-token"),
        expiry_type=APIKeyExpiry.NEVER.value,
        expires_at=None,
        is_active=True,
        disabled_reason=None,
    )
    db_session.add(other_api_key)
    db_session.commit()
    db_session.refresh(other_api_key)

    # Patch streaming executor to avoid real upstream calls.
    async def _fake_execute_run_stream(db, **kwargs):
        run = kwargs["run"]
        yield {"type": "run.delta", "delta": "Hello"}
        run.status = "succeeded"
        run.output_text = "Hello"
        run.output_preview = "Hello"
        db.add(run)
        db.commit()

    monkeypatch.setattr("app.services.chat_app_service.execute_run_stream", _fake_execute_run_stream)

    original_mode = getattr(storage.settings, "image_storage_mode", "auto")
    original_local_dir = getattr(storage.settings, "image_local_dir", None)
    original_prefix = getattr(storage.settings, "image_oss_prefix", "")
    try:
        storage.settings.image_storage_mode = "local"
        storage.settings.image_local_dir = str(tmp_path)
        storage.settings.image_oss_prefix = "generated-images"

        # Owner uploads a private audio asset
        _auth_as(client, owner)
        owner_conv_id = _create_assistant_and_conversation(client, project_id=str(owner_api_key.id))
        raw = b"RIFF....WAVEfmt "
        resp = client.post(
            f"/v1/conversations/{owner_conv_id}/audio-uploads",
            files={"file": ("ref.wav", raw, "audio/wav")},
        )
        assert resp.status_code == 201, resp.text
        owner_audio_id = resp.json()["audio_id"]
        assert owner_audio_id

        # Other user creates their own message, but tries to use owner's private audio
        _auth_as(client, other)
        other_conv_id = _create_assistant_and_conversation(client, project_id=str(other_api_key.id))
        other_msg_id = _create_text_message_and_get_id(client, conversation_id=other_conv_id)

        resp = client.post(
            f"/v1/messages/{other_msg_id}/speech",
            json={
                "model": "test-model",
                "voice": "alloy",
                "response_format": "mp3",
                "speed": 1.0,
                "prompt_audio_id": owner_audio_id,
            },
        )
        assert resp.status_code == 403, resp.text
    finally:
        storage.settings.image_storage_mode = original_mode
        if original_local_dir is None:
            try:
                delattr(storage.settings, "image_local_dir")
            except Exception:
                pass
        else:
            storage.settings.image_local_dir = original_local_dir
        storage.settings.image_oss_prefix = original_prefix


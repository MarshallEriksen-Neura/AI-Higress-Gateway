from __future__ import annotations

import time

from app.services.image_storage_service import build_signed_image_url
from app.settings import settings


def test_media_images_endpoint_valid_signature_returns_redirect(client, monkeypatch):
    monkeypatch.setattr(settings, "image_storage_mode", "oss", raising=False)
    object_key = "generated-images/2025/01/01/abc.png"
    signed = build_signed_image_url(object_key, base_url="http://localhost:8000", ttl_seconds=3600)
    # signed is absolute; TestClient expects path.
    path = signed.replace("http://localhost:8000", "")

    async def _fake_presign_image_get_url(key: str, *, expires_seconds: int):
        assert key == object_key
        assert 1 <= int(expires_seconds) <= 3600
        return "https://oss.example.com/presigned"

    monkeypatch.setattr(
        "app.api.v1.media_routes.presign_image_get_url",
        _fake_presign_image_get_url,
    )

    resp = client.get(path, follow_redirects=False)
    assert resp.status_code == 302
    assert resp.headers.get("location") == "https://oss.example.com/presigned"


def test_media_images_endpoint_local_mode_returns_image_bytes(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "image_storage_mode", "local", raising=False)
    monkeypatch.setattr(settings, "image_local_dir", str(tmp_path), raising=False)

    object_key = "generated-images/2025/01/01/abc.png"
    local_path = tmp_path / object_key
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(b"\x89PNG\r\n\x1a\nxxxx")

    signed = build_signed_image_url(object_key, base_url="http://localhost:8000", ttl_seconds=3600)
    path = signed.replace("http://localhost:8000", "")

    resp = client.get(path)
    assert resp.status_code == 200
    assert resp.headers.get("content-type", "").startswith("image/png")
    assert resp.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_media_images_endpoint_expired_signature_returns_403(client):
    object_key = "generated-images/2025/01/01/abc.png"
    expires = int(time.time()) - 10
    # A dummy sig; should fail due to expiry first.
    resp = client.get(f"/media/images/{object_key}?expires={expires}&sig=deadbeef")
    assert resp.status_code == 403

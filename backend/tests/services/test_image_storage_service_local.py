from __future__ import annotations

import uuid

import pytest

from app.services import image_storage_service as svc


@pytest.mark.asyncio
async def test_store_and_load_image_bytes_local(monkeypatch, tmp_path):
    original_mode = getattr(svc.settings, "image_storage_mode", "auto")
    original_local_dir = getattr(svc.settings, "image_local_dir", None)
    original_prefix = svc.settings.image_oss_prefix
    try:
        svc.settings.image_storage_mode = "local"
        svc.settings.image_local_dir = str(tmp_path)
        svc.settings.image_oss_prefix = "generated-images"

        fixed_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")
        monkeypatch.setattr(svc.uuid, "uuid4", lambda: fixed_uuid)
        monkeypatch.setattr(svc.time, "strftime", lambda *args, **kwargs: "2025/01/01")

        stored = await svc.store_image_bytes(
            b"\x89PNG\r\n\x1a\nfake",
            content_type="image/png",
        )

        expected_key = f"generated-images/2025/01/01/{fixed_uuid.hex}.png"
        assert stored.object_key == expected_key

        path = tmp_path / expected_key
        assert path.exists()

        loaded_bytes, loaded_type = await svc.load_image_bytes(stored.object_key)
        assert loaded_type == "image/png"
        assert loaded_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    finally:
        svc.settings.image_storage_mode = original_mode
        if original_local_dir is None:
            try:
                delattr(svc.settings, "image_local_dir")
            except Exception:
                pass
        else:
            svc.settings.image_local_dir = original_local_dir
        svc.settings.image_oss_prefix = original_prefix


@pytest.mark.asyncio
async def test_load_image_bytes_local_rejects_traversal(monkeypatch, tmp_path):
    original_mode = getattr(svc.settings, "image_storage_mode", "auto")
    original_local_dir = getattr(svc.settings, "image_local_dir", None)
    try:
        svc.settings.image_storage_mode = "local"
        svc.settings.image_local_dir = str(tmp_path)

        with pytest.raises(ValueError):
            await svc.load_image_bytes("generated-images/../secrets.txt")
    finally:
        svc.settings.image_storage_mode = original_mode
        if original_local_dir is None:
            try:
                delattr(svc.settings, "image_local_dir")
            except Exception:
                pass
        else:
            svc.settings.image_local_dir = original_local_dir


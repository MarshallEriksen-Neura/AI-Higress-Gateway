from __future__ import annotations

from app.api.v1.chat.transport_handlers import _build_headers
from app.schemas import ProviderConfig


def test_build_headers_merges_custom_headers():
    cfg = ProviderConfig(
        id="test-provider",
        name="Test Provider",
        base_url="https://api.example.com",
        custom_headers={"X-Test": "1"},
    )

    headers = _build_headers("test-key", cfg)

    assert headers["Authorization"] == "Bearer test-key"
    assert headers["X-Test"] == "1"


def test_build_headers_without_custom_headers():
    cfg = ProviderConfig(
        id="test-provider",
        name="Test Provider",
        base_url="https://api.example.com",
        custom_headers=None,
    )

    headers = _build_headers("test-key", cfg)

    assert headers == {"Authorization": "Bearer test-key"}


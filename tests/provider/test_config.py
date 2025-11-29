import os

from typing import List

import pytest

from service.provider.config import get_provider_config, load_provider_configs
from service.settings import settings


@pytest.fixture(autouse=True)
def reset_llm_providers_env(monkeypatch):
    """
    Ensure LLM_PROVIDERS-related env and settings are reset between tests.
    """
    original_raw = settings.llm_providers_raw
    for key in list(os.environ.keys()):
        if key.startswith("LLM_PROVIDER_"):
            monkeypatch.delenv(key, raising=False)
    settings.llm_providers_raw = None
    yield
    settings.llm_providers_raw = original_raw


def _set_provider_env(monkeypatch, provider_id: str, **values: str) -> None:
    prefix = f"LLM_PROVIDER_{provider_id}_"
    for suffix, value in values.items():
        monkeypatch.setenv(prefix + suffix, value)


def test_load_provider_configs_skips_incomplete(monkeypatch):
    settings.llm_providers_raw = "openai,bad"

    _set_provider_env(
        monkeypatch,
        "openai",
        NAME="OpenAI",
        BASE_URL="https://api.openai.com",
        API_KEY="sk-test",  # pragma: allowlist secret
        MODELS_PATH="/v1/models",
    )

    # Missing API_KEY -> should be skipped
    _set_provider_env(
        monkeypatch,
        "bad",
        NAME="Bad Provider",
        BASE_URL="https://bad.example.com",
    )

    providers = load_provider_configs()
    ids: List[str] = [p.id for p in providers]

    assert ids == ["openai"]
    cfg = providers[0]
    assert str(cfg.base_url).startswith("https://api.openai.com")
    assert cfg.models_path == "/v1/models"


def test_get_provider_config_returns_single(monkeypatch):
    settings.llm_providers_raw = "openai"
    _set_provider_env(
        monkeypatch,
        "openai",
        NAME="OpenAI",
        BASE_URL="https://api.openai.com",
        API_KEY="sk-test",  # pragma: allowlist secret
    )

    cfg = get_provider_config("openai")
    assert cfg is not None
    assert cfg.id == "openai"
    assert cfg.name == "OpenAI"

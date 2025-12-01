import os

import pytest

from app.provider.config import get_provider_config, load_provider_configs
from app.settings import settings


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
    ids: list[str] = [p.id for p in providers]

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


def test_provider_config_static_models_json(monkeypatch):
    settings.llm_providers_raw = "mock"
    _set_provider_env(
        monkeypatch,
        "mock",
        NAME="Manual Provider",
        BASE_URL="https://api.mock.local",
        API_KEY="sk-test",  # pragma: allowlist secret
        STATIC_MODELS_JSON='["model-a", {"id": "model-b", "context_length": 16384}]',
    )

    cfg = get_provider_config("mock")
    assert cfg is not None
    assert cfg.static_models is not None
    assert cfg.static_models[0]["id"] == "model-a"
    assert cfg.static_models[1]["context_length"] == 16384


def test_provider_config_static_models_file(monkeypatch, tmp_path):
    settings.llm_providers_raw = "mock"
    static_file = tmp_path / "models.json"
    static_file.write_text('[{"id": "manual-1"}]', encoding="utf-8")

    _set_provider_env(
        monkeypatch,
        "mock",
        NAME="Manual Provider",
        BASE_URL="https://api.mock.local",
        API_KEY="sk-test",  # pragma: allowlist secret
        STATIC_MODELS_FILE=str(static_file),
    )

    cfg = get_provider_config("mock")
    assert cfg is not None
    assert cfg.static_models is not None
    assert cfg.static_models[0]["id"] == "manual-1"


def test_provider_config_supports_comma_separated_keys(monkeypatch):
    settings.llm_providers_raw = "multi"
    _set_provider_env(
        monkeypatch,
        "multi",
        NAME="Multi Provider",
        BASE_URL="https://api.multi.local",
        API_KEYS="key-a, key-b ,key-c",  # pragma: allowlist secret
    )

    cfg = get_provider_config("multi")
    assert cfg is not None
    keys = cfg.get_api_keys()
    assert [k.key for k in keys] == ["key-a", "key-b", "key-c"]
    # Legacy field is set for compatibility.
    assert cfg.api_key == "key-a"  # pragma: allowlist secret


def test_provider_config_supports_api_keys_json(monkeypatch):
    settings.llm_providers_raw = "json"
    _set_provider_env(
        monkeypatch,
        "json",
        NAME="JSON Provider",
        BASE_URL="https://api.json.local",
        API_KEYS_JSON='[{"key":"k1","weight":2},{"key":"k2","max_qps":5,"label":"backup"}]',  # pragma: allowlist secret
    )

    cfg = get_provider_config("json")
    assert cfg is not None
    keys = cfg.get_api_keys()
    assert len(keys) == 2
    assert keys[0].weight == 2
    assert keys[1].max_qps == 5
    assert keys[1].label == "backup"


def test_provider_config_supports_api_keys_json_string_list(monkeypatch):
    settings.llm_providers_raw = "jsonlist"
    _set_provider_env(
        monkeypatch,
        "jsonlist",
        NAME="JSON List Provider",
        BASE_URL="https://api.json.local",
        API_KEYS_JSON='["k1","k2"]',  # pragma: allowlist secret
    )

    cfg = get_provider_config("jsonlist")
    assert cfg is not None
    keys = cfg.get_api_keys()
    assert [k.key for k in keys] == ["k1", "k2"]

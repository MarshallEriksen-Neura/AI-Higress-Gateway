"""
Provider configuration loading/parsing.

This module reads provider definitions from environment variables using
the convention documented in specs/001-model-routing/research.md:

    LLM_PROVIDERS=openai,azure,local
    LLM_PROVIDER_openai_NAME=OpenAI
    LLM_PROVIDER_openai_BASE_URL=https://api.openai.com
    LLM_PROVIDER_openai_API_KEY=...
    ...

Only providers with all required fields (NAME, BASE_URL, and at least one
API key via API_KEY/API_KEYS/API_KEYS_JSON) are
returned. Misconfigured providers are skipped with a warning so that a
single bad configuration does not break the entire gateway.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import ValidationError

from service.logging_config import logger
from service.models import ProviderAPIKey, ProviderConfig
from service.settings import settings


REQUIRED_SUFFIXES = ("NAME", "BASE_URL")

# Default retryable HTTP status codes for well-known providers, based on
# their public error semantics (rate limit + transient server errors).
_DEFAULT_RETRYABLE_STATUS_CODES_BY_PROVIDER_ID: Dict[str, List[int]] = {
    # OpenAI Chat Completions / Models:
    # - 429: rate limit / quota
    # - 500/502/503/504: transient server-side errors
    "openai": [429, 500, 502, 503, 504],
    # Anthropic Claude APIs.
    "claude": [429, 500, 502, 503, 504],
    "anthropic": [429, 500, 502, 503, 504],
    # Google Gemini / Generative Language APIs.
    "gemini": [429, 500, 502, 503, 504],
}


def _env_key(provider_id: str, suffix: str) -> str:
    return f"LLM_PROVIDER_{provider_id}_{suffix}"


_DOTENV_CACHE: Optional[Dict[str, str]] = None


def _load_env_from_dotenv() -> Dict[str, str]:
    """
    Lightweight .env parser used as a fallback when provider-specific
    environment variables are not present in os.environ.

    This allows local development (running `apiproxy` directly) to
    behave similarly to docker-compose's `env_file` behaviour without
    introducing extra dependencies.
    """
    global _DOTENV_CACHE
    if _DOTENV_CACHE is not None:
        return _DOTENV_CACHE

    env_path = os.getenv("APIPROXY_ENV_FILE", ".env")
    data: Dict[str, str] = {}

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if not stripped or stripped.startswith("#"):
                    continue
                if "=" not in stripped:
                    continue
                key, value = stripped.split("=", 1)
                key = key.strip()
                value = value.strip()
                # Trim optional surrounding quotes.
                if (value.startswith('"') and value.endswith('"')) or (
                    value.startswith("'") and value.endswith("'")
                ):
                    value = value[1:-1]
                if key:
                    data[key] = value
    except FileNotFoundError:
        # No local .env file; treat as empty.
        data = {}
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.warning("Failed to load .env file %s: %s", env_path, exc)
        data = {}

    _DOTENV_CACHE = data
    return data


def _load_raw_provider_env(provider_id: str) -> Dict[str, str]:
    """
    Load raw environment variables for a given provider id.
    Keys are suffixes (NAME, BASE_URL, ...) rather than full env keys.
    """
    raw: Dict[str, str] = {}
    for suffix in [
        "NAME",
        "BASE_URL",
        "TRANSPORT",
        "API_KEY",
        "API_KEYS",
        "API_KEYS_JSON",
        "MODELS_PATH",
        "MESSAGES_PATH",
        "WEIGHT",
        "REGION",
        "COST_INPUT",
        "COST_OUTPUT",
        "MAX_QPS",
        "RETRYABLE_STATUS_CODES",
        "STATIC_MODELS_JSON",
        "STATIC_MODELS_FILE",
    ]:
        env_var = _env_key(provider_id, suffix)
        value = os.getenv(env_var)
        if value is None:
            # Fallback to .env contents for local development when the
            # environment variable is not exported by the shell.
            dotenv_env = _load_env_from_dotenv()
            value = dotenv_env.get(env_var)
        if value is not None:
            raw[suffix] = value
    return raw


def _parse_status_code_list(value: str) -> List[int]:
    """
    Parse a comma-separated list of HTTP status codes or ranges into integers.

    Examples:
        "429,500,502-504" -> [429, 500, 502, 503, 504]
    """
    result: List[int] = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start_s, end_s = part.split("-", 1)
            try:
                start = int(start_s)
                end = int(end_s)
            except ValueError:
                logger.warning(
                    "Invalid status code range %r in RETRYABLE_STATUS_CODES, skipping",
                    part,
                )
                continue
            if start > end:
                start, end = end, start
            for code in range(start, end + 1):
                if code not in result:
                    result.append(code)
        else:
            try:
                code = int(part)
            except ValueError:
                logger.warning(
                    "Invalid status code %r in RETRYABLE_STATUS_CODES, skipping",
                    part,
                )
                continue
            if code not in result:
                result.append(code)
    return result


def _default_retryable_status_codes(provider_id: str) -> List[int] | None:
    """
    Return built-in retryable status codes for well-known providers
    (openai / gemini / claude) when RETRYABLE_STATUS_CODES is not set.
    """
    key = provider_id.lower()
    return _DEFAULT_RETRYABLE_STATUS_CODES_BY_PROVIDER_ID.get(key)


def _coerce_static_models(
    provider_id: str, payload: Any
) -> List[Dict[str, Any]] | None:
    """
    Ensure that a static models payload is a list of dicts, tolerating
    a single dict or a list of strings as shorthand.
    """
    if payload is None:
        return None

    entries: List[Any]
    if isinstance(payload, list):
        entries = payload
    elif isinstance(payload, dict):
        entries = [payload]
    else:
        logger.warning(
            "Provider %s: STATIC_MODELS payload must be a list/dict; got %r",
            provider_id,
            type(payload),
        )
        return None

    result: List[Dict[str, Any]] = []
    for item in entries:
        if isinstance(item, dict):
            # Accept either "id" or "model_id" while normalising.
            normalised = dict(item)
            if "id" not in normalised and "model_id" in normalised:
                normalised["id"] = normalised["model_id"]
            result.append(normalised)
        elif isinstance(item, str):
            result.append({"id": item})
        else:
            logger.warning(
                "Provider %s: skipping invalid STATIC_MODELS entry %r",
                provider_id,
                item,
            )
    return result or None


def _load_static_models_from_json(
    provider_id: str, value: str
) -> List[Dict[str, Any]] | None:
    try:
        payload = json.loads(value)
    except json.JSONDecodeError as exc:
        logger.warning(
            "Provider %s: invalid STATIC_MODELS_JSON payload: %s",
            provider_id,
            exc,
        )
        return None
    return _coerce_static_models(provider_id, payload)


def _load_static_models_from_file(
    provider_id: str, file_path: str
) -> List[Dict[str, Any]] | None:
    path = Path(file_path).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.warning(
            "Provider %s: STATIC_MODELS_FILE not found at %s",
            provider_id,
            path,
        )
        return None
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.warning(
            "Provider %s: failed reading STATIC_MODELS_FILE %s: %s",
            provider_id,
            path,
            exc,
        )
        return None
    return _load_static_models_from_json(provider_id, text)


def _parse_provider_config(provider_id: str, raw: Dict[str, str]) -> ProviderConfig | None:
    """
    Convert raw env values into a ProviderConfig instance.
    Returns None if required fields are missing or validation fails.
    """
    # Ensure all required fields are present.
    missing = [s for s in REQUIRED_SUFFIXES if s not in raw]
    if missing:
        logger.warning(
            "Skipping provider %s due to missing required config: %s",
            provider_id,
            ", ".join(missing),
        )
        return None

    data: Dict[str, object] = {
        "id": provider_id,
        "name": raw["NAME"],
        "base_url": raw["BASE_URL"],
    }

    transport = raw.get("TRANSPORT", "http").lower()
    if transport not in ("http", "sdk"):
        logger.warning(
            "Provider %s: invalid TRANSPORT=%r, falling back to http",
            provider_id,
            raw.get("TRANSPORT"),
        )
        transport = "http"
    data["transport"] = transport

    api_keys: List[ProviderAPIKey] | None = None
    if "API_KEYS_JSON" in raw:
        try:
            payload = json.loads(raw["API_KEYS_JSON"])
            if isinstance(payload, list):
                api_keys = []
                for entry in payload:
                    if isinstance(entry, dict):
                        api_keys.append(ProviderAPIKey(**entry))
                    elif isinstance(entry, str):
                        api_keys.append(ProviderAPIKey(key=entry))
                    else:
                        logger.warning(
                            "Provider %s: skipping invalid API_KEYS_JSON entry %r",
                            provider_id,
                            entry,
                        )
            else:
                logger.warning(
                    "Provider %s: API_KEYS_JSON must be a list of objects, got %r",
                    provider_id,
                    type(payload),
                )
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning(
                "Provider %s: invalid API_KEYS_JSON payload: %s", provider_id, exc
            )
    elif "API_KEYS" in raw:
        items = [item.strip() for item in raw["API_KEYS"].split(",") if item.strip()]
        if items:
            api_keys = [
                ProviderAPIKey(key=value, label=f"key{idx + 1}")
                for idx, value in enumerate(items)
            ]

    if api_keys:
        data["api_keys"] = api_keys
        # Also set the legacy single-key field for compatibility paths.
        data["api_key"] = api_keys[0].key
    elif "API_KEY" in raw:
        data["api_key"] = raw["API_KEY"]
    else:
        logger.warning(
            "Skipping provider %s because no API key was configured "
            "(API_KEY / API_KEYS / API_KEYS_JSON)",
            provider_id,
        )
        return None

    if "MODELS_PATH" in raw:
        data["models_path"] = raw["MODELS_PATH"]
    if "MESSAGES_PATH" in raw:
        value = raw["MESSAGES_PATH"].strip()
        data["messages_path"] = value or None

    # Optional numeric fields with safe parsing.
    if "WEIGHT" in raw:
        try:
            data["weight"] = float(raw["WEIGHT"])
        except ValueError:
            logger.warning(
                "Provider %s: invalid WEIGHT=%r, using default",
                provider_id,
                raw["WEIGHT"],
            )
    if "COST_INPUT" in raw:
        try:
            data["cost_input"] = float(raw["COST_INPUT"])
        except ValueError:
            logger.warning(
                "Provider %s: invalid COST_INPUT=%r, ignoring",
                provider_id,
                raw["COST_INPUT"],
            )
    if "COST_OUTPUT" in raw:
        try:
            data["cost_output"] = float(raw["COST_OUTPUT"])
        except ValueError:
            logger.warning(
                "Provider %s: invalid COST_OUTPUT=%r, ignoring",
                provider_id,
                raw["COST_OUTPUT"],
            )
    if "MAX_QPS" in raw:
        try:
            data["max_qps"] = int(raw["MAX_QPS"])
        except ValueError:
            logger.warning(
                "Provider %s: invalid MAX_QPS=%r, ignoring",
                provider_id,
                raw["MAX_QPS"],
            )
    if "REGION" in raw:
        data["region"] = raw["REGION"]

    # Retryable HTTP status codes for cross-provider failover.
    retryable_status_codes = None
    if "RETRYABLE_STATUS_CODES" in raw:
        retryable_status_codes = _parse_status_code_list(raw["RETRYABLE_STATUS_CODES"])
    else:
        retryable_status_codes = _default_retryable_status_codes(provider_id)

    if retryable_status_codes:
        data["retryable_status_codes"] = retryable_status_codes

    static_models: List[Dict[str, Any]] | None = None
    if "STATIC_MODELS_JSON" in raw:
        static_models = _load_static_models_from_json(
            provider_id, raw["STATIC_MODELS_JSON"]
        )
    elif "STATIC_MODELS_FILE" in raw:
        static_models = _load_static_models_from_file(
            provider_id, raw["STATIC_MODELS_FILE"]
        )
    if static_models is not None:
        data["static_models"] = static_models

    try:
        return ProviderConfig(**data)
    except ValidationError as exc:
        logger.warning(
            "Skipping provider %s due to validation error: %s",
            provider_id,
            exc,
        )
        return None


def load_provider_configs() -> List[ProviderConfig]:
    """
    Load all configured providers from environment, skipping invalid ones.
    """
    ids = settings.get_llm_provider_ids()
    providers: List[ProviderConfig] = []
    for provider_id in ids:
        raw = _load_raw_provider_env(provider_id)
        if not raw:
            logger.warning(
                "Provider %s listed in LLM_PROVIDERS but has no env config; skipping",
                provider_id,
            )
            continue
        cfg = _parse_provider_config(provider_id, raw)
        if cfg is not None:
            providers.append(cfg)
    return providers


def get_provider_config(provider_id: str) -> ProviderConfig | None:
    """
    Convenience helper to load a single provider config by id.
    """
    for cfg in load_provider_configs():
        if cfg.id == provider_id:
            return cfg
    return None


__all__ = ["load_provider_configs", "get_provider_config"]

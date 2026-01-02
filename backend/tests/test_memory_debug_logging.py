import logging
from pathlib import Path

import app.logging_config as logging_config
from app.settings import settings


def _clear_handlers(logger: logging.Logger) -> None:
    for h in list(logger.handlers):
        logger.removeHandler(h)
        try:
            h.close()
        except Exception:
            pass


def _reset_logging_state() -> None:
    logging_config._LOGGING_CONFIGURED = False  # type: ignore[attr-defined]
    _clear_handlers(logging.getLogger("apiproxy"))
    _clear_handlers(logging.getLogger("apiproxy.image_debug"))
    _clear_handlers(logging.getLogger("apiproxy.memory_debug"))
    _clear_handlers(logging.getLogger("uvicorn"))
    _clear_handlers(logging.getLogger("uvicorn.error"))
    _clear_handlers(logging.getLogger("uvicorn.access"))


def test_memory_debug_logger_enabled_in_development(tmp_path: Path, monkeypatch) -> None:
    _reset_logging_state()
    monkeypatch.setattr(settings, "log_dir", str(tmp_path), raising=False)
    monkeypatch.setattr(settings, "environment", "development", raising=False)

    logging_config.setup_logging()

    mem_logger = logging.getLogger("apiproxy.memory_debug")
    mem_logger.debug("memory debug hello")

    candidates = list(tmp_path.glob("*/memory-debug.log"))
    assert candidates, "memory-debug.log should be created in development"
    content = candidates[0].read_text(encoding="utf-8")
    assert "memory debug hello" in content


def test_memory_debug_logger_silent_in_production(tmp_path: Path, monkeypatch) -> None:
    _reset_logging_state()
    monkeypatch.setattr(settings, "log_dir", str(tmp_path), raising=False)
    monkeypatch.setattr(settings, "environment", "production", raising=False)

    logging_config.setup_logging()

    mem_logger = logging.getLogger("apiproxy.memory_debug")
    mem_logger.debug("memory debug should not write")

    candidates = list(tmp_path.glob("*/memory-debug.log"))
    assert not candidates, "memory-debug.log should not be created in production"

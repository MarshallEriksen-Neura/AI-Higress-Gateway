from pathlib import Path

import app.logging_config as logging_config


def test_resolve_log_dir_defaults_under_backend_root() -> None:
    backend_root = Path(logging_config.__file__).resolve().parents[1]
    assert logging_config._resolve_log_dir("logs") == backend_root / "logs"


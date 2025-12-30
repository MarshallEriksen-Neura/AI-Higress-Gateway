from __future__ import annotations

from pathlib import Path

from alembic.config import Config


def test_alembic_ini_paths_resolve_via_here_token() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    cfg = Config(str(backend_dir / "alembic.ini"))

    assert cfg.get_main_option("path_separator") == "os"
    assert cfg.get_main_option("script_location") == str(backend_dir / "alembic")
    assert cfg.get_main_option("version_locations") == str(backend_dir / "alembic" / "versions")
    assert cfg.get_main_option("prepend_sys_path") == str(backend_dir)


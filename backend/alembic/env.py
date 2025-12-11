from __future__ import annotations

import pathlib
import sys

from alembic import context
from alembic.config import Config as AlembicConfig
from sqlalchemy import engine_from_config, pool

BASE_DIR = pathlib.Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from app.models import Base  # noqa: E402
from app.settings import settings  # noqa: E402


target_metadata = Base.metadata


def _configure_alembic() -> AlembicConfig:
    """
    确保 Alembic Config 始终使用 settings.database_url。
    仅在 Alembic CLI 运行时被调用，此时 context 已初始化。
    """
    cfg = context.config
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    return cfg


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""

    cfg = _configure_alembic()
    context.configure(
        url=cfg.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    cfg = _configure_alembic()
    connectable = engine_from_config(
        cfg.get_section(cfg.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


def _in_alembic_context() -> bool:
    """
    当 env.py 被普通 Python 代码 import 时，context.get_context()
    会抛 Exception；只有在 Alembic CLI 运行时才会成功。
    """
    try:
        context.get_context()
        return True
    except (NameError, Exception):
        return False


if _in_alembic_context():
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()

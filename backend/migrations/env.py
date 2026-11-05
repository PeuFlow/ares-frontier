"""Alembic uses the same settings and declarative metadata as the API."""

from logging.config import fileConfig

from alembic import context
from alembic.util import CommandError
from sqlalchemy import create_engine, pool
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.database.base import Base
from app.database.url import psycopg_url
import app.models  # noqa: F401 -- register all six tables in Base.metadata


config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
settings = get_settings()
database_url = settings.direct_database_url or settings.database_url
if not database_url:
    raise CommandError("Configure DIRECT_DATABASE_URL or DATABASE_URL in backend/.env.")


def run_migrations_offline() -> None:
    context.configure(
        url=psycopg_url(database_url),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(
        psycopg_url(database_url),
        poolclass=pool.NullPool,
        hide_parameters=True,
        connect_args={"connect_timeout": 15},
    )
    try:
        with engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    except SQLAlchemyError as error:
        # Driver errors may contain credentials or full connection URLs.
        raise CommandError(
            f"Migration failed ({type(error).__name__}). "
            "Check connectivity and schema compatibility; credentials omitted."
        ) from None
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

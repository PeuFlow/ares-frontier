
from sqlalchemy import create_engine

from app.core.config import get_settings
from app.database.url import psycopg_url


settings = get_settings()

database_url = settings.database_url

engine = None

if database_url:
    engine = create_engine(
        psycopg_url(database_url),
        pool_pre_ping=True,
        hide_parameters=True,
        connect_args={"connect_timeout": 15},
    )

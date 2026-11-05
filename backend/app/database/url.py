"""Normalize PostgreSQL URLs without logging connection credentials."""

from sqlalchemy.engine import URL, make_url


def psycopg_url(value: str) -> URL:
    url = make_url(value)
    if url.drivername not in {"postgres", "postgresql", "postgresql+psycopg"}:
        raise ValueError("Use a PostgreSQL URL with the Psycopg 3 driver.")
    return url.set(drivername="postgresql+psycopg")

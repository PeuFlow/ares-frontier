
from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ares Frontier API"
    gemini_api_key: SecretStr | None = Field(default=None, repr=False)
    gemini_model: str | None = None

    database_url: str | None = Field(default=None, repr=False)
    direct_database_url: str | None = Field(default=None, repr=False)
    session_cookie_secure: bool = False
    session_ttl_seconds: int = Field(default=604800, ge=60, le=2592000)

    frontend_origins: str = (
        "http://localhost:8080,"
        "http://127.0.0.1:8080,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()

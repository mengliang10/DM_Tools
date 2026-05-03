"""Centralised settings loaded from environment / .env file."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = False

    # LLM
    LLM_TIMEOUT: float = 120.0
    LLM_RETRY_ATTEMPTS: int = 3
    LLM_RETRY_MIN_WAIT: float = 4.0
    LLM_RETRY_MAX_WAIT: float = 10.0

    # Encryption
    ENCRYPTION_KEY: str = ""

    # Optional integrations
    RAINDROP_TOKEN: str = ""
    RAINDROP_CLIENT_ID: str = ""
    RAINDROP_CLIENT_SECRET: str = ""
    PAGESPEED_API_KEY: str = ""

    # Paths
    DATA_DIR: Path = PROJECT_ROOT / "data"
    DB_PATH: Path = PROJECT_ROOT / "data" / "dm_tools.db"
    FRONTEND_DIST: Path = PROJECT_ROOT / "frontend" / "dist"


settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)

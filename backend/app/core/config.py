from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────
    app_name: str = "ThinkSync Models"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True
    secret_key: str = Field(default="change-me-at-least-32-chars!!", min_length=32)
    cors_origins: str = "*"
    admin_email: str = ""

    # ── Server ─────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

    # ── Supabase ───────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    # ── Database ───────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./thinksync.db"
    database_pool_size: int = 20
    database_max_overflow: int = 40

    # ── Redis ──────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    redis_pool_size: int = 20

    # ── SiliconFlow ────────────────────────────────────────────
    siliconflow_api_key: str = ""
    thinksync_provider: str = "siliconflow"

    # ── Rate Limiting ──────────────────────────────────────────
    rate_limit_rpm_default: int = 60
    rate_limit_tpm_default: int = 100000
    rate_limit_rpm_premium: int = 300
    rate_limit_tpm_premium: int = 500000

    # ── Logging ────────────────────────────────────────────────
    log_level: str = "INFO"
    log_format: str = "json"

    # ── Derived ────────────────────────────────────────────────

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_testing(self) -> bool:
        return self.environment == "test"

    @field_validator("database_url", mode="before")
    @classmethod
    def coerce_sqlite_url(cls, v: str) -> str:
        """Allow a bare file path for SQLite convenience in dev/test."""
        if v and not v.startswith(("postgresql", "sqlite", "mysql")):
            return f"sqlite+aiosqlite:///{v}"
        return v


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
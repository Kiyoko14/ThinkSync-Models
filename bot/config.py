"""Bot configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class BotConfig:
    """Bot configuration loaded from environment."""

    bot_token: str
    api_base_url: str
    admin_email: str
    default_language: str = "uz"
    debug: bool = False

    @classmethod
    def from_env(cls) -> "BotConfig":
        return cls(
            bot_token=os.getenv("BOT_TOKEN", ""),
            api_base_url=os.getenv("API_BASE_URL", "http://localhost:8000"),
            admin_email=os.getenv("ADMIN_EMAIL", "jdusi908@gmail.com"),
            default_language=os.getenv("DEFAULT_LANGUAGE", "uz"),
            debug=os.getenv("BOT_DEBUG", "false").lower() == "true",
        )


config = BotConfig.from_env()

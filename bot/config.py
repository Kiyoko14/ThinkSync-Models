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
    max_messages_per_minute: int = 20
    max_payments_per_hour: int = 5
    payment_timeout_seconds: int = 300
    low_balance_threshold: int = 1000

    @classmethod
    def from_env(cls) -> "BotConfig":
        return cls(
            bot_token=os.getenv("BOT_TOKEN", ""),
            api_base_url=os.getenv("API_BASE_URL", "http://localhost:8000"),
            admin_email=os.getenv("ADMIN_EMAIL", "jdusi908@gmail.com"),
            default_language=os.getenv("DEFAULT_LANGUAGE", "uz"),
            debug=os.getenv("BOT_DEBUG", "false").lower() == "true",
            max_messages_per_minute=int(os.getenv("MAX_MESSAGES_PER_MINUTE", "20")),
            max_payments_per_hour=int(os.getenv("MAX_PAYMENTS_PER_HOUR", "5")),
            payment_timeout_seconds=int(os.getenv("PAYMENT_TIMEOUT_SECONDS", "300")),
            low_balance_threshold=int(os.getenv("LOW_BALANCE_THRESHOLD", "1000")),
        )


config = BotConfig.from_env()

"""Security middleware: rate limiting, flood control, anti-spam."""

from __future__ import annotations

import time
from typing import ClassVar

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject

from bot.config import config
from bot.services.auth import session_manager


class RateLimiter:
    """Simple in-memory rate limiter per user."""

    _messages: ClassVar[dict[int, list[float]]] = {}
    _payments: ClassVar[dict[int, list[float]]] = {}
    _callbacks: ClassVar[dict[int, list[float]]] = {}

    @classmethod
    def _is_rate_limited(cls, user_id: int, bucket: dict[int, list[float]], max_count: int, window: int) -> bool:
        now = time.time()
        entries = bucket.get(user_id, [])
        entries = [t for t in entries if now - t < window]
        bucket[user_id] = entries
        if len(entries) >= max_count:
            return True
        entries.append(now)
        return False

    @classmethod
    def is_message_limited(cls, user_id: int) -> bool:
        return cls._is_rate_limited(user_id, cls._messages, config.max_messages_per_minute, 60)

    @classmethod
    def is_payment_limited(cls, user_id: int) -> bool:
        return cls._is_rate_limited(user_id, cls._payments, config.max_payments_per_hour, 3600)

    @classmethod
    def is_callback_limited(cls, user_id: int) -> bool:
        return cls._is_rate_limited(user_id, cls._callbacks, 60, 60)


class SecurityMiddleware(BaseMiddleware):
    """Middleware for rate limiting and flood control."""

    async def __call__(self, handler, event: TelegramObject, data: dict):
        user_id = None
        if isinstance(event, Message):
            user_id = event.from_user.id if event.from_user else None
        elif isinstance(event, CallbackQuery):
            user_id = event.from_user.id if event.from_user else None

        if user_id is None:
            return await handler(event, data)

        # Check invalid session cleanup
        if session_manager.is_authenticated(user_id):
            token = session_manager.get_token(user_id)
            if not token or not token.strip():
                session_manager.clear_session(user_id)
                data["is_authenticated"] = False
                data["token"] = None

        # Rate limit messages
        if isinstance(event, Message):
            if RateLimiter.is_message_limited(user_id):
                from bot.services.i18n import t
                lang = session_manager.get_language(user_id)
                await event.answer(t("common.rate_limit", lang))
                return None

        # Rate limit callbacks
        if isinstance(event, CallbackQuery):
            if RateLimiter.is_callback_limited(user_id):
                await event.answer("Too fast", show_alert=True)
                return None

        # Payment rate limiting injected into data
        data["payment_limited"] = RateLimiter.is_payment_limited(user_id)

        return await handler(event, data)

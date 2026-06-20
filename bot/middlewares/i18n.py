"""Language middleware for aiogram."""

from __future__ import annotations

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject

from bot.services.auth import session_manager


class I18nMiddleware(BaseMiddleware):
    """Middleware that attaches language to handler data."""

    async def __call__(self, handler, event: TelegramObject, data: dict):
        user_id = None
        if isinstance(event, Message):
            user_id = event.from_user.id if event.from_user else None
        elif isinstance(event, CallbackQuery):
            user_id = event.from_user.id if event.from_user else None

        if user_id:
            data["language"] = session_manager.get_language(user_id)
        else:
            data["language"] = "uz"

        return await handler(event, data)

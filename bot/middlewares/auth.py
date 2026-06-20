"""Auth middleware for aiogram."""

from __future__ import annotations

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject

from bot.services.auth import session_manager


class AuthMiddleware(BaseMiddleware):
    """Middleware that adds auth status to handler data."""

    async def __call__(self, handler, event: TelegramObject, data: dict):
        user_id = None
        if isinstance(event, Message):
            user_id = event.from_user.id if event.from_user else None
        elif isinstance(event, CallbackQuery):
            user_id = event.from_user.id if event.from_user else None

        if user_id:
            data["is_authenticated"] = session_manager.is_authenticated(user_id)
            data["is_admin"] = session_manager.is_admin(user_id)
            data["token"] = session_manager.get_token(user_id)
        else:
            data["is_authenticated"] = False
            data["is_admin"] = False
            data["token"] = None

        return await handler(event, data)

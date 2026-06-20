"""Pytest fixtures."""

from __future__ import annotations

import pytest
import pytest_asyncio
from aiogram import Bot
from aiogram.types import Chat, Message, User

from bot.services.auth import SessionManager, session_manager


@pytest.fixture(autouse=True)
def reset_sessions():
    """Clear all sessions before each test."""
    SessionManager._sessions.clear()
    SessionManager._otps.clear()
    yield


@pytest.fixture
def mock_user():
    return User(id=123456, is_bot=False, first_name="Test", username="testuser")


@pytest.fixture
def mock_chat():
    return Chat(id=123456, type="private")


@pytest.fixture
def mock_message(mock_user, mock_chat):
    return Message(
        message_id=1,
        date=0,
        chat=mock_chat,
        from_user=mock_user,
        text="test",
    )


@pytest_asyncio.fixture
async def mock_bot():
    bot = Bot(token="1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
    yield bot
    await bot.session.close()

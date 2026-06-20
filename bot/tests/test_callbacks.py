"""Tests for callback handlers."""

from __future__ import annotations

import pytest
from aiogram.fsm.context import FSMContext

from bot.handlers.callbacks import router
from bot.services.auth import SessionManager, UserSession, session_manager


class FakeCallback:
    def __init__(self, data, user_id=123456):
        self.data = data
        self.from_user = type("User", (), {"id": user_id})()
        self.message = FakeMessage()

    async def answer(self, text=None, show_alert=False):
        self.message._answers.append(("callback_answer", text, show_alert))


class FakeMessage:
    def __init__(self):
        self._answers = []
        self._edited = []

    async def edit_text(self, text, **kwargs):
        self._edited.append((text, kwargs))

    async def answer(self, text, **kwargs):
        self._answers.append((text, kwargs))


class FakeState:
    def __init__(self):
        self._state = None
        self._data = {}

    async def set_state(self, state):
        self._state = state

    async def update_data(self, **kwargs):
        self._data.update(kwargs)

    async def get_data(self):
        return self._data


@pytest.mark.asyncio
async def test_lang_callback():
    from bot.handlers.callbacks import process_lang_callback
    cb = FakeCallback("lang:en")
    await process_lang_callback(cb)
    assert len(cb.message._edited) == 1
    assert session_manager.get_language(123456) == "en"


@pytest.mark.asyncio
async def test_back_callback():
    from bot.handlers.callbacks import process_back
    cb = FakeCallback("menu:back")
    await process_back(cb, language="uz")
    assert len(cb.message._edited) == 1


@pytest.mark.asyncio
async def test_admin_unauthorized_callback():
    from bot.handlers.callbacks import process_admin_stats
    cb = FakeCallback("admin:stats", user_id=999)
    await process_admin_stats(cb, is_admin=False, token=None, language="uz")
    assert len(cb.message._answers) == 1
    assert "callback_answer" in str(cb.message._answers[0])

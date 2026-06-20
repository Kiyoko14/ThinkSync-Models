"""Tests for bot commands."""

from __future__ import annotations

import pytest
from aiogram import F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot.handlers.commands import router
from bot.services.auth import SessionManager, UserSession, session_manager
from bot.services.i18n import t
from bot.states import AuthState


class FakeMessage:
    def __init__(self, text="", user_id=123456, chat_id=123456):
        self.text = text
        self.from_user = type("User", (), {"id": user_id})()
        self.chat = type("Chat", (), {"id": chat_id})()
        self.message_id = 1
        self._answers = []
        self._edited = []

    async def answer(self, text, **kwargs):
        self._answers.append((text, kwargs))
        return self

    async def edit_text(self, text, **kwargs):
        self._edited.append((text, kwargs))
        return self


class FakeState:
    def __init__(self):
        self._state = None
        self._data = {}

    async def set_state(self, state):
        self._state = state

    async def clear(self):
        self._state = None
        self._data = {}

    async def update_data(self, **kwargs):
        self._data.update(kwargs)

    async def get_data(self):
        return self._data


# ── Start ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_start_command():
    from bot.handlers.commands import cmd_start
    msg = FakeMessage()
    await cmd_start(msg, language="uz")
    assert len(msg._answers) == 1
    assert t("start.welcome", "uz") in msg._answers[0][0]


@pytest.mark.asyncio
async def test_start_command_ru():
    from bot.handlers.commands import cmd_start
    msg = FakeMessage()
    await cmd_start(msg, language="ru")
    assert len(msg._answers) == 1
    assert t("start.welcome", "ru") in msg._answers[0][0]


# ── Login / Auth ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_not_authenticated():
    from bot.handlers.commands import cmd_login
    msg = FakeMessage(user_id=999)
    state = FakeState()
    await cmd_login(msg, state, language="uz")
    assert state._state == AuthState.waiting_email
    assert len(msg._answers) == 1
    assert "email" in msg._answers[0][0].lower() or "Email" in msg._answers[0][0]


@pytest.mark.asyncio
async def test_login_already_authenticated():
    from bot.handlers.commands import cmd_login
    session_manager.set_session(
        111,
        UserSession(user_id=111, token="thc_test", email="test@test.com", language="uz"),
    )
    msg = FakeMessage(user_id=111)
    state = FakeState()
    await cmd_login(msg, state, language="uz")
    assert len(msg._answers) == 1
    assert "allaqachon" in msg._answers[0][0].lower() or "already" in msg._answers[0][0].lower()


@pytest.mark.asyncio
async def test_process_email_invalid():
    from bot.handlers.commands import process_email
    msg = FakeMessage(text="not-an-email")
    state = FakeState()
    await process_email(msg, state, language="uz")
    assert state._state is None
    assert len(msg._answers) == 1
    assert "noto'g'ri" in msg._answers[0][0].lower() or "invalid" in msg._answers[0][0].lower()


@pytest.mark.asyncio
async def test_process_email_valid():
    from bot.handlers.commands import process_email
    msg = FakeMessage(text="user@test.com")
    state = FakeState()
    await process_email(msg, state, language="uz")
    assert state._state == AuthState.waiting_otp
    assert len(msg._answers) == 1
    assert "kod" in msg._answers[0][0].lower() or "code" in msg._answers[0][0].lower()


@pytest.mark.asyncio
async def test_process_otp_invalid():
    from bot.handlers.commands import process_otp
    session_manager.create_otp(222, "user@test.com")
    msg = FakeMessage(text="000000", user_id=222)
    state = FakeState()
    await process_otp(msg, state, language="uz")
    assert len(msg._answers) == 1
    assert "noto'g'ri" in msg._answers[0][0].lower() or "invalid" in msg._answers[0][0].lower()


@pytest.mark.asyncio
async def test_process_otp_valid():
    from bot.handlers.commands import process_otp
    code = session_manager.create_otp(333, "user@test.com")
    msg = FakeMessage(text=code, user_id=333)
    state = FakeState()
    await process_otp(msg, state, language="uz")
    assert state._state is None
    assert len(msg._answers) == 1
    assert "kirdingiz" in msg._answers[0][0].lower() or "logged" in msg._answers[0][0].lower()
    assert session_manager.is_authenticated(333)


# ── Profile ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_profile_not_logged_in():
    from bot.handlers.commands import cmd_profile
    msg = FakeMessage(user_id=444)
    await cmd_profile(msg, token=None, language="uz")
    assert len(msg._answers) == 1
    assert "kirmagansiz" in msg._answers[0][0].lower() or "not logged" in msg._answers[0][0].lower()


@pytest.mark.asyncio
async def test_profile_logged_in():
    from bot.handlers.commands import cmd_profile
    session_manager.set_session(
        555,
        UserSession(user_id=555, token="thc_test", email="test@thinksync.ai", language="uz"),
    )
    msg = FakeMessage(user_id=555)
    await cmd_profile(msg, token="thc_test", language="uz")
    assert len(msg._answers) == 1
    assert "test@thinksync.ai" in msg._answers[0][0]


# ── Help ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_help_command():
    from bot.handlers.commands import cmd_help
    msg = FakeMessage()
    await cmd_help(msg, language="uz")
    assert len(msg._answers) == 1
    assert "/start" in msg._answers[0][0]
    assert "/login" in msg._answers[0][0]
    assert "/help" in msg._answers[0][0]


# ── Cancel ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cancel_command():
    from bot.handlers.commands import cmd_cancel
    msg = FakeMessage()
    state = FakeState()
    await cmd_cancel(msg, state, language="uz")
    assert state._state is None
    assert len(msg._answers) == 1
    assert "bekor" in msg._answers[0][0].lower() or "cancel" in msg._answers[0][0].lower()


# ── Admin ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_unauthorized():
    from bot.handlers.commands import cmd_admin
    msg = FakeMessage(user_id=666)
    await cmd_admin(msg, is_admin=False, language="uz")
    assert len(msg._answers) == 1
    assert "admin huquqi" in msg._answers[0][0].lower() or "admin" in msg._answers[0][0].lower()


@pytest.mark.asyncio
async def test_admin_authorized():
    from bot.handlers.commands import cmd_admin
    msg = FakeMessage(user_id=777)
    session_manager.set_session(
        777,
        UserSession(user_id=777, token="thc_admin", email="jdusi908@gmail.com", is_admin=True, language="uz"),
    )
    await cmd_admin(msg, is_admin=True, language="uz")
    assert len(msg._answers) == 1
    assert "Admin" in msg._answers[0][0]


@pytest.mark.asyncio
async def test_stats_unauthorized():
    from bot.handlers.commands import cmd_stats
    msg = FakeMessage(user_id=888)
    await cmd_stats(msg, is_admin=False, token=None, language="uz")
    assert len(msg._answers) == 1
    assert "admin" in msg._answers[0][0].lower()

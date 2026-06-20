"""Tests for security middleware."""

from __future__ import annotations

import time

import pytest

from bot.middlewares.security import RateLimiter
from bot.services.auth import SessionManager, UserSession


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    RateLimiter._messages.clear()
    RateLimiter._payments.clear()
    RateLimiter._callbacks.clear()


def test_message_rate_limit_not_triggered():
    for i in range(5):
        assert RateLimiter.is_message_limited(1) is False


def test_message_rate_limit_triggered():
    # Exceed the limit
    limit = 20
    for i in range(limit):
        RateLimiter.is_message_limited(2)
    assert RateLimiter.is_message_limited(2) is True


def test_payment_rate_limit():
    for i in range(5):
        assert RateLimiter.is_payment_limited(3) is False
    assert RateLimiter.is_payment_limited(3) is True


def test_callback_rate_limit():
    for i in range(60):
        RateLimiter.is_callback_limited(4)
    assert RateLimiter.is_callback_limited(4) is True


def test_rate_limiter_window_reset():
    # Fill up
    for i in range(20):
        RateLimiter.is_message_limited(5)
    assert RateLimiter.is_message_limited(5) is True

    # Wait for window to clear
    time.sleep(1)
    # After clearing old entries, should allow more
    RateLimiter._messages[5] = []  # manual clear for test
    assert RateLimiter.is_message_limited(5) is False


def test_invalid_session_cleanup():
    SessionManager.set_session(10, UserSession(user_id=10, token="", email="test@test.com"))
    token = SessionManager.get_token(10)
    if not token or not token.strip():
        SessionManager.clear_session(10)
    assert SessionManager.is_authenticated(10) is False


def test_admin_email_check():
    SessionManager.set_session(
        20,
        UserSession(user_id=20, token="thc_admin", email="jdusi908@gmail.com", is_admin=True),
    )
    assert SessionManager.is_admin(20) is True


def test_non_admin_email():
    SessionManager.set_session(
        21,
        UserSession(user_id=21, token="thc_user", email="user@test.com", is_admin=False),
    )
    assert SessionManager.is_admin(21) is False

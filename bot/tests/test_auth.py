"""Tests for authentication."""

from __future__ import annotations

import pytest

from bot.services.auth import SessionManager, UserSession


@pytest.fixture(autouse=True)
def reset_sessions():
    SessionManager._sessions.clear()
    SessionManager._otps.clear()


def test_generate_otp():
    otp = SessionManager.generate_otp()
    assert len(otp) == 6
    assert otp.isdigit()


def test_create_otp():
    code = SessionManager.create_otp(1, "test@test.com")
    assert len(code) == 6
    assert code.isdigit()
    assert SessionManager.get_pending_email(1) == "test@test.com"


def test_verify_otp_success():
    code = SessionManager.create_otp(2, "test@test.com")
    assert SessionManager.verify_otp(2, code) is True
    assert SessionManager.get_pending_email(2) is None


def test_verify_otp_failure():
    SessionManager.create_otp(3, "test@test.com")
    assert SessionManager.verify_otp(3, "000000") is False
    assert SessionManager.verify_otp(3, "000000") is False
    assert SessionManager.verify_otp(3, "000000") is False
    # After 3 attempts, OTP is deleted
    assert SessionManager.verify_otp(3, "000000") is False


def test_set_get_session():
    session = UserSession(user_id=4, token="thc_test", email="test@test.com")
    SessionManager.set_session(4, session)
    assert SessionManager.is_authenticated(4) is True
    retrieved = SessionManager.get_session(4)
    assert retrieved.email == "test@test.com"
    assert retrieved.token == "thc_test"


def test_clear_session():
    SessionManager.set_session(5, UserSession(user_id=5, token="thc_test", email="test@test.com"))
    SessionManager.clear_session(5)
    assert SessionManager.is_authenticated(5) is False


def test_admin_check():
    SessionManager.set_session(
        6,
        UserSession(user_id=6, token="thc_admin", email="jdusi908@gmail.com", is_admin=True),
    )
    assert SessionManager.is_admin(6) is True


def test_non_admin_check():
    SessionManager.set_session(
        7,
        UserSession(user_id=7, token="thc_user", email="user@test.com", is_admin=False),
    )
    assert SessionManager.is_admin(7) is False


def test_language_storage():
    SessionManager.set_language(8, "ru")
    assert SessionManager.get_language(8) == "ru"
    SessionManager.set_language(8, "en")
    assert SessionManager.get_language(8) == "en"


def test_default_language():
    assert SessionManager.get_language(999) == "uz"

"""Tests for localization."""

from __future__ import annotations

import pytest

from bot.services.i18n import t


@pytest.mark.parametrize("lang,key,expected", [
    ("uz", "start.welcome", "Assalomu alaykum"),
    ("ru", "start.welcome", "Здравствуйте"),
    ("en", "start.welcome", "Hello"),
    ("uz", "auth.login_prompt", "email"),
    ("ru", "auth.login_prompt", "ваш email"),
    ("en", "auth.login_prompt", "email"),
])
def test_localization_keys(lang, key, expected):
    result = t(key, lang)
    assert expected in result


def test_localization_fallback():
    """Unknown key returns the key itself."""
    result = t("nonexistent.key", "en")
    assert result == "nonexistent.key"


def test_localization_with_kwargs():
    result = t("auth.otp_sent", "en", email="test@test.com", code="123456")
    assert "test@test.com" in result
    assert "123456" in result


def test_localization_missing_lang_fallback():
    """Missing language falls back to English."""
    result = t("start.welcome", "xx")
    assert "Hello" in result

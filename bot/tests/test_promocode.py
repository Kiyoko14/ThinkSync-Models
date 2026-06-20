"""Tests for promocode system."""

from __future__ import annotations

import pytest

from bot.services.notifications import NotificationManager, NotificationType


@pytest.fixture(autouse=True)
def reset_notifications():
    NotificationManager._notifications.clear()
    NotificationManager._counter = 0


def test_promocode_notification():
    user_id = 200
    ntf = NotificationManager.add(
        user_id,
        NotificationType.promocode_activated,
        "Promocode applied",
        "Bonus: 1000 tokens, Discount: 10%",
        {"bonus": 1000, "discount": 10},
    )
    assert ntf.type == NotificationType.promocode_activated
    assert ntf.data["bonus"] == 1000
    assert NotificationManager.get_unread_count(user_id) == 1


def test_promocode_expired_notification():
    user_id = 201
    ntf = NotificationManager.add(
        user_id,
        NotificationType.promocode_expired,
        "Promocode expired",
        "Code SUMMER2024 expired",
    )
    assert ntf.type == NotificationType.promocode_expired
    assert ntf.is_read is False

"""Tests for notification system."""

from __future__ import annotations

import pytest

from bot.services.notifications import NotificationManager, NotificationType


@pytest.fixture(autouse=True)
def reset_notifications():
    NotificationManager._notifications.clear()
    NotificationManager._counter = 0


def test_add_notification():
    ntf = NotificationManager.add(1, NotificationType.payment_success, "Payment OK", "+100 tokens")
    assert ntf.notification_id.startswith("NTF-")
    assert ntf.user_id == 1
    assert ntf.is_read is False


def test_list_for_user():
    NotificationManager.add(2, NotificationType.payment_success, "A", "Msg")
    NotificationManager.add(2, NotificationType.low_balance, "B", "Msg")
    NotificationManager.add(3, NotificationType.payment_success, "C", "Msg")
    assert len(NotificationManager.list_for_user(2)) == 2
    assert len(NotificationManager.list_for_user(3)) == 1


def test_unread_only():
    NotificationManager.add(4, NotificationType.payment_success, "A", "Msg")
    NotificationManager.add(4, NotificationType.payment_success, "B", "Msg")
    assert len(NotificationManager.list_for_user(4, unread_only=True)) == 2
    NotificationManager.mark_all_read(4)
    assert len(NotificationManager.list_for_user(4, unread_only=True)) == 0


def test_mark_read():
    ntf = NotificationManager.add(5, NotificationType.payment_success, "A", "Msg")
    assert NotificationManager.mark_read(ntf.notification_id) is True
    assert ntf.is_read is True


def test_get_unread_count():
    NotificationManager.add(6, NotificationType.payment_success, "A", "Msg")
    NotificationManager.add(6, NotificationType.low_balance, "B", "Msg")
    assert NotificationManager.get_unread_count(6) == 2


def test_notification_types():
    for ntype in NotificationType:
        ntf = NotificationManager.add(7, ntype, f"Title {ntype.value}", f"Msg {ntype.value}")
        assert ntf.type == ntype


def test_clear_user():
    NotificationManager.add(8, NotificationType.payment_success, "A", "Msg")
    NotificationManager.add(8, NotificationType.payment_failed, "B", "Msg")
    NotificationManager.clear_user(8)
    assert len(NotificationManager.list_for_user(8)) == 0

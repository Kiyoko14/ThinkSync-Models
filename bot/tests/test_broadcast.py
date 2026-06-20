"""Tests for broadcast system."""

from __future__ import annotations

import pytest

from bot.services.auth import SessionManager, UserSession
from bot.services.notifications import NotificationManager, NotificationType


@pytest.fixture(autouse=True)
def reset_sessions():
    SessionManager._sessions.clear()
    SessionManager._otps.clear()
    NotificationManager._notifications.clear()
    NotificationManager._counter = 0


def test_broadcast_notification_added():
    user_id = 100
    SessionManager.set_session(user_id, UserSession(user_id=user_id, token="thc_1", email="test@test.com"))
    ntf = NotificationManager.add(user_id, NotificationType.broadcast, "Test", "Hello all")
    assert ntf.user_id == user_id
    assert ntf.type == NotificationType.broadcast
    assert ntf.is_read is False


def test_broadcast_notification_list():
    user_id = 101
    NotificationManager.add(user_id, NotificationType.broadcast, "A", "Msg A")
    NotificationManager.add(user_id, NotificationType.broadcast, "B", "Msg B")
    assert len(NotificationManager.list_for_user(user_id)) == 2


def test_broadcast_notification_unread():
    user_id = 102
    NotificationManager.add(user_id, NotificationType.broadcast, "A", "Msg")
    assert NotificationManager.get_unread_count(user_id) == 1
    NotificationManager.mark_all_read(user_id)
    assert NotificationManager.get_unread_count(user_id) == 0


def test_broadcast_notification_clear():
    user_id = 103
    NotificationManager.add(user_id, NotificationType.broadcast, "A", "Msg")
    NotificationManager.clear_user(user_id)
    assert len(NotificationManager.list_for_user(user_id)) == 0

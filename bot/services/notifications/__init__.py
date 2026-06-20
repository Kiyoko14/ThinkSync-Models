"""Notification system for ThinkSync Bot."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar


class NotificationType(Enum):
    payment_success = "payment_success"
    payment_failed = "payment_failed"
    package_expired = "package_expired"
    package_expiring = "package_expiring"
    low_balance = "low_balance"
    promocode_activated = "promocode_activated"
    promocode_expired = "promocode_expired"
    admin_announcement = "admin_announcement"
    broadcast = "broadcast"
    ticket_reply = "ticket_reply"
    ticket_resolved = "ticket_resolved"


@dataclass
class Notification:
    """A notification record."""

    notification_id: str
    user_id: int
    type: NotificationType
    title: str
    message: str
    data: dict[str, Any] = field(default_factory=dict)
    is_read: bool = False
    created_at: float = field(default_factory=time.time)


class NotificationManager:
    """In-memory notification store."""

    _notifications: ClassVar[dict[str, Notification]] = {}
    _counter: ClassVar[int] = 0

    @classmethod
    def _generate_id(cls) -> str:
        cls._counter += 1
        return f"NTF-{cls._counter:05d}"

    @classmethod
    def add(cls, user_id: int, type: NotificationType, title: str, message: str, data: dict[str, Any] | None = None) -> Notification:
        ntf_id = cls._generate_id()
        ntf = Notification(
            notification_id=ntf_id,
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            data=data or {},
        )
        cls._notifications[ntf_id] = ntf
        return ntf

    @classmethod
    def list_for_user(cls, user_id: int, unread_only: bool = False) -> list[Notification]:
        notifications = [n for n in cls._notifications.values() if n.user_id == user_id]
        if unread_only:
            notifications = [n for n in notifications if not n.is_read]
        return sorted(notifications, key=lambda n: n.created_at, reverse=True)

    @classmethod
    def mark_read(cls, notification_id: str) -> bool:
        ntf = cls._notifications.get(notification_id)
        if ntf:
            ntf.is_read = True
            return True
        return False

    @classmethod
    def mark_all_read(cls, user_id: int) -> int:
        count = 0
        for ntf in cls._notifications.values():
            if ntf.user_id == user_id and not ntf.is_read:
                ntf.is_read = True
                count += 1
        return count

    @classmethod
    def get_unread_count(cls, user_id: int) -> int:
        return len([n for n in cls._notifications.values() if n.user_id == user_id and not n.is_read])

    @classmethod
    def clear_user(cls, user_id: int) -> None:
        to_remove = [nid for nid, n in cls._notifications.items() if n.user_id == user_id]
        for nid in to_remove:
            cls._notifications.pop(nid, None)


notification_manager = NotificationManager()

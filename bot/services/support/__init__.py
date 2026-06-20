"""Support ticket system for ThinkSync Bot."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import ClassVar


class TicketStatus(Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


@dataclass
class TicketMessage:
    """A single message in a ticket thread."""

    sender_id: int
    sender_type: str  # "user" or "admin"
    text: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class SupportTicket:
    """Support ticket with threaded messages."""

    ticket_id: str
    user_id: int
    user_email: str
    status: TicketStatus
    subject: str
    messages: list[TicketMessage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def add_message(self, sender_id: int, sender_type: str, text: str) -> None:
        self.messages.append(TicketMessage(sender_id, sender_type, text))
        self.updated_at = time.time()

    def close(self) -> None:
        self.status = TicketStatus.closed
        self.updated_at = time.time()

    def resolve(self) -> None:
        self.status = TicketStatus.resolved
        self.updated_at = time.time()

    def reopen(self) -> None:
        self.status = TicketStatus.in_progress
        self.updated_at = time.time()


class TicketManager:
    """In-memory ticket store."""

    _tickets: ClassVar[dict[str, SupportTicket]] = {}
    _counter: ClassVar[int] = 0

    @classmethod
    def _generate_id(cls) -> str:
        cls._counter += 1
        return f"TKT-{cls._counter:05d}"

    @classmethod
    def create_ticket(cls, user_id: int, user_email: str, subject: str, text: str) -> SupportTicket:
        ticket_id = cls._generate_id()
        ticket = SupportTicket(
            ticket_id=ticket_id,
            user_id=user_id,
            user_email=user_email,
            status=TicketStatus.open,
            subject=subject,
        )
        ticket.add_message(user_id, "user", text)
        cls._tickets[ticket_id] = ticket
        return ticket

    @classmethod
    def get_ticket(cls, ticket_id: str) -> SupportTicket | None:
        return cls._tickets.get(ticket_id)

    @classmethod
    def list_tickets(cls, user_id: int | None = None, status: TicketStatus | None = None) -> list[SupportTicket]:
        tickets = list(cls._tickets.values())
        if user_id is not None:
            tickets = [t for t in tickets if t.user_id == user_id]
        if status is not None:
            tickets = [t for t in tickets if t.status == status]
        return sorted(tickets, key=lambda t: t.updated_at, reverse=True)

    @classmethod
    def list_open_tickets(cls) -> list[SupportTicket]:
        return [t for t in cls._tickets.values() if t.status in (TicketStatus.open, TicketStatus.in_progress)]

    @classmethod
    def add_reply(cls, ticket_id: str, sender_id: int, sender_type: str, text: str) -> SupportTicket | None:
        ticket = cls._tickets.get(ticket_id)
        if ticket:
            ticket.add_message(sender_id, sender_type, text)
        return ticket

    @classmethod
    def close_ticket(cls, ticket_id: str) -> SupportTicket | None:
        ticket = cls._tickets.get(ticket_id)
        if ticket:
            ticket.close()
        return ticket

    @classmethod
    def resolve_ticket(cls, ticket_id: str) -> SupportTicket | None:
        ticket = cls._tickets.get(ticket_id)
        if ticket:
            ticket.resolve()
        return ticket

    @classmethod
    def get_stats(cls) -> dict:
        all_tickets = list(cls._tickets.values())
        return {
            "total": len(all_tickets),
            "open": len([t for t in all_tickets if t.status == TicketStatus.open]),
            "in_progress": len([t for t in all_tickets if t.status == TicketStatus.in_progress]),
            "resolved": len([t for t in all_tickets if t.status == TicketStatus.resolved]),
            "closed": len([t for t in all_tickets if t.status == TicketStatus.closed]),
        }


ticket_manager = TicketManager()

"""Tests for support ticket system."""

from __future__ import annotations

import pytest

from bot.services.support import TicketManager, TicketStatus, ticket_manager


@pytest.fixture(autouse=True)
def reset_tickets():
    TicketManager._tickets.clear()
    TicketManager._counter = 0


def test_create_ticket():
    ticket = TicketManager.create_ticket(1, "user@test.com", "Payment issue", "I cannot pay")
    assert ticket.ticket_id.startswith("TKT-")
    assert ticket.status == TicketStatus.open
    assert ticket.user_id == 1
    assert len(ticket.messages) == 1
    assert ticket.messages[0].text == "I cannot pay"


def test_get_ticket():
    ticket = TicketManager.create_ticket(2, "a@test.com", "Test", "Test message")
    retrieved = TicketManager.get_ticket(ticket.ticket_id)
    assert retrieved is not None
    assert retrieved.ticket_id == ticket.ticket_id


def test_list_tickets():
    TicketManager.create_ticket(3, "a@test.com", "T1", "M1")
    TicketManager.create_ticket(3, "a@test.com", "T2", "M2")
    TicketManager.create_ticket(4, "b@test.com", "T3", "M3")

    assert len(TicketManager.list_tickets(user_id=3)) == 2
    assert len(TicketManager.list_tickets()) == 3


def test_list_open_tickets():
    t1 = TicketManager.create_ticket(5, "a@test.com", "Open", "Msg")
    t2 = TicketManager.create_ticket(6, "b@test.com", "InProgress", "Msg")
    t2.reopen()  # Set to in_progress instead of resolved
    t3 = TicketManager.create_ticket(7, "c@test.com", "Closed", "Msg")
    TicketManager.close_ticket(t3.ticket_id)

    open_tickets = TicketManager.list_open_tickets()
    assert len(open_tickets) == 2  # open + in_progress
    assert t1.ticket_id in [t.ticket_id for t in open_tickets]
    assert t2.ticket_id in [t.ticket_id for t in open_tickets]
    assert t3.ticket_id not in [t.ticket_id for t in open_tickets]


def test_add_reply():
    ticket = TicketManager.create_ticket(8, "a@test.com", "Test", "Initial")
    TicketManager.add_reply(ticket.ticket_id, 999, "admin", "We are looking into it")
    updated = TicketManager.get_ticket(ticket.ticket_id)
    assert len(updated.messages) == 2
    assert updated.messages[1].sender_type == "admin"


def test_close_ticket():
    ticket = TicketManager.create_ticket(9, "a@test.com", "Test", "Msg")
    TicketManager.close_ticket(ticket.ticket_id)
    updated = TicketManager.get_ticket(ticket.ticket_id)
    assert updated.status == TicketStatus.closed


def test_resolve_ticket():
    ticket = TicketManager.create_ticket(10, "a@test.com", "Test", "Msg")
    TicketManager.resolve_ticket(ticket.ticket_id)
    updated = TicketManager.get_ticket(ticket.ticket_id)
    assert updated.status == TicketStatus.resolved


def test_reopen_ticket():
    ticket = TicketManager.create_ticket(11, "a@test.com", "Test", "Msg")
    TicketManager.resolve_ticket(ticket.ticket_id)
    ticket.reopen()
    assert ticket.status == TicketStatus.in_progress


def test_ticket_stats():
    TicketManager.create_ticket(12, "a@test.com", "O1", "M")
    TicketManager.create_ticket(13, "b@test.com", "O2", "M")
    t3 = TicketManager.create_ticket(14, "c@test.com", "R1", "M")
    TicketManager.resolve_ticket(t3.ticket_id)

    stats = TicketManager.get_stats()
    assert stats["total"] == 3
    assert stats["open"] == 2
    assert stats["resolved"] == 1
    assert stats["closed"] == 0

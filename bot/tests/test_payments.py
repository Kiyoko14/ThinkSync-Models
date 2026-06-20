"""Tests for payment flows."""

from __future__ import annotations

import pytest

from bot.services.payments import PaymentProvider, PaymentStatus, PaymentTracker
from bot.services.payments.click import click_gateway
from bot.services.payments.payme import payme_gateway
from bot.services.payments.stripe import stripe_gateway


@pytest.fixture(autouse=True)
def reset_payments():
    PaymentTracker._payments.clear()


@pytest.mark.asyncio
async def test_stripe_create_payment():
    gateway = stripe_gateway
    intent = await gateway.create_payment(29.99, "USD", "pkg_starter", 123)
    assert intent.provider == PaymentProvider.stripe
    assert intent.status == PaymentStatus.pending
    assert intent.amount == 29.99
    assert intent.user_id == 123
    assert intent.checkout_url.startswith("https://")
    assert "stripe" in intent.payment_id


@pytest.mark.asyncio
async def test_click_create_payment():
    gateway = click_gateway
    intent = await gateway.create_payment(50.00, "UZS", "pkg_pro", 456)
    assert intent.provider == PaymentProvider.click
    assert intent.status == PaymentStatus.pending
    assert intent.amount == 50.00
    assert "click" in intent.payment_id


@pytest.mark.asyncio
async def test_payme_create_payment():
    gateway = payme_gateway
    intent = await gateway.create_payment(99.99, "UZS", "pkg_enterprise", 789)
    assert intent.provider == PaymentProvider.payme
    assert intent.status == PaymentStatus.pending
    assert intent.amount == 99.99
    assert "payme" in intent.payment_id


@pytest.mark.asyncio
async def test_stripe_verify_success():
    gateway = stripe_gateway
    intent = await gateway.create_payment(10.0, "USD", "pkg_test", 111)
    result = await gateway.verify_payment(intent.payment_id)
    assert result.success is True
    assert result.status == PaymentStatus.success


@pytest.mark.asyncio
async def test_stripe_cancel():
    gateway = stripe_gateway
    intent = await gateway.create_payment(10.0, "USD", "pkg_test", 111)
    result = await gateway.cancel_payment(intent.payment_id)
    assert result.status == PaymentStatus.cancelled


@pytest.mark.asyncio
async def test_payment_tracker():
    intent = await stripe_gateway.create_payment(20.0, "USD", "pkg_test", 222)
    PaymentTracker.add(intent)

    assert PaymentTracker.get(intent.payment_id) is not None
    assert PaymentTracker.get_by_user(222)
    assert PaymentTracker.get_pending(222) is not None

    PaymentTracker.update_status(intent.payment_id, PaymentStatus.success)
    updated = PaymentTracker.get(intent.payment_id)
    assert updated.status == PaymentStatus.success

    PaymentTracker.clear_user(222)
    assert not PaymentTracker.get_by_user(222)


def test_payment_tracker_no_pending():
    assert PaymentTracker.get_pending(999) is None

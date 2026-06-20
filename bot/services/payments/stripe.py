"""Stripe payment gateway implementation."""

from __future__ import annotations

import logging
from typing import Any

from bot.config import config
from bot.services.payments import PaymentGateway, PaymentIntent, PaymentProvider, PaymentResult, PaymentStatus

logger = logging.getLogger(__name__)


class StripeGateway:
    """Stripe payment gateway (demo implementation)."""

    provider = PaymentProvider.stripe

    async def create_payment(self, amount: float, currency: str, package_id: str, user_id: int, metadata: dict[str, Any] | None = None) -> PaymentIntent:
        """Create a Stripe payment intent.

        In production, this calls Stripe API to create a Checkout Session.
        For demo, generates a mock payment intent.
        """
        import uuid

        payment_id = f"stripe_{uuid.uuid4().hex[:12]}"
        checkout_url = f"https://checkout.stripe.com/pay/{payment_id}"

        intent = PaymentIntent(
            payment_id=payment_id,
            provider=self.provider,
            amount=amount,
            currency=currency,
            package_id=package_id,
            user_id=user_id,
            status=PaymentStatus.pending,
            checkout_url=checkout_url,
            metadata=metadata or {},
        )
        logger.info(f"Stripe payment created: {payment_id} for user {user_id}")
        return intent

    async def verify_payment(self, payment_id: str) -> PaymentResult:
        """Verify Stripe payment status.

        In production, calls Stripe API to retrieve session/payment intent.
        For demo, simulates success.
        """
        return PaymentResult(
            success=True,
            payment_id=payment_id,
            status=PaymentStatus.success,
            message="Payment confirmed via Stripe",
        )

    async def cancel_payment(self, payment_id: str) -> PaymentResult:
        """Cancel a Stripe payment intent."""
        return PaymentResult(
            success=True,
            payment_id=payment_id,
            status=PaymentStatus.cancelled,
            message="Payment cancelled",
        )


stripe_gateway = StripeGateway()

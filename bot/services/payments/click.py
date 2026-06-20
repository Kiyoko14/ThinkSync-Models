"""Click payment gateway implementation."""

from __future__ import annotations

import logging
from typing import Any

from bot.services.payments import PaymentIntent, PaymentProvider, PaymentResult, PaymentStatus

logger = logging.getLogger(__name__)


class ClickGateway:
    """Click (Uzbekistan) payment gateway (demo implementation)."""

    provider = PaymentProvider.click

    async def create_payment(self, amount: float, currency: str, package_id: str, user_id: int, metadata: dict[str, Any] | None = None) -> PaymentIntent:
        """Create a Click payment.

        In production, integrates with Click API.
        For demo, generates a mock payment intent.
        """
        import uuid

        payment_id = f"click_{uuid.uuid4().hex[:12]}"
        # Click uses UZS by default
        checkout_url = f"https://my.click.uz/services/pay?service_id=demo&merchant_id=demo&amount={amount}"

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
        logger.info(f"Click payment created: {payment_id} for user {user_id}")
        return intent

    async def verify_payment(self, payment_id: str) -> PaymentResult:
        """Verify Click payment status."""
        return PaymentResult(
            success=True,
            payment_id=payment_id,
            status=PaymentStatus.success,
            message="Payment confirmed via Click",
        )

    async def cancel_payment(self, payment_id: str) -> PaymentResult:
        """Cancel a Click payment."""
        return PaymentResult(
            success=True,
            payment_id=payment_id,
            status=PaymentStatus.cancelled,
            message="Payment cancelled",
        )


click_gateway = ClickGateway()

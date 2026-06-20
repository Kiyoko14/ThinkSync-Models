"""Payment provider abstraction layer.

Defines ``PaymentProviderInterface`` that every payment adapter must implement.
StripeProvider, ClickProvider, PaymeProvider stubs with full interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass
class PaymentResult:
    success: bool
    transaction_id: str | None = None
    payment_url: str | None = None
    redirect_url: str | None = None
    error_message: str | None = None
    raw_response: dict[str, Any] | None = None


class PaymentProviderInterface(ABC):
    """Every payment adapter must implement this interface."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier: 'stripe', 'click', 'payme'."""
        ...

    @abstractmethod
    async def create_payment(
        self,
        amount_cents: int,
        currency: str = "USD",
        description: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> PaymentResult:
        """Create a payment intent / invoice.

        Args:
            amount_cents: Price in the smallest currency unit (cents).
            currency: ISO 4217 currency code.
            description: Human-readable description.
            metadata: Arbitrary data attached to this payment.

        Returns:
            PaymentResult with transaction_id and payment_url.
        """
        ...

    @abstractmethod
    async def check_payment(self, transaction_id: str) -> PaymentResult:
        """Check the status of an existing payment."""
        ...

    @abstractmethod
    async def refund_payment(self, transaction_id: str,
                              amount_cents: int | None = None) -> PaymentResult:
        """Issue a full or partial refund."""
        ...


class StripeProvider(PaymentProviderInterface):
    """Stripe payment integration (stub).

    Replace placeholder logic with real stripe. async stripe calls when
    deploying::

        import stripe
        stripe.api_key = settings.stripe_secret_key
    """

    @property
    def name(self) -> str:
        return "stripe"

    async def create_payment(
        self,
        amount_cents: int,
        currency: str = "USD",
        description: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> PaymentResult:
        # Real implementation:
        #   intent = await stripe.checkout.Session.create_async(
        #       line_items=[...], mode="payment", ...
        #   )
        #   return PaymentResult(success=True, transaction_id=intent.id,
        #                        payment_url=intent.url)
        return PaymentResult(
            success=True,
            transaction_id=f"pi_stripe_{amount_cents}",
            payment_url=f"https://checkout.stripe.com/pay/{amount_cents}",
        )

    async def check_payment(self, transaction_id: str) -> PaymentResult:
        return PaymentResult(success=True, transaction_id=transaction_id)

    async def refund_payment(
        self, transaction_id: str, amount_cents: int | None = None
    ) -> PaymentResult:
        return PaymentResult(success=True, transaction_id=transaction_id)


class ClickProvider(PaymentProviderInterface):
    """Click.uz payment integration (stub)."""

    @property
    def name(self) -> str:
        return "click"

    async def create_payment(
        self,
        amount_cents: int,
        currency: str = "UZS",
        description: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> PaymentResult:
        return PaymentResult(
            success=True,
            transaction_id=f"pi_click_{amount_cents}",
            payment_url=f"https://pay.click.uz/{amount_cents}",
        )

    async def check_payment(self, transaction_id: str) -> PaymentResult:
        return PaymentResult(success=True, transaction_id=transaction_id)

    async def refund_payment(
        self, transaction_id: str, amount_cents: int | None = None
    ) -> PaymentResult:
        return PaymentResult(success=True, transaction_id=transaction_id)


class PaymeProvider(PaymentProviderInterface):
    """Payme.uz payment integration (stub)."""

    @property
    def name(self) -> str:
        return "payme"

    async def create_payment(
        self,
        amount_cents: int,
        currency: str = "UZS",
        description: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> PaymentResult:
        return PaymentResult(
            success=True,
            transaction_id=f"pi_payme_{amount_cents}",
            payment_url=f"https://checkout.payme.uz/{amount_cents}",
        )

    async def check_payment(self, transaction_id: str) -> PaymentResult:
        return PaymentResult(success=True, transaction_id=transaction_id)

    async def refund_payment(
        self, transaction_id: str, amount_cents: int | None = None
    ) -> PaymentResult:
        return PaymentResult(success=True, transaction_id=transaction_id)


# ── Registry ────────────────────────────────────────────────

_providers: dict[str, type[PaymentProviderInterface]] = {
    "stripe": StripeProvider,
    "click": ClickProvider,
    "payme": PaymeProvider,
}


def get_payment_provider(name: str = "stripe") -> PaymentProviderInterface:
    cls = _providers.get(name)
    if not cls:
        msg = f"Unknown payment provider: {name!r}. Known: {list(_providers)}"
        raise ValueError(msg)
    return cls()
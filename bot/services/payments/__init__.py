"""Payment provider abstractions for ThinkSync Bot."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol


class PaymentStatus(Enum):
    pending = "pending"
    processing = "processing"
    success = "success"
    failed = "failed"
    cancelled = "cancelled"


class PaymentProvider(Enum):
    stripe = "stripe"
    click = "click"
    payme = "payme"


@dataclass
class PaymentIntent:
    """Payment intent created by a provider."""

    payment_id: str
    provider: PaymentProvider
    amount: float
    currency: str
    package_id: str
    user_id: int
    status: PaymentStatus
    checkout_url: str = ""
    metadata: dict[str, Any] | None = None


@dataclass
class PaymentResult:
    """Result of a payment verification."""

    success: bool
    payment_id: str
    status: PaymentStatus
    message: str = ""
    metadata: dict[str, Any] | None = None


class PaymentGateway(Protocol):
    """Protocol for payment gateways."""

    async def create_payment(self, amount: float, currency: str, package_id: str, user_id: int, metadata: dict[str, Any] | None = None) -> PaymentIntent:
        """Create a payment intent and return checkout details."""
        ...

    async def verify_payment(self, payment_id: str) -> PaymentResult:
        """Verify payment status by provider payment ID."""
        ...

    async def cancel_payment(self, payment_id: str) -> PaymentResult:
        """Cancel a pending payment."""
        ...


# In-memory payment tracking
class PaymentTracker:
    """Track payment intents in memory."""

    _payments: dict[str, PaymentIntent] = {}

    @classmethod
    def add(cls, payment: PaymentIntent) -> None:
        cls._payments[payment.payment_id] = payment

    @classmethod
    def get(cls, payment_id: str) -> PaymentIntent | None:
        return cls._payments.get(payment_id)

    @classmethod
    def update_status(cls, payment_id: str, status: PaymentStatus) -> None:
        payment = cls._payments.get(payment_id)
        if payment:
            payment.status = status

    @classmethod
    def get_by_user(cls, user_id: int) -> list[PaymentIntent]:
        return [p for p in cls._payments.values() if p.user_id == user_id]

    @classmethod
    def get_pending(cls, user_id: int) -> PaymentIntent | None:
        for p in cls._payments.values():
            if p.user_id == user_id and p.status in (PaymentStatus.pending, PaymentStatus.processing):
                return p
        return None

    @classmethod
    def clear_user(cls, user_id: int) -> None:
        to_remove = [pid for pid, p in cls._payments.items() if p.user_id == user_id]
        for pid in to_remove:
            cls._payments.pop(pid, None)


payment_tracker = PaymentTracker()

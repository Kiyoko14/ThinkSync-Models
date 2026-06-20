"""Phase 2 — Monetization: packages, balance, promocodes.

New models appended to the Phase 1 schema.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models import TimestampMixin, Profile


# ── Enums ───────────────────────────────────────────────────

class PackageStatus(str, enum.Enum):
    active = "active"
    archived = "archived"
    hidden = "hidden"


class TransactionType(str, enum.Enum):
    deposit = "deposit"
    charge = "charge"
    refund = "refund"
    promo_bonus = "promo_bonus"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class PromocodeDiscountType(str, enum.Enum):
    percentage = "percentage"
    fixed_amount = "fixed_amount"
    bonus_tokens = "bonus_tokens"


# ── Package ─────────────────────────────────────────────────

class Package(Base, TimestampMixin):
    """Token package available for purchase."""

    __tablename__ = "packages"

    id: Mapped[str] = mapped_column(
        String(255), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Token amount the user receives
    token_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    # Bonus tokens (promotional)
    bonus_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Price in USD cents (stripe-compatible)
    price_usd_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    # Display price as e.g. "$9.99"
    display_price: Mapped[str] = mapped_column(String(32), nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[PackageStatus] = mapped_column(
        Enum(PackageStatus), default=PackageStatus.active, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Package {self.name} {self.token_amount}t ${self.display_price}>"


# ── User Package (active package purchase) ──────────────────

class UserPackage(Base, TimestampMixin):
    """Tracks a user's purchased/active token package."""

    __tablename__ = "user_packages"

    id: Mapped[str] = mapped_column(
        String(255), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    package_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("packages.id", ondelete="RESTRICT"), nullable=False
    )
    # Tokens remaining in this package
    tokens_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    tokens_initial: Mapped[int] = mapped_column(Integer, nullable=False)
    # Payment provider used
    payment_provider: Mapped[str] = mapped_column(String(32), default="manual", nullable=False)
    payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    profile: Mapped[Profile] = relationship("Profile")
    package: Mapped[Package] = relationship("Package")

    __table_args__ = (
        Index("ix_user_packages_active", "profile_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<UserPackage {self.id[:8]} {self.tokens_remaining}/{self.tokens_initial}t>"


# ── Balance Transaction ─────────────────────────────────────

class BalanceTransaction(Base, TimestampMixin):
    """Atomic record of every balance change."""

    __tablename__ = "balance_transactions"

    id: Mapped[str] = mapped_column(
        String(255), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Positive = deposit/credit, negative = charge/debit
    amount: Mapped[int] = mapped_column(Integer, nullable=False, comment="Amount in token units")
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType), nullable=False
    )
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), default=TransactionStatus.completed, nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # Reference to related entities
    reference_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Payment metadata
    payment_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    profile: Mapped[Profile] = relationship("Profile")

    __table_args__ = (
        Index("ix_balance_tx_profile_created", "profile_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<BalanceTransaction {self.id[:8]} {self.amount:+d} {self.transaction_type.value}>"


# ── Promocode ───────────────────────────────────────────────

class Promocode(Base, TimestampMixin):
    """Discount/bonus code that can be applied to accounts."""

    __tablename__ = "promocodes"

    id: Mapped[str] = mapped_column(
        String(255), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    code: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    discount_type: Mapped[PromocodeDiscountType] = mapped_column(
        Enum(PromocodeDiscountType), nullable=False
    )
    # For percentage: 10 = 10%, for fixed_amount: value in USD cents,
    # for bonus_tokens: extra token amount
    discount_value: Mapped[int] = mapped_column(Integer, nullable=False)
    max_uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_uses_per_user: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_package_price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<Promocode {self.code} ({self.discount_type.value}={self.discount_value})>"


# ── Promocode Usage ─────────────────────────────────────────

class PromocodeUsage(Base, TimestampMixin):
    """Tracks which user used which promocode."""

    __tablename__ = "promocode_usage"

    id: Mapped[str] = mapped_column(
        String(255), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    promocode_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("promocodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    profile_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # What was applied to
    package_id: Mapped[str | None] = mapped_column(
        String(255), ForeignKey("packages.id", ondelete="SET NULL"), nullable=True
    )
    discount_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bonus_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    promocode: Mapped[Promocode] = relationship("Promocode")
    profile: Mapped[Profile] = relationship("Profile")

    __table_args__ = (
        UniqueConstraint("promocode_id", "profile_id", name="uq_promocode_per_user"),
    )

    def __repr__(self) -> str:
        return f"<PromocodeUsage {self.promocode_id[:8]} by {self.profile_id[:8]}>"
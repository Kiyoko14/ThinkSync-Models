from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.core.database import Base


# ── Mixins ──────────────────────────────────────────────────

class TimestampMixin:
    """Adds created_at / updated_at to any model."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# ── Enums ───────────────────────────────────────────────────

class ApiKeyStatus(str, enum.Enum):
    active = "active"
    revoked = "revoked"
    expired = "expired"


class LogStatus(str, enum.Enum):
    success = "success"
    error = "error"
    pending = "pending"
    rate_limited = "rate_limited"
    unauthorized = "unauthorized"


class PlanTier(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


# ── Profile ─────────────────────────────────────────────────

class Profile(Base, TimestampMixin):
    """Maps to a Supabase Auth user. Created on first API call."""

    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    supabase_uid: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    plan_tier: Mapped[PlanTier] = mapped_column(
        Enum(PlanTier), default=PlanTier.free, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    total_spent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rate_limit_rpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rate_limit_tpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Wallet / Phase 2
    balance: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="Current token balance in wallet"
    )
    balance_version: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, comment="Optimistic lock version for race condition protection"
    )

    # relationships
    api_keys: Mapped[list[ApiKey]] = relationship(
        "ApiKey", back_populates="profile", cascade="all, delete-orphan"
    )
    api_logs: Mapped[list[ApiLog]] = relationship(
        "ApiLog", back_populates="profile", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Profile {self.supabase_uid} [{self.plan_tier.value}]>"


# ── Models ──────────────────────────────────────────────────

class Model(Base, TimestampMixin):
    """AI models available through ThinkSync Gateway."""

    __tablename__ = "models"

    id: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    # Public slug used in /v1/models and chat requests (e.g. "thinking-faster1")
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    # The provider's internal model name (e.g. "Pro/deepseek-ai/DeepSeek-R1")
    provider_model_id: Mapped[str] = mapped_column(String(512), nullable=False)
    provider_name: Mapped[str] = mapped_column(
        String(64), default="siliconflow", nullable=False
    )
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    pricing_input_per_m: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False, comment="USD per 1M input tokens"
    )
    pricing_output_per_m: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False, comment="USD per 1M output tokens"
    )
    supports_streaming: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supports_functions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    context_window: Mapped[int] = mapped_column(Integer, default=8192, nullable=False)
    max_output_tokens: Mapped[int] = mapped_column(Integer, default=4096, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:
        return f"<Model {self.slug}>"


# ── API Keys ────────────────────────────────────────────────

class ApiKey(Base, TimestampMixin):
    """Hashed API keys — raw key is shown only once on creation."""

    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    profile_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Prefix of the raw key for identification (e.g. "thc_abc...")
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    # bcrypt hash of the full key
    key_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    # Name so the user knows which app this key is for
    name: Mapped[str] = mapped_column(String(128), default="default", nullable=False)
    status: Mapped[ApiKeyStatus] = mapped_column(
        Enum(ApiKeyStatus), default=ApiKeyStatus.active, nullable=False
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    profile: Mapped[Profile] = relationship("Profile", back_populates="api_keys")

    def __repr__(self) -> str:
        return f"<ApiKey {self.key_prefix}... [{self.status.value}]>"


# ── API Logs ────────────────────────────────────────────────

class ApiLog(Base, TimestampMixin):
    """Every proxied request is logged for billing & debugging."""

    __tablename__ = "api_logs"

    id: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    profile_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    model_slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    # Which auth method was used
    auth_method: Mapped[str] = mapped_column(
        String(32), default="api_key", nullable=False
    )
    input_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[LogStatus] = mapped_column(
        Enum(LogStatus), default=LogStatus.success, nullable=False
    )
    status_code: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Request metadata for debugging
    request_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stream_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)

    profile: Mapped[Profile | None] = relationship("Profile", back_populates="api_logs")

    __table_args__ = (
        Index("ix_api_logs_profile_created", "profile_id", "created_at"),
        Index("ix_api_logs_model_created", "model_slug", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ApiLog {self.id[:8]} {self.model_slug} {self.status.value}>"


# ── Phase 2 models ──────────────────────────────────────────

from app.models.monetization import (  # noqa: F401, F811
    Package,
    UserPackage,
    BalanceTransaction,
    Promocode,
    PromocodeUsage,
    PackageStatus,
    TransactionType,
    TransactionStatus,
    PromocodeDiscountType,
)
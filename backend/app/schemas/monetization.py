"""Phase 2 — Pydantic v2 schemas for monetization entities."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# ── Packages ────────────────────────────────────────────────

class PackageResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    token_amount: int
    bonus_tokens: int = 0
    price_usd_cents: int
    display_price: str
    is_featured: bool = False
    sort_order: int = 0
    status: str = "active"

    @property
    def total_tokens(self) -> int:
        return self.token_amount + self.bonus_tokens

    @property
    def price_usd(self) -> float:
        return self.price_usd_cents / 100.0


class ListPackagesResponse(BaseModel):
    object: str = "list"
    data: list[PackageResponse]


# ── Buy Package ─────────────────────────────────────────────

class BuyPackageRequest(BaseModel):
    package_id: str = Field(..., min_length=1)
    promocode: str | None = Field(None, max_length=64)


class BuyPackageResponse(BaseModel):
    id: str
    package_id: str
    package_name: str
    tokens_initial: int
    tokens_remaining: int
    payment_provider: str
    payment_id: str | None = None
    message: str = "Package purchased successfully."


# ── Balance ─────────────────────────────────────────────────

class BalanceResponse(BaseModel):
    balance: int
    active_package_tokens: int = 0
    total_available: int = 0


class TopUpRequest(BaseModel):
    amount: int = Field(..., gt=0, le=10000000, description="Amount in token units")
    payment_provider: str = Field(default="manual", pattern=r"^(stripe|click|payme|manual)$")


class TopUpResponse(BaseModel):
    transaction_id: str
    amount: int
    balance_after: int
    status: str = "completed"
    payment_url: str | None = None


# ── Transactions ────────────────────────────────────────────

class TransactionResponse(BaseModel):
    id: str
    amount: int
    balance_after: int
    transaction_type: str
    status: str
    description: str | None = None
    reference_type: str | None = None
    reference_id: str | None = None
    created_at: datetime | None = None


# ── Promocode ───────────────────────────────────────────────

class ApplyPromocodeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)
    package_id: str | None = None


class PromocodeResult(BaseModel):
    code: str
    discount_type: str
    discount_value: int
    bonus_tokens: int = 0
    description: str | None = None
    final_price_cents: int | None = None
    message: str = "Promocode applied successfully."


# ── Usage (extended for billing) ────────────────────────────

class UsageExtendedResponse(BaseModel):
    total_requests: int = 0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    total_billed_from_balance: int = 0
    total_billed_from_packages: int = 0
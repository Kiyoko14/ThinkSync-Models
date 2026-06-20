"""Admin schemas for panel management endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedResponseBase(BaseModel):
    meta: PaginationMeta


class AdminAnalyticsResponse(BaseModel):
    users_total: int
    users_active: int
    models_total: int
    models_active: int
    api_requests_total: int
    api_cost_total: float
    transactions_total: int
    package_revenue_cents: int


class AdminModelItem(BaseModel):
    id: str
    slug: str
    provider_model_id: str
    provider_name: str
    display_name: str
    description: str | None = None
    pricing_input_per_m: float
    pricing_output_per_m: float
    supports_streaming: bool
    supports_functions: bool
    is_active: bool
    context_window: int
    max_output_tokens: int
    sort_order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminModelCreateRequest(BaseModel):
    slug: str = Field(..., min_length=1, max_length=128)
    provider_model_id: str = Field(..., min_length=1, max_length=512)
    provider_name: str = Field(default="siliconflow", min_length=1, max_length=64)
    display_name: str = Field(..., min_length=1, max_length=256)
    description: str | None = None
    pricing_input_per_m: float = Field(default=0.0, ge=0)
    pricing_output_per_m: float = Field(default=0.0, ge=0)
    supports_streaming: bool = True
    supports_functions: bool = False
    is_active: bool = True
    context_window: int = Field(default=8192, ge=256)
    max_output_tokens: int = Field(default=4096, ge=1)
    sort_order: int = 0


class AdminModelUpdateRequest(BaseModel):
    provider_model_id: str | None = Field(default=None, min_length=1, max_length=512)
    provider_name: str | None = Field(default=None, min_length=1, max_length=64)
    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    description: str | None = None
    pricing_input_per_m: float | None = Field(default=None, ge=0)
    pricing_output_per_m: float | None = Field(default=None, ge=0)
    supports_streaming: bool | None = None
    supports_functions: bool | None = None
    is_active: bool | None = None
    context_window: int | None = Field(default=None, ge=256)
    max_output_tokens: int | None = Field(default=None, ge=1)
    sort_order: int | None = None


class AdminModelListResponse(PaginatedResponseBase):
    data: list[AdminModelItem]


class AdminUserItem(BaseModel):
    id: str
    supabase_uid: str
    email: str
    display_name: str | None = None
    plan_tier: str
    is_active: bool
    total_spent: float
    balance: int
    rate_limit_rpm: int | None = None
    rate_limit_tpm: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminUserUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    plan_tier: str | None = Field(default=None, pattern=r"^(free|pro|enterprise)$")
    is_active: bool | None = None
    rate_limit_rpm: int | None = Field(default=None, ge=1, le=100000)
    rate_limit_tpm: int | None = Field(default=None, ge=1, le=50000000)


class AdminUserListResponse(PaginatedResponseBase):
    data: list[AdminUserItem]


class AdminTransactionItem(BaseModel):
    id: str
    profile_id: str
    amount: int
    balance_after: int
    transaction_type: str
    status: str
    description: str | None = None
    reference_type: str | None = None
    reference_id: str | None = None
    payment_provider: str | None = None
    payment_id: str | None = None
    created_at: datetime | None = None


class AdminTransactionListResponse(PaginatedResponseBase):
    data: list[AdminTransactionItem]


class AdminPackageItem(BaseModel):
    id: str
    name: str
    description: str | None = None
    token_amount: int
    bonus_tokens: int
    price_usd_cents: int
    display_price: str
    is_featured: bool
    sort_order: int
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminPackageCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = None
    token_amount: int = Field(..., gt=0)
    bonus_tokens: int = Field(default=0, ge=0)
    price_usd_cents: int = Field(..., ge=0)
    display_price: str = Field(..., min_length=1, max_length=32)
    is_featured: bool = False
    sort_order: int = 0
    status: str = Field(default="active", pattern=r"^(active|archived|hidden)$")


class AdminPackageUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = None
    token_amount: int | None = Field(default=None, gt=0)
    bonus_tokens: int | None = Field(default=None, ge=0)
    price_usd_cents: int | None = Field(default=None, ge=0)
    display_price: str | None = Field(default=None, min_length=1, max_length=32)
    is_featured: bool | None = None
    sort_order: int | None = None
    status: str | None = Field(default=None, pattern=r"^(active|archived|hidden)$")


class AdminPackageListResponse(PaginatedResponseBase):
    data: list[AdminPackageItem]


class AdminPromocodeItem(BaseModel):
    id: str
    code: str
    description: str | None = None
    discount_type: str
    discount_value: int
    max_uses: int
    max_uses_per_user: int
    current_uses: int
    min_package_price_cents: int | None = None
    is_active: bool
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminPromocodeCreateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)
    description: str | None = None
    discount_type: str = Field(..., pattern=r"^(percentage|fixed_amount|bonus_tokens)$")
    discount_value: int = Field(..., ge=0)
    max_uses: int = Field(default=0, ge=0)
    max_uses_per_user: int = Field(default=1, ge=1)
    min_package_price_cents: int | None = Field(default=None, ge=0)
    is_active: bool = True
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class AdminPromocodeUpdateRequest(BaseModel):
    description: str | None = None
    discount_type: str | None = Field(default=None, pattern=r"^(percentage|fixed_amount|bonus_tokens)$")
    discount_value: int | None = Field(default=None, ge=0)
    max_uses: int | None = Field(default=None, ge=0)
    max_uses_per_user: int | None = Field(default=None, ge=1)
    min_package_price_cents: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class AdminPromocodeListResponse(PaginatedResponseBase):
    data: list[AdminPromocodeItem]


class AdminApiLogItem(BaseModel):
    id: str
    profile_id: str | None = None
    model_slug: str
    auth_method: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost: float
    duration_ms: int
    status: str
    status_code: int
    error_message: str | None = None
    request_model: str | None = None
    stream_enabled: bool
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime | None = None


class AdminApiLogListResponse(PaginatedResponseBase):
    data: list[AdminApiLogItem]

"""User profile and API key management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import API_KEY_NOT_FOUND, ThinkSyncError
from app.dependencies import get_current_profile
from app.models import Profile
from app.schemas import (
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyResponse,
    ApiKeyRevokeResponse,
    ProfileResponse,
    StatsResponse,
)
from app.schemas.monetization import (
    BalanceResponse,
    TransactionResponse,
    UsageExtendedResponse,
)
from app.services.api_keys import (
    create_api_key,
    get_api_keys,
    revoke_api_key,
    rotate_api_key,
)
from app.services.usage import get_usage_stats
from app.services.balance import (
    get_balance,
    get_total_active_package_tokens as get_balance_total_active_package_tokens,
    get_transactions,
)

router = APIRouter()


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(profile: Profile = Depends(get_current_profile)):
    """Get the authenticated user's profile."""
    return ProfileResponse(
        id=profile.id,
        supabase_uid=profile.supabase_uid,
        email=profile.email,
        display_name=profile.display_name,
        plan_tier=profile.plan_tier.value,
        is_active=profile.is_active,
        total_spent=profile.total_spent,
        created_at=profile.created_at,
    )


@router.get("/tokens", response_model=list[ApiKeyResponse])
async def list_api_keys(
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):
    """List all active API keys for the authenticated user."""
    keys = await get_api_keys(db, profile.id)
    return [
        ApiKeyResponse(
            id=k.id,
            key_prefix=k.key_prefix,
            name=k.name,
            status=k.status.value,
            created_at=k.created_at,
            last_used_at=k.last_used_at,
            expires_at=k.expires_at,
        )
        for k in keys
    ]


@router.post("/tokens/generate", response_model=ApiKeyCreateResponse)
async def create_new_api_key(
    body: ApiKeyCreateRequest,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):
    """Generate a new ``thc_*`` API key.

    **Store the returned ``raw_key`` — it will never be shown again.**
    """
    key, raw = await create_api_key(
        db, profile.id, name=body.name, expires_in_days=body.expires_in_days
    )
    return ApiKeyCreateResponse(
        id=key.id,
        key_prefix=key.key_prefix,
        name=key.name,
        raw_key=raw,
        status=key.status.value,
    )


@router.post("/tokens/{key_id}/revoke", response_model=ApiKeyRevokeResponse)
async def revoke_existing_api_key(
    key_id: str,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):
    """Revoke an API key immediately."""
    key = await revoke_api_key(db, profile.id, key_id)
    return ApiKeyRevokeResponse(id=key.id, status=key.status.value)


@router.post("/tokens/{key_id}/rotate", response_model=ApiKeyCreateResponse)
async def rotate_existing_api_key(
    key_id: str,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):
    """Revoke the current API key and issue a new one.

    **Store the returned ``raw_key`` — it will never be shown again.**
    """
    key, raw = await rotate_api_key(db, profile.id, key_id)
    return ApiKeyCreateResponse(
        id=key.id,
        key_prefix=key.key_prefix,
        name=key.name,
        raw_key=raw,
        status=key.status.value,
    )


@router.get("/stats", response_model=StatsResponse)
async def get_user_stats(
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):
    """Aggregated usage statistics for the authenticated user."""
    return await get_usage_stats(db, profile.id)


# ── Phase 2: Balance & Transactions ────────────────────────

@router.get("/balance", response_model=BalanceResponse)
async def get_user_balance(
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):
    """Get current token balance and active package tokens."""
    bal = await get_balance(db, profile.id)
    pkg_tokens = await get_balance_total_active_package_tokens(db, profile.id)
    return BalanceResponse(
        balance=bal,
        active_package_tokens=pkg_tokens,
        total_available=bal + pkg_tokens,
    )


@router.get("/transactions", response_model=list[TransactionResponse])
async def get_user_transactions(
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
    limit: int = 50,
    offset: int = 0,
):
    """Get balance transaction history."""
    txs = await get_transactions(db, profile.id, limit=limit, offset=offset)
    return [
        TransactionResponse(
            id=tx.id,
            amount=tx.amount,
            balance_after=tx.balance_after,
            transaction_type=tx.transaction_type.value,
            status=tx.status.value,
            description=tx.description,
            reference_type=tx.reference_type,
            reference_id=tx.reference_id,
            created_at=tx.created_at,
        )
        for tx in txs
    ]


@router.get("/usage", response_model=UsageExtendedResponse)
async def get_user_usage_extended(
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):
    """Extended usage statistics including billing breakdown."""
    stats = await get_usage_stats(db, profile.id)
    # Query billing-specific fields
    from sqlalchemy import func, select as sa_select
    from app.models import BalanceTransaction, TransactionType
    from app.models import ApiLog, LogStatus

    # Total billed from balance usage (charge transactions)
    charge_result = await db.execute(
        sa_select(
            func.coalesce(func.sum(func.abs(BalanceTransaction.amount)), 0)
        ).where(
            BalanceTransaction.profile_id == profile.id,
            BalanceTransaction.transaction_type == TransactionType.charge,
            BalanceTransaction.status == "completed",
        )
    )
    total_billed_balance = int(charge_result.scalar())

    # Total billed from packages (sum of tokens from ApiLog where profile matches)
    log_result = await db.execute(
        sa_select(
            func.coalesce(func.sum(ApiLog.total_tokens), 0)
        ).where(
            ApiLog.profile_id == profile.id,
            ApiLog.status == LogStatus.success,
        )
    )
    total_tokens_logged = int(log_result.scalar())

    return UsageExtendedResponse(
        total_requests=stats["total_requests"],
        total_tokens=stats["total_tokens"],
        total_cost_usd=stats["total_cost"],
        total_billed_from_balance=total_billed_balance,
        total_billed_from_packages=max(0, total_tokens_logged - total_billed_balance),
    )
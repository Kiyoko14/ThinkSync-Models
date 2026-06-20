"""API key service — CRUD + hashing for thc-* keys."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    API_KEY_NOT_FOUND,
    INVALID_API_KEY,
    ThinkSyncError,
)
from app.core.security import (
    generate_api_key,
    get_key_prefix,
    verify_api_key,
)
from app.models import ApiKey, ApiKeyStatus, Profile


async def create_api_key(
    db: AsyncSession,
    profile_id: str,
    name: str = "default",
    expires_in_days: int | None = None,
) -> tuple[ApiKey, str]:
    """Create a new API key for *profile_id*.

    Returns (ApiKey ORM object, raw_key_string).
    The raw key is shown **once** and is never stored.
    """
    raw_key, hashed = generate_api_key()
    prefix = get_key_prefix(raw_key)

    key = ApiKey(
        profile_id=profile_id,
        key_prefix=prefix,
        key_hash=hashed,
        name=name,
        status=ApiKeyStatus.active,
        expires_at=(
            datetime.now(timezone.utc) + timedelta(days=expires_in_days)
            if expires_in_days
            else None
        ),
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return key, raw_key


async def revoke_api_key(
    db: AsyncSession,
    profile_id: str,
    key_id: str,
) -> ApiKey:
    """Revoke an API key (soft-delete by status)."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.profile_id == profile_id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise ThinkSyncError(API_KEY_NOT_FOUND)

    key.status = ApiKeyStatus.revoked
    await db.commit()
    await db.refresh(key)
    return key


async def rotate_api_key(
    db: AsyncSession,
    profile_id: str,
    key_id: str,
) -> tuple[ApiKey, str]:
    """Revoke the old key and issue a new one atomically.

    Returns (new_key, raw_key_string).
    """
    old_key = await revoke_api_key(db, profile_id, key_id)
    new_key, raw = await create_api_key(
        db, profile_id, name=old_key.name, expires_in_days=None
    )
    return new_key, raw


async def get_api_keys(
    db: AsyncSession,
    profile_id: str,
    include_revoked: bool = False,
) -> list[ApiKey]:
    """List API keys for a profile."""
    stmt = select(ApiKey).where(ApiKey.profile_id == profile_id)
    if not include_revoked:
        stmt = stmt.where(ApiKey.status == ApiKeyStatus.active)
    stmt = stmt.order_by(ApiKey.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def authenticate_api_key(
    db: AsyncSession,
    raw_key: str,
) -> tuple[ApiKey, Profile]:
    """Validate a raw API key string and return the (ApiKey, Profile).

    Raises ``ThinkSyncError`` on any failure.
    """
    if not raw_key:
        raise ThinkSyncError(INVALID_API_KEY, detail_override="No API key provided.")

    # Find candidate keys by prefix (first 12 chars)
    prefix = get_key_prefix(raw_key)
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_prefix == prefix,
            ApiKey.status == ApiKeyStatus.active,
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise ThinkSyncError(
            INVALID_API_KEY,
            detail_override="API key not found or has been revoked.",
        )

    if not verify_api_key(raw_key, key.key_hash):
        raise ThinkSyncError(
            INVALID_API_KEY,
            detail_override="API key is invalid.",
        )

    # Check expiry
    if key.expires_at and key.expires_at < datetime.now(timezone.utc):
        key.status = ApiKeyStatus.expired
        await db.commit()
        raise ThinkSyncError(
            INVALID_API_KEY,
            detail_override="API key has expired.",
        )

    # Load profile
    profile_result = await db.execute(
        select(Profile).where(Profile.id == key.profile_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile or not profile.is_active:
        raise ThinkSyncError(
            INVALID_API_KEY,
            detail_override="Account is disabled.",
        )

    # Touch last_used_at
    key.last_used_at = datetime.now(timezone.utc)
    await db.commit()

    return key, profile
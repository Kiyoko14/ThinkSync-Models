"""FastAPI dependencies for authentication and rate limiting."""

from __future__ import annotations

from fastapi import Depends, Header, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.errors import MISSING_API_KEY, PERMISSION_DENIED, ThinkSyncError
from app.core.rate_limiter import RateLimiter
from app.core.redis import get_redis
from app.models import Profile
from app.services.api_keys import authenticate_api_key
from app.services.profile import get_or_create_profile


# ── Rate limiter dependency ────────────────────────────────

async def get_rate_limiter(
    redis: Redis = Depends(get_redis),
) -> RateLimiter:
    return RateLimiter(redis)


# ── Current user via API key ───────────────────────────────

async def get_current_profile(
    request: Request,
    db: AsyncSession = Depends(get_session),
    authorization: str | None = Header(None),
) -> Profile:
    """Resolve the authenticated ``Profile`` from the request.

    Supports:
    - ``Authorization: Bearer thc_...`` (API key)
    - ``Authorization: Bearer <jwt>`` (Supabase JWT)
    """
    preloaded = getattr(request.state, "auth_profile", None)
    if preloaded is not None:
        return preloaded

    if not authorization:
        raise ThinkSyncError(MISSING_API_KEY)

    scheme, _, token = authorization.partition(" ")
    if not scheme or scheme.lower() != "bearer":
        raise ThinkSyncError(MISSING_API_KEY)

    if not token:
        raise ThinkSyncError(MISSING_API_KEY)

    if token.startswith("thc_"):
        # API key auth
        _, profile = await authenticate_api_key(db, token)
        return profile

    # JWT auth (Supabase)
    from app.core.security import decode_supabase_jwt

    payload = decode_supabase_jwt(token)
    if not payload:
        raise ThinkSyncError(MISSING_API_KEY)

    sub = payload.get("sub") or payload.get("user_id")
    email = payload.get("email", "unknown@thinksync.ai")
    if not sub:
        raise ThinkSyncError(MISSING_API_KEY)

    profile = await get_or_create_profile(db, sub, email)
    if not profile.is_active:
        raise ThinkSyncError(MISSING_API_KEY)
    return profile


# ── Optional current user (for public endpoints) ───────────

async def get_optional_profile(
    request: Request,
    db: AsyncSession = Depends(get_session),
    authorization: str | None = Header(None),
) -> Profile | None:
    """Like ``get_current_profile`` but returns ``None`` instead of raising."""
    if not authorization:
        return None
    try:
        return await get_current_profile(request, db, authorization)
    except (ThinkSyncError, Exception):
        return None


async def get_admin_profile(
    profile: Profile = Depends(get_current_profile),
) -> Profile:
    """Allow access only for the configured admin email."""
    configured = (settings.admin_email or "").strip().lower()
    if not configured:
        raise ThinkSyncError(
            PERMISSION_DENIED,
            detail_override="Admin access is not configured on the server.",
        )

    if (profile.email or "").strip().lower() != configured:
        raise ThinkSyncError(
            PERMISSION_DENIED,
            detail_override="This account does not have admin access.",
        )
    return profile

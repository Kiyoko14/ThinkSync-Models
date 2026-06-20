"""Health-check endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.redis import get_redis
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
):
    """Unified health check — verifies DB, Redis, and upstream provider."""
    db_status = "connected"
    try:
        await db.execute(select(1))
    except Exception:
        db_status = "disconnected"

    redis_status = "connected"
    try:
        await redis.ping()
    except Exception:
        redis_status = "disconnected"

    # Try upstream provider health
    provider_status = "unknown"
    try:
        from app.services.provider import get_provider

        provider = get_provider(settings.thinksync_provider)
        if hasattr(provider, "health_check"):
            result = await provider.health_check()
            provider_status = result.get("status", "unknown")
    except Exception:
        provider_status = "unavailable"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=db_status,
        redis=redis_status,
        provider=provider_status,
    )
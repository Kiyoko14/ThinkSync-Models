"""Usage tracking service — records every proxied request."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models import ApiLog, LogStatus, Model, Profile


@dataclass
class UsageRecord:
    """Normalised usage data produced by providers and used by the logger."""

    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost: float = 0.0
    duration_ms: int = 0


@dataclass
class UsageLogEntry:
    """Everything we know about one proxied request, ready to persist."""

    profile_id: str | None
    model_slug: str
    auth_method: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost: float
    duration_ms: int
    status: LogStatus
    status_code: int
    error_message: str | None = None
    request_model: str | None = None
    stream_enabled: bool = False
    ip_address: str | None = None
    user_agent: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


async def log_usage(
    db: AsyncSession,
    entry: UsageLogEntry,
) -> ApiLog:
    """Persist an API log entry and update the profile's total_spent."""
    log = ApiLog(
        profile_id=entry.profile_id,
        model_slug=entry.model_slug,
        auth_method=entry.auth_method,
        input_tokens=entry.input_tokens,
        output_tokens=entry.output_tokens,
        total_tokens=entry.total_tokens,
        estimated_cost=entry.estimated_cost,
        duration_ms=entry.duration_ms,
        status=entry.status,
        status_code=entry.status_code,
        error_message=entry.error_message,
        request_model=entry.request_model,
        stream_enabled=entry.stream_enabled,
        ip_address=entry.ip_address,
        user_agent=entry.user_agent,
    )
    db.add(log)

    # Accumulate spend on the profile
    if entry.profile_id and entry.status == LogStatus.success:
        result = await db.execute(
            select(Profile).where(Profile.id == entry.profile_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            profile.total_spent = float(profile.total_spent or 0.0) + float(entry.estimated_cost)

    await db.commit()
    await db.refresh(log)
    logger.info("usage_logged", log_id=log.id, cost=entry.estimated_cost)
    return log


async def get_user_usage(
    db: AsyncSession,
    profile_id: str,
    limit: int = 50,
    offset: int = 0,
) -> list[ApiLog]:
    """Return recent usage records for a profile."""
    result = await db.execute(
        select(ApiLog)
        .where(ApiLog.profile_id == profile_id)
        .order_by(ApiLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_usage_stats(
    db: AsyncSession,
    profile_id: str,
) -> dict[str, Any]:
    """Aggregated usage statistics for a profile."""
    from sqlalchemy import func

    result = await db.execute(
        select(
            func.count(ApiLog.id).label("total_requests"),
            func.coalesce(func.sum(ApiLog.total_tokens), 0).label("total_tokens"),
            func.coalesce(func.sum(ApiLog.estimated_cost), 0.0).label("total_cost"),
        ).where(ApiLog.profile_id == profile_id)
    )
    row = result.one()
    return {
        "total_requests": row.total_requests,
        "total_tokens": int(row.total_tokens),
        "total_cost": round(float(row.total_cost), 6),
    }
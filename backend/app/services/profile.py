"""Profile service — user management on top of Supabase Auth."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models import PlanTier, Profile


async def get_or_create_profile(
    db: AsyncSession,
    supabase_uid: str,
    email: str,
    display_name: str | None = None,
) -> Profile:
    """Find a profile by Supabase UID or create it on first access."""
    result = await db.execute(
        select(Profile).where(Profile.supabase_uid == supabase_uid)
    )
    profile = result.scalar_one_or_none()
    if profile:
        return profile

    profile = Profile(
        supabase_uid=supabase_uid,
        email=email,
        display_name=display_name or email.split("@")[0],
        plan_tier=PlanTier.free,
        is_active=True,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    logger.info("profile_created", profile_id=profile.id, email=email)
    return profile


async def get_profile_by_id(
    db: AsyncSession,
    profile_id: str,
) -> Profile | None:
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id)
    )
    return result.scalar_one_or_none()


async def update_profile(
    db: AsyncSession,
    profile_id: str,
    **kwargs,
) -> Profile | None:
    profile = await get_profile_by_id(db, profile_id)
    if not profile:
        return None
    for key, value in kwargs.items():
        if hasattr(profile, key):
            setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return profile
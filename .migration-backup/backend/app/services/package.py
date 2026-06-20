"""Package service — purchase and manage token packages."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models import Package, PackageStatus, UserPackage


class PackageNotFoundError(Exception):
    pass


class PackageInactiveError(Exception):
    pass


async def get_active_packages(db: AsyncSession) -> list[Package]:
    """Return all active (purchasable) packages, ordered by sort_order."""
    result = await db.execute(
        select(Package)
        .where(Package.status == PackageStatus.active)
        .order_by(Package.sort_order, Package.token_amount)
    )
    return list(result.scalars().all())


async def get_package_by_id(db: AsyncSession, package_id: str) -> Package | None:
    result = await db.execute(select(Package).where(Package.id == package_id))
    return result.scalar_one_or_none()


async def purchase_package(
    db: AsyncSession,
    profile_id: str,
    package_id: str,
    payment_provider: str = "manual",
    payment_id: str | None = None,
    bonus_tokens: int = 0,
) -> UserPackage:
    """Create a UserPackage record after purchase.

    Does NOT charge balance — that happens via the billing service flow.
    This records the package ownership.
    """
    package = await get_package_by_id(db, package_id)
    if not package:
        raise PackageNotFoundError(f"Package {package_id} not found")
    if package.status != PackageStatus.active:
        raise PackageInactiveError(f"Package {package_id} is not active")

    total_tokens = package.token_amount + package.bonus_tokens + bonus_tokens

    user_pkg = UserPackage(
        profile_id=profile_id,
        package_id=package_id,
        tokens_remaining=total_tokens,
        tokens_initial=total_tokens,
        payment_provider=payment_provider,
        payment_id=payment_id,
        is_active=True,
        activated_at=datetime.now(timezone.utc),
    )
    db.add(user_pkg)
    await db.commit()
    await db.refresh(user_pkg)

    logger.info(
        "package_purchased",
        profile_id=profile_id,
        package_id=package_id,
        tokens=total_tokens,
    )
    return user_pkg


async def get_user_active_packages(
    db: AsyncSession, profile_id: str,
) -> list[UserPackage]:
    """Return active (non-expired, non-exhausted) packages for a user."""
    result = await db.execute(
        select(UserPackage)
        .where(
            UserPackage.profile_id == profile_id,
            UserPackage.is_active == True,
        )
        .order_by(UserPackage.created_at)
    )
    return list(result.scalars().all())


async def deduct_from_package(
    db: AsyncSession, user_package: UserPackage, tokens: int,
) -> UserPackage:
    """Deduct tokens from a specific user package.

    If the package is exhausted, marks it as inactive.
    """
    if user_package.tokens_remaining < tokens:
        raise ValueError(
            f"Package {user_package.id} has only {user_package.tokens_remaining} tokens, "
            f"cannot deduct {tokens}"
        )

    user_package.tokens_remaining -= tokens
    if user_package.tokens_remaining <= 0:
        user_package.is_active = False

    await db.flush()
    return user_package


async def get_total_user_package_tokens(
    db: AsyncSession, profile_id: str,
) -> int:
    """Sum of all remaining tokens across active packages."""
    packages = await get_user_active_packages(db, profile_id)
    return sum(p.tokens_remaining for p in packages)
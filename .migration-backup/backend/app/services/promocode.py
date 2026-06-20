"""Promocode service — apply, validate, and track promo codes."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models import (
    Package,
    Promocode,
    PromocodeDiscountType,
    PromocodeUsage,
)


class PromocodeError(Exception):
    """Base error for promocode failures."""


class PromocodeNotFoundError(PromocodeError):
    pass


class PromocodeExpiredError(PromocodeError):
    pass


class PromocodeInactiveError(PromocodeError):
    pass


class PromocodeMaxUsesError(PromocodeError):
    pass


class PromocodeAlreadyUsedError(PromocodeError):
    pass


class PromocodeMinPriceError(PromocodeError):
    pass


@dataclass
class PromocodeValidationResult:
    valid: bool
    promocode: Promocode | None = None
    discount_amount_cents: int = 0
    bonus_tokens: int = 0
    error: str | None = None


async def get_promocode_by_code(
    db: AsyncSession, code: str,
) -> Promocode | None:
    result = await db.execute(
        select(Promocode).where(Promocode.code == code)
    )
    return result.scalar_one_or_none()


async def validate_promocode(
    db: AsyncSession,
    code: str,
    profile_id: str,
    package_price_cents: int | None = None,
) -> PromocodeValidationResult:
    """Validate a promocode and return the discount details.

    Checks: existence, active, expiry, max_uses, per-user limit, min price.
    """
    promocode = await get_promocode_by_code(db, code)
    if not promocode:
        return PromocodeValidationResult(
            valid=False, error=f"Promocode '{code}' not found."
        )

    if not promocode.is_active:
        return PromocodeValidationResult(
            valid=False, error="Promocode is no longer active.",
        )

    now = datetime.now(timezone.utc)
    if promocode.expires_at and promocode.expires_at < now:
        return PromocodeValidationResult(
            valid=False, error="Promocode has expired.",
        )

    if promocode.starts_at and promocode.starts_at > now:
        return PromocodeValidationResult(
            valid=False, error="Promocode is not yet active.",
        )

    # Max global uses
    if promocode.max_uses > 0 and promocode.current_uses >= promocode.max_uses:
        return PromocodeValidationResult(
            valid=False, error="Promocode has reached its maximum uses.",
        )

    # Per-user check
    if promocode.max_uses_per_user > 0:
        usage_result = await db.execute(
            select(PromocodeUsage).where(
                PromocodeUsage.promocode_id == promocode.id,
                PromocodeUsage.profile_id == profile_id,
            )
        )
        existing_usage = usage_result.scalars().all()
        if len(existing_usage) >= promocode.max_uses_per_user:
            return PromocodeValidationResult(
                valid=False, error="You have already used this promocode.",
            )

    # Minimum package price check
    if (
        promocode.min_package_price_cents
        and package_price_cents
        and package_price_cents < promocode.min_package_price_cents
    ):
        return PromocodeValidationResult(
            valid=False,
            error=f"Minimum purchase of ${promocode.min_package_price_cents / 100:.2f} required.",
        )

    # Calculate discount
    discount_cents = 0
    bonus_tokens = 0
    if promocode.discount_type == PromocodeDiscountType.percentage:
        if package_price_cents:
            discount_cents = int(
                package_price_cents * promocode.discount_value / 100
            )
    elif promocode.discount_type == PromocodeDiscountType.fixed_amount:
        discount_cents = promocode.discount_value
    elif promocode.discount_type == PromocodeDiscountType.bonus_tokens:
        bonus_tokens = promocode.discount_value

    return PromocodeValidationResult(
        valid=True,
        promocode=promocode,
        discount_amount_cents=discount_cents,
        bonus_tokens=bonus_tokens,
    )


async def apply_promocode(
    db: AsyncSession,
    profile_id: str,
    code: str,
    package: Package | None = None,
) -> tuple[Promocode, PromocodeValidationResult, PromocodeUsage | None]:
    """Validate and apply a promocode. Increments usage counters atomically.

    Returns (promocode, validation_result, usage_record_or_none).
    """
    package_price = package.price_usd_cents if package else None
    validation = await validate_promocode(
        db, code, profile_id, package_price_cents=package_price,
    )
    if not validation.valid or not validation.promocode:
        raise PromocodeError(validation.error or "Invalid promocode")

    promocode = validation.promocode

    # Increment usage atomically
    promocode.current_uses += 1

    # Record usage
    usage = PromocodeUsage(
        promocode_id=promocode.id,
        profile_id=profile_id,
        package_id=package.id if package else None,
        discount_amount=validation.discount_amount_cents,
        bonus_tokens=validation.bonus_tokens,
    )
    db.add(usage)
    await db.commit()
    await db.refresh(usage)

    logger.info(
        "promocode_applied",
        profile_id=profile_id,
        code=code,
        discount=validation.discount_amount_cents,
        bonus=validation.bonus_tokens,
    )

    return promocode, validation, usage


async def get_promocode_usage_count(
    db: AsyncSession, promocode_id: str, profile_id: str,
) -> int:
    result = await db.execute(
        select(PromocodeUsage).where(
            PromocodeUsage.promocode_id == promocode_id,
            PromocodeUsage.profile_id == profile_id,
        )
    )
    return len(result.scalars().all())
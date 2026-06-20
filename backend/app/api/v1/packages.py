"""Phase 2 — Package and promocode endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import (
    ErrorCode,
    ThinkSyncError,
    invalid_request,
)
from app.dependencies import get_current_profile
from app.models import Profile
from app.schemas.monetization import (
    ApplyPromocodeRequest,
    BuyPackageRequest,
    BuyPackageResponse,
    ListPackagesResponse,
    PackageResponse,
    PromocodeResult,
)
from app.services.package import (
    PackageInactiveError,
    PackageNotFoundError,
    get_active_packages,
    get_package_by_id,
    purchase_package,
)
from app.services.promocode import (
    PromocodeError,
    apply_promocode,
)

router = APIRouter()


@router.get("/packages", response_model=ListPackagesResponse)
async def list_packages(db: AsyncSession = Depends(get_session)):
    """List all active (purchasable) token packages."""
    packages = await get_active_packages(db)
    return ListPackagesResponse(
        data=[
            PackageResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                token_amount=p.token_amount,
                bonus_tokens=p.bonus_tokens,
                price_usd_cents=p.price_usd_cents,
                display_price=p.display_price,
                is_featured=p.is_featured,
                sort_order=p.sort_order,
                status=p.status.value,
            )
            for p in packages
        ]
    )


@router.post("/packages/buy", response_model=BuyPackageResponse)
async def buy_package(
    body: BuyPackageRequest,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):
    """Purchase a token package.

    Optionally apply a promocode for discounts or bonus tokens.
    """
    # 1. Resolve package
    package = await get_package_by_id(db, body.package_id)
    if not package:
        raise ThinkSyncError(
            ErrorCode(code="package_not_found", http_status=404,
                      message="Package not found.",
                      detail="The requested package does not exist or is not available."),
        )

    # 2. Apply promocode if provided
    bonus_tokens = 0
    discount_cents = 0
    if body.promocode:
        try:
            promo, validation, usage = await apply_promocode(
                db, profile.id, body.promocode, package,
            )
            bonus_tokens = validation.bonus_tokens
            discount_cents = validation.discount_amount_cents
        except PromocodeError as exc:
            raise invalid_request(detail=str(exc))

    # 3. Purchase (record ownership)
    user_pkg = await purchase_package(
        db,
        profile_id=profile.id,
        package_id=package.id,
        payment_provider="manual",
        payment_id=None,
        bonus_tokens=bonus_tokens,
    )

    return BuyPackageResponse(
        id=user_pkg.id,
        package_id=package.id,
        package_name=package.name,
        tokens_initial=user_pkg.tokens_initial,
        tokens_remaining=user_pkg.tokens_remaining,
        payment_provider=user_pkg.payment_provider,
        payment_id=user_pkg.payment_id,
    )


@router.post("/promocode/apply", response_model=PromocodeResult)
async def apply_promocode_endpoint(
    body: "ApplyPromocodeRequest",
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_session),
):  # noqa: E125
    """Validate and apply a promocode to the user's account."""
    package = None
    package_price = None
    if body.package_id:
        package = await get_package_by_id(db, body.package_id)
        if package:
            package_price = package.price_usd_cents

    from app.services.promocode import validate_promocode

    validation = await validate_promocode(
        db, body.code, profile.id, package_price_cents=package_price,
    )

    # Even if validation passes, we don't auto-credit here — the user
    # applies it at purchase time. This endpoint validates availability.
    if not validation.valid:
        raise invalid_request(detail=validation.error or "Invalid promocode.")

    return PromocodeResult(
        code=body.code,
        discount_type=validation.promocode.discount_type.value,
        discount_value=validation.promocode.discount_value,
        bonus_tokens=validation.bonus_tokens,
        description=validation.promocode.description,
        final_price_cents=(
            package_price - validation.discount_amount_cents
            if package_price and validation.discount_amount_cents
            else None
        ),
    )
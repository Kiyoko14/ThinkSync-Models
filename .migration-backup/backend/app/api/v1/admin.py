"""Admin management endpoints."""

from __future__ import annotations

from math import ceil

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import INVALID_REQUEST, MODEL_NOT_FOUND, ThinkSyncError
from app.dependencies import get_admin_profile
from app.models import ApiLog, Model, PlanTier, Profile
from app.models.monetization import (
    BalanceTransaction,
    Package,
    PackageStatus,
    Promocode,
    PromocodeDiscountType,
)
from app.schemas.admin import (
    AdminAnalyticsResponse,
    AdminApiLogItem,
    AdminApiLogListResponse,
    AdminModelCreateRequest,
    AdminModelItem,
    AdminModelListResponse,
    AdminModelUpdateRequest,
    AdminPackageCreateRequest,
    AdminPackageItem,
    AdminPackageListResponse,
    AdminPackageUpdateRequest,
    AdminPromocodeCreateRequest,
    AdminPromocodeItem,
    AdminPromocodeListResponse,
    AdminPromocodeUpdateRequest,
    AdminTransactionItem,
    AdminTransactionListResponse,
    AdminUserItem,
    AdminUserListResponse,
    AdminUserUpdateRequest,
    PaginationMeta,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_admin_profile)])


def _pagination_meta(page: int, page_size: int, total: int) -> PaginationMeta:
    pages = ceil(total / page_size) if total > 0 else 0
    return PaginationMeta(page=page, page_size=page_size, total=total, total_pages=pages)


@router.get("/analytics", response_model=AdminAnalyticsResponse)
async def get_admin_analytics(db: AsyncSession = Depends(get_session)):
    users_total = int((await db.execute(select(func.count(Profile.id)))).scalar() or 0)
    users_active = int(
        (await db.execute(select(func.count(Profile.id)).where(Profile.is_active == True))).scalar() or 0
    )
    models_total = int((await db.execute(select(func.count(Model.id)))).scalar() or 0)
    models_active = int(
        (await db.execute(select(func.count(Model.id)).where(Model.is_active == True))).scalar() or 0
    )
    api_requests_total = int((await db.execute(select(func.count(ApiLog.id)))).scalar() or 0)
    api_cost_total = float((await db.execute(select(func.coalesce(func.sum(ApiLog.estimated_cost), 0.0)))).scalar() or 0.0)
    transactions_total = int((await db.execute(select(func.count(BalanceTransaction.id)))).scalar() or 0)

    package_revenue_cents = int(
        (
            await db.execute(
                select(func.coalesce(func.sum(Package.price_usd_cents), 0)).select_from(Package)
            )
        ).scalar()
        or 0
    )

    return AdminAnalyticsResponse(
        users_total=users_total,
        users_active=users_active,
        models_total=models_total,
        models_active=models_active,
        api_requests_total=api_requests_total,
        api_cost_total=api_cost_total,
        transactions_total=transactions_total,
        package_revenue_cents=package_revenue_cents,
    )


@router.get("/models", response_model=AdminModelListResponse)
async def list_admin_models(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Model)

    if search:
        needle = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Model.slug).like(needle),
                func.lower(Model.display_name).like(needle),
                func.lower(Model.provider_name).like(needle),
            )
        )
    if is_active is not None:
        stmt = stmt.where(Model.is_active == is_active)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar() or 0)

    stmt = stmt.order_by(Model.sort_order.asc(), Model.slug.asc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    rows = list((await db.execute(stmt)).scalars().all())

    data = [
        AdminModelItem(
            id=m.id,
            slug=m.slug,
            provider_model_id=m.provider_model_id,
            provider_name=m.provider_name,
            display_name=m.display_name,
            description=m.description,
            pricing_input_per_m=m.pricing_input_per_m,
            pricing_output_per_m=m.pricing_output_per_m,
            supports_streaming=m.supports_streaming,
            supports_functions=m.supports_functions,
            is_active=m.is_active,
            context_window=m.context_window,
            max_output_tokens=m.max_output_tokens,
            sort_order=m.sort_order,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in rows
    ]
    return AdminModelListResponse(data=data, meta=_pagination_meta(page, page_size, total))


@router.post("/models", response_model=AdminModelItem)
async def create_admin_model(body: AdminModelCreateRequest, db: AsyncSession = Depends(get_session)):
    exists = await db.execute(select(Model).where(Model.slug == body.slug))
    if exists.scalar_one_or_none() is not None:
        raise ThinkSyncError(INVALID_REQUEST, detail_override="A model with this slug already exists.")

    item = Model(
        slug=body.slug,
        provider_model_id=body.provider_model_id,
        provider_name=body.provider_name,
        display_name=body.display_name,
        description=body.description,
        pricing_input_per_m=body.pricing_input_per_m,
        pricing_output_per_m=body.pricing_output_per_m,
        supports_streaming=body.supports_streaming,
        supports_functions=body.supports_functions,
        is_active=body.is_active,
        context_window=body.context_window,
        max_output_tokens=body.max_output_tokens,
        sort_order=body.sort_order,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return AdminModelItem(
        id=item.id,
        slug=item.slug,
        provider_model_id=item.provider_model_id,
        provider_name=item.provider_name,
        display_name=item.display_name,
        description=item.description,
        pricing_input_per_m=item.pricing_input_per_m,
        pricing_output_per_m=item.pricing_output_per_m,
        supports_streaming=item.supports_streaming,
        supports_functions=item.supports_functions,
        is_active=item.is_active,
        context_window=item.context_window,
        max_output_tokens=item.max_output_tokens,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.patch("/models/{model_id}", response_model=AdminModelItem)
async def update_admin_model(model_id: str, body: AdminModelUpdateRequest, db: AsyncSession = Depends(get_session)):
    model = (await db.execute(select(Model).where(Model.id == model_id))).scalar_one_or_none()
    if model is None:
        raise ThinkSyncError(MODEL_NOT_FOUND, detail_override="Model not found.")

    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(model, key, value)

    await db.commit()
    await db.refresh(model)

    return AdminModelItem(
        id=model.id,
        slug=model.slug,
        provider_model_id=model.provider_model_id,
        provider_name=model.provider_name,
        display_name=model.display_name,
        description=model.description,
        pricing_input_per_m=model.pricing_input_per_m,
        pricing_output_per_m=model.pricing_output_per_m,
        supports_streaming=model.supports_streaming,
        supports_functions=model.supports_functions,
        is_active=model.is_active,
        context_window=model.context_window,
        max_output_tokens=model.max_output_tokens,
        sort_order=model.sort_order,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_admin_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    plan_tier: str | None = Query(default=None, pattern=r"^(free|pro|enterprise)$"),
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Profile)
    if search:
        needle = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Profile.email).like(needle),
                func.lower(func.coalesce(Profile.display_name, "")).like(needle),
            )
        )
    if plan_tier:
        stmt = stmt.where(Profile.plan_tier == PlanTier(plan_tier))
    if is_active is not None:
        stmt = stmt.where(Profile.is_active == is_active)

    total = int((await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0)
    rows = list(
        (
            await db.execute(
                stmt.order_by(Profile.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .scalars()
        .all()
    )

    data = [
        AdminUserItem(
            id=u.id,
            supabase_uid=u.supabase_uid,
            email=u.email,
            display_name=u.display_name,
            plan_tier=u.plan_tier.value,
            is_active=u.is_active,
            total_spent=u.total_spent,
            balance=u.balance,
            rate_limit_rpm=u.rate_limit_rpm,
            rate_limit_tpm=u.rate_limit_tpm,
            created_at=u.created_at,
            updated_at=u.updated_at,
        )
        for u in rows
    ]
    return AdminUserListResponse(data=data, meta=_pagination_meta(page, page_size, total))


@router.patch("/users/{user_id}", response_model=AdminUserItem)
async def update_admin_user(user_id: str, body: AdminUserUpdateRequest, db: AsyncSession = Depends(get_session)):
    user = (await db.execute(select(Profile).where(Profile.id == user_id))).scalar_one_or_none()
    if user is None:
        raise ThinkSyncError(INVALID_REQUEST, detail_override="User not found.")

    updates = body.model_dump(exclude_none=True)
    if "plan_tier" in updates:
        user.plan_tier = PlanTier(updates.pop("plan_tier"))
    for key, value in updates.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)

    return AdminUserItem(
        id=user.id,
        supabase_uid=user.supabase_uid,
        email=user.email,
        display_name=user.display_name,
        plan_tier=user.plan_tier.value,
        is_active=user.is_active,
        total_spent=user.total_spent,
        balance=user.balance,
        rate_limit_rpm=user.rate_limit_rpm,
        rate_limit_tpm=user.rate_limit_tpm,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/transactions", response_model=AdminTransactionListResponse)
async def list_admin_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    profile_id: str | None = None,
    transaction_type: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_session),
):
    stmt = select(BalanceTransaction)

    if profile_id:
        stmt = stmt.where(BalanceTransaction.profile_id == profile_id)
    if transaction_type:
        stmt = stmt.where(BalanceTransaction.transaction_type == transaction_type)
    if status:
        stmt = stmt.where(BalanceTransaction.status == status)

    total = int((await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0)
    rows = list(
        (
            await db.execute(
                stmt.order_by(BalanceTransaction.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .scalars()
        .all()
    )

    data = [
        AdminTransactionItem(
            id=tx.id,
            profile_id=tx.profile_id,
            amount=tx.amount,
            balance_after=tx.balance_after,
            transaction_type=tx.transaction_type.value,
            status=tx.status.value,
            description=tx.description,
            reference_type=tx.reference_type,
            reference_id=tx.reference_id,
            payment_provider=tx.payment_provider,
            payment_id=tx.payment_id,
            created_at=tx.created_at,
        )
        for tx in rows
    ]
    return AdminTransactionListResponse(data=data, meta=_pagination_meta(page, page_size, total))


@router.get("/packages", response_model=AdminPackageListResponse)
async def list_admin_packages(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    status: str | None = Query(default=None, pattern=r"^(active|archived|hidden)$"),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Package)
    if search:
        needle = f"%{search.strip().lower()}%"
        stmt = stmt.where(func.lower(Package.name).like(needle))
    if status:
        stmt = stmt.where(Package.status == PackageStatus(status))

    total = int((await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0)
    rows = list(
        (
            await db.execute(
                stmt.order_by(Package.sort_order.asc(), Package.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .scalars()
        .all()
    )

    data = [
        AdminPackageItem(
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
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in rows
    ]
    return AdminPackageListResponse(data=data, meta=_pagination_meta(page, page_size, total))


@router.post("/packages", response_model=AdminPackageItem)
async def create_admin_package(body: AdminPackageCreateRequest, db: AsyncSession = Depends(get_session)):
    item = Package(
        name=body.name,
        description=body.description,
        token_amount=body.token_amount,
        bonus_tokens=body.bonus_tokens,
        price_usd_cents=body.price_usd_cents,
        display_price=body.display_price,
        is_featured=body.is_featured,
        sort_order=body.sort_order,
        status=PackageStatus(body.status),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return AdminPackageItem(
        id=item.id,
        name=item.name,
        description=item.description,
        token_amount=item.token_amount,
        bonus_tokens=item.bonus_tokens,
        price_usd_cents=item.price_usd_cents,
        display_price=item.display_price,
        is_featured=item.is_featured,
        sort_order=item.sort_order,
        status=item.status.value,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.patch("/packages/{package_id}", response_model=AdminPackageItem)
async def update_admin_package(package_id: str, body: AdminPackageUpdateRequest, db: AsyncSession = Depends(get_session)):
    item = (await db.execute(select(Package).where(Package.id == package_id))).scalar_one_or_none()
    if item is None:
        raise ThinkSyncError(INVALID_REQUEST, detail_override="Package not found.")

    updates = body.model_dump(exclude_none=True)
    if "status" in updates:
        item.status = PackageStatus(updates.pop("status"))
    for key, value in updates.items():
        setattr(item, key, value)

    await db.commit()
    await db.refresh(item)

    return AdminPackageItem(
        id=item.id,
        name=item.name,
        description=item.description,
        token_amount=item.token_amount,
        bonus_tokens=item.bonus_tokens,
        price_usd_cents=item.price_usd_cents,
        display_price=item.display_price,
        is_featured=item.is_featured,
        sort_order=item.sort_order,
        status=item.status.value,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/promocodes", response_model=AdminPromocodeListResponse)
async def list_admin_promocodes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_session),
):
    stmt = select(Promocode)
    if search:
        needle = f"%{search.strip().lower()}%"
        stmt = stmt.where(func.lower(Promocode.code).like(needle))
    if is_active is not None:
        stmt = stmt.where(Promocode.is_active == is_active)

    total = int((await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0)
    rows = list(
        (
            await db.execute(
                stmt.order_by(Promocode.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .scalars()
        .all()
    )

    data = [
        AdminPromocodeItem(
            id=p.id,
            code=p.code,
            description=p.description,
            discount_type=p.discount_type.value,
            discount_value=p.discount_value,
            max_uses=p.max_uses,
            max_uses_per_user=p.max_uses_per_user,
            current_uses=p.current_uses,
            min_package_price_cents=p.min_package_price_cents,
            is_active=p.is_active,
            starts_at=p.starts_at,
            expires_at=p.expires_at,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in rows
    ]
    return AdminPromocodeListResponse(data=data, meta=_pagination_meta(page, page_size, total))


@router.post("/promocodes", response_model=AdminPromocodeItem)
async def create_admin_promocode(body: AdminPromocodeCreateRequest, db: AsyncSession = Depends(get_session)):
    exists = await db.execute(select(Promocode).where(Promocode.code == body.code))
    if exists.scalar_one_or_none() is not None:
        raise ThinkSyncError(INVALID_REQUEST, detail_override="Promocode already exists.")

    item = Promocode(
        code=body.code,
        description=body.description,
        discount_type=PromocodeDiscountType(body.discount_type),
        discount_value=body.discount_value,
        max_uses=body.max_uses,
        max_uses_per_user=body.max_uses_per_user,
        min_package_price_cents=body.min_package_price_cents,
        is_active=body.is_active,
        starts_at=body.starts_at,
        expires_at=body.expires_at,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return AdminPromocodeItem(
        id=item.id,
        code=item.code,
        description=item.description,
        discount_type=item.discount_type.value,
        discount_value=item.discount_value,
        max_uses=item.max_uses,
        max_uses_per_user=item.max_uses_per_user,
        current_uses=item.current_uses,
        min_package_price_cents=item.min_package_price_cents,
        is_active=item.is_active,
        starts_at=item.starts_at,
        expires_at=item.expires_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.patch("/promocodes/{promocode_id}", response_model=AdminPromocodeItem)
async def update_admin_promocode(promocode_id: str, body: AdminPromocodeUpdateRequest, db: AsyncSession = Depends(get_session)):
    item = (await db.execute(select(Promocode).where(Promocode.id == promocode_id))).scalar_one_or_none()
    if item is None:
        raise ThinkSyncError(INVALID_REQUEST, detail_override="Promocode not found.")

    updates = body.model_dump(exclude_none=True)
    if "discount_type" in updates:
        item.discount_type = PromocodeDiscountType(updates.pop("discount_type"))
    for key, value in updates.items():
        setattr(item, key, value)

    await db.commit()
    await db.refresh(item)

    return AdminPromocodeItem(
        id=item.id,
        code=item.code,
        description=item.description,
        discount_type=item.discount_type.value,
        discount_value=item.discount_value,
        max_uses=item.max_uses,
        max_uses_per_user=item.max_uses_per_user,
        current_uses=item.current_uses,
        min_package_price_cents=item.min_package_price_cents,
        is_active=item.is_active,
        starts_at=item.starts_at,
        expires_at=item.expires_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/logs", response_model=AdminApiLogListResponse)
async def list_admin_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    profile_id: str | None = None,
    model_slug: str | None = None,
    status: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_session),
):
    stmt = select(ApiLog)

    if profile_id:
        stmt = stmt.where(ApiLog.profile_id == profile_id)
    if model_slug:
        stmt = stmt.where(ApiLog.model_slug == model_slug)
    if status:
        stmt = stmt.where(ApiLog.status == status)
    if search:
        needle = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(func.coalesce(ApiLog.error_message, "")).like(needle),
                func.lower(func.coalesce(ApiLog.user_agent, "")).like(needle),
            )
        )

    total = int((await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0)
    rows = list(
        (
            await db.execute(
                stmt.order_by(ApiLog.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .scalars()
        .all()
    )

    data = [
        AdminApiLogItem(
            id=log.id,
            profile_id=log.profile_id,
            model_slug=log.model_slug,
            auth_method=log.auth_method,
            input_tokens=log.input_tokens,
            output_tokens=log.output_tokens,
            total_tokens=log.total_tokens,
            estimated_cost=log.estimated_cost,
            duration_ms=log.duration_ms,
            status=log.status.value,
            status_code=log.status_code,
            error_message=log.error_message,
            request_model=log.request_model,
            stream_enabled=log.stream_enabled,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            created_at=log.created_at,
        )
        for log in rows
    ]
    return AdminApiLogListResponse(data=data, meta=_pagination_meta(page, page_size, total))

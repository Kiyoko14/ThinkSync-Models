"""Billing service — ties usage tracking, package deduction, and balance charging.

Deduction priority:
  1. Active token packages (oldest first)
  2. Wallet balance
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models import LogStatus, Model
from app.services.balance import debit_balance, get_balance, get_total_active_package_tokens
from app.services.package import deduct_from_package, get_user_active_packages
from app.services.usage import UsageLogEntry, log_usage


class BillingError(Exception):
    """Raised when billing fails."""


async def calculate_cost(model: Model, input_tokens: int, output_tokens: int) -> float:
    input_cost = (input_tokens / 1_000_000) * model.pricing_input_per_m
    output_cost = (output_tokens / 1_000_000) * model.pricing_output_per_m
    return round(input_cost + output_cost, 8)


def tokens_from_cost(cost_usd: float, model: Model, is_input: bool = True) -> int:
    rate = model.pricing_input_per_m if is_input else model.pricing_output_per_m
    if rate <= 0:
        return 0
    return int((cost_usd / rate) * 1_000_000)


async def charge_for_usage(
    db: AsyncSession,
    profile_id: str,
    model: Model,
    input_tokens: int,
    output_tokens: int,
    duration_ms: int = 0,
    auth_method: str = "api_key",
    stream_enabled: bool = False,
    status: LogStatus = LogStatus.success,
    status_code: int = 200,
    error_message: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> UsageLogEntry:
    cost_usd = await calculate_cost(model, input_tokens, output_tokens)
    total_tokens = max(0, input_tokens) + max(0, output_tokens)

    deducted_from_package = 0
    deducted_from_balance = 0

    if status == LogStatus.success and total_tokens > 0:
        tokens_to_deduct = total_tokens

        # 1) Packages first (oldest active first)
        packages = await get_user_active_packages(db, profile_id)
        for pkg in packages:
            if tokens_to_deduct <= 0:
                break

            take = min(tokens_to_deduct, max(0, pkg.tokens_remaining))
            if take <= 0:
                continue

            await deduct_from_package(db, pkg, take)
            deducted_from_package += take
            tokens_to_deduct -= take

        # 2) Wallet balance for remainder
        if tokens_to_deduct > 0:
            try:
                await debit_balance(
                    db,
                    profile_id=profile_id,
                    amount=tokens_to_deduct,
                    description=f"Usage: {model.slug} ({input_tokens}+{output_tokens}t)",
                    reference_type="model",
                    reference_id=model.slug,
                )
                deducted_from_balance = tokens_to_deduct
            except Exception as exc:
                logger.error(
                    "billing_failed",
                    profile_id=profile_id,
                    tokens=tokens_to_deduct,
                    error=str(exc),
                )
                status = LogStatus.error
                error_message = str(exc)[:500]

    entry = UsageLogEntry(
        profile_id=profile_id,
        model_slug=model.slug,
        auth_method=auth_method,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        estimated_cost=cost_usd,
        duration_ms=duration_ms,
        status=status,
        status_code=status_code,
        error_message=error_message,
        stream_enabled=stream_enabled,
        ip_address=ip_address,
        user_agent=user_agent,
        request_model=model.slug,
    )

    await log_usage(db, entry)

    logger.info(
        "usage_charged",
        profile_id=profile_id,
        cost=cost_usd,
        deducted_from_package=deducted_from_package,
        deducted_from_balance=deducted_from_balance,
    )

    return entry


async def check_billing_capacity(
    db: AsyncSession,
    profile_id: str,
    model: Model,
    estimated_input_tokens: int = 100,
    estimated_output_tokens: int = 50,
) -> dict:
    balance = await get_balance(db, profile_id)
    package_tokens = await get_total_active_package_tokens(db, profile_id)
    total_available = balance + package_tokens
    estimated_total = max(0, estimated_input_tokens) + max(0, estimated_output_tokens)
    cost = await calculate_cost(model, estimated_input_tokens, estimated_output_tokens)

    return {
        "sufficient": total_available >= estimated_total,
        "balance": balance,
        "package_tokens": package_tokens,
        "total_available": total_available,
        "estimated_cost_usd": cost,
    }

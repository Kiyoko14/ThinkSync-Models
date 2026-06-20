"""Balance / wallet service with optimistic locking for race condition protection."""

from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models import (
    BalanceTransaction,
    Profile,
    TransactionStatus,
    TransactionType,
)


class InsufficientBalanceError(Exception):
    """Raised when the user lacks sufficient balance."""


class OptimisticLockError(Exception):
    """Raised when balance_version mismatch prevents atomic update."""


async def get_balance(db: AsyncSession, profile_id: str) -> int:
    """Return the current token balance for a profile."""
    result = await db.execute(
        select(Profile.balance).where(Profile.id == profile_id)
    )
    row = result.scalar_one_or_none()
    return row if row is not None else 0


async def get_balance_with_version(
    db: AsyncSession, profile_id: str,
) -> tuple[int, int]:
    """Return (balance, balance_version) for atomic operations."""
    result = await db.execute(
        select(Profile.balance, Profile.balance_version).where(
            Profile.id == profile_id
        )
    )
    row = result.one_or_none()
    if row is None:
        return 0, 0
    return int(row.balance), int(row.balance_version)


async def credit_balance(
    db: AsyncSession,
    profile_id: str,
    amount: int,
    transaction_type: TransactionType = TransactionType.deposit,
    description: str | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
    payment_provider: str | None = None,
    payment_id: str | None = None,
) -> BalanceTransaction:
    """Credit tokens to a user's balance. Atomic with optimistic lock.

    Positive ``amount`` adds tokens.
    """
    if amount <= 0:
        raise ValueError("Credit amount must be positive")

    current_balance, version = await get_balance_with_version(db, profile_id)
    new_balance = current_balance + amount

    # Optimistic lock: only update if balance_version matches
    result = await db.execute(
        update(Profile)
        .where(Profile.id == profile_id, Profile.balance_version == version)
        .values(balance=new_balance, balance_version=version + 1)
    )
    if result.rowcount == 0:
        raise OptimisticLockError(
            f"Balance update conflict for profile {profile_id}"
        )

    tx = BalanceTransaction(
        profile_id=profile_id,
        amount=amount,
        balance_after=new_balance,
        transaction_type=transaction_type,
        status=TransactionStatus.completed,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
        payment_provider=payment_provider,
        payment_id=payment_id,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)

    logger.info(
        "balance_credited",
        profile_id=profile_id,
        amount=amount,
        balance_after=new_balance,
    )
    return tx


async def debit_balance(
    db: AsyncSession,
    profile_id: str,
    amount: int,
    description: str | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
) -> BalanceTransaction:
    """Debit tokens from a user's balance.

    Raises ``InsufficientBalanceError`` if balance < amount.
    Raises ``OptimisticLockError`` on concurrent modification.
    """
    if amount <= 0:
        raise ValueError("Debit amount must be positive")

    current_balance, version = await get_balance_with_version(db, profile_id)
    if current_balance < amount:
        raise InsufficientBalanceError(
            f"Insufficient balance: {current_balance} < {amount}"
        )

    new_balance = current_balance - amount

    result = await db.execute(
        update(Profile)
        .where(Profile.id == profile_id, Profile.balance_version == version)
        .values(balance=new_balance, balance_version=version + 1)
    )
    if result.rowcount == 0:
        raise OptimisticLockError(
            f"Balance update conflict for profile {profile_id}"
        )

    tx = BalanceTransaction(
        profile_id=profile_id,
        amount=-amount,
        balance_after=new_balance,
        transaction_type=TransactionType.charge,
        status=TransactionStatus.completed,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)

    logger.info(
        "balance_debited",
        profile_id=profile_id,
        amount=amount,
        balance_after=new_balance,
    )
    return tx


async def get_transactions(
    db: AsyncSession,
    profile_id: str,
    limit: int = 50,
    offset: int = 0,
) -> list[BalanceTransaction]:
    """Return recent balance transactions for a profile."""
    from sqlalchemy import desc

    result = await db.execute(
        select(BalanceTransaction)
        .where(BalanceTransaction.profile_id == profile_id)
        .order_by(desc(BalanceTransaction.created_at))
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_total_active_package_tokens(
    db: AsyncSession, profile_id: str,
) -> int:
    """Sum tokens_remaining across all active (non-expired) user packages."""
    from sqlalchemy import func

    from app.models import UserPackage

    result = await db.execute(
        select(func.coalesce(func.sum(UserPackage.tokens_remaining), 0)).where(
            UserPackage.profile_id == profile_id,
            UserPackage.is_active == True,
        )
    )
    return int(result.scalar())
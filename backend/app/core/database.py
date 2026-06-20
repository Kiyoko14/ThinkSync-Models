from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


# ── Engine ──────────────────────────────────────────────────

engine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    echo=settings.debug,
    future=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Base ────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ── Session helpers ─────────────────────────────────────────

async def get_session() -> AsyncSession:  # type: ignore[misc]
    """Yield an async session.  Used as a FastAPI dependency."""
    async with async_session_factory() as session:
        yield session


async def create_all_tables() -> None:
    """Create tables (dev/test only — Alembic for prod)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_all_tables() -> None:
    """Drop all tables (test teardown)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
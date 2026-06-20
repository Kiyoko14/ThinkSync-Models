"""Redis connection management."""

from __future__ import annotations

from typing import AsyncIterator

from redis.asyncio import ConnectionPool, Redis

from app.core.config import settings


_pool: ConnectionPool | None = None


async def get_redis_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool.from_url(
            settings.redis_url,
            max_connections=settings.redis_pool_size,
            decode_responses=True,
        )
    return _pool


async def get_redis() -> AsyncIterator[Redis]:
    """FastAPI dependency — yields a Redis client."""
    pool = await get_redis_pool()
    r = Redis(connection_pool=pool)
    try:
        yield r
    finally:
        await r.close()


async def close_redis() -> None:
    global _pool
    if _pool:
        await _pool.disconnect()
        _pool = None
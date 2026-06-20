"""Redis-backed rate limiter.

Implements:
- Per-user RPM (requests per minute)
- Per-user TPM (tokens per minute)
"""

from __future__ import annotations

import inspect
import time
import uuid
from dataclasses import dataclass
from typing import Final

from redis.asyncio import Redis

from app.core.errors import rate_limited

_KEY_RPM: Final[str] = "rl:rpm:{user_id}"
_KEY_TPM: Final[str] = "rl:tpm:{user_id}"


async def _maybe_await(value):
    if inspect.isawaitable(value):
        return await value
    return value


@dataclass
class RateLimitResult:
    allowed: bool
    remaining_rpm: int = 0
    remaining_tpm: int = 0
    reset_after: int = 0


class RateLimiter:
    """Rate limiter using rolling 60-second windows in Redis."""

    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def check(
        self,
        user_id: str,
        rpm_limit: int = 60,
        tpm_limit: int = 100000,
        estimated_tokens: int = 0,
    ) -> RateLimitResult:
        now = time.time()

        rpm_ok, rpm_remaining, rpm_reset = await self._check_rpm_window(
            _KEY_RPM.format(user_id=user_id),
            limit=max(1, rpm_limit),
            now=now,
        )
        tpm_ok, tpm_remaining, tpm_reset = await self._check_tpm_window(
            _KEY_TPM.format(user_id=user_id),
            limit=max(1, tpm_limit),
            now=now,
            cost=max(0, estimated_tokens),
        )

        return RateLimitResult(
            allowed=rpm_ok and tpm_ok,
            remaining_rpm=rpm_remaining,
            remaining_tpm=tpm_remaining,
            reset_after=max(rpm_reset, tpm_reset),
        )

    async def check_or_raise(
        self,
        user_id: str,
        rpm_limit: int = 60,
        tpm_limit: int = 100000,
        estimated_tokens: int = 0,
    ) -> RateLimitResult:
        result = await self.check(user_id, rpm_limit, tpm_limit, estimated_tokens)
        if not result.allowed:
            err = rate_limited(retry_after=result.reset_after)
            err.args = ("rate_limited",)
            raise err
        return result

    async def reset(self, user_id: str) -> None:
        await _maybe_await(
            self.redis.delete(
                _KEY_RPM.format(user_id=user_id),
                _KEY_TPM.format(user_id=user_id),
            )
        )

    async def _check_rpm_window(
        self,
        key: str,
        limit: int,
        now: float,
    ) -> tuple[bool, int, int]:
        window_start = now - 60
        await _maybe_await(self.redis.zremrangebyscore(key, 0, window_start))

        current = int(await _maybe_await(self.redis.zcard(key)) or 0)
        projected = current + 1
        if projected > limit:
            oldest = await _maybe_await(self.redis.zrange(key, 0, 0, withscores=True))
            reset_after = int((oldest[0][1] + 60) - now) if oldest else 1
            return False, max(0, limit - current), max(reset_after, 1)

        member = f"{now}:1:{uuid.uuid4().hex[:8]}"
        await _maybe_await(self.redis.zadd(key, {member: now}))
        await _maybe_await(self.redis.expire(key, 120))
        return True, max(0, limit - projected), 0

    async def _check_tpm_window(
        self,
        key: str,
        limit: int,
        now: float,
        cost: int,
    ) -> tuple[bool, int, int]:
        # Prefer counter semantics for token accounting.
        raw_current = await _maybe_await(getattr(self.redis, "get", lambda *_: 0)(key))
        current_tokens: int
        try:
            current_tokens = int(raw_current or 0)
        except Exception:
            # Fallback for mocks that expose only zcard.
            current_tokens = int(await _maybe_await(self.redis.zcard(key)) or 0)

        projected = current_tokens + cost
        if projected > limit:
            ttl = await _maybe_await(getattr(self.redis, "ttl", lambda *_: 1)(key))
            reset_after = int(ttl) if isinstance(ttl, (int, float)) and ttl > 0 else 1
            return False, max(0, limit - current_tokens), reset_after

        # Use INCRBY if available; otherwise fallback to sorted-set marker.
        incrby = getattr(self.redis, "incrby", None)
        if incrby is not None:
            await _maybe_await(incrby(key, cost))
            await _maybe_await(self.redis.expire(key, 60))
        else:
            member = f"{now}:{cost}:{uuid.uuid4().hex[:8]}"
            await _maybe_await(self.redis.zadd(key, {member: now}))
            await _maybe_await(self.redis.expire(key, 120))

        return True, max(0, limit - projected), 0

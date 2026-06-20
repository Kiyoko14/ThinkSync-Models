"""Tests for the Redis-based rate limiter."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.core.rate_limiter import RateLimiter


@pytest.fixture
def rate_limiter(mock_redis: AsyncMock) -> RateLimiter:
    return RateLimiter(mock_redis)


class TestRateLimiter:
    """All tests use a mock Redis; no real Redis connection required."""

    @pytest.mark.asyncio
    async def test_allowed_when_under_limit(self, rate_limiter: RateLimiter, mock_redis: AsyncMock):
        mock_redis.zcard.return_value = 5  # 5 requests in window, limit is 10
        result = await rate_limiter.check(
            user_id="user-1",
            rpm_limit=10,
            tpm_limit=100000,
        )
        assert result.allowed is True
        assert result.remaining_rpm >= 0
        assert result.remaining_tpm >= 0

    @pytest.mark.asyncio
    async def test_blocked_when_over_rpm(self, rate_limiter: RateLimiter, mock_redis: AsyncMock):
        mock_redis.zcard.return_value = 10  # at limit
        result = await rate_limiter.check(
            user_id="user-1",
            rpm_limit=10,
            tpm_limit=100000,
        )
        assert result.allowed is False

    @pytest.mark.asyncio
    async def test_blocked_when_over_tpm(self, rate_limiter: RateLimiter, mock_redis: AsyncMock):
        mock_redis.zcard.return_value = 0  # rpm ok
        result = await rate_limiter.check(
            user_id="user-1",
            rpm_limit=100,
            tpm_limit=50,
            estimated_tokens=100,
        )
        assert result.allowed is False

    @pytest.mark.asyncio
    async def test_check_or_raise_raises_on_block(self, rate_limiter: RateLimiter, mock_redis: AsyncMock):
        mock_redis.zcard.return_value = 100  # way over limit
        with pytest.raises(Exception) as exc_info:
            await rate_limiter.check_or_raise(
                user_id="user-1",
                rpm_limit=10,
                tpm_limit=1000,
            )
        assert "rate_limited" in str(exc_info.value).lower() or "rate_limited" in str(type(exc_info.value))

    @pytest.mark.asyncio
    async def test_reset_clears_keys(self, rate_limiter: RateLimiter, mock_redis: AsyncMock):
        await rate_limiter.reset("user-1")
        assert mock_redis.delete.called

    @pytest.mark.asyncio
    async def test_allowed_reset_after_is_zero(self, rate_limiter: RateLimiter, mock_redis: AsyncMock):
        mock_redis.zcard.return_value = 0
        result = await rate_limiter.check(
            user_id="user-1",
            rpm_limit=10,
            tpm_limit=100000,
        )
        assert result.allowed is True
        assert result.reset_after == 0

    @pytest.mark.asyncio
    async def test_different_user_ids_separate_limits(self, rate_limiter: RateLimiter, mock_redis: AsyncMock):
        """Users A and B should not share rate-limit state."""
        mock_redis.zcard.return_value = 0
        result_a = await rate_limiter.check("user-a", rpm_limit=5)
        result_b = await rate_limiter.check("user-b", rpm_limit=5)
        assert result_a.allowed is True
        assert result_b.allowed is True
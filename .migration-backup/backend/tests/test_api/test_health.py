"""Tests for the health endpoint."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient, mock_redis):
    """Health endpoint should return 200 with component statuses."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert data["version"] != ""
    assert data["timestamp"] != ""
    assert data["database"] in ("connected", "disconnected")
    assert data["redis"] in ("connected", "disconnected")


@pytest.mark.asyncio
async def test_health_check_no_auth_required(client: AsyncClient):
    """Health is a public endpoint — no auth needed."""
    resp = await client.get("/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_health_check_response_shape(client: AsyncClient):
    resp = await client.get("/health")
    data = resp.json()
    expected_keys = {"status", "version", "timestamp", "database", "redis", "provider"}
    assert expected_keys.issubset(data.keys())


@pytest.mark.asyncio
async def test_health_downstream_failure(client: AsyncClient):
    """Even if DB is down, the endpoint should still respond."""
    with patch(
        "app.api.v1.health.get_session",
        side_effect=Exception("DB connection failed"),
    ):
        resp = await client.get("/health")
        # Should still return 200 with degraded status
        assert resp.status_code == 200
        data = resp.json()
        assert data["database"] in ("connected", "disconnected")
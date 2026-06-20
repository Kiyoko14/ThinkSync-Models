"""Tests for user profile and API key management endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_profile(client: AsyncClient, sample_api_key):
    key, raw = sample_api_key
    headers = {"Authorization": f"Bearer {raw}"}
    resp = await client.get("/v1/user/profile", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@thinksync.ai"
    assert data["plan_tier"] == "free"
    assert "id" in data
    assert "total_spent" in data


@pytest.mark.asyncio
async def test_get_profile_unauthorized(client: AsyncClient):
    resp = await client.get("/v1/user/profile")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_api_keys(client: AsyncClient, sample_api_key):
    key, raw = sample_api_key
    headers = {"Authorization": f"Bearer {raw}"}
    resp = await client.get("/v1/user/tokens", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["key_prefix"].endswith("...")
    assert data[0]["status"] == "active"


@pytest.mark.asyncio
async def test_generate_api_key(client: AsyncClient, sample_api_key):
    key, raw = sample_api_key
    headers = {"Authorization": f"Bearer {raw}"}
    resp = await client.post(
        "/v1/user/tokens/generate",
        json={"name": "new-key"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["raw_key"].startswith("thc_")
    assert data["name"] == "new-key"
    assert data["status"] == "active"
    # raw_key should only be shown once
    assert "raw_key" in data


@pytest.mark.asyncio
async def test_generate_api_key_with_expiry(client: AsyncClient, sample_api_key):
    key, raw = sample_api_key
    headers = {"Authorization": f"Bearer {raw}"}
    resp = await client.post(
        "/v1/user/tokens/generate",
        json={"name": "ephemeral", "expires_in_days": 7},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "ephemeral"


@pytest.mark.asyncio
async def test_revoke_api_key(client: AsyncClient, sample_api_key):
    key, raw = sample_api_key
    headers = {"Authorization": f"Bearer {raw}"}
    resp = await client.post(
        f"/v1/user/tokens/{key.id}/revoke",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "revoked"


@pytest.mark.asyncio
async def test_rotate_api_key(client: AsyncClient, sample_api_key):
    key, raw = sample_api_key
    headers = {"Authorization": f"Bearer {raw}"}
    resp = await client.post(
        f"/v1/user/tokens/{key.id}/rotate",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["raw_key"].startswith("thc_")
    assert data["raw_key"] != raw
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_get_user_stats(client: AsyncClient, sample_api_key):
    key, raw = sample_api_key
    headers = {"Authorization": f"Bearer {raw}"}
    resp = await client.get("/v1/user/stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_requests" in data
    assert "total_tokens" in data
    assert "total_cost" in data
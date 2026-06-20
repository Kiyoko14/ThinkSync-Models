"""Tests for model listing and retrieval endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_models(client: AsyncClient):
    resp = await client.get("/v1/models")
    assert resp.status_code == 200
    data = resp.json()
    assert data["object"] == "list"
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_list_models_includes_seeded(client: AsyncClient):
    resp = await client.get("/v1/models")
    models = resp.json()["data"]
    slugs = [m["id"] for m in models]
    # The app seeds default models on startup
    assert "thinking-faster1" in slugs
    assert "deepseek-v3" in slugs


@pytest.mark.asyncio
async def test_get_model_by_slug(client: AsyncClient):
    resp = await client.get("/v1/models/thinking-faster1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "thinking-faster1"
    assert data["object"] == "model"
    assert data["active"] is True
    assert data["context_window"] > 0
    assert data["pricing_input_per_m"] >= 0


@pytest.mark.asyncio
async def test_get_model_not_found(client: AsyncClient):
    resp = await client.get("/v1/models/nonexistent-model-xyz")
    assert resp.status_code == 404
    body = resp.json()
    assert "error" in body
    assert body["error"]["code"] == "model_not_found"


@pytest.mark.asyncio
async def test_model_response_shape(client: AsyncClient):
    resp = await client.get("/v1/models/thinking-faster1")
    data = resp.json()
    expected_keys = {
        "id", "object", "created", "owned_by",
        "active", "context_window", "max_output_tokens",
        "pricing_input_per_m", "pricing_output_per_m",
        "supports_streaming", "supports_functions",
    }
    assert expected_keys.issubset(data.keys())
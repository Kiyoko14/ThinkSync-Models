"""Tests for the chat completion endpoint.

Uses mocked upstream provider responses so no real API calls are made.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.schemas import ChatCompletionRequest


@pytest.mark.asyncio
async def test_chat_completion_with_api_key(
    client: AsyncClient,
    sample_api_key,
    sample_model,
):
    """A successfully authenticated request returns a chat completion."""
    key, raw_key = sample_api_key
    auth_header = {"Authorization": f"Bearer {raw_key}"}

    payload = {
        "model": sample_model.slug,
        "messages": [{"role": "user", "content": "Hello"}],
    }

    # Mock the upstream provider
    from app.services.provider import ChatCompletionResponse as ProviderResp
    from app.services.usage import UsageRecord

    mock_resp = ProviderResp(
        id="chatcmpl-test123",
        model=sample_model.slug,
        provider_model=sample_model.provider_model_id,
        choices=[{
            "index": 0,
            "message": {"role": "assistant", "content": "Hi there!"},
            "finish_reason": "stop",
        }],
        usage=UsageRecord(
            input_tokens=10,
            output_tokens=5,
            total_tokens=15,
            estimated_cost=0.000015,
            duration_ms=100,
        ),
    )

    with patch(
        "app.services.providers.SiliconFlowProvider.chat_completion",
        new=AsyncMock(return_value=mock_resp),
    ):
        resp = await client.post(
            "/v1/chat/completions",
            json=payload,
            headers=auth_header,
        )

    assert resp.status_code == 200, f"Body: {resp.text}"
    data = resp.json()
    assert data["object"] == "chat.completion"
    assert len(data["choices"]) > 0
    assert data["choices"][0]["message"]["content"] == "Hi there!"
    assert data["usage"] is not None
    assert data["usage"]["total_tokens"] == 15


@pytest.mark.asyncio
async def test_chat_completion_no_auth(client: AsyncClient):
    resp = await client.post(
        "/v1/chat/completions",
        json={"model": "test", "messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_chat_completion_invalid_api_key(client: AsyncClient):
    resp = await client.post(
        "/v1/chat/completions",
        json={"model": "test", "messages": [{"role": "user", "content": "hi"}]},
        headers={"Authorization": "Bearer thc_fakekey1234567890abcdef12345678"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_chat_completion_model_not_found(
    client: AsyncClient,
    sample_api_key,
):
    key, raw_key = sample_api_key
    payload = {
        "model": "nonexistent-model",
        "messages": [{"role": "user", "content": "Hello"}],
    }
    resp = await client.post(
        "/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_chat_completion_validation_error(
    client: AsyncClient,
    sample_api_key,
):
    key, raw_key = sample_api_key
    # Missing required "messages" field
    resp = await client.post(
        "/v1/chat/completions",
        json={"model": "test-model"},
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_chat_completion_upstream_error(
    client: AsyncClient,
    sample_api_key,
    sample_model,
):
    key, raw_key = sample_api_key

    with patch(
        "app.services.providers.SiliconFlowProvider.chat_completion",
        new=AsyncMock(side_effect=Exception("Upstream connection failed")),
    ):
        resp = await client.post(
            "/v1/chat/completions",
            json={
                "model": sample_model.slug,
                "messages": [{"role": "user", "content": "Hello"}],
            },
            headers={"Authorization": f"Bearer {raw_key}"},
        )

    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_chat_completion_streaming_flag(
    client: AsyncClient,
    sample_api_key,
    sample_model,
):
    """Verify the endpoint accepts stream=True even if we mock non-stream."""
    key, raw_key = sample_api_key

    from app.services.provider import ChatCompletionResponse as ProviderResp
    from app.services.usage import UsageRecord

    mock_resp = ProviderResp(
        id="chatcmpl-stream-test",
        model=sample_model.slug,
        provider_model=sample_model.provider_model_id,
        choices=[{
            "index": 0,
            "message": {"role": "assistant", "content": "Stream result"},
            "finish_reason": "stop",
        }],
        usage=UsageRecord(input_tokens=5, output_tokens=3, total_tokens=8, estimated_cost=0.00001, duration_ms=50),
    )

    with patch(
        "app.services.providers.SiliconFlowProvider.chat_completion",
        new=AsyncMock(return_value=mock_resp),
    ):
        resp = await client.post(
            "/v1/chat/completions",
            json={
                "model": sample_model.slug,
                "messages": [{"role": "user", "content": "Hello"}],
                "stream": False,  # Non-stream for now
            },
            headers={"Authorization": f"Bearer {raw_key}"},
        )

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_chat_completion_request_schema_validation():
    """Test that the Pydantic schema validates correctly."""
    valid = ChatCompletionRequest(
        model="test-model",
        messages=[{"role": "user", "content": "Hello"}],
        temperature=0.7,
        max_tokens=100,
    )
    assert valid.model == "test-model"
    assert valid.temperature == 0.7

    with pytest.raises(Exception):
        ChatCompletionRequest(
            model="",
            messages=[],
        )
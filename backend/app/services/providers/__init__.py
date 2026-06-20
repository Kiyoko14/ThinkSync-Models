"""SiliconFlow provider implementation."""

from __future__ import annotations

import json
import time
import uuid
from typing import Any, AsyncIterator

import httpx

from app.core.config import settings
from app.core.errors import provider_error
from app.services.provider import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ProviderInterface,
    register_provider,
)
from app.services.token_counter import estimate_completion_tokens
from app.services.usage import UsageRecord


@register_provider
class SiliconFlowProvider(ProviderInterface):
    """Adapter for the SiliconFlow API (OpenAI-compatible)."""

    BASE_URL = "https://api.siliconflow.cn/v1"

    @property
    def name(self) -> str:
        return "siliconflow"

    def _build_headers(self) -> dict[str, str]:
        if not settings.siliconflow_api_key:
            raise provider_error("SiliconFlow API key is not configured.")
        return {
            "Authorization": f"Bearer {settings.siliconflow_api_key}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _resolve_model_id(model: Any) -> str:
        return model.provider_model_id

    def _build_body(self, request: ChatCompletionRequest) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model": self._resolve_model_id(request.model),
            "messages": request.messages,
        }
        if request.temperature is not None:
            body["temperature"] = request.temperature
        if request.top_p is not None:
            body["top_p"] = request.top_p
        if request.max_tokens is not None:
            body["max_tokens"] = request.max_tokens
        if request.stop:
            body["stop"] = request.stop
        if request.stream:
            body["stream"] = True
        if request.extra_body:
            body.update(request.extra_body)
        return body

    async def chat_completion(
        self,
        request: ChatCompletionRequest,
        user_id: str,
    ) -> ChatCompletionResponse:
        body = self._build_body(request)
        body["stream"] = False

        t0 = time.monotonic()
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self._build_headers(),
                json=body,
            )
        duration_ms = int((time.monotonic() - t0) * 1000)

        if resp.status_code != 200:
            self._raise_upstream_error(resp.status_code, resp.text)

        data = resp.json()
        usage = data.get("usage") or {}

        input_tokens = int(usage.get("prompt_tokens", 0) or 0)
        output_tokens = int(usage.get("completion_tokens", 0) or 0)

        if output_tokens == 0:
            text = ""
            for choice in data.get("choices", []):
                text += (choice.get("message") or {}).get("content") or ""
            output_tokens = estimate_completion_tokens(text=text, model_name=request.model.provider_model_id)

        total_tokens = int(usage.get("total_tokens", 0) or 0)
        if total_tokens == 0:
            total_tokens = input_tokens + output_tokens

        usage_record = UsageRecord(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            estimated_cost=_estimate_cost(request.model, input_tokens, output_tokens),
            duration_ms=duration_ms,
        )

        return ChatCompletionResponse(
            id=data.get("id", f"chatcmpl-{uuid.uuid4().hex[:12]}"),
            model=request.model.slug,
            provider_model=request.model.provider_model_id,
            choices=data.get("choices", []),
            usage=usage_record,
            raw_response=data,
        )

    async def chat_completion_stream(
        self,
        request: ChatCompletionRequest,
        user_id: str,
    ) -> AsyncIterator[dict[str, Any]]:
        body = self._build_body(request)
        body["stream"] = True

        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream(
                "POST",
                f"{self.BASE_URL}/chat/completions",
                headers=self._build_headers(),
                json=body,
            ) as resp:
                if resp.status_code != 200:
                    detail = await resp.aread()
                    self._raise_upstream_error(resp.status_code, detail.decode("utf-8", errors="replace"))

                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    if not line.startswith("data:"):
                        continue

                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        break

                    try:
                        event = json.loads(payload)
                    except json.JSONDecodeError:
                        continue

                    yield event

    async def health_check(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/models",
                headers=self._build_headers(),
            )
        return {"status": "ok" if resp.status_code == 200 else "error"}

    @staticmethod
    def _raise_upstream_error(status_code: int, body: str) -> None:
        detail = body[:500] if body else "no body"
        try:
            parsed = json.loads(body)
            detail = (parsed.get("error") or {}).get("message") or detail
        except Exception:
            pass
        raise provider_error(f"SiliconFlow returned {status_code}: {detail}")


def _estimate_cost(model: Any, input_tokens: int, output_tokens: int) -> float:
    input_cost = (input_tokens / 1_000_000) * model.pricing_input_per_m
    output_cost = (output_tokens / 1_000_000) * model.pricing_output_per_m
    return round(input_cost + output_cost, 6)

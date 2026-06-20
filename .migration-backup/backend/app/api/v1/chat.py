"""Chat completion endpoint — OpenAI-compatible /v1/chat/completions."""

from __future__ import annotations

import json
import time
import uuid
from typing import Any, AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import MODEL_INACTIVE, MODEL_NOT_FOUND, PROVIDER_ERROR, ThinkSyncError
from app.core.logging import logger
from app.core.rate_limiter import RateLimiter
from app.core.redis import get_redis
from app.dependencies import get_current_profile, get_rate_limiter
from app.models import LogStatus, Model, Profile
from app.schemas import (
    ChatCompletionRequest as ChatCompletionSchema,
    ChatCompletionResponse as ChatCompletionResponseSchema,
    ChoiceResponse,
    UsageResponse,
)
from app.services.billing import charge_for_usage
from app.services.provider import ChatCompletionRequest as ProviderRequest
from app.services.provider import get_provider
from app.services.token_counter import count_message_tokens, estimate_completion_tokens

router = APIRouter()


@router.post("/completions")
async def chat_completion(
    request: Request,
    body: ChatCompletionSchema,
    db: AsyncSession = Depends(get_session),
    profile: Profile = Depends(get_current_profile),
    redis: Redis = Depends(get_redis),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
):
    model_obj = await _resolve_model(db, body.model)
    if not model_obj:
        raise ThinkSyncError(MODEL_NOT_FOUND)
    if not model_obj.is_active:
        raise ThinkSyncError(MODEL_INACTIVE)

    messages = [m.model_dump(exclude_none=True) for m in body.messages]
    estimated_prompt_tokens = count_message_tokens(messages, model_obj.provider_model_id)
    estimated_completion = estimate_completion_tokens(
        max_tokens=body.max_tokens or min(model_obj.max_output_tokens, 1024),
        model_name=model_obj.provider_model_id,
    )
    estimated_total = estimated_prompt_tokens + estimated_completion

    rpm_limit = profile.rate_limit_rpm or 60
    tpm_limit = profile.rate_limit_tpm or 100000
    await rate_limiter.check_or_raise(
        user_id=profile.id,
        rpm_limit=rpm_limit,
        tpm_limit=tpm_limit,
        estimated_tokens=estimated_total,
    )

    provider_req = ProviderRequest(
        model=model_obj,
        messages=messages,
        temperature=body.temperature,
        top_p=body.top_p,
        max_tokens=body.max_tokens,
        stop=[body.stop] if isinstance(body.stop, str) else body.stop,
        stream=body.stream,
        extra_body=body.extra_body,
    )

    provider = get_provider(model_obj.provider_name)

    if body.stream:
        return await _stream_response(
            request=request,
            provider=provider,
            provider_req=provider_req,
            db=db,
            profile=profile,
            model_obj=model_obj,
            estimated_prompt_tokens=estimated_prompt_tokens,
            estimated_completion_tokens=estimated_completion,
        )

    return await _non_stream_response(
        request=request,
        provider=provider,
        provider_req=provider_req,
        db=db,
        profile=profile,
        model_obj=model_obj,
        estimated_prompt_tokens=estimated_prompt_tokens,
        estimated_completion_tokens=estimated_completion,
    )


async def _non_stream_response(
    request: Request,
    provider: Any,
    provider_req: ProviderRequest,
    db: AsyncSession,
    profile: Profile,
    model_obj: Model,
    estimated_prompt_tokens: int,
    estimated_completion_tokens: int,
):
    t0 = time.monotonic()
    try:
        resp = await provider.chat_completion(provider_req, profile.id)
    except ThinkSyncError:
        raise
    except Exception as exc:
        logger.exception("provider_error", model=model_obj.slug)
        raise ThinkSyncError(PROVIDER_ERROR, detail_override=f"Upstream provider error: {str(exc)[:300]}")

    duration_ms = int((time.monotonic() - t0) * 1000)

    input_tokens = resp.usage.input_tokens or estimated_prompt_tokens
    output_tokens = resp.usage.output_tokens or estimated_completion_tokens

    await charge_for_usage(
        db=db,
        profile_id=profile.id,
        model=model_obj,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        duration_ms=duration_ms,
        auth_method="api_key",
        stream_enabled=False,
        status=LogStatus.success,
        status_code=200,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    choices = [
        ChoiceResponse(
            index=c.get("index", 0),
            message={
                "role": (c.get("message") or {}).get("role", "assistant"),
                "content": (c.get("message") or {}).get("content", ""),
            },
            finish_reason=c.get("finish_reason"),
        )
        for c in resp.choices
    ]

    return ChatCompletionResponseSchema(
        id=resp.id,
        created=int(time.time()),
        model=resp.model,
        choices=choices,
        usage=UsageResponse(
            prompt_tokens=input_tokens,
            completion_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            estimated_cost_usd=resp.usage.estimated_cost,
        ),
    )


async def _stream_response(
    request: Request,
    provider: Any,
    provider_req: ProviderRequest,
    db: AsyncSession,
    profile: Profile,
    model_obj: Model,
    estimated_prompt_tokens: int,
    estimated_completion_tokens: int,
):
    async def event_stream() -> AsyncIterator[str]:
        t0 = time.monotonic()
        response_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        output_text_parts: list[str] = []
        prompt_tokens = 0
        completion_tokens = 0
        saw_usage = False

        try:
            async for chunk in provider.chat_completion_stream(provider_req, profile.id):
                # Provider-emitted final usage chunk
                if "usage" in chunk:
                    usage_data = chunk.get("usage") or {}
                    prompt_tokens = int(usage_data.get("prompt_tokens", 0) or 0)
                    completion_tokens = int(usage_data.get("completion_tokens", 0) or 0)
                    saw_usage = True
                    # Do not emit the usage pseudo-chunk to OpenAI clients
                    continue

                # Normalize chunk shape for OpenAI compatibility
                normalized = {
                    "id": chunk.get("id", response_id),
                    "object": "chat.completion.chunk",
                    "created": chunk.get("created", int(time.time())),
                    "model": chunk.get("model", model_obj.slug),
                    "choices": chunk.get("choices", []),
                }

                # Track emitted text for token fallback
                for c in normalized.get("choices", []):
                    delta = c.get("delta") or {}
                    if isinstance(delta.get("content"), str) and delta["content"]:
                        output_text_parts.append(delta["content"])

                yield f"data: {json.dumps(normalized, ensure_ascii=False)}\n\n"

            if not saw_usage:
                prompt_tokens = estimated_prompt_tokens
                completion_text = "".join(output_text_parts)
                completion_tokens = estimate_completion_tokens(
                    text=completion_text,
                    max_tokens=estimated_completion_tokens,
                    model_name=model_obj.provider_model_id,
                )

            duration_ms = int((time.monotonic() - t0) * 1000)
            await charge_for_usage(
                db=db,
                profile_id=profile.id,
                model=model_obj,
                input_tokens=prompt_tokens,
                output_tokens=completion_tokens,
                duration_ms=duration_ms,
                auth_method="api_key",
                stream_enabled=True,
                status=LogStatus.success,
                status_code=200,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )

            yield "data: [DONE]\n\n"

        except Exception as exc:
            logger.exception("stream_error", model=model_obj.slug)
            duration_ms = int((time.monotonic() - t0) * 1000)
            await charge_for_usage(
                db=db,
                profile_id=profile.id,
                model=model_obj,
                input_tokens=0,
                output_tokens=0,
                duration_ms=duration_ms,
                auth_method="api_key",
                stream_enabled=True,
                status=LogStatus.error,
                status_code=502,
                error_message=str(exc)[:500],
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            err = {"error": {"message": str(exc)[:200], "type": "provider_error"}}
            yield f"data: {json.dumps(err)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _resolve_model(db: AsyncSession, slug: str) -> Model | None:
    result = await db.execute(select(Model).where(Model.slug == slug))
    return result.scalar_one_or_none()

"""Pydantic v2 schemas for request/response models."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Health ──────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = ""
    timestamp: str = ""
    database: str = "connected"
    redis: str = "connected"
    provider: str = "unknown"


# ── Models ──────────────────────────────────────────────────

class ModelResponse(BaseModel):
    id: str
    object: str = "model"
    created: int = 0
    owned_by: str = "thinksync"
    active: bool = True
    context_window: int = 0
    max_output_tokens: int = 0
    pricing_input_per_m: float = 0.0
    pricing_output_per_m: float = 0.0
    supports_streaming: bool = True
    supports_functions: bool = False


class ListModelsResponse(BaseModel):
    object: str = "list"
    data: list[ModelResponse]


# ── Chat Completion (OpenAI-compatible) ────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., pattern=r"^(system|user|assistant|tool)$")
    content: str | list[dict[str, Any]] | None = None
    name: str | None = None
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: str | None = None


class ChatCompletionRequest(BaseModel):
    model: str = Field(..., min_length=1, description="Model slug (e.g. thinking-faster1)")
    messages: list[ChatMessage] = Field(..., min_length=1)
    temperature: float | None = Field(None, ge=0.0, le=2.0)
    top_p: float | None = Field(None, ge=0.0, le=1.0)
    max_tokens: int | None = Field(None, ge=1, le=102400)
    stop: str | list[str] | None = None
    stream: bool = False
    frequency_penalty: float | None = Field(None, ge=-2.0, le=2.0)
    presence_penalty: float | None = Field(None, ge=-2.0, le=2.0)
    user: str | None = None
    extra_body: dict[str, Any] | None = None


class UsageResponse(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0


class ChoiceResponse(BaseModel):
    index: int = 0
    message: ChatMessage
    finish_reason: str | None = None
    logprobs: dict[str, Any] | None = None


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int = 0
    model: str
    choices: list[ChoiceResponse]
    usage: UsageResponse | None = None


# ── User / Profile ─────────────────────────────────────────

class ProfileResponse(BaseModel):
    id: str
    supabase_uid: str
    email: str
    display_name: str | None
    plan_tier: str
    is_active: bool
    total_spent: float
    created_at: datetime | None = None


class StatsResponse(BaseModel):
    total_requests: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0


# ── API Keys ───────────────────────────────────────────────

class ApiKeyResponse(BaseModel):
    id: str
    key_prefix: str
    name: str
    status: str
    created_at: datetime | None = None
    last_used_at: datetime | None = None
    expires_at: datetime | None = None


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(default="default", max_length=128)
    expires_in_days: int | None = Field(None, ge=1, le=365)


class ApiKeyCreateResponse(BaseModel):
    id: str
    key_prefix: str
    name: str
    raw_key: str = Field(..., description="Full API key — shown only once")
    status: str


class ApiKeyRevokeResponse(BaseModel):
    id: str
    status: str
    message: str = "API key revoked successfully."


# ── Error ──────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: ErrorDetail


class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: str = ""
    retry_after_seconds: int | None = None
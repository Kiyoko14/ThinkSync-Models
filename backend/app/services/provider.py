"""Provider abstraction layer.

Define ``ProviderInterface`` that every AI provider must implement.
Concrete providers live under ``app/services/providers/``.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, AsyncIterator

from app.models import Model
from app.services.usage import UsageRecord


# ── Dataclasses ─────────────────────────────────────────────

@dataclass
class ChatCompletionRequest:
    """Normalised request that providers operate on."""

    model: Model
    messages: list[dict[str, Any]]
    temperature: float | None = None
    top_p: float | None = None
    max_tokens: int | None = None
    stop: list[str] | None = None
    stream: bool = False
    extra_body: dict[str, Any] | None = None


@dataclass
class ChatCompletionResponse:
    """Normalised response returned to the gateway layer."""

    id: str
    model: str
    provider_model: str
    choices: list[dict[str, Any]]
    usage: UsageRecord
    raw_response: dict[str, Any] | None = None


# ── Interface ───────────────────────────────────────────────

class ProviderInterface(ABC):
    """Every AI provider adapter must implement this interface."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name (e.g. 'siliconflow')."""
        ...

    @abstractmethod
    async def chat_completion(
        self,
        request: ChatCompletionRequest,
        user_id: str,
    ) -> ChatCompletionResponse:
        """Send a non-streaming chat completion request.

        Returns a normalised ``ChatCompletionResponse``.
        """
        ...

    @abstractmethod
    async def chat_completion_stream(
        self,
        request: ChatCompletionRequest,
        user_id: str,
    ) -> AsyncIterator[dict[str, Any]]:
        """Send a streaming chat completion request.

        Yields SSE-friendly dicts; the last dict **must** include
        usage information (``"usage"`` key with token counts).
        """
        ...


# ── Registry ────────────────────────────────────────────────

_providers: dict[str, type[ProviderInterface]] = {}


def register_provider(cls: type[ProviderInterface]) -> type[ProviderInterface]:
    """Decorator to register a provider class."""
    instance = cls()
    _providers[instance.name] = cls
    return cls


def get_provider(name: str = "siliconflow") -> ProviderInterface:
    """Return an instance of the named provider."""
    cls = _providers.get(name)
    if not cls:
        msg = f"Unknown provider: {name!r}.  Available: {list(_providers)}"
        raise ValueError(msg)

    # Pass config via constructor — each provider accepts its own params
    return cls()


def list_providers() -> list[str]:
    return list(_providers)


# ── Auto-import all provider modules so decorators fire ─────

def _discover_providers() -> None:
    import importlib
    import pkgutil
    import app.services.providers as pkg

    for _mod_info in pkgutil.iter_modules(pkg.__path__):
        importlib.import_module(f"app.services.providers.{_mod_info.name}")


_discover_providers()
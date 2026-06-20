"""Token counting utilities with deterministic fallbacks."""

from __future__ import annotations

from typing import Any

try:
    import tiktoken  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    tiktoken = None  # type: ignore


def _encode_len(text: str, model_name: str | None = None) -> int:
    if not text:
        return 0

    if tiktoken is not None:
        try:
            enc = tiktoken.encoding_for_model(model_name or "gpt-4o-mini")
        except Exception:
            enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))

    # fallback heuristic: ~4 chars/token for latin text
    return max(1, len(text) // 4)


def _message_content_to_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
                continue
            if isinstance(part, dict):
                if isinstance(part.get("text"), str):
                    parts.append(part["text"])
                elif isinstance(part.get("content"), str):
                    parts.append(part["content"])
        return "\n".join(parts)
    return str(content)


def count_message_tokens(messages: list[dict[str, Any]], model_name: str | None = None) -> int:
    """Approximate token count for OpenAI-style chat messages."""
    total = 0
    for msg in messages:
        # Per-message framing overhead (OpenAI style conventions)
        total += 4
        total += _encode_len(str(msg.get("role", "")), model_name)
        total += _encode_len(_message_content_to_text(msg.get("content")), model_name)

        if msg.get("name"):
            total += _encode_len(str(msg["name"]), model_name)

        # Tool calls can materially increase prompt size
        tool_calls = msg.get("tool_calls")
        if tool_calls:
            total += _encode_len(str(tool_calls), model_name)

    # Assistant priming/end marker
    total += 2
    return max(total, 0)


def estimate_completion_tokens(
    text: str | None = None,
    max_tokens: int | None = None,
    model_name: str | None = None,
) -> int:
    if text:
        return _encode_len(text, model_name)
    if max_tokens is not None:
        return max(0, max_tokens)
    return 0

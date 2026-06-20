"""Utility helpers."""

from __future__ import annotations

import re


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def is_valid_email(email: str) -> bool:
    return bool(EMAIL_REGEX.match(email))


def format_profile(data: dict, lang: str = "uz") -> str:
    """Format profile data for display."""
    lines = [
        f"📧 Email: {data.get('email', 'N/A')}",
        f"📊 Plan: {data.get('plan_tier', 'N/A')}",
        f"🔒 Status: {'active' if data.get('is_active') else 'inactive'}",
        f"💸 Total spent: ${data.get('total_spent', 0)}",
    ]
    return "\n".join(lines)


def format_model(model: dict, lang: str = "uz") -> str:
    """Format model data for display."""
    streaming = "Yes" if model.get("supports_streaming") else "No"
    functions = "Yes" if model.get("supports_functions") else "No"
    active = "✅" if model.get("active") else "❌"
    return (
        f"{active} {model.get('id', 'Unknown')}\n"
        f"📊 Context: {model.get('context_window', 0):,} tokens\n"
        f"✍️ Input: ${model.get('pricing_input_per_m', 0)}/1M | Output: ${model.get('pricing_output_per_m', 0)}/1M\n"
        f"⚡ Streaming: {streaming} | Functions: {functions}\n"
        f"🔹 Max output: {model.get('max_output_tokens', 0):,} tokens"
    )


def format_package(pkg: dict, lang: str = "uz") -> str:
    """Format package data for display."""
    total = pkg.get("token_amount", 0) + pkg.get("bonus_tokens", 0)
    featured = "⭐" if pkg.get("is_featured") else ""
    return (
        f"{featured} {pkg.get('name', 'Unknown')}\n"
        f"💰 Price: {pkg.get('display_price', 'N/A')}\n"
        f"📦 Tokens: {pkg.get('token_amount', 0):,} + {pkg.get('bonus_tokens', 0):,} bonus = {total:,} total"
    )


def escape_markdown(text: str) -> str:
    """Escape markdown characters for Telegram."""
    chars = r"_\*\[\]\(\)~`>#+-=|{}.!"
    for ch in chars:
        text = text.replace(ch, f"\\{ch}")
    return text


def truncate_text(text: str, max_length: int = 4000) -> str:
    """Truncate text to Telegram message limit."""
    if len(text) <= max_length:
        return text
    return text[: max_length - 3] + "..."

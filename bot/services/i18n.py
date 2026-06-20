"""Internationalization for the bot."""

from __future__ import annotations

import json
import os
from typing import Any


class I18n:
    """Simple i18n manager."""

    _translations: dict[str, dict[str, Any]] = {}
    _loaded = False

    @classmethod
    def _load(cls) -> None:
        if cls._loaded:
            return
        locales_dir = os.path.join(os.path.dirname(__file__), "..", "locales")
        for lang in ("en", "uz", "ru"):
            path = os.path.join(locales_dir, f"{lang}.json")
            try:
                with open(path, "r", encoding="utf-8") as f:
                    cls._translations[lang] = json.load(f)
            except FileNotFoundError:
                cls._translations[lang] = {}
        cls._loaded = True

    @classmethod
    def get(cls, lang: str, key: str, **kwargs: Any) -> str:
        cls._load()
        translations = cls._translations.get(lang, cls._translations.get("en", {}))
        parts = key.split(".")
        value: Any = translations
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                value = key
                break
        if not isinstance(value, str):
            value = key
        try:
            return value.format(**kwargs)
        except (KeyError, ValueError):
            return value


# Convenience function
def t(key: str, lang: str = "uz", **kwargs: Any) -> str:
    return I18n.get(lang, key, **kwargs)

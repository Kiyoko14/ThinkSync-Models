"""Inline keyboards for the bot."""

from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot.services.i18n import t


def language_keyboard() -> InlineKeyboardMarkup:
    """Language selection keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🇺🇿 O'zbek", callback_data="lang:uz"),
                InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang:ru"),
                InlineKeyboardButton(text="🇬🇧 English", callback_data="lang:en"),
            ]
        ]
    )


def main_menu_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Main menu keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t("models.select", lang), callback_data="menu:models"),
                InlineKeyboardButton(text=t("profile.title", lang), callback_data="menu:profile"),
            ],
            [
                InlineKeyboardButton(text=t("chat.select_model", lang), callback_data="menu:ask"),
                InlineKeyboardButton(text=t("billing.title", lang), callback_data="menu:buy"),
            ],
            [
                InlineKeyboardButton(text=t("help.title", lang), callback_data="menu:help"),
            ],
        ]
    )


def model_list_keyboard(models: list[dict], lang: str = "uz") -> InlineKeyboardMarkup:
    """Keyboard for selecting a model."""
    buttons = []
    for model in models:
        slug = model.get("id", "")
        name = model.get("id", slug)
        buttons.append([InlineKeyboardButton(text=name, callback_data=f"model:{slug}")])
    buttons.append([InlineKeyboardButton(text=t("common.back", lang), callback_data="menu:back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def chat_model_keyboard(models: list[dict], lang: str = "uz") -> InlineKeyboardMarkup:
    """Keyboard for selecting a chat model."""
    buttons = []
    for model in models:
        slug = model.get("id", "")
        name = model.get("id", slug)
        buttons.append([InlineKeyboardButton(text=name, callback_data=f"chat_model:{slug}")])
    buttons.append([InlineKeyboardButton(text=t("common.back", lang), callback_data="menu:back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def package_list_keyboard(packages: list[dict], lang: str = "uz") -> InlineKeyboardMarkup:
    """Keyboard for selecting a package to buy."""
    buttons = []
    for pkg in packages:
        pkg_id = pkg.get("id", "")
        name = pkg.get("name", pkg_id)
        price = pkg.get("display_price", "")
        buttons.append([InlineKeyboardButton(text=f"{name} — {price}", callback_data=f"buy:{pkg_id}")])
    buttons.append([InlineKeyboardButton(text=t("common.back", lang), callback_data="menu:back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def admin_menu_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Admin panel keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="📈 Stats", callback_data="admin:stats"),
                InlineKeyboardButton(text="📤 Broadcast", callback_data="admin:broadcast"),
            ],
            [
                InlineKeyboardButton(text="🤖 Models", callback_data="admin:models"),
                InlineKeyboardButton(text="👥 Users", callback_data="admin:users"),
            ],
            [
                InlineKeyboardButton(text="📋 Logs", callback_data="admin:logs"),
            ],
            [
                InlineKeyboardButton(text=t("common.back", lang), callback_data="menu:back"),
            ],
        ]
    )


def back_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Simple back button."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t("common.back", lang), callback_data="menu:back")]
        ]
    )


def confirm_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Yes/No confirmation keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t("common.yes", lang), callback_data="confirm:yes"),
                InlineKeyboardButton(text=t("common.no", lang), callback_data="confirm:no"),
            ]
        ]
    )

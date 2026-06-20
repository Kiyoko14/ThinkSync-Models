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


def payment_method_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Payment method selection keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💵 Stripe", callback_data="pay:stripe"),
            ],
            [
                InlineKeyboardButton(text="🇺🇿 Click", callback_data="pay:click"),
            ],
            [
                InlineKeyboardButton(text="💳 Payme", callback_data="pay:payme"),
            ],
            [
                InlineKeyboardButton(text=t("common.cancel", lang), callback_data="pay:cancel"),
            ],
        ]
    )


def package_confirm_keyboard(pkg_id: str, lang: str = "uz") -> InlineKeyboardMarkup:
    """Package purchase confirmation keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t("common.yes", lang), callback_data=f"buy_confirm:{pkg_id}:yes"),
                InlineKeyboardButton(text=t("common.no", lang), callback_data=f"buy_confirm:{pkg_id}:no"),
            ]
        ]
    )


def payment_action_keyboard(payment_id: str, checkout_url: str, lang: str = "uz") -> InlineKeyboardMarkup:
    """Payment action keyboard with checkout link and verify."""
    buttons = [
        [InlineKeyboardButton(text=t("payment.checkout", lang), url=checkout_url)],
        [
            InlineKeyboardButton(text=t("payment.verify", lang), callback_data=f"pay_verify:{payment_id}"),
        ],
        [InlineKeyboardButton(text=t("common.cancel", lang), callback_data="pay:cancel")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def support_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Support menu keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t("support.create_ticket", lang), callback_data="support:new"),
                InlineKeyboardButton(text=t("support.my_tickets", lang), callback_data="support:list"),
            ],
            [
                InlineKeyboardButton(text=t("common.back", lang), callback_data="menu:back"),
            ],
        ]
    )


def ticket_list_keyboard(tickets: list[dict], lang: str = "uz") -> InlineKeyboardMarkup:
    """Keyboard for listing user's tickets."""
    buttons = []
    for ticket in tickets:
        t_id = ticket.get("ticket_id", ticket.get("id", ""))
        subject = ticket.get("subject", "No subject")
        status = ticket.get("status", "open")
        emoji = "✅" if status == "resolved" else "🔹" if status == "in_progress" else "🔴"
        buttons.append([InlineKeyboardButton(text=f"{emoji} {subject}", callback_data=f"ticket:{t_id}")])
    buttons.append([InlineKeyboardButton(text=t("common.back", lang), callback_data="support:menu")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def ticket_detail_keyboard(ticket_id: str, status: str, is_admin: bool, lang: str = "uz") -> InlineKeyboardMarkup:
    """Keyboard for ticket detail view."""
    buttons = [
        [InlineKeyboardButton(text=t("support.reply", lang), callback_data=f"ticket_reply:{ticket_id}")],
    ]
    if status != "closed":
        buttons.append([InlineKeyboardButton(text=t("support.close_ticket", lang), callback_data=f"ticket_close:{ticket_id}")])
    if is_admin:
        if status == "open":
            buttons.append([InlineKeyboardButton(text=t("support.take_ticket", lang), callback_data=f"ticket_take:{ticket_id}")])
        buttons.append([InlineKeyboardButton(text=t("support.resolve_ticket", lang), callback_data=f"ticket_resolve:{ticket_id}")])
    buttons.append([InlineKeyboardButton(text=t("common.back", lang), callback_data="support:list")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def admin_support_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Admin support panel keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t("support.open_tickets", lang), callback_data="admin_support:open"),
                InlineKeyboardButton(text=t("support.all_tickets", lang), callback_data="admin_support:all"),
            ],
            [
                InlineKeyboardButton(text=t("support.ticket_stats", lang), callback_data="admin_support:stats"),
            ],
            [
                InlineKeyboardButton(text=t("common.back", lang), callback_data="admin:menu"),
            ],
        ]
    )


def broadcast_audience_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Broadcast audience selection keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t("broadcast.all_users", lang), callback_data="broadcast_audience:all"),
            ],
            [
                InlineKeyboardButton(text=t("broadcast.active_users", lang), callback_data="broadcast_audience:active"),
            ],
            [
                InlineKeyboardButton(text=t("broadcast.paying_users", lang), callback_data="broadcast_audience:paying"),
            ],
            [
                InlineKeyboardButton(text=t("common.cancel", lang), callback_data="broadcast:cancel"),
            ],
        ]
    )


def broadcast_confirm_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Broadcast confirmation keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t("broadcast.confirm", lang), callback_data="broadcast_confirm:yes"),
                InlineKeyboardButton(text=t("common.cancel", lang), callback_data="broadcast_confirm:no"),
            ],
        ]
    )


def promocode_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Promocode entry keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t("promocode.enter", lang), callback_data="promocode:enter")],
            [InlineKeyboardButton(text=t("common.back", lang), callback_data="menu:back")],
        ]
    )

"""Command handlers for ThinkSync Bot."""

from __future__ import annotations

import asyncio

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.config import config
from bot.keyboards import (
    admin_menu_keyboard,
    admin_support_keyboard,
    back_keyboard,
    broadcast_audience_keyboard,
    broadcast_confirm_keyboard,
    chat_model_keyboard,
    language_keyboard,
    main_menu_keyboard,
    model_list_keyboard,
    package_confirm_keyboard,
    package_list_keyboard,
    payment_action_keyboard,
    payment_method_keyboard,
    promocode_keyboard,
    support_keyboard,
    ticket_list_keyboard,
)
from bot.services.api import ApiError, api
from bot.services.auth import SessionManager, UserSession, session_manager
from bot.services.i18n import t
from bot.services.notifications import NotificationManager, NotificationType, notification_manager
from bot.services.payments import PaymentProvider, PaymentStatus, payment_tracker
from bot.services.payments.click import click_gateway
from bot.services.payments.payme import payme_gateway
from bot.services.payments.stripe import stripe_gateway
from bot.services.support import TicketManager, TicketStatus, ticket_manager
from bot.states import (
    AdminState,
    AuthState,
    BroadcastState,
    BuyState,
    ChatState,
    PaymentState,
    PromocodeState,
    SupportState,
)
from bot.utils import (
    escape_markdown,
    format_model,
    format_package,
    format_profile,
    is_valid_email,
    truncate_text,
)

router = Router()


# ── /start ───────────────────────────────────────────────────

@router.message(Command("start"))
async def cmd_start(message: Message, language: str = "uz"):
    await message.answer(
        f"{t('start.welcome', language)}\n\n{t('start.description', language)}",
        reply_markup=language_keyboard(),
    )


# ── /login ───────────────────────────────────────────────────

@router.message(Command("login"))
async def cmd_login(message: Message, state: FSMContext, language: str = "uz"):
    user_id = message.from_user.id
    if session_manager.is_authenticated(user_id):
        await message.answer(t("auth.already_logged_in", language))
        return
    await state.set_state(AuthState.waiting_email)
    await message.answer(t("auth.login_prompt", language))


@router.message(AuthState.waiting_email)
async def process_email(message: Message, state: FSMContext, language: str = "uz"):
    email = message.text.strip()
    if not is_valid_email(email):
        await message.answer(t("auth.invalid_email", language))
        return

    otp_code = session_manager.create_otp(message.from_user.id, email)
    await state.set_state(AuthState.waiting_otp)
    await state.update_data(email=email)
    await message.answer(
        t("auth.otp_sent", language, email=email, code=otp_code),
        reply_markup=back_keyboard(language),
    )


@router.message(AuthState.waiting_otp)
async def process_otp(message: Message, state: FSMContext, language: str = "uz"):
    code = message.text.strip()
    user_id = message.from_user.id

    data = await state.get_data()
    email = data.get("email", "")

    if not session_manager.verify_otp(user_id, code):
        remaining = 3 - session_manager._otps.get(user_id, type("", (), {"attempts": 3})()).attempts
        if remaining <= 0:
            await state.clear()
            await message.answer(t("auth.otp_expired", language))
            return
        await message.answer(t("auth.otp_invalid", language, attempts=remaining))
        return

    token = f"thc_telegram_{user_id}_{email}"
    is_admin = email.lower() == config.admin_email.lower()

    session_manager.set_session(
        user_id,
        UserSession(
            user_id=user_id,
            token=token,
            email=email,
            language=language,
            is_admin=is_admin,
        ),
    )

    await state.clear()
    await message.answer(
        t("auth.login_success", language, email=email),
        reply_markup=main_menu_keyboard(language),
    )


# ── /profile ───────────────────────────────────────────────────

@router.message(Command("profile"))
async def cmd_profile(message: Message, token: str | None, language: str = "uz"):
    user_id = message.from_user.id
    if not session_manager.is_authenticated(user_id):
        await message.answer(t("auth.not_logged_in", language))
        return

    session = session_manager.get_session(user_id)
    text = f"*{t('profile.title', language)}*\n\n📧 {session.email}\n"
    try:
        profile = await api.get_profile(token)
        text = (
            f"*{t('profile.title', language)}*\n\n"
            f"{t('profile.email', language, email=profile.get('email', session.email))}\n"
            f"{t('profile.plan', language, plan=profile.get('plan_tier', 'N/A'))}\n"
            f"{t('profile.status', language, status='active' if profile.get('is_active') else 'inactive')}\n"
            f"{t('profile.total_spent', language, spent=profile.get('total_spent', 0))}\n"
        )
        try:
            balance = await api.get_balance(token)
            text += (
                f"\n{t('profile.balance', language, balance=balance.get('balance', 0))}\n"
                f"{t('profile.package_tokens', language, tokens=balance.get('active_package_tokens', 0))}\n"
                f"{t('profile.total_available', language, total=balance.get('total_available', 0))}\n"
            )
        except ApiError:
            pass
        try:
            stats = await api.get_stats(token)
            text += (
                f"\n{t('profile.stats', language, requests=stats.get('total_requests', 0), tokens=stats.get('total_tokens', 0))}\n"
            )
        except ApiError:
            pass
    except ApiError:
        text += "\n_Backend unavailable — showing local info_"

    await message.answer(text, reply_markup=main_menu_keyboard(language))


# ── /models ───────────────────────────────────────────────────

@router.message(Command("models"))
async def cmd_models(message: Message, language: str = "uz"):
    try:
        models = await api.list_models()
        if not models:
            await message.answer(t("models.no_models", language))
            return
        await message.answer(
            t("models.select", language),
            reply_markup=model_list_keyboard(models, language),
        )
    except ApiError as exc:
        await message.answer(t("common.error", language, message=exc.message))


# ── /ask ───────────────────────────────────────────────────

@router.message(Command("ask"))
async def cmd_ask(message: Message, state: FSMContext, token: str | None, language: str = "uz"):
    user_id = message.from_user.id
    if not session_manager.is_authenticated(user_id):
        await message.answer(t("auth.not_logged_in", language))
        return

    try:
        models = await api.list_models()
        if not models:
            await message.answer(t("models.no_models", language))
            return
        await state.set_state(ChatState.waiting_model)
        await message.answer(
            t("chat.select_model", language),
            reply_markup=chat_model_keyboard(models, language),
        )
    except ApiError as exc:
        await message.answer(t("common.error", language, message=exc.message))


@router.message(ChatState.waiting_model)
async def chat_model_selected(message: Message, state: FSMContext, language: str = "uz"):
    await state.clear()
    await message.answer(t("common.cancel", language))


@router.message(ChatState.waiting_prompt)
async def chat_process_prompt(message: Message, state: FSMContext, token: str | None, language: str = "uz"):
    user_id = message.from_user.id
    data = await state.get_data()
    model = data.get("model", "")
    prompt = message.text

    if not prompt or not prompt.strip():
        await message.answer(t("chat.error", language, message="Empty prompt"))
        return

    thinking_msg = await message.answer(t("chat.thinking", language))

    try:
        response = await api.chat_completion(
            token=token,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )

        choices = response.get("choices", [])
        content = choices[0].get("message", {}).get("content", "") if choices else ""
        usage = response.get("usage", {})

        await thinking_msg.delete()

        text = t("chat.result", language, response=content)
        text += "\n\n" + t(
            "chat.usage",
            language,
            input=usage.get("prompt_tokens", 0),
            output=usage.get("completion_tokens", 0),
            cost=usage.get("estimated_cost_usd", 0),
        )
        await message.answer(truncate_text(text), reply_markup=main_menu_keyboard(language))
    except ApiError as exc:
        await thinking_msg.delete()
        await message.answer(t("chat.error", language, message=exc.message))
    except asyncio.TimeoutError:
        await thinking_msg.delete()
        await message.answer(t("common.timeout", language))
    finally:
        await state.clear()


# ── /buy ───────────────────────────────────────────────────

@router.message(Command("buy"))
async def cmd_buy(message: Message, token: str | None, language: str = "uz"):
    user_id = message.from_user.id
    if not session_manager.is_authenticated(user_id):
        await message.answer(t("auth.not_logged_in", language))
        return

    try:
        packages = await api.list_packages()
        if not packages:
            await message.answer(t("billing.no_transactions", language))
            return
        await message.answer(
            t("billing.buy_prompt", language),
            reply_markup=package_list_keyboard(packages, language),
        )
    except ApiError as exc:
        await message.answer(t("common.error", language, message=exc.message))


# ── /topup ───────────────────────────────────────────────────

@router.message(Command("topup"))
async def cmd_topup(message: Message, token: str | None, language: str = "uz"):
    """Topup command redirects to buy flow."""
    user_id = message.from_user.id
    if not session_manager.is_authenticated(user_id):
        await message.answer(t("auth.not_logged_in", language))
        return

    try:
        packages = await api.list_packages()
        if not packages:
            await message.answer(t("billing.no_transactions", language))
            return
        await message.answer(
            t("billing.topup", language) + "\n\n" + t("billing.buy_prompt", language),
            reply_markup=package_list_keyboard(packages, language),
        )
    except ApiError as exc:
        await message.answer(t("common.error", language, message=exc.message))


# ── /support ───────────────────────────────────────────────────

@router.message(Command("support"))
async def cmd_support(message: Message, language: str = "uz"):
    await message.answer(
        f"*{t('support.title', language)}*\n\n"
        f"📧 Email: support@thinksync.ai\n"
        f"💬 Telegram: @ThinkSyncSupport\n\n"
        f"{t('support.title', language)}",
        reply_markup=support_keyboard(language),
    )


@router.message(SupportState.waiting_subject)
async def process_support_subject(message: Message, state: FSMContext, language: str = "uz"):
    subject = message.text.strip()
    if not subject:
        await message.answer(t("common.error", language, message="Subject required"))
        return
    await state.update_data(subject=subject)
    await state.set_state(SupportState.waiting_message)
    await message.answer(t("support.new_ticket_message", language))


@router.message(SupportState.waiting_message)
async def process_support_message(message: Message, state: FSMContext, token: str | None, language: str = "uz"):
    user_id = message.from_user.id
    text = message.text.strip()
    if not text:
        await message.answer(t("common.error", language, message="Message required"))
        return

    data = await state.get_data()
    subject = data.get("subject", "No subject")
    session = session_manager.get_session(user_id)
    email = session.email if session else ""

    # Create ticket via backend (or local fallback)
    try:
        ticket = await api.create_support_ticket(token, subject, text)
        ticket_id = ticket.get("id", "")
    except ApiError:
        ticket = ticket_manager.create_ticket(user_id, email, subject, text)
        ticket_id = ticket.ticket_id

    await state.clear()

    # Notify user
    notification_manager.add(
        user_id,
        NotificationType.ticket_reply,
        t("support.ticket_created", language, ticket_id=ticket_id, subject=subject),
        t("support.admin_notified", language),
    )

    await message.answer(
        t("support.ticket_created", language, ticket_id=ticket_id, subject=subject),
        reply_markup=support_keyboard(language),
    )


# ── /promocode ────────────────────────────────────────────────

@router.message(Command("promocode"))
async def cmd_promocode(message: Message, state: FSMContext, language: str = "uz"):
    user_id = message.from_user.id
    if not session_manager.is_authenticated(user_id):
        await message.answer(t("auth.not_logged_in", language))
        return
    await state.set_state(PromocodeState.waiting_code)
    await message.answer(
        t("promocode.enter", language),
        reply_markup=promocode_keyboard(language),
    )


@router.message(PromocodeState.waiting_code)
async def process_promocode(message: Message, state: FSMContext, token: str | None, language: str = "uz"):
    code = message.text.strip().upper()
    user_id = message.from_user.id

    try:
        result = await api.apply_promocode(token, code)
        bonus = result.get("bonus_tokens", 0)
        discount = result.get("discount_percent", 0)

        notification_manager.add(
            user_id,
            NotificationType.promocode_activated,
            t("promocode.success", language, code=code),
            t("promocode.applied", language, bonus=bonus, discount=discount),
        )

        await state.clear()
        await message.answer(
            t("promocode.applied", language, bonus=bonus, discount=discount),
            reply_markup=main_menu_keyboard(language),
        )
    except ApiError as exc:
        error_msg = exc.message.lower()
        if "invalid" in error_msg:
            await message.answer(t("promocode.invalid", language))
        elif "expired" in error_msg:
            await message.answer(t("promocode.expired", language))
        elif "limit" in error_msg or "used" in error_msg:
            await message.answer(t("promocode.used_up", language))
        else:
            await message.answer(t("promocode.invalid", language))


# ── /notifications ──────────────────────────────────────────

@router.message(Command("notifications"))
async def cmd_notifications(message: Message, language: str = "uz"):
    user_id = message.from_user.id
    unread = notification_manager.get_unread_count(user_id)
    notifications = notification_manager.list_for_user(user_id, unread_only=False)

    if not notifications:
        await message.answer(
            t("common.error", language, message="No notifications"),
            reply_markup=main_menu_keyboard(language),
        )
        return

    lines = [f"*📢 Notifications* ({unread} unread)\n"]
    for ntf in notifications[:10]:
        status = "🔴" if not ntf.is_read else "✓"
        lines.append(f"{status} {ntf.title}\n   {ntf.message}\n")

    notification_manager.mark_all_read(user_id)
    await message.answer(
        "\n".join(lines),
        reply_markup=main_menu_keyboard(language),
    )


# ── /lang ───────────────────────────────────────────────────

@router.message(Command("lang"))
async def cmd_lang(message: Message, language: str = "uz"):
    await message.answer(
        t("start.choose_lang", language),
        reply_markup=language_keyboard(),
    )


# ── /help ───────────────────────────────────────────────────

@router.message(Command("help"))
async def cmd_help(message: Message, language: str = "uz"):
    await message.answer(
        f"{t('help.title', language)}\n\n{t('help.commands', language)}",
        reply_markup=main_menu_keyboard(language),
    )


# ── Admin commands ───────────────────────────────────────────────

@router.message(Command("admin"))
async def cmd_admin(message: Message, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await message.answer(t("admin.unauthorized", language))
        return
    await message.answer(
        t("admin.title", language),
        reply_markup=admin_menu_keyboard(language),
    )


@router.message(Command("stats"))
async def cmd_stats(message: Message, is_admin: bool, token: str | None, language: str = "uz"):
    if not is_admin:
        await message.answer(t("admin.unauthorized", language))
        return

    try:
        analytics = await api.get_admin_stats(token)
        text = t(
            "admin.analytics",
            language,
            total_users=analytics.get("users_total", 0),
            active_users=analytics.get("users_active", 0),
            paid_users=analytics.get("paid_users", 0),
            revenue=analytics.get("revenue_total", 0),
            tokens_consumed=analytics.get("tokens_consumed", 0),
            top_model=analytics.get("top_model", "N/A"),
            purchases_today=analytics.get("purchases_today", 0),
            purchases_month=analytics.get("purchases_month", 0),
        )
        await message.answer(text)
    except ApiError:
        # Fallback to local ticket stats + basic analytics
        ticket_stats = ticket_manager.get_stats()
        text = (
            f"*{t('admin.analytics', language)}*\n\n"
            f"• Total users: {len(session_manager._sessions)}\n"
            f"• Tickets: {ticket_stats['total']} (open: {ticket_stats['open']}, resolved: {ticket_stats['resolved']})\n"
            f"• Total revenue: $0 (demo)\n"
            f"• Purchases today: 0\n"
            f"• Purchases this month: 0\n"
        )
        await message.answer(text)


@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message, state: FSMContext, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await message.answer(t("admin.unauthorized", language))
        return
    await state.set_state(BroadcastState.waiting_message)
    await message.answer(t("broadcast.enter_message", language))


@router.message(BroadcastState.waiting_message)
async def process_broadcast_message(message: Message, state: FSMContext, language: str = "uz"):
    text = message.text.strip()
    if not text:
        await message.answer(t("common.error", language, message="Message cannot be empty"))
        return
    await state.update_data(broadcast_text=text)
    await state.set_state(BroadcastState.waiting_audience)
    await message.answer(
        t("broadcast.select_audience", language),
        reply_markup=broadcast_audience_keyboard(language),
    )


@router.message(Command("support_panel"))
async def cmd_support_panel(message: Message, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await message.answer(t("admin.unauthorized", language))
        return
    await message.answer(
        t("admin.support_panel", language),
        reply_markup=admin_support_keyboard(language),
    )


@router.message(Command("addmodel"))
async def cmd_addmodel(message: Message, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await message.answer(t("admin.unauthorized", language))
        return
    await message.answer(
        "To add a model, use the web admin panel.\n"
        "Or provide model details in format:\n"
        "slug|provider_model_id|display_name|input_price|output_price"
    )


@router.message(Command("removemodel"))
async def cmd_removemodel(message: Message, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await message.answer(t("admin.unauthorized", language))
        return
    await message.answer(
        "To remove a model, use the web admin panel.\n"
        "Or provide the model slug to deactivate."
    )


# ── Cancel / back ─────────────────────────────────────────────

@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext, language: str = "uz"):
    await state.clear()
    payment_tracker.clear_user(message.from_user.id)
    await message.answer(t("common.cancel", language), reply_markup=main_menu_keyboard(language))

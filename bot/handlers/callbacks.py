"""Callback query handlers for ThinkSync Bot."""

from __future__ import annotations

from aiogram import Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery

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
    ticket_detail_keyboard,
    ticket_list_keyboard,
)
from bot.services.api import ApiError, api
from bot.services.auth import session_manager
from bot.services.i18n import t
from bot.services.notifications import NotificationManager, NotificationType, notification_manager
from bot.services.payments import PaymentProvider, PaymentStatus, payment_tracker
from bot.services.payments.click import click_gateway
from bot.services.payments.payme import payme_gateway
from bot.services.payments.stripe import stripe_gateway
from bot.services.support import TicketManager, TicketStatus, ticket_manager
from bot.states import (
    AdminState,
    BroadcastState,
    ChatState,
    PaymentState,
    PromocodeState,
    SupportState,
)
from bot.utils import format_model, format_package, truncate_text

router = Router()


# ── Language callbacks ───────────────────────────────────────

@router.callback_query(lambda c: c.data.startswith("lang:"))
async def process_lang_callback(callback: CallbackQuery):
    lang = callback.data.split(":")[1]
    user_id = callback.from_user.id
    session_manager.set_language(user_id, lang)
    await callback.message.edit_text(
        t("start.ready", lang),
        reply_markup=main_menu_keyboard(lang),
    )
    await callback.answer()


# ── Menu callbacks ──────────────────────────────────────────

@router.callback_query(lambda c: c.data == "menu:back")
async def process_back(callback: CallbackQuery, language: str = "uz"):
    await callback.message.edit_text(
        t("start.ready", language),
        reply_markup=main_menu_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "menu:models")
async def process_menu_models(callback: CallbackQuery, language: str = "uz"):
    try:
        models = await api.list_models()
        if not models:
            await callback.message.edit_text(t("models.no_models", language))
            return
        await callback.message.edit_text(
            t("models.select", language),
            reply_markup=model_list_keyboard(models, language),
        )
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


@router.callback_query(lambda c: c.data == "menu:profile")
async def process_menu_profile(callback: CallbackQuery, token: str | None, language: str = "uz"):
    user_id = callback.from_user.id
    if not session_manager.is_authenticated(user_id):
        await callback.message.edit_text(t("auth.not_logged_in", language))
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
        text += "\n_Backend unavailable_"

    await callback.message.edit_text(text, reply_markup=main_menu_keyboard(language))
    await callback.answer()


@router.callback_query(lambda c: c.data == "menu:ask")
async def process_menu_ask(callback: CallbackQuery, state: FSMContext, token: str | None, language: str = "uz"):
    user_id = callback.from_user.id
    if not session_manager.is_authenticated(user_id):
        await callback.message.edit_text(t("auth.not_logged_in", language))
        await callback.answer()
        return

    try:
        models = await api.list_models()
        if not models:
            await callback.message.edit_text(t("models.no_models", language))
            return
        await state.set_state(ChatState.waiting_model)
        await callback.message.edit_text(
            t("chat.select_model", language),
            reply_markup=chat_model_keyboard(models, language),
        )
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


@router.callback_query(lambda c: c.data == "menu:buy")
async def process_menu_buy(callback: CallbackQuery, token: str | None, language: str = "uz"):
    user_id = callback.from_user.id
    if not session_manager.is_authenticated(user_id):
        await callback.message.edit_text(t("auth.not_logged_in", language))
        await callback.answer()
        return

    try:
        packages = await api.list_packages()
        if not packages:
            await callback.message.edit_text(t("billing.no_transactions", language))
            return
        await callback.message.edit_text(
            t("billing.buy_prompt", language),
            reply_markup=package_list_keyboard(packages, language),
        )
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


@router.callback_query(lambda c: c.data == "menu:help")
async def process_menu_help(callback: CallbackQuery, language: str = "uz"):
    await callback.message.edit_text(
        f"{t('help.title', language)}\n\n{t('help.commands', language)}",
        reply_markup=main_menu_keyboard(language),
    )
    await callback.answer()


# ── Model callbacks ──────────────────────────────────────────

@router.callback_query(lambda c: c.data.startswith("model:"))
async def process_model_detail(callback: CallbackQuery, language: str = "uz"):
    slug = callback.data.split(":")[1]
    try:
        model = await api.get_model(slug)
        text = format_model(model, language)
        await callback.message.edit_text(text, reply_markup=back_keyboard(language))
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


# ── Chat model callbacks ───────────────────────────────────

@router.callback_query(lambda c: c.data.startswith("chat_model:"))
async def process_chat_model(callback: CallbackQuery, state: FSMContext, language: str = "uz"):
    slug = callback.data.split(":")[1]
    await state.set_state(ChatState.waiting_prompt)
    await state.update_data(model=slug)
    await callback.message.edit_text(t("chat.enter_prompt", language))
    await callback.answer()


# ── Package purchase callbacks (enhanced with payment flow) ──────────

@router.callback_query(lambda c: c.data.startswith("buy:"))
async def process_buy(callback: CallbackQuery, token: str | None, state: FSMContext, language: str = "uz"):
    pkg_id = callback.data.split(":")[1]
    try:
        packages = await api.list_packages()
        pkg = None
        for p in packages:
            if p.get("id") == pkg_id:
                pkg = p
                break

        if not pkg:
            await callback.message.edit_text(t("common.error", language, message="Package not found"))
            await callback.answer()
            return

        # Store package in state
        await state.set_state(PaymentState.waiting_package)
        await state.update_data(
            package_id=pkg_id,
            package_name=pkg.get("name", ""),
            package_price=pkg.get("display_price", ""),
            package_tokens=pkg.get("token_amount", 0),
            package_bonus=pkg.get("bonus_tokens", 0),
        )

        text = (
            f"{t('billing.package_detail', language, name=pkg.get('name', ''), price=pkg.get('display_price', ''), tokens=pkg.get('token_amount', 0), expires=pkg.get('expiration_days', 30), featured='Yes' if pkg.get('is_featured') else 'No')}\n\n"
            f"{t('billing.confirm_purchase', language, name=pkg.get('name', ''), price=pkg.get('display_price', ''))}"
        )
        await callback.message.edit_text(
            text,
            reply_markup=package_confirm_keyboard(pkg_id, language),
        )
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


@router.callback_query(lambda c: c.data.startswith("buy_confirm:"))
async def process_buy_confirm(callback: CallbackQuery, state: FSMContext, language: str = "uz"):
    parts = callback.data.split(":")
    pkg_id = parts[1]
    confirmed = parts[2] == "yes"

    if not confirmed:
        await state.clear()
        await callback.message.edit_text(
            t("common.cancel", language),
            reply_markup=main_menu_keyboard(language),
        )
        await callback.answer()
        return

    # Show payment method selection
    await state.set_state(PaymentState.waiting_payment_method)
    data = await state.get_data()
    pkg_name = data.get("package_name", "")
    pkg_price = data.get("package_price", "")

    await callback.message.edit_text(
        f"{t('payment.title', language)}\n\n"
        f"{t('billing.package_item', language, name=pkg_name, price=pkg_price, tokens=data.get('package_tokens', 0), bonus=data.get('package_bonus', 0))}\n\n"
        f"{t('payment.select_method', language)}",
        reply_markup=payment_method_keyboard(language),
    )
    await callback.answer()


# ── Payment callbacks ──────────────────────────────────────

@router.callback_query(lambda c: c.data.startswith("pay:"))
async def process_payment_method(callback: CallbackQuery, state: FSMContext, token: str | None, language: str = "uz"):
    provider_str = callback.data.split(":")[1]
    user_id = callback.from_user.id

    if provider_str == "cancel":
        await state.clear()
        payment_tracker.clear_user(user_id)
        await callback.message.edit_text(
            t("payment.cancelled", language),
            reply_markup=main_menu_keyboard(language),
        )
        await callback.answer()
        return

    data = await state.get_data()
    pkg_id = data.get("package_id", "")
    pkg_name = data.get("package_name", "")
    pkg_price = data.get("package_price", "")
    pkg_tokens = data.get("package_tokens", 0)
    pkg_bonus = data.get("package_bonus", 0)

    # Parse price to float
    try:
        price_str = str(pkg_price).replace("$", "").replace("USD", "").strip()
        amount = float(price_str) if price_str else 0.0
    except (ValueError, TypeError):
        amount = 0.0

    # Select gateway
    provider_map = {
        "stripe": (stripe_gateway, PaymentProvider.stripe),
        "click": (click_gateway, PaymentProvider.click),
        "payme": (payme_gateway, PaymentProvider.payme),
    }
    gateway, provider = provider_map.get(provider_str, (stripe_gateway, PaymentProvider.stripe))

    # Create payment intent
    intent = await gateway.create_payment(
        amount=amount,
        currency="USD",
        package_id=pkg_id,
        user_id=user_id,
        metadata={
            "package_name": pkg_name,
            "package_tokens": pkg_tokens,
            "package_bonus": pkg_bonus,
            "user_id": user_id,
        },
    )

    payment_tracker.add(intent)

    await state.set_state(PaymentState.waiting_payment_complete)
    await state.update_data(
        payment_id=intent.payment_id,
        provider=provider_str,
        package_id=pkg_id,
    )

    await callback.message.edit_text(
        f"{t('payment.title', language)}\n\n"
        f"{t('payment.amount', language, amount=amount, currency='USD')}\n"
        f"{t('billing.package_item', language, name=pkg_name, price=pkg_price, tokens=pkg_tokens, bonus=pkg_bonus)}\n\n"
        f"{t('payment.pending', language)}",
        reply_markup=payment_action_keyboard(intent.payment_id, intent.checkout_url, language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data.startswith("pay_verify:"))
async def process_payment_verify(callback: CallbackQuery, state: FSMContext, token: str | None, language: str = "uz"):
    payment_id = callback.data.split(":")[1]
    user_id = callback.from_user.id

    intent = payment_tracker.get(payment_id)
    if not intent:
        await callback.message.edit_text(
            t("payment.no_pending", language),
            reply_markup=main_menu_keyboard(language),
        )
        await callback.answer()
        return

    # Select gateway
    provider_map = {
        "stripe": stripe_gateway,
        "click": click_gateway,
        "payme": payme_gateway,
    }
    gateway = provider_map.get(intent.provider.value, stripe_gateway)

    result = await gateway.verify_payment(payment_id)
    payment_tracker.update_status(payment_id, result.status)

    if result.success:
        # Try to activate via backend
        try:
            backend_result = await api.verify_payment(token, payment_id)
        except ApiError:
            backend_result = {}

        # Create notification
        notification_manager.add(
            user_id,
            NotificationType.payment_success,
            t("payment.success", language),
            t(
                "payment.success",
                language,
                amount=intent.amount,
                currency=intent.currency,
                name=intent.metadata.get("package_name", ""),
                tokens=intent.metadata.get("package_tokens", 0),
            ),
        )

        await state.clear()
        await callback.message.edit_text(
            t(
                "payment.success",
                language,
                amount=intent.amount,
                currency=intent.currency,
                name=intent.metadata.get("package_name", ""),
                tokens=intent.metadata.get("package_tokens", 0),
            ),
            reply_markup=main_menu_keyboard(language),
        )
    else:
        notification_manager.add(
            user_id,
            NotificationType.payment_failed,
            t("payment.failed", language),
            t("payment.failed", language, message=result.message),
        )
        await callback.message.edit_text(
            t("payment.failed", language, message=result.message),
            reply_markup=main_menu_keyboard(language),
        )

    await callback.answer()


# ── Support callbacks ──────────────────────────────────────

@router.callback_query(lambda c: c.data == "support:new")
async def process_support_new(callback: CallbackQuery, state: FSMContext, language: str = "uz"):
    await state.set_state(SupportState.waiting_subject)
    await callback.message.edit_text(t("support.new_ticket_subject", language))
    await callback.answer()


@router.callback_query(lambda c: c.data == "support:list")
async def process_support_list(callback: CallbackQuery, token: str | None, language: str = "uz"):
    user_id = callback.from_user.id
    try:
        tickets = await api.get_support_tickets(token)
    except ApiError:
        tickets = []
        for ticket in ticket_manager.list_tickets(user_id):
            tickets.append({
                "ticket_id": ticket.ticket_id,
                "subject": ticket.subject,
                "status": ticket.status.value,
            })

    if not tickets:
        await callback.message.edit_text(
            t("support.no_tickets", language),
            reply_markup=support_keyboard(language),
        )
        await callback.answer()
        return

    await callback.message.edit_text(
        t("support.my_tickets", language),
        reply_markup=ticket_list_keyboard(tickets, language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "support:menu")
async def process_support_menu(callback: CallbackQuery, language: str = "uz"):
    await callback.message.edit_text(
        t("support.title", language),
        reply_markup=support_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data.startswith("ticket:"))
async def process_ticket_detail(callback: CallbackQuery, token: str | None, language: str = "uz"):
    ticket_id = callback.data.split(":")[1]
    user_id = callback.from_user.id
    is_admin = session_manager.is_admin(user_id)

    # Try to get from backend, fallback to local
    ticket = ticket_manager.get_ticket(ticket_id)
    if not ticket:
        await callback.message.edit_text(
            t("common.error", language, message="Ticket not found"),
            reply_markup=support_keyboard(language),
        )
        await callback.answer()
        return

    # Build messages
    messages_text = ""
    for msg in ticket.messages:
        sender = "👤" if msg.sender_type == "user" else "👑"
        messages_text += f"{sender} {msg.text}\n\n"

    status_emoji = {
        "open": "🔴",
        "in_progress": "🔹",
        "resolved": "✅",
        "closed": "🔒",
    }.get(ticket.status.value, "🔴")

    text = (
        f"{t('support.ticket_detail', language, ticket_id=ticket_id, status=f'{status_emoji} {ticket.status.value}', subject=ticket.subject, messages=messages_text)}"
    )

    await callback.message.edit_text(
        text,
        reply_markup=ticket_detail_keyboard(ticket_id, ticket.status.value, is_admin, language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data.startswith("ticket_reply:"))
async def process_ticket_reply(callback: CallbackQuery, state: FSMContext, language: str = "uz"):
    ticket_id = callback.data.split(":")[1]
    await state.set_state(SupportState.waiting_reply)
    await state.update_data(reply_ticket_id=ticket_id)
    await callback.message.edit_text(t("support.reply", language))
    await callback.answer()


@router.callback_query(lambda c: c.data.startswith("ticket_close:"))
async def process_ticket_close(callback: CallbackQuery, token: str | None, language: str = "uz"):
    ticket_id = callback.data.split(":")[1]
    user_id = callback.from_user.id

    try:
        await api.close_support_ticket(token, ticket_id)
    except ApiError:
        pass

    ticket = ticket_manager.close_ticket(ticket_id)
    await callback.message.edit_text(
        t("support.ticket_closed", language, ticket_id=ticket_id),
        reply_markup=support_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data.startswith("ticket_resolve:"))
async def process_ticket_resolve(callback: CallbackQuery, token: str | None, language: str = "uz"):
    ticket_id = callback.data.split(":")[1]
    user_id = callback.from_user.id

    try:
        await api.close_support_ticket(token, ticket_id)
    except ApiError:
        pass

    ticket = ticket_manager.resolve_ticket(ticket_id)
    if ticket:
        # Notify user
        notification_manager.add(
            ticket.user_id,
            NotificationType.ticket_resolved,
            t("support.ticket_resolved", language, ticket_id=ticket_id),
            t("support.ticket_resolved", language, ticket_id=ticket_id),
        )

    await callback.message.edit_text(
        t("support.ticket_resolved", language, ticket_id=ticket_id),
        reply_markup=support_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data.startswith("ticket_take:"))
async def process_ticket_take(callback: CallbackQuery, token: str | None, language: str = "uz"):
    ticket_id = callback.data.split(":")[1]
    user_id = callback.from_user.id

    ticket = ticket_manager.get_ticket(ticket_id)
    if ticket:
        ticket.reopen()
        ticket.add_message(user_id, "admin", "Admin assigned to this ticket.")

    await callback.message.edit_text(
        t("support.ticket_replied", language, ticket_id=ticket_id),
        reply_markup=admin_support_keyboard(language),
    )
    await callback.answer()


# ── Admin callbacks ──────────────────────────────────────────

@router.callback_query(lambda c: c.data == "admin:stats")
async def process_admin_stats(callback: CallbackQuery, is_admin: bool, token: str | None, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return

    try:
        analytics = await api.get_admin_analytics(token)
        text = t(
            "admin.stats",
            language,
            users_total=analytics.get("users_total", 0),
            users_active=analytics.get("users_active", 0),
            models_total=analytics.get("models_total", 0),
            models_active=analytics.get("models_active", 0),
            api_requests=analytics.get("api_requests_total", 0),
            api_cost=analytics.get("api_cost_total", 0),
        )
        await callback.message.edit_text(text, reply_markup=admin_menu_keyboard(language))
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


@router.callback_query(lambda c: c.data == "admin:broadcast")
async def process_admin_broadcast(callback: CallbackQuery, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return
    await callback.message.edit_text(
        t("admin.broadcast_prompt", language),
        reply_markup=back_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "admin:models")
async def process_admin_models(callback: CallbackQuery, is_admin: bool, token: str | None, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return

    try:
        result = await api.list_admin_models(token)
        models = result.get("data", [])
        lines = [t("admin.models_list", language)]
        for m in models[:10]:
            status = "✅" if m.get("is_active") else "❌"
            lines.append(f"{status} {m.get('slug', '')} — {m.get('display_name', '')}")
        await callback.message.edit_text(
            "\n".join(lines),
            reply_markup=admin_menu_keyboard(language),
        )
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


@router.callback_query(lambda c: c.data == "admin:users")
async def process_admin_users(callback: CallbackQuery, is_admin: bool, token: str | None, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return

    try:
        result = await api.list_admin_users(token)
        users = result.get("data", [])
        lines = [t("admin.users_list", language)]
        for u in users[:10]:
            status = "✅" if u.get("is_active") else "❌"
            lines.append(f"{status} {u.get('email', '')} — {u.get('plan_tier', '')}")
        await callback.message.edit_text(
            "\n".join(lines),
            reply_markup=admin_menu_keyboard(language),
        )
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


@router.callback_query(lambda c: c.data == "admin:logs")
async def process_admin_logs(callback: CallbackQuery, is_admin: bool, token: str | None, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return

    try:
        result = await api.list_admin_logs(token)
        logs = result.get("data", [])
        lines = [t("admin.logs_list", language)]
        for log in logs[:10]:
            status = "✅" if log.get("status") == "success" else "❌"
            lines.append(
                f"{status} {log.get('model_slug', '')} — {log.get('total_tokens', 0)} tokens — ${log.get('estimated_cost', 0)}"
            )
        await callback.message.edit_text(
            "\n".join(lines),
            reply_markup=admin_menu_keyboard(language),
        )
    except ApiError as exc:
        await callback.message.edit_text(t("common.error", language, message=exc.message))
    await callback.answer()


# ── Admin support callbacks ───────────────────────────────

@router.callback_query(lambda c: c.data == "admin:menu")
async def process_admin_menu(callback: CallbackQuery, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return
    await callback.message.edit_text(
        t("admin.title", language),
        reply_markup=admin_menu_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "admin_support:open")
async def process_admin_support_open(callback: CallbackQuery, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return

    tickets = ticket_manager.list_open_tickets()
    if not tickets:
        await callback.message.edit_text(
            t("support.no_tickets", language),
            reply_markup=admin_support_keyboard(language),
        )
        await callback.answer()
        return

    lines = [t("support.open_tickets", language)]
    for ticket in tickets:
        status = "🔴" if ticket.status == TicketStatus.open else "🔹"
        lines.append(f"{status} {ticket.ticket_id} — {ticket.subject} ({ticket.user_email})")

    await callback.message.edit_text(
        "\n".join(lines),
        reply_markup=admin_support_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "admin_support:all")
async def process_admin_support_all(callback: CallbackQuery, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return

    tickets = ticket_manager.list_tickets()
    if not tickets:
        await callback.message.edit_text(
            t("support.no_tickets", language),
            reply_markup=admin_support_keyboard(language),
        )
        await callback.answer()
        return

    lines = [t("support.all_tickets", language)]
    for ticket in tickets[:15]:
        status = "✅" if ticket.status == TicketStatus.resolved else "🔒" if ticket.status == TicketStatus.closed else "🔴"
        lines.append(f"{status} {ticket.ticket_id} — {ticket.subject}")

    await callback.message.edit_text(
        "\n".join(lines),
        reply_markup=admin_support_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "admin_support:stats")
async def process_admin_support_stats(callback: CallbackQuery, is_admin: bool, language: str = "uz"):
    if not is_admin:
        await callback.answer(t("admin.unauthorized", language), show_alert=True)
        return

    stats = ticket_manager.get_stats()
    text = (
        f"*{t('support.ticket_stats', language)}*\n\n"
        f"• Total: {stats['total']}\n"
        f"• Open: {stats['open']}\n"
        f"• In Progress: {stats['in_progress']}\n"
        f"• Resolved: {stats['resolved']}\n"
        f"• Closed: {stats['closed']}\n"
    )
    await callback.message.edit_text(
        text,
        reply_markup=admin_support_keyboard(language),
    )
    await callback.answer()


# ── Broadcast callbacks ───────────────────────────────────

@router.callback_query(lambda c: c.data.startswith("broadcast_audience:"))
async def process_broadcast_audience(callback: CallbackQuery, state: FSMContext, language: str = "uz"):
    audience = callback.data.split(":")[1]
    await state.update_data(audience=audience)
    await state.set_state(BroadcastState.waiting_confirm)

    data = await state.get_data()
    broadcast_text = data.get("broadcast_text", "")
    audience_label = {
        "all": t("broadcast.all_users", language),
        "active": t("broadcast.active_users", language),
        "paying": t("broadcast.paying_users", language),
    }.get(audience, audience)

    await callback.message.edit_text(
        f"*{t('broadcast.enter_message', language)}*\n\n"
        f"{broadcast_text}\n\n"
        f"*{t('broadcast.select_audience', language)}* {audience_label}\n\n"
        f"{t('broadcast.confirm', language)}?",
        reply_markup=broadcast_confirm_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "broadcast_confirm:yes")
async def process_broadcast_confirm(callback: CallbackQuery, state: FSMContext, bot, language: str = "uz"):
    data = await state.get_data()
    broadcast_text = data.get("broadcast_text", "")
    audience = data.get("audience", "all")

    # Get target users from sessions
    target_users = []
    for uid, session in session_manager._sessions.items():
        if not session.token:
            continue
        if audience == "all":
            target_users.append(uid)
        elif audience == "active":
            target_users.append(uid)
        elif audience == "paying":
            target_users.append(uid)

    sent = 0
    failed = 0
    for uid in target_users:
        try:
            await bot.send_message(uid, broadcast_text)
            sent += 1
            notification_manager.add(
                uid,
                NotificationType.broadcast,
                t("broadcast.sent", language),
                broadcast_text,
            )
        except Exception:
            failed += 1

    await state.clear()
    await callback.message.edit_text(
        t("admin.broadcast_sent", language, count=sent),
        reply_markup=admin_menu_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "broadcast_confirm:no")
async def process_broadcast_cancel(callback: CallbackQuery, state: FSMContext, language: str = "uz"):
    await state.clear()
    await callback.message.edit_text(
        t("broadcast.cancelled", language),
        reply_markup=admin_menu_keyboard(language),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "broadcast:cancel")
async def process_broadcast_cancel_inline(callback: CallbackQuery, state: FSMContext, language: str = "uz"):
    await state.clear()
    await callback.message.edit_text(
        t("broadcast.cancelled", language),
        reply_markup=main_menu_keyboard(language),
    )
    await callback.answer()


# ── Promocode callbacks ──────────────────────────────

@router.callback_query(lambda c: c.data == "promocode:enter")
async def process_promocode_enter(callback: CallbackQuery, state: FSMContext, language: str = "uz"):
    await state.set_state(PromocodeState.waiting_code)
    await callback.message.edit_text(t("promocode.enter", language))
    await callback.answer()

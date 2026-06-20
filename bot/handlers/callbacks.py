"""Callback query handlers for ThinkSync Bot."""

from __future__ import annotations

from aiogram import Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery

from bot.config import config
from bot.keyboards import (
    admin_menu_keyboard,
    back_keyboard,
    chat_model_keyboard,
    language_keyboard,
    main_menu_keyboard,
    model_list_keyboard,
    package_list_keyboard,
)
from bot.services.api import ApiError, api
from bot.services.auth import session_manager
from bot.services.i18n import t
from bot.states import ChatState
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


# ── Buy callbacks ──────────────────────────────────────────

@router.callback_query(lambda c: c.data.startswith("buy:"))
async def process_buy(callback: CallbackQuery, token: str | None, language: str = "uz"):
    pkg_id = callback.data.split(":")[1]
    try:
        result = await api.buy_package(token, pkg_id)
        await callback.message.edit_text(
            t(
                "billing.buy_success",
                language,
                name=result.get("package_name", ""),
                tokens=result.get("tokens_initial", 0),
            ),
            reply_markup=main_menu_keyboard(language),
        )
    except ApiError as exc:
        await callback.message.edit_text(
            t("billing.buy_error", language, message=exc.message),
            reply_markup=main_menu_keyboard(language),
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

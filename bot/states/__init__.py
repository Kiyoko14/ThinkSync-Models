"""FSM states for the bot."""

from aiogram.fsm.state import State, StatesGroup


class AuthState(StatesGroup):
    waiting_email = State()
    waiting_otp = State()


class ChatState(StatesGroup):
    waiting_model = State()
    waiting_prompt = State()


class BuyState(StatesGroup):
    waiting_package = State()
    waiting_promocode = State()


class AdminState(StatesGroup):
    waiting_broadcast = State()
    waiting_add_model = State()
    waiting_remove_model = State()

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
    waiting_broadcast_confirm = State()
    waiting_broadcast_audience = State()
    waiting_add_model = State()
    waiting_remove_model = State()
    waiting_ticket_reply = State()
    waiting_ticket_close = State()


class PaymentState(StatesGroup):
    waiting_package = State()
    waiting_confirm = State()
    waiting_payment_method = State()
    waiting_payment_complete = State()


class SupportState(StatesGroup):
    waiting_subject = State()
    waiting_message = State()
    waiting_reply = State()


class PromocodeState(StatesGroup):
    waiting_code = State()


class BroadcastState(StatesGroup):
    waiting_message = State()
    waiting_audience = State()
    waiting_confirm = State()

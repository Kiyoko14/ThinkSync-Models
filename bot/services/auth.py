"""In-memory session and OTP management."""

from __future__ import annotations

import random
import string
from dataclasses import dataclass, field
from typing import ClassVar


@dataclass
class UserSession:
    """Authenticated session for a Telegram user."""

    user_id: int
    token: str
    email: str = ""
    language: str = "uz"
    is_admin: bool = False


@dataclass
class PendingOTP:
    """Pending OTP record."""

    email: str
    code: str
    attempts: int = 0


class SessionManager:
    """In-memory session and OTP store."""

    _sessions: ClassVar[dict[int, UserSession]] = {}
    _otps: ClassVar[dict[int, PendingOTP]] = {}

    @classmethod
    def generate_otp(cls, length: int = 6) -> str:
        return "".join(random.choices(string.digits, k=length))

    @classmethod
    def create_otp(cls, telegram_id: int, email: str) -> str:
        code = cls.generate_otp()
        cls._otps[telegram_id] = PendingOTP(email=email, code=code)
        return code

    @classmethod
    def verify_otp(cls, telegram_id: int, code: str) -> bool:
        pending = cls._otps.get(telegram_id)
        if not pending:
            return False
        pending.attempts += 1
        if pending.attempts > 3:
            del cls._otps[telegram_id]
            return False
        if pending.code == code:
            del cls._otps[telegram_id]
            return True
        return False

    @classmethod
    def get_pending_email(cls, telegram_id: int) -> str | None:
        pending = cls._otps.get(telegram_id)
        return pending.email if pending else None

    @classmethod
    def set_session(cls, telegram_id: int, session: UserSession) -> None:
        cls._sessions[telegram_id] = session

    @classmethod
    def get_session(cls, telegram_id: int) -> UserSession | None:
        return cls._sessions.get(telegram_id)

    @classmethod
    def clear_session(cls, telegram_id: int) -> None:
        cls._sessions.pop(telegram_id, None)
        cls._otps.pop(telegram_id, None)

    @classmethod
    def is_authenticated(cls, telegram_id: int) -> bool:
        return telegram_id in cls._sessions

    @classmethod
    def is_admin(cls, telegram_id: int) -> bool:
        session = cls._sessions.get(telegram_id)
        return session.is_admin if session else False

    @classmethod
    def get_token(cls, telegram_id: int) -> str | None:
        session = cls._sessions.get(telegram_id)
        return session.token if session else None

    @classmethod
    def set_language(cls, telegram_id: int, language: str) -> None:
        session = cls._sessions.get(telegram_id)
        if session:
            session.language = language
        else:
            # Store language preference for non-authenticated users
            cls._sessions[telegram_id] = UserSession(
                user_id=telegram_id,
                token="",
                language=language,
            )

    @classmethod
    def get_language(cls, telegram_id: int) -> str:
        session = cls._sessions.get(telegram_id)
        if session and session.language:
            return session.language
        return "uz"


session_manager = SessionManager()

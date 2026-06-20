from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Final

from passlib.context import CryptContext

from app.core.config import settings

# ── Constants ───────────────────────────────────────────────

API_KEY_PREFIX: Final[str] = "thc"
API_KEY_BYTES: Final[int] = 32  # 32 bytes → 256-bit key

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Key generation ──────────────────────────────────────────

def generate_api_key() -> tuple[str, str]:
    """Return (raw_api_key, bcrypt_hash).

    The raw key is shown **once** to the user and is never stored.
    Format:  ``thc_<32-hex-chars>``  (32 random bytes → 64 hex chars)
    """
    raw = f"{API_KEY_PREFIX}_{secrets.token_hex(API_KEY_BYTES)}"
    hashed = pwd_context.hash(raw)
    return raw, hashed


def get_key_prefix(raw_key: str) -> str:
    """Return the first 12 chars of the raw key for identification."""
    return raw_key[:12] + "..." if len(raw_key) > 12 else raw_key


def verify_api_key(raw_key: str, hashed: str) -> bool:
    """Constant-time comparison of a raw key against a stored bcrypt hash."""
    try:
        return pwd_context.verify(raw_key, hashed)
    except Exception:
        return False


# ── Supabase JWT ────────────────────────────────────────────

def decode_supabase_jwt(token: str) -> dict | None:
    """Decode and validate a Supabase JWT, returning the payload or None.

    Uses the SUPABASE_JWT_SECRET for HMAC-SHA256 verification.
    Falls back to ``python-jose`` for full JWT lifecycle (exp, iss, etc.).
    """
    from jose import JWTError, jwt

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError:
        return None


# ── ID generation ───────────────────────────────────────────

def generate_id(prefix: str = "") -> str:
    """Short, URL-safe unique id (ULID-style)."""
    import uuid

    uid = uuid.uuid4().hex[:26]
    return f"{prefix}_{uid}" if prefix else uid


# ── Time helpers ────────────────────────────────────────────

def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def utcnow_ts() -> float:
    return utcnow().timestamp()
"""Errors module."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from fastapi import HTTPException, status


@dataclass
class ErrorCode:
    """Canonical error codes returned in JSON bodies."""

    code: str
    http_status: int
    message: str
    detail: str = ""
    extra: dict[str, Any] = field(default_factory=dict)


# ── Pre-defined codes ──────────────────────────────────────

INTERNAL_ERROR = ErrorCode(
    code="internal_error",
    http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    message="An unexpected error occurred.",
    detail="Please try again later or contact support if the issue persists.",
)

RATE_LIMITED = ErrorCode(
    code="rate_limited",
    http_status=status.HTTP_429_TOO_MANY_REQUESTS,
    message="Rate limit exceeded.",
    detail="You are sending requests too fast.  Slow down and retry after the "
    "indicated period.",
)

INVALID_API_KEY = ErrorCode(
    code="invalid_api_key",
    http_status=status.HTTP_401_UNAUTHORIZED,
    message="Invalid API key.",
    detail="The API key provided is invalid, expired, or has been revoked.",
)

MISSING_API_KEY = ErrorCode(
    code="missing_api_key",
    http_status=status.HTTP_401_UNAUTHORIZED,
    message="Missing API key.",
    detail="Authenticate via the Authorization header: `Bearer thc_...`",
)

INVALID_JWT = ErrorCode(
    code="invalid_jwt",
    http_status=status.HTTP_401_UNAUTHORIZED,
    message="Invalid or expired token.",
    detail="Your JWT is invalid or has expired.  Obtain a new one from Supabase Auth.",
)

MODEL_NOT_FOUND = ErrorCode(
    code="model_not_found",
    http_status=status.HTTP_404_NOT_FOUND,
    message="Model not found.",
    detail="The requested model slug does not exist or is not active.",
)

MODEL_INACTIVE = ErrorCode(
    code="model_inactive",
    http_status=status.HTTP_400_BAD_REQUEST,
    message="Model is not currently active.",
    detail="This model exists but is not accepting requests right now.  Try another model.",
)

INVALID_REQUEST = ErrorCode(
    code="invalid_request",
    http_status=status.HTTP_400_BAD_REQUEST,
    message="Invalid request.",
    detail="The request body is malformed or missing required fields.",
)

INSUFFICIENT_QUOTA = ErrorCode(
    code="insufficient_quota",
    http_status=status.HTTP_402_PAYMENT_REQUIRED,
    message="Insufficient quota.",
    detail="You have exhausted your usage quota for this billing period.",
)

PROVIDER_ERROR = ErrorCode(
    code="provider_error",
    http_status=status.HTTP_502_BAD_GATEWAY,
    message="Upstream provider error.",
    detail="The AI model provider returned an error.  Please retry your request.",
)

PROVIDER_TIMEOUT = ErrorCode(
    code="provider_timeout",
    http_status=status.HTTP_504_GATEWAY_TIMEOUT,
    message="Upstream provider timed out.",
    detail="The AI model provider did not respond in time.  Please retry.",
)

API_KEY_NOT_FOUND = ErrorCode(
    code="api_key_not_found",
    http_status=status.HTTP_404_NOT_FOUND,
    message="API key not found.",
    detail="No API key with the given prefix exists for your account.",
)

PERMISSION_DENIED = ErrorCode(
    code="permission_denied",
    http_status=status.HTTP_403_FORBIDDEN,
    message="Permission denied.",
    detail="You do not have permission to perform this action.",
)

PROFILE_INACTIVE = ErrorCode(
    code="profile_inactive",
    http_status=status.HTTP_403_FORBIDDEN,
    message="Account is disabled.",
    detail="Your account has been disabled. Contact support for assistance.",
)

VALIDATION_ERROR = ErrorCode(
    code="validation_error",
    http_status=status.HTTP_422_UNPROCESSABLE_ENTITY,
    message="Validation error.",
    detail="One or more request fields are invalid.",
)


# ── Exception class ────────────────────────────────────────

class ThinkSyncError(Exception):
    """Base exception that maps to a JSON error response."""

    def __init__(
        self,
        error_code: ErrorCode,
        extra: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        detail_override: str | None = None,
    ) -> None:
        self.error_code = error_code
        self.extra = extra or {}
        self.headers = headers
        self.detail_override = detail_override
        super().__init__(self.error_code.message)

    def to_http(self) -> HTTPException:
        body = {
            "error": {
                "code": self.error_code.code,
                "message": self.error_code.message,
                "detail": self.detail_override or self.error_code.detail,
                **self.extra,
            }
        }
        return HTTPException(
            status_code=self.error_code.http_status,
            detail=body,
            headers=self.headers,
        )


# ── Convenience factories ──────────────────────────────────

def rate_limited(retry_after: int = 5) -> ThinkSyncError:
    return ThinkSyncError(
        RATE_LIMITED,
        extra={"retry_after_seconds": retry_after},
        headers={"Retry-After": str(retry_after)},
    )


def invalid_api_key(detail: str | None = None) -> ThinkSyncError:
    return ThinkSyncError(INVALID_API_KEY, detail_override=detail)


def model_not_found(slug: str) -> ThinkSyncError:
    return ThinkSyncError(MODEL_NOT_FOUND, extra={"model": slug})


def provider_error(detail: str | None = None) -> ThinkSyncError:
    return ThinkSyncError(PROVIDER_ERROR, detail_override=detail)


def invalid_request(detail: str | None = None) -> ThinkSyncError:
    return ThinkSyncError(INVALID_REQUEST, detail_override=detail)
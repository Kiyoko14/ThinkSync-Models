"""Global middleware: error handling, request ID, timing, auth."""

from __future__ import annotations

import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.database import async_session_factory
from app.core.errors import MISSING_API_KEY, ThinkSyncError, invalid_api_key
from app.core.logging import logger
from app.services.api_keys import authenticate_api_key


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Catches ``ThinkSyncError`` and unexpected exceptions."""

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except ThinkSyncError as exc:
            http_exc = exc.to_http()
            return JSONResponse(
                status_code=http_exc.status_code,
                content=http_exc.detail,
                headers=http_exc.headers or {},
            )
        except Exception:
            logger.exception("unhandled_error", path=str(request.url))
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "internal_error",
                        "message": "An unexpected error occurred.",
                        "detail": "Please try again later or contact support.",
                    }
                },
            )


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attaches a unique ``X-Request-ID`` to every response."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """Records request duration and injects ``X-Process-Time``."""

    async def dispatch(self, request: Request, call_next):
        t0 = time.monotonic()
        response = await call_next(request)
        duration_ms = int((time.monotonic() - t0) * 1000)
        response.headers["X-Process-Time"] = str(duration_ms)
        logger.info(
            "request",
            method=request.method,
            path=str(request.url.path),
            status=response.status_code,
            duration_ms=duration_ms,
        )
        return response


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """Authenticate API keys on protected routes and preload profile on request.state."""

    PROTECTED_PREFIXES = (
        "/v1/chat/",
        "/v1/user/",
        "/v1/packages/buy",
        "/v1/promocode/apply",
    )

    def _requires_auth(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.PROTECTED_PREFIXES)

    async def dispatch(self, request: Request, call_next):
        if not self._requires_auth(request.url.path):
            return await call_next(request)

        authorization = request.headers.get("authorization")
        if not authorization:
            raise ThinkSyncError(MISSING_API_KEY)

        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise ThinkSyncError(MISSING_API_KEY)

        # Only API keys are handled here; JWT flow remains in dependency layer.
        if token.startswith("thc_"):
            async with async_session_factory() as db:
                _, profile = await authenticate_api_key(db, token)
                if not profile.is_active:
                    raise invalid_api_key("Account is disabled.")
                request.state.auth_profile = profile

        return await call_next(request)


def register_middleware(app: FastAPI) -> None:
    """Register all middleware in order (first added = outermost)."""
    app.add_middleware(TimingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(APIKeyAuthMiddleware)
    app.add_middleware(ErrorHandlingMiddleware)

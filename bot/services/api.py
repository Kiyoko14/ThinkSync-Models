"""HTTP client for ThinkSync backend API."""

from __future__ import annotations

import json
from typing import Any

import aiohttp

from bot.config import config


class ApiError(Exception):
    """API error wrapper."""

    def __init__(self, message: str, status: int = 0):
        super().__init__(message)
        self.status = status
        self.message = message


class ThinkSyncApi:
    """Async HTTP client for ThinkSync backend."""

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or config.api_base_url).rstrip("/")
        self._session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
        return self._session

    async def _request(
        self,
        method: str,
        path: str,
        token: str | None = None,
        json_data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        session = await self._get_session()
        url = f"{self.base_url}{path}"
        headers: dict[str, str] = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            async with session.request(
                method, url, headers=headers, json=json_data, params=params
            ) as resp:
                body = await resp.text()
                if resp.status >= 400:
                    try:
                        data = json.loads(body)
                        msg = data.get("error", {}).get("message", body)
                    except json.JSONDecodeError:
                        msg = body or f"HTTP {resp.status}"
                    raise ApiError(msg, resp.status)
                if not body:
                    return {}
                return json.loads(body)
        except aiohttp.ClientError as exc:
            raise ApiError(f"Network error: {exc}", 0) from exc

    async def health(self) -> dict[str, Any]:
        return await self._request("GET", "/health")

    # ── Models ─────────────────────────────────────────────────

    async def list_models(self) -> list[dict[str, Any]]:
        data = await self._request("GET", "/v1/models")
        return data.get("data", [])

    async def get_model(self, model_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/v1/models/{model_id}")

    # ── Chat ───────────────────────────────────────────────────

    async def chat_completion(
        self,
        token: str,
        model: str,
        messages: list[dict[str, str]],
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if temperature is not None:
            payload["temperature"] = temperature
        return await self._request("POST", "/v1/chat/completions", token=token, json_data=payload)

    # ── User ───────────────────────────────────────────────────

    async def get_profile(self, token: str) -> dict[str, Any]:
        return await self._request("GET", "/v1/user/profile", token=token)

    async def get_stats(self, token: str) -> dict[str, Any]:
        return await self._request("GET", "/v1/user/stats", token=token)

    async def get_balance(self, token: str) -> dict[str, Any]:
        return await self._request("GET", "/v1/user/balance", token=token)

    async def get_usage(self, token: str) -> dict[str, Any]:
        return await self._request("GET", "/v1/user/usage", token=token)

    async def get_transactions(self, token: str, limit: int = 10) -> list[dict[str, Any]]:
        data = await self._request("GET", "/v1/user/transactions", token=token, params={"limit": limit})
        return data if isinstance(data, list) else []

    async def get_api_keys(self, token: str) -> list[dict[str, Any]]:
        data = await self._request("GET", "/v1/user/tokens", token=token)
        return data if isinstance(data, list) else []

    # ── Packages ───────────────────────────────────────────────

    async def list_packages(self) -> list[dict[str, Any]]:
        data = await self._request("GET", "/v1/packages")
        return data.get("data", [])

    async def buy_package(self, token: str, package_id: str, promocode: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"package_id": package_id}
        if promocode:
            payload["promocode"] = promocode
        return await self._request("POST", "/v1/packages/buy", token=token, json_data=payload)

    # ── Admin ──────────────────────────────────────────────────

    async def get_admin_analytics(self, token: str) -> dict[str, Any]:
        return await self._request("GET", "/v1/admin/analytics", token=token)

    async def list_admin_models(self, token: str, page: int = 1) -> dict[str, Any]:
        return await self._request("GET", "/v1/admin/models", token=token, params={"page": page, "page_size": 20})

    async def list_admin_users(self, token: str, page: int = 1) -> dict[str, Any]:
        return await self._request("GET", "/v1/admin/users", token=token, params={"page": page, "page_size": 20})

    async def list_admin_transactions(self, token: str, page: int = 1) -> dict[str, Any]:
        return await self._request("GET", "/v1/admin/transactions", token=token, params={"page": page, "page_size": 20})

    async def list_admin_logs(self, token: str, page: int = 1) -> dict[str, Any]:
        return await self._request("GET", "/v1/admin/logs", token=token, params={"page": page, "page_size": 20})

    # ── Payment endpoints ────────────────────────────────────

    async def create_payment(self, token: str, package_id: str, provider: str, amount: float) -> dict[str, Any]:
        payload = {
            "package_id": package_id,
            "provider": provider,
            "amount": amount,
            "currency": "USD",
        }
        return await self._request("POST", "/v1/payments/create", token=token, json_data=payload)

    async def verify_payment(self, token: str, payment_id: str) -> dict[str, Any]:
        return await self._request("POST", f"/v1/payments/{payment_id}/verify", token=token)

    async def get_payment(self, token: str, payment_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/v1/payments/{payment_id}", token=token)

    async def get_user_payments(self, token: str, limit: int = 10) -> list[dict[str, Any]]:
        data = await self._request("GET", "/v1/payments", token=token, params={"limit": limit})
        return data if isinstance(data, list) else []

    # ── Promocode endpoints ──────────────────────────────────

    async def apply_promocode(self, token: str, code: str) -> dict[str, Any]:
        return await self._request("POST", "/v1/promocodes/apply", token=token, json_data={"code": code})

    async def get_promocodes(self, token: str) -> list[dict[str, Any]]:
        data = await self._request("GET", "/v1/promocodes", token=token)
        return data if isinstance(data, list) else []

    # ── Support endpoints ────────────────────────────────────

    async def create_support_ticket(self, token: str, subject: str, message: str) -> dict[str, Any]:
        return await self._request("POST", "/v1/support/tickets", token=token, json_data={"subject": subject, "message": message})

    async def get_support_tickets(self, token: str) -> list[dict[str, Any]]:
        data = await self._request("GET", "/v1/support/tickets", token=token)
        return data if isinstance(data, list) else []

    async def reply_support_ticket(self, token: str, ticket_id: str, message: str) -> dict[str, Any]:
        return await self._request("POST", f"/v1/support/tickets/{ticket_id}/reply", token=token, json_data={"message": message})

    async def close_support_ticket(self, token: str, ticket_id: str) -> dict[str, Any]:
        return await self._request("POST", f"/v1/support/tickets/{ticket_id}/close", token=token)

    # ── Admin endpoints ──────────────────────────────────────

    async def get_admin_payments(self, token: str, page: int = 1) -> dict[str, Any]:
        return await self._request("GET", "/v1/admin/payments", token=token, params={"page": page, "page_size": 20})

    async def get_admin_support_tickets(self, token: str, page: int = 1) -> dict[str, Any]:
        return await self._request("GET", "/v1/admin/support/tickets", token=token, params={"page": page, "page_size": 20})

    async def get_admin_stats(self, token: str) -> dict[str, Any]:
        return await self._request("GET", "/v1/admin/stats", token=token)

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()


# Global singleton
api = ThinkSyncApi()

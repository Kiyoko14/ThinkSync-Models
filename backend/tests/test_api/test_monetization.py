"""Phase 2 tests: package purchase and billing."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.schemas.monetization import PackageResponse


@pytest.mark.asyncio
async def test_list_packages(client: AsyncClient):
    """GET /v1/packages should return available packages."""
    resp = await client.get("/v1/packages")
    assert resp.status_code == 200
    data = resp.json()
    assert data["object"] == "list"
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_buy_package_unauthorized(client: AsyncClient):
    resp = await client.post(
        "/v1/packages/buy",
        json={"package_id": "test-pkg-id"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_buy_package_not_found(
    client: AsyncClient, sample_api_key,
):
    key, raw = sample_api_key
    resp = await client.post(
        "/v1/packages/buy",
        json={"package_id": "nonexistent-package-id"},
        headers={"Authorization": f"Bearer {raw}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_balance_endpoint(
    client: AsyncClient, sample_api_key,
):
    key, raw = sample_api_key
    resp = await client.get(
        "/v1/user/balance",
        headers={"Authorization": f"Bearer {raw}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "balance" in data
    assert "active_package_tokens" in data
    assert "total_available" in data


@pytest.mark.asyncio
async def test_transactions_empty(
    client: AsyncClient, sample_api_key,
):
    key, raw = sample_api_key
    resp = await client.get(
        "/v1/user/transactions",
        headers={"Authorization": f"Bearer {raw}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_usage_extended(
    client: AsyncClient, sample_api_key,
):
    key, raw = sample_api_key
    resp = await client.get(
        "/v1/user/usage",
        headers={"Authorization": f"Bearer {raw}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_requests" in data
    assert "total_billed_from_balance" in data
    assert "total_billed_from_packages" in data


# ── Service-level tests ────────────────────────────────────

class TestPackageService:
    @pytest.mark.asyncio
    async def test_calculate_cost(self):
        from app.services.billing import calculate_cost
        from app.models import Model

        model = Model(
            slug="test-model",
            provider_model_id="test/test",
            provider_name="test",
            display_name="Test",
            pricing_input_per_m=1.0,
            pricing_output_per_m=4.0,
        )

        cost = await calculate_cost(model, 1000, 500)
        # input: (1000/1M) * 1.0 = 0.001
        # output: (500/1M) * 4.0 = 0.002
        # total: 0.003
        assert cost == 0.003

    @pytest.mark.asyncio
    async def test_calculate_cost_zero_tokens(self):
        from app.services.billing import calculate_cost
        from app.models import Model

        model = Model(
            slug="test",
            provider_model_id="test/test",
            provider_name="test",
            display_name="Test",
            pricing_input_per_m=2.0,
            pricing_output_per_m=8.0,
        )

        cost = await calculate_cost(model, 0, 0)
        assert cost == 0.0


class TestBalanceService:
    @pytest.mark.asyncio
    async def test_credit_and_get_balance(self, db, sample_profile):
        from app.services.balance import credit_balance, get_balance

        tx = await credit_balance(db, sample_profile.id, 10000)
        assert tx.amount == 10000
        assert tx.transaction_type.value == "deposit"
        assert tx.balance_after == 10000

        bal = await get_balance(db, sample_profile.id)
        assert bal == 10000

    @pytest.mark.asyncio
    async def test_debit_balance(self, db, sample_profile):
        from app.services.balance import credit_balance, debit_balance, get_balance

        await credit_balance(db, sample_profile.id, 5000)
        tx = await debit_balance(db, sample_profile.id, 1000)
        assert tx.amount == -1000
        assert tx.balance_after == 4000

        bal = await get_balance(db, sample_profile.id)
        assert bal == 4000

    @pytest.mark.asyncio
    async def test_insufficient_balance(self, db, sample_profile):
        from app.services.balance import (
            InsufficientBalanceError,
            debit_balance,
        )

        with pytest.raises(InsufficientBalanceError):
            await debit_balance(db, sample_profile.id, 100)

    @pytest.mark.asyncio
    async def test_optimistic_lock_version_increments(self, db, sample_profile):
        """Verify balance_version increments after each balance mutation."""
        from app.services.balance import (
            credit_balance,
            get_balance_with_version,
        )

        v1 = await get_balance_with_version(db, sample_profile.id)
        assert v1[1] >= 1

        await credit_balance(db, sample_profile.id, 1000)

        v2 = await get_balance_with_version(db, sample_profile.id)
        assert v2[1] == v1[1] + 1
        assert v2[0] == 1000


class TestPromocodeService:
    @pytest.mark.asyncio
    async def test_validate_promocode_not_found(self, db, sample_profile):
        from app.services.promocode import validate_promocode

        result = await validate_promocode(db, "NONEXISTENT", sample_profile.id)
        assert result.valid is False
        assert "not found" in (result.error or "").lower()

    @pytest.mark.asyncio
    async def test_create_and_validate_promocode(self, db, sample_profile):
        from app.models import Promocode, PromocodeDiscountType
        from app.services.promocode import validate_promocode

        promo = Promocode(
            code="SAVE20",
            discount_type=PromocodeDiscountType.percentage,
            discount_value=20,
            max_uses=100,
            is_active=True,
        )
        db.add(promo)
        await db.commit()

        result = await validate_promocode(db, "SAVE20", sample_profile.id)
        assert result.valid is True
        assert result.promocode is not None
        assert result.discount_amount_cents == 0  # no package price to apply to

    @pytest.mark.asyncio
    async def test_percentage_discount_with_price(self, db, sample_profile):
        from app.models import Promocode, PromocodeDiscountType
        from app.services.promocode import validate_promocode

        promo = Promocode(
            code="10OFF",
            discount_type=PromocodeDiscountType.percentage,
            discount_value=10,
            max_uses=100,
            is_active=True,
        )
        db.add(promo)
        await db.commit()

        result = await validate_promocode(
            db, "10OFF", sample_profile.id, package_price_cents=1999,
        )
        assert result.valid is True
        assert result.discount_amount_cents == 199  # 10% of 1999

    @pytest.mark.asyncio
    async def test_expired_promocode(self, db, sample_profile):
        from datetime import datetime, timezone, timedelta
        from app.models import Promocode, PromocodeDiscountType
        from app.services.promocode import validate_promocode

        promo = Promocode(
            code="EXPIRED",
            discount_type=PromocodeDiscountType.fixed_amount,
            discount_value=500,
            max_uses=100,
            is_active=True,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(promo)
        await db.commit()

        result = await validate_promocode(db, "EXPIRED", sample_profile.id)
        assert result.valid is False
        assert "expired" in (result.error or "").lower()
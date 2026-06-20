"""Tests for authentication — API key validation + JWT decoding."""

from __future__ import annotations

import pytest

from app.core.security import (
    generate_api_key,
    get_key_prefix,
    verify_api_key,
)


class TestApiKeyGeneration:
    def test_generate_returns_raw_and_hash(self):
        raw, hashed = generate_api_key()
        assert raw.startswith("thc_")
        assert len(raw) > 32
        assert hashed.startswith("$2b$") or hashed.startswith("$2a")

    def test_verify_own_key(self):
        raw, hashed = generate_api_key()
        assert verify_api_key(raw, hashed) is True

    def test_verify_wrong_key(self):
        _, hashed = generate_api_key()
        assert verify_api_key("thc_wrongkey1234567890abcdef12345678", hashed) is False

    def test_verify_tampered_hash(self):
        raw, hashed = generate_api_key()
        tampered = hashed[:-1] + "x"
        assert verify_api_key(raw, tampered) is False

    def test_key_prefix_truncation(self):
        raw, _ = generate_api_key()
        prefix = get_key_prefix(raw)
        assert prefix.endswith("...")
        assert len(prefix) == 15  # 12 chars + "..."

    def test_generates_unique_keys(self):
        keys = {generate_api_key()[0] for _ in range(100)}
        assert len(keys) == 100


class TestApiKeyService:
    @pytest.mark.asyncio
    async def test_create_and_authenticate(self, db, sample_profile):
        from app.services.api_keys import (
            authenticate_api_key,
            create_api_key,
            get_api_keys,
        )

        key, raw = await create_api_key(db, sample_profile.id, name="my-app")
        assert key.key_prefix is not None
        assert key.name == "my-app"
        assert key.status.value == "active"

        # Authenticate with the raw key
        found_key, profile = await authenticate_api_key(db, raw)
        assert found_key.id == key.id
        assert profile.id == sample_profile.id

        # List keys
        keys = await get_api_keys(db, sample_profile.id)
        assert len(keys) == 1

    @pytest.mark.asyncio
    async def test_revoke_key(self, db, sample_profile):
        from app.services.api_keys import (
            authenticate_api_key,
            create_api_key,
            get_api_keys,
            revoke_api_key,
        )

        key, raw = await create_api_key(db, sample_profile.id)
        await revoke_api_key(db, sample_profile.id, key.id)

        keys = await get_api_keys(db, sample_profile.id)
        assert len(keys) == 0

        with pytest.raises(Exception):
            await authenticate_api_key(db, raw)

    @pytest.mark.asyncio
    async def test_rotate_key(self, db, sample_profile):
        from app.services.api_keys import (
            create_api_key,
            get_api_keys,
            rotate_api_key,
        )

        key1, raw1 = await create_api_key(db, sample_profile.id, name="rotate-me")
        key2, raw2 = await rotate_api_key(db, sample_profile.id, key1.id)

        assert key2.id != key1.id
        assert key2.name == "rotate-me"
        assert raw2.startswith("thc_")
        assert raw2 != raw1

        # Only one active key
        keys = await get_api_keys(db, sample_profile.id)
        assert len(keys) == 1
        assert keys[0].id == key2.id

    @pytest.mark.asyncio
    async def test_authenticate_invalid_key(self, db, sample_profile):
        from app.services.api_keys import authenticate_api_key

        with pytest.raises(Exception):
            await authenticate_api_key(db, "thc_fakekey1234567890abcdef12345678")

    @pytest.mark.asyncio
    async def test_authenticate_empty_key(self, db):
        from app.services.api_keys import authenticate_api_key

        with pytest.raises(Exception):
            await authenticate_api_key(db, "")


class TestSupabaseJwt:
    def test_decode_invalid_token(self):
        from app.core.security import decode_supabase_jwt

        result = decode_supabase_jwt("invalid.jwt.token")
        assert result is None

    def test_decode_empty_token(self):
        from app.core.security import decode_supabase_jwt

        result = decode_supabase_jwt("")
        assert result is None
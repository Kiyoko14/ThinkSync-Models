"""
pytest fixtures for ThinkSync Models tests.

Uses a transient SQLite database and mocks all external services.
"""

from __future__ import annotations

import os
import sys
from typing import AsyncIterator
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Force test settings BEFORE any app module imports
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-test-test-test-test-test-test-test"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_thinksync.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"

# Re-import config to clear the lru_cache
import importlib
from app.core import config as config_module

importlib.reload(config_module)
settings = config_module.get_settings()

# Test engine
test_engine = create_async_engine(
    "sqlite+aiosqlite:///./test_thinksync.db",
    echo=False,
)

test_async_session_factory = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

from app.core.database import Base
from app.main import app
from app.core.redis import get_redis


# Database lifecycle


@pytest_asyncio.fixture(autouse=True)
async def _reset_db():
    """Create clean tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncIterator[AsyncSession]:
    async with test_async_session_factory() as session:
        yield session


# Redis fixture (mock)


@pytest.fixture
def mock_redis() -> AsyncMock:
    """A mock Redis client that all tests use.

    Real Redis would fail in CI without Redis running.
    The mock tracks calls so rate-limiter tests can assert correct behaviour.
    """
    mock = AsyncMock(spec=Redis)
    mock.ping.return_value = True
    mock.zcard.return_value = 0
    mock.zadd.return_value = 1
    mock.zremrangebyscore.return_value = 0
    mock.expire.return_value = True
    mock.delete.return_value = 1
    mock.zrange.return_value = []

    # Pipeline mock: pipeline() returns an object with awaitable execute()
    pipe_mock = AsyncMock()
    pipe_mock.zremrangebyscore.return_value = pipe_mock
    pipe_mock.zcard.return_value = pipe_mock
    pipe_mock.execute.return_value = [0, 0]  # [zremrange result, zcard result]
    mock.pipeline.return_value = pipe_mock

    return mock


@pytest_asyncio.fixture
async def client(mock_redis: AsyncMock) -> AsyncIterator[AsyncClient]:
    """HTTP client against the FastAPI app with mocked Redis."""
    app.dependency_overrides[get_redis] = lambda: mock_redis

    transport = ASGITransport(app=app)
    async with LifespanManager(app):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    app.dependency_overrides.clear()


# Factories


@pytest_asyncio.fixture
async def sample_profile(db: AsyncSession):
    """Create a test profile in the database."""
    from app.models import Profile

    p = Profile(
        supabase_uid="test-supabase-uid-001",
        email="test@thinksync.ai",
        display_name="Test User",
        plan_tier="free",
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@pytest_asyncio.fixture
async def sample_api_key(db: AsyncSession, sample_profile):
    """Create a test API key and return (ApiKey ORM, raw_key_string)."""
    from app.services.api_keys import create_api_key

    key, raw = await create_api_key(db, sample_profile.id, name="test-key")
    return key, raw


@pytest_asyncio.fixture
async def sample_model(db: AsyncSession):
    """Create a test model entry."""
    from app.models import Model

    m = Model(
        slug="test-model",
        provider_model_id="test/test-model",
        provider_name="siliconflow",
        display_name="Test Model",
        pricing_input_per_m=0.50,
        pricing_output_per_m=2.00,
        supports_streaming=True,
        is_active=True,
        context_window=4096,
        max_output_tokens=1024,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m
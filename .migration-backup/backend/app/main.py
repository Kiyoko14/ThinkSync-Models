from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.database import create_all_tables
from app.core.logging import setup_logging
from app.middleware import register_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    setup_logging()

    # Create tables in dev/test (Alembic for prod)
    if not settings.is_production:
        await create_all_tables()

    # Seed initial models and packages
    await _seed_data()

    yield

    # Shutdown: close Redis pool
    from app.core.redis import close_redis
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Middleware ───────────────────────────────────────────────
register_middleware(app)

# ── Routes ──────────────────────────────────────────────────
from app.api.v1.health import router as health_router

app.include_router(health_router)
app.include_router(v1_router)


# ── Seed data ───────────────────────────────────────────────

async def _seed_data() -> None:
    """Insert default model records and token packages if the tables are empty."""
    from sqlalchemy import select
    from app.core.database import async_session_factory
    from app.models import Model, Package

    async with async_session_factory() as db:
        result = await db.execute(select(Model).limit(1))
        if result.scalar_one_or_none():
            return  # already seeded

        default_models = [
            Model(
                slug="thinking-faster1",
                provider_model_id="Pro/deepseek-ai/DeepSeek-R1",
                provider_name="siliconflow",
                display_name="Thinking Faster V1",
                description="Fast reasoning model based on DeepSeek-R1",
                pricing_input_per_m=0.50,
                pricing_output_per_m=2.00,
                supports_streaming=True,
                context_window=65536,
                max_output_tokens=8192,
                sort_order=1,
            ),
            Model(
                slug="thinking-faster2",
                provider_model_id="Pro/deepseek-ai/DeepSeek-V3",
                provider_name="siliconflow",
                display_name="Thinking Faster V2",
                description="Enhanced fast reasoning model",
                pricing_input_per_m=0.80,
                pricing_output_per_m=3.00,
                supports_streaming=True,
                context_window=65536,
                max_output_tokens=8192,
                sort_order=2,
            ),
            Model(
                slug="qwen-32b",
                provider_model_id="Qwen/Qwen2.5-32B-Instruct",
                provider_name="siliconflow",
                display_name="Qwen 32B Instruct",
                description="Alibaba's Qwen 32B instruction-tuned model",
                pricing_input_per_m=0.35,
                pricing_output_per_m=1.20,
                supports_streaming=True,
                context_window=32768,
                max_output_tokens=4096,
                sort_order=10,
            ),
            Model(
                slug="deepseek-v3",
                provider_model_id="deepseek-ai/DeepSeek-V3",
                provider_name="siliconflow",
                display_name="DeepSeek V3",
                description="DeepSeek's latest general-purpose model",
                pricing_input_per_m=0.30,
                pricing_output_per_m=1.10,
                supports_streaming=True,
                context_window=65536,
                max_output_tokens=8192,
                sort_order=20,
            ),
        ]
        for m in default_models:
            db.add(m)

        # Seed Phase 2 token packages
        default_packages = [
            Package(
                name="Starter",
                token_amount=1_000_000,
                bonus_tokens=0,
                price_usd_cents=499,
                display_price="$4.99",
                sort_order=1,
            ),
            Package(
                name="Pro",
                token_amount=5_000_000,
                bonus_tokens=100_000,
                price_usd_cents=1999,
                display_price="$19.99",
                is_featured=True,
                sort_order=2,
            ),
            Package(
                name="Enterprise",
                token_amount=20_000_000,
                bonus_tokens=500_000,
                price_usd_cents=6999,
                display_price="$69.99",
                sort_order=3,
            ),
        ]
        for p in default_packages:
            db.add(p)

        await db.commit()
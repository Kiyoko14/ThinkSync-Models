"""Model listing endpoints."""

from __future__ import annotations

from datetime import timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.errors import model_not_found
from app.models import Model
from app.schemas import ListModelsResponse, ModelResponse

router = APIRouter()


def _model_to_response(m: Model) -> ModelResponse:
    return ModelResponse(
        id=m.slug,
        created=int(m.created_at.replace(tzinfo=timezone.utc).timestamp()) if m.created_at else 0,
        owned_by=m.provider_name,
        active=m.is_active,
        context_window=m.context_window,
        max_output_tokens=m.max_output_tokens,
        pricing_input_per_m=m.pricing_input_per_m,
        pricing_output_per_m=m.pricing_output_per_m,
        supports_streaming=m.supports_streaming,
        supports_functions=m.supports_functions,
    )


@router.get("", response_model=ListModelsResponse)
async def list_models(db: AsyncSession = Depends(get_session)):
    """List all active models available through the gateway."""
    result = await db.execute(
        select(Model).where(Model.is_active == True).order_by(Model.sort_order, Model.slug)
    )
    models = list(result.scalars().all())
    return ListModelsResponse(
        data=[_model_to_response(m) for m in models]
    )


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str, db: AsyncSession = Depends(get_session)):
    """Get details for a specific model by slug."""
    result = await db.execute(
        select(Model).where(Model.slug == model_id)
    )
    m = result.scalar_one_or_none()
    if not m:
        raise model_not_found(model_id)
    return _model_to_response(m)
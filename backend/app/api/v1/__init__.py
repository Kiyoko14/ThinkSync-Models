"""API v1 routes."""

from __future__ import annotations

from fastapi import APIRouter

from . import admin, chat, health, models, user
from . import packages

router = APIRouter(prefix="/v1")

router.include_router(models.router, prefix="/models", tags=["models"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])
router.include_router(user.router, prefix="/user", tags=["user"])
router.include_router(packages.router, tags=["packages"])
router.include_router(admin.router)
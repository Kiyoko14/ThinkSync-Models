"""ThinkSync Telegram Bot entry point."""

from __future__ import annotations

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from bot.config import config
from bot.handlers import callbacks_router, commands_router
from bot.middlewares import AuthMiddleware, I18nMiddleware, SecurityMiddleware
from bot.services.api import api


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.DEBUG if config.debug else logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stdout,
    )


async def main() -> None:
    setup_logging()
    logger = logging.getLogger(__name__)

    if not config.bot_token:
        logger.error("BOT_TOKEN environment variable is not set!")
        sys.exit(1)

    bot = Bot(token=config.bot_token, parse_mode=ParseMode.MARKDOWN)
    dp = Dispatcher(storage=MemoryStorage())

    # Register middlewares (order matters: security first, then i18n, then auth)
    dp.message.middleware(SecurityMiddleware())
    dp.message.middleware(I18nMiddleware())
    dp.message.middleware(AuthMiddleware())
    dp.callback_query.middleware(SecurityMiddleware())
    dp.callback_query.middleware(I18nMiddleware())
    dp.callback_query.middleware(AuthMiddleware())

    # Register routers
    dp.include_router(commands_router)
    dp.include_router(callbacks_router)

    logger.info("ThinkSync Bot started (Phase 4B)")
    try:
        await dp.start_polling(bot)
    finally:
        await api.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())

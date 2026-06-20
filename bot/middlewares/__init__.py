"""Bot middlewares."""

from bot.middlewares.i18n import I18nMiddleware
from bot.middlewares.auth import AuthMiddleware

__all__ = ["I18nMiddleware", "AuthMiddleware"]

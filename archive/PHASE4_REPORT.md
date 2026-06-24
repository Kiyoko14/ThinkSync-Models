# PHASE 4: Telegram Bot

## Overview

A production-grade Telegram Bot for ThinkSync Models built with **Aiogram v3**, providing multi-language support (UZ, RU, EN), user authentication via email/OTP, AI model chat, billing/package purchase, and admin commands.

## Architecture

```
bot/
├── main.py                  # Entry point (Bot + Dispatcher + polling)
├── config.py                # Environment-based configuration
├── handlers/
│   ├── commands.py           # All command handlers (/start, /login, /profile, etc.)
│   └── callbacks.py          # Inline keyboard callback handlers
├── keyboards/
│   └── __init__.py           # Inline keyboards (language, menu, models, packages, admin)
├── middlewares/
│   ├── i18n.py              # Language resolution middleware
│   └── auth.py               # Auth status middleware
├── services/
│   ├── api.py               # Async HTTP client for ThinkSync backend
│   ├── auth.py              # In-memory session + OTP manager
│   └── i18n.py              # JSON-based localization
├── states/
│   └── __init__.py          # FSM states (Auth, Chat, Buy, Admin)
├── locales/
│   ├── uz.json              # Uzbek translations
│   ├── ru.json              # Russian translations
│   └── en.json              # English translations
├── utils/
│   └── __init__.py          # Email validation, formatters, markdown helpers
├── tests/
│   ├── test_commands.py     # Command handler tests
│   ├── test_callbacks.py    # Callback handler tests
│   ├── test_localization.py # Localization tests
│   ├── test_auth.py         # Auth/OTP/session tests
│   └── conftest.py          # Pytest fixtures
├── requirements.txt
├── .env.example
└── pytest.ini
```

## Features

### User Commands
| Command | Description | Auth Required |
|---------|-------------|---------------|
| `/start` | Start bot, choose language | No |
| `/login` | Email + OTP authentication | No |
| `/profile` | View profile, balance, stats | Yes |
| `/models` | Browse AI models | No |
| `/ask` | Chat with AI models | Yes |
| `/buy` | Purchase packages | Yes |
| `/topup` | Top-up instructions | Yes |
| `/support` | Support info | No |
| `/lang` | Change language | No |
| `/help` | List all commands | No |

### Admin Commands
| Command | Description | Admin Required |
|---------|-------------|----------------|
| `/admin` | Admin panel | Yes |
| `/stats` | System statistics | Yes |
| `/broadcast` | Broadcast message to all users | Yes |
| `/addmodel` | Add model instructions | Yes |
| `/removemodel` | Remove model instructions | Yes |

### Multi-language Support
- Full JSON-based i18n (uz, ru, en)
- All commands, auth flows, billing, and admin messages localized
- Language preference persists per user
- Unknown language falls back to English

### Authentication
- Email-based OTP (6-digit code)
- In-memory session storage with token
- 3-attempt OTP limit
- Auto-logout on invalid session
- Admin access determined by email match (`jdusi908@gmail.com`)

## Backend Integration

- Connects to FastAPI backend at `http://localhost:8000`
- All endpoints authenticated via Bearer token
- Supports models, chat/completions, profile, balance, packages, transactions
- Admin endpoints: analytics, users, models, transactions, logs

## Testing

- **37 tests passing** (100% pass rate)
- Auth, commands, callbacks, localization all covered
- Run with: `source venv/bin/activate && python3 -m pytest tests/ -v`

## Configuration

```bash
BOT_TOKEN=your_telegram_bot_token_here
API_BASE_URL=http://localhost:8000
ADMIN_EMAIL=jdusi908@gmail.com
DEFAULT_LANGUAGE=uz
BOT_DEBUG=false
```

## Running

```bash
cd bot
source venv/bin/activate
export BOT_TOKEN=your_token
export API_BASE_URL=http://localhost:8000
python3 -m bot.main
```

## Technical Stack

- **Aiogram v3** — modern async Telegram framework
- **aiohttp** — HTTP client for backend API
- **FSM (Finite State Machine)** — for auth, chat, buy, admin flows
- **Middlewares** — i18n and auth injection
- **JSON-based i18n** — simple, fast, no external deps

#!/usr/bin/env python3
"""Run the test suite with proper env setup."""
import os
import sys

os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "a" * 40
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_thinksync.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["SILICONFLOW_API_KEY"] = "sk-test"

import pytest
sys.exit(pytest.main(sys.argv[1:] if len(sys.argv) > 1 else ["tests/", "-v", "--tb=short"]))
"""Initial migration: create profiles, models, api_keys, api_logs.

Revision ID: 0001_create_initial_tables
Revises: None
Create Date: 2026-06-19
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_create_initial_tables"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Profiles ──────────────────────────────────────────────
    op.create_table(
        "profiles",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("supabase_uid", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("email", sa.String(320), unique=True, nullable=False),
        sa.Column("display_name", sa.String(128), nullable=True),
        sa.Column(
            "plan_tier",
            sa.Enum("free", "pro", "enterprise", name="plantier"),
            nullable=False,
            server_default="free",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("total_spent", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("rate_limit_rpm", sa.Integer(), nullable=True),
        sa.Column("rate_limit_tpm", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # ── Models ────────────────────────────────────────────────
    op.create_table(
        "models",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("slug", sa.String(128), unique=True, nullable=False, index=True),
        sa.Column("provider_model_id", sa.String(512), nullable=False),
        sa.Column("provider_name", sa.String(64), nullable=False, server_default="siliconflow"),
        sa.Column("display_name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("pricing_input_per_m", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("pricing_output_per_m", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("supports_streaming", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("supports_functions", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("context_window", sa.Integer(), nullable=False, server_default="8192"),
        sa.Column("max_output_tokens", sa.Integer(), nullable=False, server_default="4096"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # ── API Keys ──────────────────────────────────────────────
    op.create_table(
        "api_keys",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column(
            "profile_id",
            sa.String(255),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("key_prefix", sa.String(16), nullable=False),
        sa.Column("key_hash", sa.String(128), unique=True, nullable=False),
        sa.Column("name", sa.String(128), nullable=False, server_default="default"),
        sa.Column(
            "status",
            sa.Enum("active", "revoked", "expired", name="apikeystatus"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # ── API Logs ──────────────────────────────────────────────
    op.create_table(
        "api_logs",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column(
            "profile_id",
            sa.String(255),
            sa.ForeignKey("profiles.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("model_slug", sa.String(128), nullable=False, index=True),
        sa.Column("auth_method", sa.String(32), nullable=False, server_default="api_key"),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estimated_cost", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "status",
            sa.Enum("success", "error", "pending", "rate_limited", "unauthorized", name="logstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("status_code", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("request_model", sa.String(255), nullable=True),
        sa.Column("stream_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # ── Indexes ───────────────────────────────────────────────
    op.create_index("ix_api_logs_profile_created", "api_logs", ["profile_id", "created_at"])
    op.create_index("ix_api_logs_model_created", "api_logs", ["model_slug", "created_at"])


def downgrade() -> None:
    op.drop_table("api_logs")
    op.drop_table("api_keys")
    op.drop_table("models")
    op.drop_table("profiles")

    # Drop ENUM types (PostgreSQL-specific; safe to run unconditionally)
    op.execute("DROP TYPE IF EXISTS plantier")
    op.execute("DROP TYPE IF EXISTS apikeystatus")
    op.execute("DROP TYPE IF EXISTS logstatus")
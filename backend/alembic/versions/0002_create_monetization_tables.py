"""Phase 2 migration: packages, balance_transactions, user_packages, promocodes, promocode_usage.

Adds:
- packages
- user_packages
- balance_transactions
- promocodes
- promocode_usage
- profiles.balance / profiles.balance_version
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_create_monetization_tables"
down_revision: Union[str, None] = "0001_create_initial_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Add wallet columns to profiles ────────────────────────
    op.add_column(
        "profiles",
        sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "profiles",
        sa.Column("balance_version", sa.Integer(), nullable=False, server_default="1"),
    )

    # ── Packages ──────────────────────────────────────────────
    op.create_table(
        "packages",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("token_amount", sa.Integer(), nullable=False),
        sa.Column("bonus_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("price_usd_cents", sa.Integer(), nullable=False),
        sa.Column("display_price", sa.String(32), nullable=False),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "status",
            sa.Enum("active", "archived", "hidden", name="packagestatus"),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # ── User Packages ─────────────────────────────────────────
    op.create_table(
        "user_packages",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column(
            "profile_id", sa.String(255),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column(
            "package_id", sa.String(255),
            sa.ForeignKey("packages.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("tokens_remaining", sa.Integer(), nullable=False),
        sa.Column("tokens_initial", sa.Integer(), nullable=False),
        sa.Column("payment_provider", sa.String(32), nullable=False, server_default="manual"),
        sa.Column("payment_id", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "activated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_user_packages_active", "user_packages", ["profile_id", "is_active"])

    # ── Balance Transactions ──────────────────────────────────
    op.create_table(
        "balance_transactions",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column(
            "profile_id", sa.String(255),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column("amount", sa.Integer(), nullable=False, comment="Token units"),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column(
            "transaction_type",
            sa.Enum("deposit", "charge", "refund", "promo_bonus", name="transactiontype"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "completed", "failed", "cancelled", name="transactionstatus"),
            nullable=False, server_default="completed",
        ),
        sa.Column("description", sa.String(512), nullable=True),
        sa.Column("reference_type", sa.String(64), nullable=True),
        sa.Column("reference_id", sa.String(255), nullable=True),
        sa.Column("payment_provider", sa.String(32), nullable=True),
        sa.Column("payment_id", sa.String(255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_balance_tx_profile_created", "balance_transactions", ["profile_id", "created_at"],
    )

    # ── Promocodes ────────────────────────────────────────────
    op.create_table(
        "promocodes",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("code", sa.String(64), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "discount_type",
            sa.Enum("percentage", "fixed_amount", "bonus_tokens", name="promocodediscounttype"),
            nullable=False,
        ),
        sa.Column("discount_value", sa.Integer(), nullable=False),
        sa.Column("max_uses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_uses_per_user", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("current_uses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("min_package_price_cents", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # ── Promocode Usage ───────────────────────────────────────
    op.create_table(
        "promocode_usage",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column(
            "promocode_id", sa.String(255),
            sa.ForeignKey("promocodes.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column(
            "profile_id", sa.String(255),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column("package_id", sa.String(255), sa.ForeignKey("packages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("discount_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bonus_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_unique_constraint("uq_promocode_per_user", "promocode_usage", ["promocode_id", "profile_id"])


def downgrade() -> None:
    op.drop_table("promocode_usage")
    op.drop_table("promocodes")
    op.drop_table("balance_transactions")
    op.drop_table("user_packages")
    op.drop_table("packages")
    op.drop_column("profiles", "balance_version")
    op.drop_column("profiles", "balance")

    op.execute("DROP TYPE IF EXISTS packagestatus")
    op.execute("DROP TYPE IF EXISTS transactiontype")
    op.execute("DROP TYPE IF EXISTS transactionstatus")
    op.execute("DROP TYPE IF EXISTS promocodediscounttype")
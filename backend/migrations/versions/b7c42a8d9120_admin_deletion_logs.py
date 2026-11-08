"""Persistent user deletion audit trail."""
from alembic import op
import sqlalchemy as sa

revision = "b7c42a8d9120"
down_revision = "a1f09c2d4e61"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "admin_deletion_logs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("actor_name", sa.String(120), nullable=False),
        sa.Column("actor_email", sa.String(255), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("user_name", sa.String(120), nullable=False),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_admin_deletion_logs_deleted_at", "admin_deletion_logs", ["deleted_at"])


def downgrade():
    op.drop_table("admin_deletion_logs")

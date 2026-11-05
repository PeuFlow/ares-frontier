"""initial_schema

Revision ID: ee3d92351607
Revises:
Create Date: 2026-11-04 16:16:30.062883
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'ee3d92351607'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reviewed: creates only the six application tables and their indexes.
    op.create_table('catalog_items',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('code', sa.String(length=40), nullable=False),
    sa.Column('item_type', sa.String(length=30), nullable=False),
    sa.Column('name', sa.String(length=160), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('price_credits', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('currency', sa.String(length=10), nullable=False),
    sa.Column('image_url', sa.Text(), nullable=True),
    sa.Column('available', sa.Boolean(), nullable=False),
    sa.Column('attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("item_type IN ('terrain', 'trip', 'accommodation', 'experience')", name='ck_catalog_item_type'),
    sa.CheckConstraint('price_credits >= 0', name='ck_catalog_price'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_catalog_items_code'), 'catalog_items', ['code'], unique=True)
    op.create_index(op.f('ix_catalog_items_item_type'), 'catalog_items', ['item_type'], unique=False)
    op.create_table('content_blocks',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('slug', sa.String(length=120), nullable=False),
    sa.Column('section', sa.String(length=80), nullable=False),
    sa.Column('title', sa.String(length=180), nullable=False),
    sa.Column('summary', sa.Text(), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('context_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('image_urls', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_content_blocks_section'), 'content_blocks', ['section'], unique=False)
    op.create_table('users',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("role IN ('explorer', 'admin')", name='ck_users_role'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_table('favorites',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('catalog_item_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['catalog_item_id'], ['catalog_items.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'catalog_item_id', name='uq_favorites_user_item')
    )
    op.create_table('missions',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('total_credits', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('confirmation_code', sa.String(length=40), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status IN ('draft', 'reserved', 'cancelled', 'completed')", name='ck_missions_status'),
    sa.CheckConstraint('total_credits >= 0', name='ck_missions_total'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('confirmation_code')
    )
    op.create_index(op.f('ix_missions_user_id'), 'missions', ['user_id'], unique=False)
    op.create_table('mission_items',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('mission_id', sa.Uuid(), nullable=False),
    sa.Column('catalog_item_id', sa.Uuid(), nullable=False),
    sa.Column('item_name_snapshot', sa.String(length=160), nullable=False),
    sa.Column('item_type_snapshot', sa.String(length=30), nullable=False),
    sa.Column('unit_price_snapshot', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('details_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.CheckConstraint('quantity > 0', name='ck_mission_items_quantity'),
    sa.CheckConstraint('unit_price_snapshot >= 0', name='ck_mission_items_price'),
    sa.ForeignKeyConstraint(['catalog_item_id'], ['catalog_items.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['mission_id'], ['missions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mission_items_mission_id'), 'mission_items', ['mission_id'], unique=False)


def downgrade() -> None:
    raise RuntimeError(
        "Initial schema downgrade is disabled to preserve data. "
        "Use a separately reviewed migration for schema changes."
    )

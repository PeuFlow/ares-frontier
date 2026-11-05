
import uuid

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


# =====================================================
# 1. USUARIOS
# =====================================================

class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        CheckConstraint(
            "role IN ('explorer', 'admin')",
            name="ck_users_role",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    full_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )

    # Nunca armazenaremos a senha original.
    # Aqui ficará somente o hash da senha.
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="explorer",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# =====================================================
# 2. CATALOGO
# =====================================================

class CatalogItem(Base):
    __tablename__ = "catalog_items"

    __table_args__ = (
        CheckConstraint(
            "item_type IN ('terrain', 'trip', "
            "'accommodation', 'experience')",
            name="ck_catalog_item_type",
        ),
        CheckConstraint(
            "price_credits >= 0",
            name="ck_catalog_price",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    code: Mapped[str] = mapped_column(
        String(40),
        unique=True,
        nullable=False,
        index=True,
    )

    item_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    price_credits: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="MC",
    )

    image_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    available: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Caracteristicas especificas de cada tipo de item.
    # Exemplo: area_km2 para terrenos e duration_days
    # para viagens.
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# =====================================================
# 3. MISSOES
# =====================================================

class Mission(Base):
    __tablename__ = "missions"

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'reserved', "
            "'cancelled', 'completed')",
            name="ck_missions_status",
        ),
        CheckConstraint(
            "total_credits >= 0",
            name="ck_missions_total",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
    )

    total_credits: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    confirmation_code: Mapped[str | None] = mapped_column(
        String(40),
        unique=True,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# =====================================================
# 4. ITENS DAS MISSOES
# =====================================================

class MissionItem(Base):
    __tablename__ = "mission_items"

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_mission_items_quantity",
        ),
        CheckConstraint(
            "unit_price_snapshot >= 0",
            name="ck_mission_items_price",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    mission_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    catalog_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("catalog_items.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Guardamos uma fotografia dos dados no momento
    # em que o item foi adicionado a uma missao.
    item_name_snapshot: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    item_type_snapshot: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    unit_price_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    details_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )


# =====================================================
# 5. FAVORITOS
# =====================================================

class Favorite(Base):
    __tablename__ = "favorites"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "catalog_item_id",
            name="uq_favorites_user_item",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    catalog_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("catalog_items.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# =====================================================
# 6. BLOCOS DE CONHECIMENTO
# =====================================================

class ContentBlock(Base):
    __tablename__ = "content_blocks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    slug: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
    )

    section: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
    )

    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    body: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Informacoes estruturadas utilizadas futuramente
    # pelo astronauta e pela inteligencia artificial.
    context_data: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    image_urls: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

"""Immutable identity snapshots: deleting an account must not erase its audit trail."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class AdminDeletionLog(Base):
    __tablename__ = "admin_deletion_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Deliberately no foreign keys: both identities must survive account deletion.
    actor_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True))
    actor_name: Mapped[str] = mapped_column(String(120))
    actor_email: Mapped[str] = mapped_column(String(255))
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True))
    user_name: Mapped[str] = mapped_column(String(120))
    user_email: Mapped[str] = mapped_column(String(255))
    deleted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

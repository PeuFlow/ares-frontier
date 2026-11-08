"""User management. Every endpoint checks the live database role."""
from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError

from app.models import AdminDeletionLog, AuthSession, User
from app.routers.auth import DB, RegisterInput, UserOutput, current_user, output, passwords, require_csrf


def require_admin(user: Annotated[User, Depends(current_user)]) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Acesso exclusivo para administradores.")
    return user


Admin = Annotated[User, Depends(require_admin)]
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class AdminUserOutput(UserOutput):
    is_active: bool
    created_at: datetime


def admin_output(user: User) -> AdminUserOutput:
    return AdminUserOutput(**output(user).model_dump(), is_active=user.is_active, created_at=user.created_at)


class UserList(BaseModel):
    users: list[AdminUserOutput]
    total: int
    active: int
    admins: int


class DeletionLogOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    actor_id: UUID
    actor_name: str
    actor_email: str
    user_id: UUID
    user_name: str
    user_email: str
    deleted_at: datetime

    @field_validator("deleted_at")
    @classmethod
    def utc_timestamp(cls, value):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class DeletionLogList(BaseModel):
    logs: list[DeletionLogOutput]
    total: int


@router.get("/deletion-logs", response_model=DeletionLogList)
def list_deletion_logs(response: Response, db: DB, offset: int = Query(default=0, ge=0),
                       limit: int = Query(default=20, ge=1, le=100)):
    logs = db.scalars(select(AdminDeletionLog).order_by(AdminDeletionLog.deleted_at.desc(), AdminDeletionLog.id)
                      .offset(offset).limit(limit)).all()
    response.headers["Cache-Control"] = "no-store"
    return DeletionLogList(logs=[DeletionLogOutput.model_validate(log) for log in logs],
                           total=db.scalar(select(func.count()).select_from(AdminDeletionLog)) or 0)


class CreateUser(RegisterInput):
    role: Literal["explorer", "admin"] = "explorer"


class UpdateUser(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr = Field(max_length=255)
    role: Literal["explorer", "admin"]
    is_active: bool

    @field_validator("name", "email", mode="before")
    @classmethod
    def normalize(cls, value, info):
        if isinstance(value, str):
            return value.strip().lower() if info.field_name == "email" else value.strip()
        return value


class ResetPassword(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: SecretStr

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if not 12 <= len(value.get_secret_value()) <= 128:
            # Do not echo the submitted password in validation error responses.
            raise HTTPException(422, "Use uma senha entre 12 e 128 caracteres.")
        return value


@router.put("/users/{user_id}/password", status_code=204, dependencies=[Depends(require_csrf)])
def reset_password(user_id: UUID, data: ResetPassword, response: Response, db: DB, actor: Admin):
    password_hash = passwords.hash(data.password.get_secret_value())
    # Same lock order as role/status changes and deletion; recheck the live actor.
    db.scalars(select(User).where(User.role == "admin", User.is_active.is_(True))
               .order_by(User.id).with_for_update().execution_options(populate_existing=True)).all()
    db.refresh(actor)
    if actor.role != "admin" or not actor.is_active:
        raise HTTPException(403, "Acesso exclusivo para administradores.")
    user = db.scalar(select(User).where(User.id == user_id).with_for_update()
                     .execution_options(populate_existing=True))
    if user is None:
        raise HTTPException(404, "Usuário não encontrado.")
    user.password_hash = password_hash
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.commit()
    response.headers["Cache-Control"] = "no-store"


@router.get("/users", response_model=UserList)
def list_users(response: Response, db: DB, q: str = Query(default="", max_length=120),
               status: Literal["all", "active", "inactive"] = "all",
               role: Literal["all", "explorer", "admin"] = "all",
               offset: int = Query(default=0, ge=0), limit: int = Query(default=20, ge=1, le=100)):
    filters = []
    if q.strip():
        term = q.strip().lower()
        filters.append(or_(func.lower(User.full_name).contains(term, autoescape=True),
                           func.lower(User.email).contains(term, autoescape=True)))
    if status != "all":
        filters.append(User.is_active == (status == "active"))
    if role != "all":
        filters.append(User.role == role)
    total = db.scalar(select(func.count()).select_from(User).where(*filters)) or 0
    users = db.scalars(select(User).where(*filters).order_by(User.created_at.desc(), User.id)
                       .offset(offset).limit(limit)).all()
    response.headers["Cache-Control"] = "no-store"
    return UserList(users=[admin_output(u) for u in users], total=total,
                    active=db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True))) or 0,
                    admins=db.scalar(select(func.count()).select_from(User).where(User.role == "admin", User.is_active.is_(True))) or 0)


@router.post("/users", response_model=AdminUserOutput, status_code=201, dependencies=[Depends(require_csrf)])
def create_user(data: CreateUser, response: Response, db: DB):
    user = User(full_name=data.name, email=str(data.email), role=data.role,
                password_hash=passwords.hash(data.password), is_active=True)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Já existe uma conta com esse e-mail.") from None
    response.headers["Cache-Control"] = "no-store"
    return admin_output(user)


@router.delete("/users/{user_id}", status_code=204, dependencies=[Depends(require_csrf)])
def delete_user(user_id: UUID, response: Response, db: DB, actor: Admin):
    # Use the same lock order as permission changes to preserve a live administrator.
    admins = db.scalars(select(User).where(User.role == "admin", User.is_active.is_(True))
                        .order_by(User.id).with_for_update().execution_options(populate_existing=True)).all()
    db.refresh(actor)
    if actor.role != "admin" or not actor.is_active:
        raise HTTPException(403, "Acesso exclusivo para administradores.")
    user = db.scalar(select(User).where(User.id == user_id).with_for_update()
                     .execution_options(populate_existing=True))
    if user is None:
        raise HTTPException(404, "Usuário não encontrado.")
    if user.id == actor.id:
        raise HTTPException(409, "Você não pode excluir sua própria conta administrativa.")
    if user.role == "admin" and user.is_active and len(admins) <= 1:
        raise HTTPException(409, "Mantenha ao menos um administrador ativo.")
    db.add(AdminDeletionLog(actor_id=actor.id, actor_name=actor.full_name, actor_email=actor.email,
                            user_id=user.id, user_name=user.full_name, user_email=user.email))
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.delete(user)
    try:
        # Account removal and audit entry are committed together or both rolled back.
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Esta conta possui registros vinculados e não pode ser excluída. Desative-a para impedir o acesso.") from None
    response.headers["Cache-Control"] = "no-store"


@router.put("/users/{user_id}", response_model=AdminUserOutput, dependencies=[Depends(require_csrf)])
def update_user(user_id: UUID, data: UpdateUser, response: Response, db: DB, actor: Admin):
    # Serialize administrative permission changes, including concurrent edits.
    admins = db.scalars(select(User).where(User.role == "admin", User.is_active.is_(True))
                        .order_by(User.id).with_for_update().execution_options(populate_existing=True)).all()
    db.refresh(actor)
    if actor.role != "admin" or not actor.is_active:
        raise HTTPException(403, "Acesso exclusivo para administradores.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Usuário não encontrado.")
    removing_admin = user.role == "admin" and user.is_active and (data.role != "admin" or not data.is_active)
    if user.id == actor.id and (data.role != "admin" or not data.is_active):
        raise HTTPException(409, "Você não pode remover seu próprio acesso administrativo.")
    if removing_admin and len(admins) <= 1:
        raise HTTPException(409, "Mantenha ao menos um administrador ativo.")
    revoke_sessions = user.role != data.role or user.is_active != data.is_active
    user.full_name, user.email = data.name, str(data.email)
    user.role, user.is_active = data.role, data.is_active
    if revoke_sessions:
        db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Já existe uma conta com esse e-mail.") from None
    response.headers["Cache-Control"] = "no-store"
    return admin_output(user)

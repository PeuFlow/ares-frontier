"""User management. Every endpoint checks the live database role."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError

from app.models import AuthSession, User
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

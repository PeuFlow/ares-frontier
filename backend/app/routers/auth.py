import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pwdlib import PasswordHash
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.connection import engine
from app.models import AuthSession, User

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])
passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash(secrets.token_urlsafe(32))
COOKIE = "ares_session"


class LoginInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class RegisterInput(LoginInput):
    name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value


class UserOutput(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    guest: bool = False


def get_db():
    if engine is None:
        raise HTTPException(503, "Banco de dados não configurado.")
    with Session(engine) as db:
        try:
            yield db
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(503, "Não foi possível acessar o banco de dados.") from None


DB = Annotated[Session, Depends(get_db)]


def require_csrf(request: Request):
    # Mandatory custom header forces CORS preflight; Origin is also checked.
    if (request.headers.get("origin") not in settings.allowed_origins
            or request.headers.get("x-ares-csrf") != "1"):
        raise HTTPException(403, "Origem da solicitação não permitida.")


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def current_user(request: Request, db: DB) -> User:
    token = request.cookies.get(COOKIE, "")
    session = db.get(AuthSession, digest(token)) if token else None
    if session is None:
        raise HTTPException(401, "Entre na sua conta para continuar.")
    # SQLite in tests returns naive datetimes; PostgreSQL returns aware values.
    if session.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        db.delete(session)
        db.commit()
        raise HTTPException(401, "Sua sessão expirou. Entre novamente.")
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(401, "Entre na sua conta para continuar.")
    return user


def output(user: User) -> UserOutput:
    return UserOutput(id=user.id, name=user.full_name, email=user.email, role=user.role)


def create_session(user: User, request: Request, response: Response, db: Session):
    now = datetime.now(timezone.utc)
    previous = request.cookies.get(COOKIE)
    db.execute(delete(AuthSession).where(AuthSession.expires_at <= now))
    if previous:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == digest(previous)))
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(token_hash=digest(token), user_id=user.id,
                       expires_at=now + timedelta(seconds=settings.session_ttl_seconds)))
    db.commit()
    response.set_cookie(COOKIE, token, max_age=settings.session_ttl_seconds,
                        httponly=True, secure=settings.session_cookie_secure,
                        samesite="lax", path="/api")
    response.headers["Cache-Control"] = "no-store"


@router.post("/register", response_model=UserOutput, status_code=201,
             dependencies=[Depends(require_csrf)])
def register(data: RegisterInput, request: Request, response: Response, db: DB):
    user = User(full_name=data.name, email=str(data.email),
                password_hash=passwords.hash(data.password), role="explorer")
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Não foi possível criar a conta com esse e-mail.") from None
    create_session(user, request, response, db)
    return output(user)


@router.post("/login", response_model=UserOutput, dependencies=[Depends(require_csrf)])
def login(data: LoginInput, request: Request, response: Response, db: DB):
    user = db.scalar(select(User).where(User.email == str(data.email)))
    valid = passwords.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not valid or user is None or not user.is_active:
        raise HTTPException(401, "E-mail ou senha inválidos.")
    create_session(user, request, response, db)
    return output(user)


@router.get("/me", response_model=UserOutput)
def me(response: Response, user: Annotated[User, Depends(current_user)]):
    response.headers["Cache-Control"] = "no-store"
    return output(user)


@router.post("/logout", status_code=204, dependencies=[Depends(require_csrf)])
def logout(request: Request, response: Response, db: DB):
    token = request.cookies.get(COOKIE)
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == digest(token)))
        db.commit()
    response.delete_cookie(COOKIE, path="/api", httponly=True,
                           secure=settings.session_cookie_secure, samesite="lax")
    response.headers["Cache-Control"] = "no-store"

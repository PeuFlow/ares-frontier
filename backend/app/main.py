
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.database.connection import engine
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.ai import router as ai_router


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="API da plataforma Ares Frontier.",
    version="1.0.0",
)

# Permite a comunicação entre React e Python.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(ai_router)


@app.get("/")
def home():
    return {
        "project": "Ares Frontier",
        "message": "Bem-vindo à API da Ares Frontier!",
        "version": "1.0.0",
    }


@app.get("/api/health")
def health_check():

    if engine is None:
        return {
            "status": "ok",
            "api": "connected",
            "database": "not_configured",
        }

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "api": "connected",
            "database": "connected",
        }

    except Exception as error:
        print(
            f"Erro na conexão com o banco: "
            f"{type(error).__name__}"
        )

        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "api": "connected",
                "database": "unavailable",
            },
        )

"""Explicit local bootstrap: python -m app.cli promote-admin EMAIL."""
import argparse

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.connection import engine
from app.models import User


def main():
    parser = argparse.ArgumentParser(description="Administração local da Ares Frontier")
    parser.add_argument("command", choices=["promote-admin"])
    parser.add_argument("email", help="E-mail de uma conta já cadastrada e ativa")
    args = parser.parse_args()
    if engine is None:
        parser.exit(1, "Configure DATABASE_URL antes de continuar.\n")
    try:
        with Session(engine) as db:
            user = db.scalar(select(User).where(User.email == args.email.strip().lower()))
            if user is None or not user.is_active:
                parser.exit(1, "Conta ativa não encontrada. Cadastre-se no site primeiro.\n")
            user.role = "admin"
            db.commit()
    except SQLAlchemyError:
        parser.exit(1, "Não foi possível atualizar a conta. Verifique a conexão com o banco.\n")
    print("Permissão administrativa concedida. Atualize o site para acessar /admin.")


if __name__ == "__main__":
    main()

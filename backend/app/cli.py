"""Explicit local administration and additive catalog import."""
import argparse

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.connection import engine
from app.models import User


def main():
    parser = argparse.ArgumentParser(description="Administração local da Ares Frontier")
    parser.add_argument("command", choices=["promote-admin", "import-catalog"])
    parser.add_argument("email", nargs='?', help="E-mail de uma conta já cadastrada e ativa")
    parser.add_argument("--apply", action='store_true', help="Aplicar inserções do catálogo; sem esta opção, apenas conferir")
    args = parser.parse_args()
    if args.command == 'promote-admin' and (not args.email or args.apply):
        parser.error('Use promote-admin EMAIL, sem --apply.')
    if args.command == 'import-catalog' and args.email:
        parser.error('import-catalog não recebe e-mail.')
    if engine is None:
        parser.exit(1, "Configure DATABASE_URL antes de continuar.\n")
    try:
        with Session(engine) as db:
            if args.command == 'import-catalog':
                from app.services.catalog_import_service import import_catalog, load_catalog
                result = import_catalog(db, load_catalog(), apply=args.apply)
                print(result)
                return
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

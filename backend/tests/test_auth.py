"""Auth contract tested against an isolated database, never the configured DB."""
import unittest
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import AuthSession, User
from app.routers.auth import COOKIE, digest, get_db, passwords


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        User.__table__.create(self.engine)
        AuthSession.__table__.create(self.engine)

        def test_db():
            with Session(self.engine) as db:
                yield db

        app.dependency_overrides[get_db] = test_db
        self.client = TestClient(app, headers={"Origin": "http://localhost:5173", "X-Ares-CSRF": "1"})
        self.data = {"name": " Explorador Teste ", "email": " EXPLORER@example.com ",
                     "password": "uma-senha-longa-123"}

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def register(self):
        return self.client.post("/api/auth/register", json=self.data)

    def test_register_restore_login_logout_and_replay(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["name"], "Explorador Teste")
        self.assertEqual(response.json()["email"], "explorer@example.com")
        self.assertEqual(response.json()["role"], "explorer")
        self.assertNotIn("password", response.text)
        self.assertIn("HttpOnly", response.headers["set-cookie"])
        self.assertIn("SameSite=lax", response.headers["set-cookie"])
        token = self.client.cookies.get(COOKIE)
        with Session(self.engine) as db:
            user = db.scalar(select(User))
            self.assertNotEqual(user.password_hash, self.data["password"])
            self.assertTrue(passwords.verify(self.data["password"], user.password_hash))
            self.assertIsNotNone(db.get(AuthSession, digest(token)))
        self.assertEqual(self.client.get("/api/auth/me").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/logout", json={}).status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.client.cookies.set(COOKIE, token)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.client.cookies.clear()
        login = {"email": self.data["email"], "password": self.data["password"]}
        self.assertEqual(self.client.post("/api/auth/login", json=login).status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 200)

    def test_duplicate_validation_and_wrong_credentials(self):
        self.assertEqual(self.register().status_code, 201)
        self.assertEqual(self.register().status_code, 409)
        self.assertEqual(self.client.post("/api/auth/register", json={**self.data, "password": "short"}).status_code, 422)
        self.assertEqual(self.client.post("/api/auth/register", json={**self.data, "role": "admin"}).status_code, 422)
        for email in ["explorer@example.com", "unknown@example.com"]:
            response = self.client.post("/api/auth/login", json={"email": email, "password": "wrong"})
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["detail"], "E-mail ou senha inválidos.")

    def test_expired_disabled_and_forged_sessions(self):
        self.register()
        with Session(self.engine) as db:
            session = db.scalar(select(AuthSession))
            session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.client.post("/api/auth/login", json={"email": self.data["email"], "password": self.data["password"]})
        with Session(self.engine) as db:
            user = db.scalar(select(User))
            user.is_active = False
            db.commit()
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.client.cookies.clear()
        self.client.cookies.set(COOKIE, "forged")
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_csrf_and_session_rotation(self):
        for path in ["register", "login", "logout"]:
            self.assertEqual(self.client.post(f"/api/auth/{path}", json=self.data,
                headers={"Origin": "https://evil.example"}).status_code, 403)
            self.assertEqual(self.client.post(f"/api/auth/{path}", json=self.data,
                headers={"X-Ares-CSRF": ""}).status_code, 403)
        self.register()
        old_token = self.client.cookies.get(COOKIE)
        self.client.post("/api/auth/login", json={"email": self.data["email"], "password": self.data["password"]})
        self.assertNotEqual(old_token, self.client.cookies.get(COOKIE))
        with Session(self.engine) as db:
            self.assertIsNone(db.get(AuthSession, digest(old_token)))


if __name__ == "__main__":
    unittest.main()

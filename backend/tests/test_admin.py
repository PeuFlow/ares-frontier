import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import AuthSession, User
from app.routers.auth import get_db


class AdminTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        User.__table__.create(self.engine)
        AuthSession.__table__.create(self.engine)

        def db_override():
            with Session(self.engine) as db:
                yield db

        app.dependency_overrides[get_db] = db_override
        headers = {"Origin": "http://localhost:8080", "X-Ares-CSRF": "1"}
        self.admin = TestClient(app, headers=headers)
        self.explorer = TestClient(app, headers=headers)
        self.password = "a-long-test-password"
        self.admin_id = self.admin.post("/api/auth/register", json={"name": "Admin", "email": "admin@example.com", "password": self.password}).json()["id"]
        self.explorer_id = self.explorer.post("/api/auth/register", json={"name": "Explorer", "email": "explorer@example.com", "password": self.password}).json()["id"]
        with Session(self.engine) as db:
            admin = db.scalar(select(User).where(User.email == "admin@example.com"))
            admin.role = "admin"
            db.commit()

    def tearDown(self):
        self.admin.close()
        self.explorer.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def update(self, **changes):
        data = {"name": "Explorer Edited", "email": "edited@example.com", "role": "explorer", "is_active": True, **changes}
        return self.admin.put(f"/api/admin/users/{self.explorer_id}", json=data)

    def test_access_control_on_every_endpoint(self):
        for method, path, body in [("GET", "/api/admin/users", None),
                                  ("POST", "/api/admin/users", {}),
                                  ("PUT", f"/api/admin/users/{self.admin_id}", {})]:
            response = self.explorer.request(method, path, json=body)
            self.assertEqual(response.status_code, 403)
            self.explorer.cookies.clear()
            self.assertEqual(self.explorer.request(method, path, json=body).status_code, 401)
            self.explorer.post("/api/auth/login", json={"email": "explorer@example.com", "password": self.password})

    def test_search_filters_pagination_and_safe_output(self):
        response = self.admin.get("/api/admin/users?q=explorer&limit=1")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["active"], 2)
        self.assertEqual(data["admins"], 1)
        self.assertEqual(data["users"][0]["email"], "explorer@example.com")
        self.assertNotIn("password", response.text)
        self.assertEqual(self.admin.get("/api/admin/users?offset=2&limit=1").json()["users"], [])
        self.assertEqual(self.admin.get("/api/admin/users?role=admin").json()["total"], 1)
        self.assertEqual(self.admin.get("/api/admin/users?status=inactive").json()["total"], 0)
        self.assertEqual(self.admin.get("/api/admin/users?q=%25").json()["total"], 0)

    def test_create_validation_duplicates_and_no_admin_session_replacement(self):
        data = {"name": "New User", "email": " NEW@example.com ", "password": self.password, "role": "admin"}
        response = self.admin.post("/api/admin/users", json=data)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["email"], "new@example.com")
        self.assertEqual(self.admin.get("/api/auth/me").json()["id"], self.admin_id)
        self.assertEqual(self.admin.post("/api/admin/users", json=data).status_code, 409)
        self.assertEqual(self.admin.post("/api/admin/users", json={**data, "password": "short"}).status_code, 422)

    def test_edit_deactivate_reactivate_and_session_revocation(self):
        self.assertEqual(self.update().status_code, 200)
        self.assertEqual(self.explorer.get("/api/auth/me").json()["name"], "Explorer Edited")
        self.assertEqual(self.update(is_active=False).status_code, 200)
        self.assertEqual(self.explorer.get("/api/auth/me").status_code, 401)
        login = {"email": "edited@example.com", "password": self.password}
        self.assertEqual(self.explorer.post("/api/auth/login", json=login).status_code, 401)
        self.assertEqual(self.update(is_active=True).status_code, 200)
        self.assertEqual(self.explorer.post("/api/auth/login", json=login).status_code, 200)
        self.assertEqual(self.update(role="admin").status_code, 200)
        self.assertEqual(self.explorer.get("/api/auth/me").status_code, 401)
        self.assertEqual(self.explorer.post("/api/auth/login", json=login).status_code, 200)
        self.assertEqual(self.explorer.get("/api/admin/users").status_code, 200)

    def test_self_protection_csrf_duplicates_and_not_found(self):
        data = {"name": "Admin", "email": "admin@example.com", "role": "admin", "is_active": True}
        for changes in [{"role": "explorer"}, {"is_active": False}]:
            self.assertEqual(self.admin.put(f"/api/admin/users/{self.admin_id}", json={**data, **changes}).status_code, 409)
        self.assertEqual(self.update(email="admin@example.com").status_code, 409)
        self.assertEqual(self.admin.put(f"/api/admin/users/{uuid4()}", json=data).status_code, 404)
        self.assertEqual(self.admin.put(f"/api/admin/users/{self.admin_id}", json=data, headers={"Origin": "https://evil.example"}).status_code, 403)
        self.assertEqual(self.admin.post("/api/admin/users", json=data, headers={"X-Ares-CSRF": ""}).status_code, 403)


if __name__ == "__main__":
    unittest.main()

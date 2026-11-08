import unittest
from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import AdminDeletionLog, AuthSession, User
from app.routers.auth import get_db, passwords


class AdminTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        with self.engine.connect() as connection:
            connection.execute(text("PRAGMA foreign_keys=ON"))
        User.__table__.create(self.engine)
        AuthSession.__table__.create(self.engine)
        AdminDeletionLog.__table__.create(self.engine)

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
                                  ("PUT", f"/api/admin/users/{self.admin_id}", {}),
                                  ("DELETE", f"/api/admin/users/{self.admin_id}", None),
                                  ("PUT", f"/api/admin/users/{self.admin_id}/password", {"password": self.password}),
                                  ("GET", "/api/admin/deletion-logs", None)]:
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

    def test_delete_revokes_sessions_and_records_server_identity_and_time(self):
        before = datetime.now(timezone.utc)
        response = self.admin.delete(f"/api/admin/users/{self.explorer_id}")
        self.assertEqual(response.status_code, 204, response.text)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(self.explorer.get("/api/auth/me").status_code, 401)
        self.assertEqual(self.explorer.post("/api/auth/login", json={"email": "explorer@example.com", "password": self.password}).status_code, 401)
        self.assertEqual(self.admin.get("/api/admin/users").json()["total"], 1)
        audit = self.admin.get("/api/admin/deletion-logs")
        self.assertEqual(audit.headers["cache-control"], "no-store")
        self.assertEqual(audit.json()["total"], 1)
        log = audit.json()["logs"][0]
        self.assertEqual(log["actor_id"], self.admin_id)
        self.assertEqual(log["actor_email"], "admin@example.com")
        self.assertEqual(log["actor_name"], "Admin")
        self.assertEqual(log["user_id"], self.explorer_id)
        self.assertEqual(log["user_email"], "explorer@example.com")
        self.assertEqual(log["user_name"], "Explorer")
        timestamp = datetime.fromisoformat(log["deleted_at"].replace("Z", "+00:00"))
        self.assertLessEqual(before, timestamp)
        self.assertLessEqual(timestamp, datetime.now(timezone.utc))
        self.assertNotIn("password", audit.text)
        with Session(self.engine) as db:
            self.assertEqual(len(db.scalars(select(AuthSession)).all()), 1)
        self.assertEqual(self.admin.get("/api/admin/deletion-logs?offset=1&limit=1").json()["logs"], [])

    def test_delete_self_csrf_missing_and_invalid_target_leave_no_log(self):
        self.assertEqual(self.admin.delete(f"/api/admin/users/{self.admin_id}").status_code, 409)
        self.assertEqual(self.admin.delete(f"/api/admin/users/{uuid4()}").status_code, 404)
        for headers in [{"X-Ares-CSRF": ""}, {"Origin": "https://evil.example"}]:
            self.assertEqual(self.admin.delete(f"/api/admin/users/{self.explorer_id}", headers=headers).status_code, 403)
        self.assertEqual(self.admin.get("/api/admin/deletion-logs").json()["total"], 0)
        self.assertEqual(self.explorer.get("/api/auth/me").status_code, 200)

    def test_linked_records_roll_back_deletion_log_and_session_revocation(self):
        # Simulate the missions FK without PostgreSQL-specific JSONB catalog tables.
        with self.engine.begin() as connection:
            connection.execute(text("CREATE TABLE missions (user_id CHAR(32) REFERENCES users(id) ON DELETE RESTRICT)"))
            connection.execute(text("INSERT INTO missions (user_id) VALUES (:user_id)"), {"user_id": self.explorer_id.replace("-", "")})
        response = self.admin.delete(f"/api/admin/users/{self.explorer_id}")
        self.assertEqual(response.status_code, 409, response.text)
        self.assertIn("Desative", response.json()["detail"])
        self.assertEqual(self.admin.get("/api/admin/deletion-logs").json()["total"], 0)
        self.assertEqual(self.explorer.get("/api/auth/me").status_code, 200)

    def test_password_reset_hashes_revokes_all_target_sessions_and_preserves_admin(self):
        other = TestClient(app, headers={"Origin": "http://localhost:8080", "X-Ares-CSRF": "1"})
        try:
            other.post("/api/auth/login", json={"email": "explorer@example.com", "password": self.password})
            new_password = "a-new-long-password-123"
            result = self.admin.put(f"/api/admin/users/{self.explorer_id}/password", json={"password": new_password})
            self.assertEqual(result.status_code, 204, result.text)
            self.assertEqual(result.headers["cache-control"], "no-store")
            self.assertEqual(result.text, "")
            self.assertEqual(self.explorer.get("/api/auth/me").status_code, 401)
            self.assertEqual(other.get("/api/auth/me").status_code, 401)
            self.assertEqual(self.admin.get("/api/auth/me").status_code, 200)
            self.assertEqual(self.explorer.post("/api/auth/login", json={"email": "explorer@example.com", "password": self.password}).status_code, 401)
            self.assertEqual(self.explorer.post("/api/auth/login", json={"email": "explorer@example.com", "password": new_password}).status_code, 200)
            with Session(self.engine) as db:
                user = db.scalar(select(User).where(User.email == "explorer@example.com"))
                self.assertNotEqual(user.password_hash, new_password)
                self.assertTrue(passwords.verify(new_password, user.password_hash))
        finally:
            other.close()

    def test_password_reset_validation_csrf_and_missing_account(self):
        path = f"/api/admin/users/{self.explorer_id}/password"
        for password in ["short", "x" * 129]:
            result = self.admin.put(path, json={"password": password})
            self.assertEqual(result.status_code, 422)
            self.assertNotIn(password, result.text)
        for headers in [{"X-Ares-CSRF": ""}, {"Origin": "https://evil.example"}]:
            self.assertEqual(self.admin.put(path, json={"password": self.password}, headers=headers).status_code, 403)
        self.assertEqual(self.admin.put(f"/api/admin/users/{uuid4()}/password", json={"password": self.password}).status_code, 404)
        self.assertEqual(self.explorer.get("/api/auth/me").status_code, 200)

    def test_admin_can_reset_own_password_and_must_login_again(self):
        new_password = "new-admin-password-123"
        result = self.admin.put(f"/api/admin/users/{self.admin_id}/password", json={"password": new_password})
        self.assertEqual(result.status_code, 204)
        self.assertEqual(self.admin.get("/api/admin/users").status_code, 401)
        self.assertEqual(self.admin.post("/api/auth/login", json={"email": "admin@example.com", "password": self.password}).status_code, 401)
        self.assertEqual(self.admin.post("/api/auth/login", json={"email": "admin@example.com", "password": new_password}).status_code, 200)
        self.assertEqual(self.admin.get("/api/admin/users").status_code, 200)

    def test_revoked_admin_cannot_reset_password(self):
        with Session(self.engine) as db:
            db.scalar(select(User).where(User.email == "admin@example.com")).role = "explorer"
            db.commit()
        self.assertEqual(self.admin.put(f"/api/admin/users/{self.explorer_id}/password", json={"password": self.password}).status_code, 403)

    def test_audit_survives_deleting_its_actor(self):
        self.assertEqual(self.admin.delete(f"/api/admin/users/{self.explorer_id}").status_code, 204)
        other = TestClient(app, headers={"Origin": "http://localhost:8080", "X-Ares-CSRF": "1"})
        try:
            other_id = other.post("/api/auth/register", json={"name": "Other Admin", "email": "other@example.com", "password": self.password}).json()["id"]
            with Session(self.engine) as db:
                db.scalar(select(User).where(User.email == "other@example.com")).role = "admin"
                db.commit()
            self.assertEqual(other.delete(f"/api/admin/users/{self.admin_id}").status_code, 204)
            self.assertEqual(self.admin.get("/api/admin/deletion-logs").status_code, 401)
            logs = other.get("/api/admin/deletion-logs").json()
            self.assertEqual(logs["total"], 2)
            self.assertEqual(logs["logs"][1]["actor_id"], self.admin_id)
            self.assertEqual(logs["logs"][1]["actor_email"], "admin@example.com")
            self.assertEqual(other.get("/api/admin/users").json()["admins"], 1)
            self.assertEqual(other.delete(f"/api/admin/users/{other_id}").status_code, 409)
        finally:
            other.close()


if __name__ == "__main__":
    unittest.main()

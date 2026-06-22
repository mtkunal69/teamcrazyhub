"""TeamCrazy Hub Backend Tests — covers auth, charts, channels, links, webhook,
reports, dashboard, audit, settings and Excel export.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://unified-dashboard-58.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

# unique per-run user
RUN_ID = uuid.uuid4().hex[:8]
TEST_USERNAME = f"test_{RUN_ID}"
TEST_PASSWORD = "secret123"
TEST_NAME = f"TEST User {RUN_ID}"
TEST_TG = f"@test_{RUN_ID}"


# ─────────── Fixtures ───────────
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def user_token(s):
    body = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "name": TEST_NAME,
        "telegram": TEST_TG,
        "default_worker_type": "5 ID Worker",
    }
    r = s.post(f"{API}/auth/user/register", json=body)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def user_h(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


# ─────────── Health ───────────
def test_health(s):
    r = s.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ─────────── Auth ───────────
class TestAuth:
    def test_admin_login_success(self, s):
        r = s.post(f"{API}/auth/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "admin"
        assert d["token"] and isinstance(d["token"], str)

    def test_admin_login_wrong_pw(self, s):
        r = s.post(f"{API}/auth/admin/login", json={"username": ADMIN_USER, "password": "wrong"})
        assert r.status_code == 401

    def test_user_register_short_username(self, s):
        r = s.post(f"{API}/auth/user/register", json={
            "username": "ab", "password": "abcdef", "name": "x", "telegram": "@x",
            "default_worker_type": "5 ID Worker",
        })
        assert r.status_code == 400

    def test_user_register_short_password(self, s):
        r = s.post(f"{API}/auth/user/register", json={
            "username": f"u_{uuid.uuid4().hex[:6]}", "password": "abc", "name": "x", "telegram": "@x",
            "default_worker_type": "5 ID Worker",
        })
        assert r.status_code == 400

    def test_user_register_invalid_worker(self, s):
        r = s.post(f"{API}/auth/user/register", json={
            "username": f"u_{uuid.uuid4().hex[:6]}", "password": "abcdef", "name": "x",
            "telegram": "@x", "default_worker_type": "Bad Worker",
        })
        assert r.status_code == 400

    def test_user_register_duplicate(self, s, user_token):
        # user_token fixture already created TEST_USERNAME
        r = s.post(f"{API}/auth/user/register", json={
            "username": TEST_USERNAME, "password": TEST_PASSWORD, "name": TEST_NAME,
            "telegram": TEST_TG, "default_worker_type": "5 ID Worker",
        })
        assert r.status_code == 409

    def test_user_login_success(self, s, user_token):
        # ensure user exists
        r = s.post(f"{API}/auth/user/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})
        assert r.status_code == 200
        assert r.json()["role"] == "user"

    def test_user_login_wrong_pw(self, s, user_token):
        r = s.post(f"{API}/auth/user/login", json={"username": TEST_USERNAME, "password": "wrong"})
        assert r.status_code == 401

    def test_me_admin(self, s, admin_h):
        r = s.get(f"{API}/auth/me", headers=admin_h)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_user(self, s, user_h):
        r = s.get(f"{API}/auth/me", headers=user_h)
        assert r.status_code == 200
        assert r.json()["role"] == "user"

    def test_me_no_auth(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401


# ─────────── Charts / Slabs ───────────
class TestCharts:
    def test_get_charts_seeded(self, s):
        r = s.get(f"{API}/charts")
        assert r.status_code == 200
        d = r.json()
        # 4 worker types
        for wt in ["4 ID Worker", "5 ID Worker", "7 ID Worker", "10 ID Worker"]:
            assert wt in d, f"missing {wt}"
            assert len(d[wt]) >= 1, f"no slabs for {wt}"

    def test_slab_crud_and_audit(self, s, admin_h):
        # CREATE
        body = {"worker_type": "5 ID Worker", "min": 200, "max": 250, "salary": 999, "enabled": True}
        r = s.post(f"{API}/charts/slab", json=body, headers=admin_h)
        assert r.status_code == 200, r.text
        slab = r.json()
        sid = slab["id"]
        assert slab["label"] == "200\u2013250"
        # GET via charts
        r2 = s.get(f"{API}/charts")
        assert any(s_["id"] == sid for s_ in r2.json()["5 ID Worker"])
        # EDIT (unlimited)
        r3 = s.put(f"{API}/charts/slab/{sid}", json={"unlimited": True, "salary": 1000}, headers=admin_h)
        assert r3.status_code == 200
        assert r3.json()["max"] is None
        assert r3.json()["salary"] == 1000
        # TOGGLE
        r4 = s.patch(f"{API}/charts/slab/{sid}/toggle", headers=admin_h)
        assert r4.status_code == 200
        assert r4.json()["enabled"] is False
        # DELETE
        r5 = s.delete(f"{API}/charts/slab/{sid}", headers=admin_h)
        assert r5.status_code == 200
        # Verify audit log includes our ADD
        r6 = s.get(f"{API}/audit", headers=admin_h)
        assert r6.status_code == 200
        assert any(a["action"] == "ADD" for a in r6.json())

    def test_slab_invalid_worker(self, s, admin_h):
        r = s.post(f"{API}/charts/slab",
                   json={"worker_type": "BAD", "min": 0, "max": 10, "salary": 100},
                   headers=admin_h)
        assert r.status_code == 400

    def test_slab_requires_admin(self, s, user_h):
        r = s.post(f"{API}/charts/slab",
                   json={"worker_type": "5 ID Worker", "min": 0, "max": 10, "salary": 100},
                   headers=user_h)
        assert r.status_code == 403

    def test_slab_404(self, s, admin_h):
        r = s.put(f"{API}/charts/slab/nope", json={"salary": 5}, headers=admin_h)
        assert r.status_code == 404


# ─────────── Channels (no real bot token) ───────────
class TestChannels:
    def test_add_channel_without_bot_token(self, s, admin_h):
        # Ensure no telegram settings (or token empty)
        s.put(f"{API}/settings/telegram",
              json={"bot_token": "", "chat_id": "", "enabled": False,
                    "notify_on_report": True, "daily_summary": True},
              headers=admin_h)
        r = s.post(f"{API}/channels", json={"chat_id": "-1001234567890"}, headers=admin_h)
        assert r.status_code == 400
        assert "telegram" in r.json()["detail"].lower() or "bot" in r.json()["detail"].lower()

    def test_add_channel_with_fake_token_resolves_error(self, s, admin_h):
        # Set fake token
        s.put(f"{API}/settings/telegram",
              json={"bot_token": "1234:FAKE", "chat_id": "0", "enabled": False,
                    "notify_on_report": True, "daily_summary": True},
              headers=admin_h)
        r = s.post(f"{API}/channels", json={"chat_id": "-1001234567890"}, headers=admin_h)
        assert r.status_code == 400
        assert "find chat" in r.json()["detail"].lower() or "bot is admin" in r.json()["detail"].lower()

    def test_add_channel_missing_input(self, s, admin_h):
        r = s.post(f"{API}/channels", json={}, headers=admin_h)
        assert r.status_code == 400

    def test_add_channel_private_invite(self, s, admin_h):
        r = s.post(f"{API}/channels", json={"invite_link": "https://t.me/+abc123def"}, headers=admin_h)
        assert r.status_code == 400
        assert "private" in r.json()["detail"].lower()

    def test_list_channels_admin(self, s, admin_h):
        r = s.get(f"{API}/channels", headers=admin_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_available_channels_user(self, s, user_h):
        r = s.get(f"{API}/channels/available", headers=user_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_edit_delete_channel_404(self, s, admin_h):
        assert s.put(f"{API}/channels/nope", json={"notes": "x"}, headers=admin_h).status_code == 404
        assert s.delete(f"{API}/channels/nope", headers=admin_h).status_code == 404

    def test_channels_requires_admin(self, s, user_h):
        assert s.get(f"{API}/channels", headers=user_h).status_code == 403


# ─────────── Links ───────────
class TestLinks:
    def test_create_link_missing_channel(self, s, user_h):
        r = s.post(f"{API}/links/create", json={}, headers=user_h)
        assert r.status_code == 400

    def test_create_link_unknown_channel(self, s, user_h):
        r = s.post(f"{API}/links/create", json={"channel_id": "does-not-exist"}, headers=user_h)
        assert r.status_code == 404

    def test_my_links_user(self, s, user_h):
        r = s.get(f"{API}/links/me", headers=user_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_all_links_admin(self, s, admin_h):
        r = s.get(f"{API}/links", headers=admin_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ─────────── Telegram webhook (public) ───────────
class TestWebhook:
    def test_webhook_empty(self, s):
        r = s.post(f"{API}/telegram/webhook", json={})
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_webhook_invalid_body(self, s):
        r = requests.post(f"{API}/telegram/webhook", data="not json",
                          headers={"Content-Type": "application/json"})
        assert r.status_code == 200

    def test_webhook_join_request_no_matching_link(self, s):
        # Should still return ok=true, just log
        payload = {
            "chat_join_request": {
                "chat": {"id": -100999, "title": "X", "type": "channel"},
                "from": {"id": 111, "first_name": "Test", "username": "tester"},
                "invite_link": {"invite_link": "https://t.me/+nonexistent"},
            }
        }
        r = s.post(f"{API}/telegram/webhook", json=payload)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_webhook_chat_member_left(self, s):
        payload = {
            "chat_member": {
                "chat": {"id": -100999},
                "new_chat_member": {"status": "left", "user": {"id": 111}},
            }
        }
        r = s.post(f"{API}/telegram/webhook", json=payload)
        assert r.status_code == 200

    def test_webhook_my_chat_member(self, s):
        payload = {
            "my_chat_member": {
                "chat": {"id": -1009998888, "title": "Test Chan", "type": "channel"},
                "new_chat_member": {"status": "administrator"},
            }
        }
        r = s.post(f"{API}/telegram/webhook", json=payload)
        assert r.status_code == 200


# ─────────── Reports ───────────
class TestReports:
    def test_submit_report_manual(self, s, user_h):
        r = s.post(f"{API}/reports",
                   json={"worker_type": "5 ID Worker", "member_count": 75},
                   headers=user_h)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["member_count"] == 75
        assert d["source"] == "MANUAL"
        assert d["salary"] >= 0
        assert d["status"] == "VERIFIED"
        # GET it back via /reports/me
        r2 = s.get(f"{API}/reports/me", headers=user_h)
        assert r2.status_code == 200
        assert any(x["id"] == d["id"] for x in r2.json())

    def test_submit_report_no_link_no_count(self, s, user_h):
        r = s.post(f"{API}/reports",
                   json={"worker_type": "5 ID Worker"},
                   headers=user_h)
        assert r.status_code == 400

    def test_submit_report_invalid_link(self, s, user_h):
        r = s.post(f"{API}/reports",
                   json={"worker_type": "5 ID Worker", "link_id": "no-such-link"},
                   headers=user_h)
        assert r.status_code == 404

    def test_submit_report_invalid_worker(self, s, user_h):
        r = s.post(f"{API}/reports",
                   json={"worker_type": "Junk", "member_count": 50},
                   headers=user_h)
        assert r.status_code == 400

    def test_list_reports_admin(self, s, admin_h):
        r = s.get(f"{API}/reports", headers=admin_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ─────────── Dashboard / Audit ───────────
class TestDashboardAudit:
    def test_dashboard_stats(self, s, admin_h):
        r = s.get(f"{API}/dashboard/stats", headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_reports", "today_reports", "total_paid", "verified", "by_type"]:
            assert k in d

    def test_audit_log(self, s, admin_h):
        r = s.get(f"{API}/audit", headers=admin_h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ─────────── Settings: Telegram + Gemini + Auto Reports ───────────
class TestSettings:
    def test_tg_test_no_token(self, s, admin_h):
        # blank settings
        s.put(f"{API}/settings/telegram",
              json={"bot_token": "", "chat_id": "", "enabled": False,
                    "notify_on_report": True, "daily_summary": True},
              headers=admin_h)
        r = s.post(f"{API}/settings/telegram/test", headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is False
        assert "token" in d["error"].lower()

    def test_tg_test_fake_token(self, s, admin_h):
        s.put(f"{API}/settings/telegram",
              json={"bot_token": "fake:token", "chat_id": "123", "enabled": False,
                    "notify_on_report": True, "daily_summary": True},
              headers=admin_h)
        r = s.post(f"{API}/settings/telegram/test", headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is False
        # Specific Telegram API error, not generic
        assert "telegram" in d["error"].lower() or "unauthorized" in d["error"].lower() or "network" in d["error"].lower()

    def test_setup_webhook_no_token(self, s, admin_h):
        s.put(f"{API}/settings/telegram",
              json={"bot_token": "", "chat_id": "", "enabled": False,
                    "notify_on_report": True, "daily_summary": True},
              headers=admin_h)
        r = s.post(f"{API}/settings/telegram/setup-webhook", headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is False
        assert "token" in d.get("error", "").lower()

    def test_setup_webhook_fake_token(self, s, admin_h):
        s.put(f"{API}/settings/telegram",
              json={"bot_token": "fake:token", "chat_id": "0", "enabled": False,
                    "notify_on_report": True, "daily_summary": True},
              headers=admin_h)
        r = s.post(f"{API}/settings/telegram/setup-webhook", headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        # Should fail gracefully without crashing
        assert d.get("ok") in (False, None) or "error" in d

    def test_run_auto_reports_now(self, s, admin_h):
        r = s.post(f"{API}/settings/run-auto-reports-now", headers=admin_h)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_run_auto_reports_requires_admin(self, s, user_h):
        r = s.post(f"{API}/settings/run-auto-reports-now", headers=user_h)
        assert r.status_code == 403


# ─────────── Excel Export ───────────
class TestExport:
    def test_weekly_export(self, s, admin_token):
        # Use raw session (no JSON content type)
        r = requests.get(f"{API}/reports/export/weekly",
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("Content-Type", "")
        cd = r.headers.get("Content-Disposition", "")
        assert ".xlsx" in cd
        assert len(r.content) > 1000  # non-empty workbook

    def test_weekly_export_requires_admin(self, s, user_token):
        r = requests.get(f"{API}/reports/export/weekly",
                         headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 403

"""Telegram bot helper — extended with invite link tracking.

Workflow:
1. Bot is added to a Telegram channel/group as admin (with `can_invite_users`)
2. Staff generates a unique invite link via /api/links/create
3. Each link has `creates_join_request=true`
4. When user clicks link → Telegram fires `chat_join_request` to our webhook
5. Bot auto-approves + increments per-staff counter in DB
6. Staff salary = members joined via their link(s)
"""
import httpx
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta

log = logging.getLogger("telegram")

TG_API = "https://api.telegram.org/bot{token}/{method}"


async def get_config(db) -> Optional[dict]:
    doc = await db.settings.find_one({"key": "telegram"}, {"_id": 0})
    return doc


async def _call(token: str, method: str, params: dict = None, timeout: int = 20) -> dict:
    """Generic Bot API call."""
    url = TG_API.format(token=token, method=method)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=params or {})
            data = r.json()
            if not data.get("ok"):
                return {"ok": False, "error": data.get("description", "Unknown")}
            return {"ok": True, "result": data.get("result")}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


async def send_message(db, text: str, parse_mode: str = "HTML") -> dict:
    """Send a message using config stored in DB."""
    cfg = await get_config(db)
    if not cfg or not cfg.get("enabled"):
        return {"ok": False, "error": "Telegram disabled"}
    token = (cfg.get("bot_token") or "").strip()
    chat_id = (cfg.get("chat_id") or "").strip()
    if not token or not chat_id:
        return {"ok": False, "error": "Bot token or chat id missing"}
    res = await _call(token, "sendMessage", {
        "chat_id": chat_id, "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    })
    return res


# ─────────────────────────────────────────────────────────────
# Bot Admin / Webhook helpers
# ─────────────────────────────────────────────────────────────
async def set_webhook(token: str, webhook_url: str) -> dict:
    """Register our webhook URL with Telegram. Allows chat_join_request + my_chat_member updates."""
    return await _call(token, "setWebhook", {
        "url": webhook_url,
        "allowed_updates": ["message", "chat_join_request", "my_chat_member", "chat_member"],
        "drop_pending_updates": True,
    })


async def delete_webhook(token: str) -> dict:
    return await _call(token, "deleteWebhook", {"drop_pending_updates": True})


async def get_webhook_info(token: str) -> dict:
    return await _call(token, "getWebhookInfo")


async def get_me(token: str) -> dict:
    """Get bot info — used to verify token + extract bot username."""
    return await _call(token, "getMe")


# ─────────────────────────────────────────────────────────────
# Invite Link helpers
# ─────────────────────────────────────────────────────────────
async def get_chat(token: str, chat_id) -> dict:
    """Resolve a channel @username or numeric chat_id to full Chat object."""
    return await _call(token, "getChat", {"chat_id": chat_id})


async def get_chat_member_count(token: str, chat_id) -> dict:
    return await _call(token, "getChatMemberCount", {"chat_id": chat_id})


async def create_invite_link(token: str, chat_id, name: str = "", creates_join_request: bool = True) -> dict:
    """Create a unique invite link for a chat. Bot must be admin with can_invite_users."""
    params = {"chat_id": chat_id, "creates_join_request": creates_join_request}
    if name:
        params["name"] = name[:32]  # Telegram limit
    return await _call(token, "createChatInviteLink", params)


async def revoke_invite_link(token: str, chat_id, invite_link: str) -> dict:
    return await _call(token, "revokeChatInviteLink", {
        "chat_id": chat_id, "invite_link": invite_link,
    })


async def approve_join_request(token: str, chat_id, user_id: int) -> dict:
    return await _call(token, "approveChatJoinRequest", {"chat_id": chat_id, "user_id": user_id})


async def decline_join_request(token: str, chat_id, user_id: int) -> dict:
    return await _call(token, "declineChatJoinRequest", {"chat_id": chat_id, "user_id": user_id})


# ─────────────────────────────────────────────────────────────
# Message builders
# ─────────────────────────────────────────────────────────────
def _esc(s) -> str:
    s = str(s) if s is not None else ""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_report_notification(report: dict) -> str:
    """HTML-formatted instant notification for a new report."""
    status = report.get("status", "")
    icon = "✅" if status == "VERIFIED" else "⚠️"
    badge = "VERIFIED" if status == "VERIFIED" else "MISMATCH"
    ts = report.get("created_at", "")
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00")) if ts else datetime.now(timezone.utc)
        ist = dt + timedelta(hours=5, minutes=30)
        time_str = ist.strftime("%d %b %Y · %I:%M %p IST")
    except Exception:
        time_str = ts
    channel = report.get("channel_title", "")
    src = "Live Telegram Count" if report.get("source") == "INVITE_LINK" else "Manual"
    return (
        f"{icon} <b>New Salary Report</b> [{badge}]\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Worker:</b> {_esc(report.get('name'))}\n"
        f"📱 <b>Telegram:</b> {_esc(report.get('telegram'))}\n"
        f"🏷 <b>Type:</b> {_esc(report.get('worker_type'))}\n"
        f"📺 <b>Channel:</b> {_esc(channel) if channel else '—'}\n"
        f"🔗 <b>Source:</b> {src}\n"
        f"🔢 <b>Members Joined:</b> {report.get('ai_count')}\n"
        f"💰 <b>Salary:</b> ₹{report.get('salary', 0):,}\n"
        f"📅 {time_str}\n"
    )


def build_daily_summary(reports: list, date_str: str) -> str:
    """HTML-formatted daily salary chart sent at 12 PM."""
    if not reports:
        return (
            f"📊 <b>Daily Salary Report</b> · {date_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"No submissions in the last 24 hours."
        )
    total_paid = sum(r.get("salary", 0) for r in reports)
    verified = sum(1 for r in reports if r.get("status") == "VERIFIED")
    mismatch = len(reports) - verified

    by_user = {}
    for r in reports:
        key = (r.get("telegram") or r.get("name") or "?", r.get("name", "?"))
        d = by_user.setdefault(key, {"name": r.get("name", "?"), "telegram": r.get("telegram", ""),
                                     "count": 0, "salary": 0, "members": 0})
        d["count"] += 1
        d["salary"] += r.get("salary", 0)
        d["members"] += r.get("ai_count", 0)

    sorted_users = sorted(by_user.values(), key=lambda x: x["salary"], reverse=True)
    lines = [
        f"📊 <b>Daily Salary Report</b> · {date_str}",
        f"━━━━━━━━━━━━━━━━━━━━━",
        f"👥 <b>Total Reports:</b> {len(reports)}",
        f"✅ <b>Verified:</b> {verified}    ⚠️ <b>Mismatch:</b> {mismatch}",
        f"💰 <b>Total Paid:</b> ₹{total_paid:,}",
        f"━━━━━━━━━━━━━━━━━━━━━",
        f"<b>Worker-wise Breakdown:</b>",
    ]
    for i, u in enumerate(sorted_users[:25], 1):
        tg = f" ({_esc(u['telegram'])})" if u['telegram'] else ""
        lines.append(
            f"{i}. <b>{_esc(u['name'])}</b>{tg}\n"
            f"     · {u['count']} report(s) · {u['members']} members · ₹{u['salary']:,}"
        )
    if len(sorted_users) > 25:
        lines.append(f"\n…and {len(sorted_users) - 25} more workers")
    return "\n".join(lines)

"""Telegram bot helper — sends messages via Bot API + builds report messages."""
import httpx
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta

log = logging.getLogger("telegram")

TG_API = "https://api.telegram.org/bot{token}/sendMessage"


async def get_config(db) -> Optional[dict]:
    doc = await db.settings.find_one({"key": "telegram"}, {"_id": 0})
    return doc


async def send_message(db, text: str, parse_mode: str = "HTML") -> dict:
    """Send a message using config stored in DB. Returns {ok, error?}."""
    cfg = await get_config(db)
    if not cfg or not cfg.get("enabled"):
        return {"ok": False, "error": "Telegram disabled"}
    token = cfg.get("bot_token", "").strip()
    chat_id = cfg.get("chat_id", "").strip()
    if not token or not chat_id:
        return {"ok": False, "error": "Bot token or chat id missing"}
    url = TG_API.format(token=token)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, json={
                "chat_id": chat_id, "text": text,
                "parse_mode": parse_mode,
                "disable_web_page_preview": True,
            })
            data = r.json()
            if not data.get("ok"):
                log.warning(f"Telegram error: {data}")
                return {"ok": False, "error": data.get("description", "Unknown")}
            return {"ok": True}
    except Exception as e:
        log.exception("Telegram send failed")
        return {"ok": False, "error": str(e)}


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
    return (
        f"{icon} <b>New Salary Report</b> [{badge}]\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Worker:</b> {_esc(report.get('name'))}\n"
        f"📱 <b>Telegram:</b> {_esc(report.get('telegram'))}\n"
        f"🏷 <b>Type:</b> {_esc(report.get('worker_type'))}\n"
        f"🔢 <b>Entered:</b> {report.get('member_count')} · <b>AI Count:</b> {report.get('ai_count')}\n"
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

    # Per-worker rollup
    by_user = {}
    for r in reports:
        key = (r.get("telegram") or r.get("name") or "?", r.get("name", "?"))
        d = by_user.setdefault(key, {"name": r.get("name", "?"), "telegram": r.get("telegram", ""),
                                     "count": 0, "salary": 0, "types": set()})
        d["count"] += 1
        d["salary"] += r.get("salary", 0)
        d["types"].add(r.get("worker_type", ""))

    sorted_users = sorted(by_user.values(), key=lambda x: x["salary"], reverse=True)

    lines = [
        f"📊 <b>Daily Salary Report</b> · {date_str}",
        "━━━━━━━━━━━━━━━━━━━━━",
        f"👥 <b>Total Reports:</b> {len(reports)}",
        f"✅ <b>Verified:</b> {verified}    ⚠️ <b>Mismatch:</b> {mismatch}",
        f"💰 <b>Total Paid Out:</b> ₹{total_paid:,}",
        "━━━━━━━━━━━━━━━━━━━━━",
        "<b>Worker-wise Breakdown:</b>",
    ]
    for i, u in enumerate(sorted_users[:25], 1):
        tg = f" ({_esc(u['telegram'])})" if u['telegram'] else ""
        lines.append(
            f"{i}. <b>{_esc(u['name'])}</b>{tg}\n"
            f"     · {u['count']} report(s) · ₹{u['salary']:,}"
        )
    if len(sorted_users) > 25:
        lines.append(f"\n…and {len(sorted_users) - 25} more workers")
    return "\n".join(lines)

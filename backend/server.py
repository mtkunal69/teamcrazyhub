from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import jwt
import bcrypt
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict

# ─────────────────────────────────────────────────────────────
# Config & DB
# ─────────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
JWT_EXPIRES_MIN = 60 * 24 * 7  # 7 days

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_NAME = os.environ.get("ADMIN_NAME", "TeamCrazy Admin")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="TeamCrazy Hub API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("tch")

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_pw(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))

def make_token(subject: str, role: str, name: str) -> str:
    payload = {
        "sub": subject,
        "role": role,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MIN),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

async def get_principal(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    return decode_token(authorization[7:])

async def require_admin(p: dict = Depends(get_principal)) -> dict:
    if p.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return p

async def require_user(p: dict = Depends(get_principal)) -> dict:
    if p.get("role") != "user":
        raise HTTPException(403, "User only")
    return p

def strip_id(doc: dict) -> dict:
    if doc is None:
        return doc
    doc.pop("_id", None)
    return doc

# ─────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────
WORKER_TYPES = ["4 ID Worker", "5 ID Worker", "7 ID Worker", "10 ID Worker"]

class AdminLogin(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    name: str
    telegram: str  # e.g. @username

class SlabIn(BaseModel):
    worker_type: str
    min: int
    max: Optional[int] = None  # None == unlimited
    salary: int
    enabled: bool = True

class SlabPatch(BaseModel):
    min: Optional[int] = None
    max: Optional[int] = None  # use -1 to signal unlimited via PUT? keep None=unchanged; use "unlimited" flag
    unlimited: Optional[bool] = None
    salary: Optional[int] = None
    enabled: Optional[bool] = None

class ReportIn(BaseModel):
    worker_type: str
    member_count: int
    video_filename: Optional[str] = None

class AICountIn(BaseModel):
    entered_count: int
    worker_type: str

# ─────────────────────────────────────────────────────────────
# Seed defaults
# ─────────────────────────────────────────────────────────────
DEFAULT_SLABS = {
    "4 ID Worker": [(0,39,0),(40,49,150),(50,59,220),(60,74,280),(75,None,350)],
    "5 ID Worker": [(0,49,0),(50,64,200),(65,79,300),(80,99,400),(100,None,500)],
    "7 ID Worker": [(0,59,0),(60,79,250),(80,99,380),(100,124,500),(125,None,650)],
    "10 ID Worker":[(0,79,0),(80,99,300),(100,124,450),(125,149,600),(150,None,800)],
}

def slab_label(mn: int, mx: Optional[int]) -> str:
    return f"{mn}+" if mx is None else f"{mn}\u2013{mx}"

async def seed_admin():
    existing = await db.admins.find_one({"username": ADMIN_USERNAME})
    if not existing:
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "username": ADMIN_USERNAME,
            "password_hash": hash_pw(ADMIN_PASSWORD),
            "name": ADMIN_NAME,
            "created_at": now_iso(),
        })
        log.info(f"Seeded admin: {ADMIN_USERNAME}")
    else:
        # keep password in sync with env
        if not verify_pw(ADMIN_PASSWORD, existing["password_hash"]):
            await db.admins.update_one(
                {"username": ADMIN_USERNAME},
                {"$set": {"password_hash": hash_pw(ADMIN_PASSWORD)}},
            )
            log.info("Updated admin password from env")

async def seed_slabs():
    count = await db.salary_slabs.count_documents({})
    if count > 0:
        return
    docs = []
    for wt, rows in DEFAULT_SLABS.items():
        for order, (mn, mx, sal) in enumerate(rows):
            docs.append({
                "id": str(uuid.uuid4()),
                "worker_type": wt,
                "min": mn,
                "max": mx,
                "salary": sal,
                "label": slab_label(mn, mx),
                "enabled": True,
                "order": order,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            })
    await db.salary_slabs.insert_many(docs)
    log.info(f"Seeded {len(docs)} default salary slabs")

async def ensure_indexes():
    await db.admins.create_index("username", unique=True)
    await db.users.create_index("telegram", unique=True)
    await db.salary_slabs.create_index([("worker_type", 1), ("order", 1)])
    await db.reports.create_index([("created_at", -1)])
    await db.reports.create_index("telegram")
    await db.audit_logs.create_index([("created_at", -1)])

# ─────────────────────────────────────────────────────────────
# Salary calc
# ─────────────────────────────────────────────────────────────
async def calc_salary(worker_type: str, count: int) -> tuple[int, Optional[str]]:
    slabs = await db.salary_slabs.find(
        {"worker_type": worker_type, "enabled": True}, {"_id": 0}
    ).sort("min", 1).to_list(100)
    for s in slabs:
        mx = s["max"] if s["max"] is not None else 10**9
        if s["min"] <= count <= mx:
            return s["salary"], s["label"]
    return 0, None

# ─────────────────────────────────────────────────────────────
# Routes — Auth
# ─────────────────────────────────────────────────────────────
@api.post("/auth/admin/login")
async def admin_login(body: AdminLogin):
    a = await db.admins.find_one({"username": body.username})
    if not a or not verify_pw(body.password, a["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(a["id"], "admin", a["name"])
    return {"token": token, "role": "admin", "name": a["name"], "username": a["username"]}

@api.post("/auth/user/login")
async def user_login(body: UserLogin):
    name = body.name.strip()
    tg = body.telegram.strip()
    if not tg.startswith("@"):
        tg = "@" + tg
    if not name or len(tg) < 2:
        raise HTTPException(400, "Name and telegram required")
    existing = await db.users.find_one({"telegram": tg})
    if not existing:
        user = {
            "id": str(uuid.uuid4()),
            "name": name,
            "telegram": tg,
            "created_at": now_iso(),
            "last_login": now_iso(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one({"telegram": tg}, {"$set": {"name": name, "last_login": now_iso()}})
        user = await db.users.find_one({"telegram": tg}, {"_id": 0})
    token = make_token(user["id"], "user", name)
    return {"token": token, "role": "user", "name": name, "telegram": tg, "user_id": user["id"]}

@api.get("/auth/me")
async def me(p: dict = Depends(get_principal)):
    return {"id": p["sub"], "role": p["role"], "name": p["name"]}

# ─────────────────────────────────────────────────────────────
# Routes — Salary Charts
# ─────────────────────────────────────────────────────────────
@api.get("/charts")
async def get_charts():
    slabs = await db.salary_slabs.find({}, {"_id": 0}).sort([("worker_type",1),("min",1)]).to_list(1000)
    out = {wt: [] for wt in WORKER_TYPES}
    for s in slabs:
        if s["worker_type"] in out:
            out[s["worker_type"]].append(s)
    return out

async def push_audit(admin: dict, worker_type: str, action: str, slab_label_: str,
                    old_value: str = "", new_value: str = ""):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["sub"],
        "admin_name": admin["name"],
        "worker_type": worker_type,
        "action": action,
        "slab_label": slab_label_,
        "old_value": old_value,
        "new_value": new_value,
        "created_at": now_iso(),
    })

@api.post("/charts/slab")
async def add_slab(body: SlabIn, admin: dict = Depends(require_admin)):
    if body.worker_type not in WORKER_TYPES:
        raise HTTPException(400, "Invalid worker type")
    label = slab_label(body.min, body.max)
    doc = {
        "id": str(uuid.uuid4()),
        "worker_type": body.worker_type,
        "min": body.min, "max": body.max, "salary": body.salary,
        "label": label, "enabled": body.enabled, "order": 999,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.salary_slabs.insert_one(doc)
    await push_audit(admin, body.worker_type, "ADD", label, "", f"\u20b9{body.salary}")
    doc.pop("_id", None)
    return doc

@api.put("/charts/slab/{slab_id}")
async def edit_slab(slab_id: str, body: SlabPatch, admin: dict = Depends(require_admin)):
    old = await db.salary_slabs.find_one({"id": slab_id}, {"_id": 0})
    if not old:
        raise HTTPException(404, "Slab not found")
    upd = {}
    new_min = old["min"] if body.min is None else body.min
    new_max = old["max"]
    if body.unlimited is True:
        new_max = None
    elif body.max is not None:
        new_max = body.max
    new_sal = old["salary"] if body.salary is None else body.salary
    upd["min"] = new_min
    upd["max"] = new_max
    upd["salary"] = new_sal
    upd["label"] = slab_label(new_min, new_max)
    if body.enabled is not None:
        upd["enabled"] = body.enabled
    upd["updated_at"] = now_iso()
    await db.salary_slabs.update_one({"id": slab_id}, {"$set": upd})
    await push_audit(admin, old["worker_type"], "EDIT", upd["label"],
                     f"Range:{old['label']} | \u20b9{old['salary']}",
                     f"Range:{upd['label']} | \u20b9{new_sal}")
    new = await db.salary_slabs.find_one({"id": slab_id}, {"_id": 0})
    return new

@api.patch("/charts/slab/{slab_id}/toggle")
async def toggle_slab(slab_id: str, admin: dict = Depends(require_admin)):
    old = await db.salary_slabs.find_one({"id": slab_id}, {"_id": 0})
    if not old:
        raise HTTPException(404, "Slab not found")
    new_state = not old["enabled"]
    await db.salary_slabs.update_one({"id": slab_id}, {"$set": {"enabled": new_state, "updated_at": now_iso()}})
    await push_audit(admin, old["worker_type"], "DISABLE" if not new_state else "ENABLE",
                     old["label"], "", "Disabled" if not new_state else "Enabled")
    return {"id": slab_id, "enabled": new_state}

@api.delete("/charts/slab/{slab_id}")
async def del_slab(slab_id: str, admin: dict = Depends(require_admin)):
    old = await db.salary_slabs.find_one({"id": slab_id}, {"_id": 0})
    if not old:
        raise HTTPException(404, "Slab not found")
    await db.salary_slabs.delete_one({"id": slab_id})
    await push_audit(admin, old["worker_type"], "DELETE", old["label"], f"\u20b9{old['salary']}", "")
    return {"ok": True}

@api.post("/charts/reset")
async def reset_charts(admin: dict = Depends(require_admin)):
    await db.salary_slabs.delete_many({})
    await seed_slabs()
    await push_audit(admin, "ALL", "RESET", "All", "", "Reset to defaults")
    return {"ok": True}

# ─────────────────────────────────────────────────────────────
# Routes — AI Count + Reports
# ─────────────────────────────────────────────────────────────
SAMPLE_NAMES = [
    "Anurag Dwivedi","BLACK KEY","MR. S.P. SIR","ISHIKA","Rahul Sharma","Priya Singh",
    "Amit Kumar","Sneha Patel","Vikram Rao","Neha Gupta","Arjun Mehta","Pooja Verma",
    "Suresh Nair","Kavita Joshi","Rohit Das","Anita Roy","Deepak Tiwari","Meena Shah",
    "Ravi Pillai","Sunita Yadav","Manish Dubey","Rekha Mishra","Ajay Sinha","Geeta Bose",
]

@api.post("/ai/count")
async def ai_count(body: AICountIn, _: dict = Depends(require_user)):
    """Simulated AI vision: pretends to count members from screen recording."""
    entered = body.entered_count
    total_visible = entered + random.randint(0, 3)
    premium_count = int(total_visible * (0.18 + random.random() * 0.10))
    members = []
    premium_idx = set(random.sample(range(total_visible), min(premium_count, total_visible)))
    for i in range(total_visible):
        is_premium = i in premium_idx
        members.append({
            "name": random.choice(SAMPLE_NAMES),
            "premium": is_premium,
            "badge": ("\u2b50 Premium" if random.random() > 0.5 else "\U0001f381 Gift Badge") if is_premium else None,
        })
    ai_n = total_visible
    matched = abs(ai_n - entered) <= 3
    final_count = entered if matched else ai_n
    return {
        "total_visible": total_visible,
        "premium_count": premium_count,
        "ai_count": final_count,
        "matched": matched,
        "members": members[:15],
    }

@api.post("/reports")
async def submit_report(body: ReportIn, p: dict = Depends(require_user)):
    if body.worker_type not in WORKER_TYPES:
        raise HTTPException(400, "Invalid worker type")
    # Run AI count
    ai_res = await ai_count(AICountIn(entered_count=body.member_count, worker_type=body.worker_type), p)
    salary, slab = await calc_salary(body.worker_type, ai_res["ai_count"])
    status = "VERIFIED" if ai_res["matched"] else "MISMATCH COUNTING"
    user = await db.users.find_one({"id": p["sub"]}, {"_id": 0})
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": p["sub"],
        "name": user["name"] if user else p["name"],
        "telegram": user["telegram"] if user else "",
        "worker_type": body.worker_type,
        "member_count": body.member_count,
        "ai_count": ai_res["ai_count"],
        "salary": salary,
        "status": status,
        "slab_label": slab,
        "video_filename": body.video_filename,
        "video_proof": bool(body.video_filename),
        "members_detected": ai_res["members"],
        "created_at": now_iso(),
    }
    await db.reports.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/reports")
async def list_reports(
    admin: dict = Depends(require_admin),
    worker_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    date: Optional[str] = None,  # YYYY-MM-DD
):
    q = {}
    if worker_type and worker_type != "ALL":
        q["worker_type"] = worker_type
    if status and status != "ALL":
        q["status"] = status
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"telegram": {"$regex": search, "$options": "i"}},
        ]
    if date:
        q["created_at"] = {"$gte": date, "$lt": date + "T99:99:99"}
    rows = await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return rows

@api.get("/reports/me")
async def my_reports(p: dict = Depends(require_user)):
    rows = await db.reports.find({"user_id": p["sub"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows

@api.get("/reports/{rid}")
async def get_report(rid: str, p: dict = Depends(get_principal)):
    r = await db.reports.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Not found")
    if p["role"] == "user" and r["user_id"] != p["sub"]:
        raise HTTPException(403, "Forbidden")
    return r

# ─────────────────────────────────────────────────────────────
# Routes — Audit + Dashboard
# ─────────────────────────────────────────────────────────────
@api.get("/audit")
async def audit(admin: dict = Depends(require_admin), action: Optional[str] = None):
    q = {} if not action or action == "ALL" else {"action": action}
    rows = await db.audit_logs.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return rows

@api.get("/dashboard/stats")
async def dashboard_stats(admin: dict = Depends(require_admin)):
    reports = await db.reports.find({}, {"_id": 0}).to_list(5000)
    today = datetime.now(timezone.utc).date().isoformat()
    today_count = sum(1 for r in reports if r["created_at"][:10] == today)
    total_paid = sum(r["salary"] for r in reports)
    verified = sum(1 for r in reports if r["status"] == "VERIFIED")
    mismatch = sum(1 for r in reports if r["status"] == "MISMATCH COUNTING")
    by_type = []
    for wt in WORKER_TYPES:
        type_rows = [r for r in reports if r["worker_type"] == wt]
        by_type.append({
            "worker_type": wt,
            "count": len(type_rows),
            "paid": sum(r["salary"] for r in type_rows),
        })
    active_slabs = await db.salary_slabs.count_documents({"enabled": True})
    return {
        "total_reports": len(reports),
        "today_reports": today_count,
        "total_paid": total_paid,
        "verified": verified,
        "mismatch": mismatch,
        "active_slabs": active_slabs,
        "by_type": by_type,
        "recent": sorted(reports, key=lambda r: r["created_at"], reverse=True)[:5],
    }

@api.get("/health")
async def health():
    return {"status": "ok", "time": now_iso()}

# ─────────────────────────────────────────────────────────────
# App wiring
# ─────────────────────────────────────────────────────────────
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_start():
    await ensure_indexes()
    await seed_admin()
    await seed_slabs()
    log.info("TeamCrazy Hub API ready")

@app.on_event("shutdown")
async def on_stop():
    client.close()

# TeamCrazy Hub — Product Requirements

## Problem Statement
AI-powered salary verification platform connecting a User Panel (workers submit daily work + screen recordings) and an Admin Panel (manage salary slabs, view reports, audit) through a unified backend + database. Workers earn salary based on Telegram member counts verified by AI vision.

## Tech Stack
- **Backend**: FastAPI + Motor (async MongoDB) + APScheduler + openpyxl + httpx + bcrypt + PyJWT
- **Frontend**: React 19 + react-router-dom 7 + axios + craco
- **Database**: MongoDB (collections: admins, users, salary_slabs, reports, audit_logs, settings)
- **Notifications**: Telegram Bot API

## User Personas
1. **Worker (User)** — logs in with Name + Telegram handle, submits daily work + screen recording, views salary chart + personal report history
2. **Admin** — manages salary slab CRUD, monitors all submissions, exports reports, configures Telegram bot

## Implemented Features

### Auth & Authorization
- JWT-based dual auth: admin (username/password, bcrypt) + user (name + telegram, auto-created on first login)
- Seedable admin account from env (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- Protected routes via React `<Protect role="admin|user">`
- Auto-logout on 401 + redirect to correct login page

### User Panel
- Public landing page with feature highlights & 7-step flow
- Worker login (`/login`)
- Dashboard (`/app`) with 3 tabs:
  - **Submit Work** — choose worker type, enter count, upload video → AI verification simulation → instant result
  - **Salary Chart** — live view of admin-controlled slabs (auto-polls every 8s)
  - **My Reports** — personal submission history

### Admin Panel (`/admin`)
- Dashboard — live stats: total reports, today's count, total paid, verified vs mismatch, active slabs, per-worker-type breakdown, recent submissions feed (auto-refreshes every 6s)
- Staff Reports — searchable/filterable table (by name, worker type, status, date), CSV export, **Weekly Excel Report** (.xlsx with Summary + All Reports + Worker Breakdown sheets)
- Salary Charts — full CRUD on slabs: add, edit, enable/disable, delete, reset to defaults
- Simulator — quick salary calculator tool
- Audit Log — every chart change tracked with before/after values + admin name + IST timestamp
- **Telegram Bot** settings page — paste bot token + chat ID, 3 independent toggles, test message, manual daily trigger

### Telegram Bot Integration
- Stored config in `settings` collection (collection key: `telegram`)
- Instant HTML-formatted notification on every report submission (worker name, telegram, type, counts, salary, status, IST time)
- **APScheduler cron**: daily 12:00 PM IST → consolidated salary chart sent to configured chat (last 24h reports, totals, verified vs mismatch, top-25 worker breakdown)
- Manual triggers: `/test`, `/send-daily-now` for admin

### Excel Export
- 7-day weekly report endpoint `/api/reports/export/weekly?days=7`
- 3 sheets: Summary (totals + by-worker-type), All Reports (every submission), Worker Breakdown (per-user rollup)
- Styled headers, IST timestamps, currency formatting

## Database Schema
| Collection | Key Fields |
| --- | --- |
| `admins` | id, username (unique), password_hash (bcrypt), name, created_at |
| `users` | id, name, telegram (unique), created_at, last_login |
| `salary_slabs` | id, worker_type, min, max (null=unlimited), salary, label, enabled, order, timestamps |
| `reports` | id, user_id, name, telegram, worker_type, member_count, ai_count, salary, status, slab_label, video_filename, members_detected[], created_at |
| `audit_logs` | id, admin_id, admin_name, worker_type, action (ADD/EDIT/DELETE/ENABLE/DISABLE/RESET), slab_label, old_value, new_value, created_at |
| `settings` | key (e.g. "telegram"), bot_token, chat_id, enabled, notify_on_report, daily_summary, updated_at, updated_by |

## API Surface
```
POST   /api/auth/admin/login          { username, password } → { token, role, name }
POST   /api/auth/user/login           { name, telegram }     → { token, role, name, telegram }
GET    /api/auth/me                                          → principal

GET    /api/charts                                           → { workerType: [slab] }  (public)
POST   /api/charts/slab               (admin) add slab
PUT    /api/charts/slab/{id}          (admin) edit slab
PATCH  /api/charts/slab/{id}/toggle   (admin) enable/disable
DELETE /api/charts/slab/{id}          (admin)
POST   /api/charts/reset              (admin) reset to defaults

POST   /api/reports                   (user)  submit work → triggers AI + Telegram notify
POST   /api/ai/count                  (user)  mock AI vision endpoint
GET    /api/reports                   (admin) filtered list
GET    /api/reports/me                (user)  own history
GET    /api/reports/{id}              (auth)  single (own or admin)
GET    /api/reports/export/weekly     (admin) .xlsx download

GET    /api/audit                     (admin) audit log (filterable)
GET    /api/dashboard/stats           (admin) live stats

GET    /api/settings/telegram         (admin)
PUT    /api/settings/telegram         (admin)
POST   /api/settings/telegram/test    (admin) send test message
POST   /api/settings/telegram/send-daily-now (admin) trigger summary
```

## Folder Structure
```
/app
├── backend/
│   ├── server.py              FastAPI app, all routes, scheduler
│   ├── telegram_service.py    Telegram Bot API helper + message builders
│   ├── requirements.txt
│   └── .env                   MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_*
├── frontend/
│   ├── src/
│   │   ├── App.js             Router with Protect HOC
│   │   ├── index.js, index.css, App.css
│   │   ├── context/AuthContext.jsx
│   │   ├── lib/api.js         axios instance + helpers + constants
│   │   └── pages/
│   │       ├── Landing.jsx
│   │       ├── user/UserLogin.jsx
│   │       ├── user/UserDashboard.jsx
│   │       ├── admin/AdminLogin.jsx
│   │       └── admin/AdminPanel.jsx   (dashboard, reports, charts, simulator, audit, telegram)
│   ├── package.json
│   └── .env                   REACT_APP_BACKEND_URL
├── memory/
│   ├── PRD.md
│   └── test_credentials.md
└── .env.example
```

## Run Locally
```bash
# Backend
cd backend && pip install -r requirements.txt
# create .env from .env.example
uvicorn server:app --reload --port 8001

# Frontend
cd frontend && yarn install
yarn start  # http://localhost:3000

# MongoDB
# Local: mongod --dbpath ./data
```

## Backlog / Next
- P1: Real AI vision (Gemini 3 Flash or GPT-5.2 vision) for actual member counting from video frames
- P1: Per-worker DM Telegram notifications (in addition to group)
- P2: PDF report export option (alongside Excel)
- P2: Multi-admin support with role hierarchy
- P2: Cloud video storage (Cloudinary) — currently stores only filename
- P3: WebSocket-based live updates (replace 6-8s polling)
- P3: Mobile app wrapper (PWA or React Native)

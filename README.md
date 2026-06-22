# TeamCrazy Hub

AI-powered salary verification & reporting system. Connects a worker (user) panel and an admin panel through a unified FastAPI + MongoDB backend with JWT auth, Telegram bot notifications, and Excel exports.

## Stack
- **Frontend**: React 19 + react-router-dom 7 + axios + craco
- **Backend**: FastAPI + Motor (async MongoDB) + APScheduler + openpyxl + httpx + bcrypt + PyJWT
- **Database**: MongoDB 7.0
- **Notifications**: Telegram Bot API (instant + daily 12 PM IST scheduler)
- **Deploy**: Nginx + PM2 + Let's Encrypt (self-hosted on VPS)

## Folder Structure
```
.
├── backend/                      FastAPI app
│   ├── server.py                 Main app, routes, scheduler
│   ├── telegram_service.py       Telegram Bot API helper
│   ├── requirements.txt
│   └── .env                      (create from .env.example)
├── frontend/                     React app
│   ├── src/
│   │   ├── App.js                Router + Protect HOC
│   │   ├── context/AuthContext.jsx
│   │   ├── lib/api.js            Axios instance, helpers, constants
│   │   └── pages/
│   │       ├── Landing.jsx
│   │       ├── user/UserLogin.jsx
│   │       ├── user/UserDashboard.jsx
│   │       ├── admin/AdminLogin.jsx
│   │       └── admin/AdminPanel.jsx
│   ├── package.json
│   └── .env                      (create from .env.example)
├── deploy/
│   ├── bootstrap.sh              One-shot VPS setup script
│   ├── update.sh                 Pull + rebuild + restart
│   └── nginx.conf                Nginx vhost config
├── ecosystem.config.js           PM2 process config
├── memory/
│   ├── PRD.md                    Product requirements + schema
│   └── test_credentials.md
├── .env.example                  Example env vars
├── DEPLOYMENT.md                 ⭐ Full VPS guide (READ THIS)
└── README.md
```

## Quick Start — Local Dev

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # edit values
uvicorn server:app --reload --port 8001

# Frontend (new terminal)
cd frontend
yarn install
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn start  # http://localhost:3000

# MongoDB
mongod --dbpath ./data  # or use Atlas
```

Default credentials (from `.env.example`): username `admin` / password `admin123` (change in production!)

## Quick Start — VPS Production

```bash
ssh user@your-vps
cd /tmp && git clone YOUR_REPO_URL teamcrazy && cd teamcrazy
bash deploy/bootstrap.sh your-domain.com
```

Full guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## API Surface (high-level)

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/admin/login` | — | Admin JWT |
| POST | `/api/auth/user/login` | — | Worker JWT (auto-creates user) |
| GET | `/api/auth/me` | any | Current principal |
| GET | `/api/charts` | public | Salary slabs (all worker types) |
| POST/PUT/PATCH/DELETE | `/api/charts/slab/*` | admin | Slab CRUD |
| POST | `/api/charts/reset` | admin | Reset to defaults |
| POST | `/api/reports` | user | Submit work (triggers AI + Telegram) |
| GET | `/api/reports` | admin | List with filters |
| GET | `/api/reports/me` | user | Own history |
| GET | `/api/reports/export/weekly` | admin | Excel download |
| GET | `/api/audit` | admin | Audit log |
| GET | `/api/dashboard/stats` | admin | Live dashboard data |
| GET/PUT | `/api/settings/telegram` | admin | Bot config |
| POST | `/api/settings/telegram/test` | admin | Send test message |
| POST | `/api/settings/telegram/send-daily-now` | admin | Manual daily trigger |
| GET | `/api/health` | — | Health check |

## Database Schema

See `memory/PRD.md` for full schema. Collections: `admins`, `users`, `salary_slabs`, `reports`, `audit_logs`, `settings`. All indexes auto-created on startup.

## Default Salary Slabs (seeded on first boot)

| Worker Type | Slab 1 | Slab 2 | Slab 3 | Slab 4 | Slab 5 |
| --- | --- | --- | --- | --- | --- |
| 4 ID Worker | 0–39 = ₹0 | 40–49 = ₹150 | 50–59 = ₹220 | 60–74 = ₹280 | 75+ = ₹350 |
| 5 ID Worker | 0–49 = ₹0 | 50–64 = ₹200 | 65–79 = ₹300 | 80–99 = ₹400 | 100+ = ₹500 |
| 7 ID Worker | 0–59 = ₹0 | 60–79 = ₹250 | 80–99 = ₹380 | 100–124 = ₹500 | 125+ = ₹650 |
| 10 ID Worker | 0–79 = ₹0 | 80–99 = ₹300 | 100–124 = ₹450 | 125–149 = ₹600 | 150+ = ₹800 |

All editable via Admin → Salary Charts.

## License
Proprietary — built for TeamCrazy Hub.

# 🚀 TeamCrazy Hub — VPS Self-Hosting Guide

Complete guide to deploy on your own Ubuntu VPS with Nginx + PM2 + MongoDB + Let's Encrypt SSL.

---

## 📋 Prerequisites

- **VPS**: Ubuntu 22.04 or 24.04 LTS · 1 GB RAM minimum (2 GB recommended) · 20 GB disk
- **Domain**: Pointed to your VPS IP (A record `your-domain.com` → `123.45.67.89`)
- **SSH access** with sudo-capable user (don't run as root)
- **Open ports** on VPS firewall provider: 22, 80, 443

Popular VPS providers: **Hetzner** (€4/mo), **DigitalOcean** ($6/mo), **Vultr**, **Linode**, **AWS Lightsail**, **Contabo**, **OVH**

---

## ⚡ Method 1 — Automated (Recommended, 5 minutes)

### Step 1 — Get the code on your VPS

```bash
ssh user@your-vps-ip
mkdir -p ~/teamcrazy-hub && cd ~/teamcrazy-hub

# Option A: Clone from GitHub (if you've pushed via "Save to GitHub")
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git .

# Option B: Upload from local machine via scp
# (Run this from YOUR LAPTOP, not the VPS)
# scp -r /path/to/local/app/* user@your-vps-ip:~/teamcrazy-hub/
```

### Step 2 — Run the bootstrap script

```bash
bash deploy/bootstrap.sh your-domain.com
```

That's it. The script does **everything**:

1. Installs system packages (curl, build-essential, ufw)
2. Installs Node.js 20 + yarn + PM2
3. Installs MongoDB 7.0 Community
4. Configures UFW firewall (SSH + Nginx Full)
5. Sets up `/var/www/teamcrazy-hub` with proper permissions
6. Creates Python venv + installs backend deps
7. Auto-generates secure `JWT_SECRET` + random admin password into `backend/.env`
8. Installs frontend deps + builds production bundle
9. Starts backend via PM2 with auto-restart on reboot
10. Configures Nginx + obtains free Let's Encrypt SSL cert via Certbot

After completion you'll see your **auto-generated admin password** — note it down.

```bash
# View admin credentials any time
cat /var/www/teamcrazy-hub/backend/.env | grep ADMIN
```

Open `https://your-domain.com` — done.

---

## 🔧 Method 2 — Manual (Step-by-step understanding)

### 1. System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx
```

### 2. Node.js 20 + yarn + PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn pm2
```

### 3. MongoDB 7.0

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# verify
mongosh --eval "db.runCommand({ping:1})"
```

### 4. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 5. Get the code

```bash
sudo mkdir -p /var/www/teamcrazy-hub
sudo chown -R $USER:$USER /var/www/teamcrazy-hub
cd /var/www/teamcrazy-hub

# Clone OR upload via scp/rsync from local machine
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git .
```

### 6. Backend setup

```bash
cd /var/www/teamcrazy-hub/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

Create `backend/.env`:

```bash
JWT=$(python3 -c "import secrets;print(secrets.token_hex(32))")
PWD=$(openssl rand -base64 12)

cat > .env <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=teamcrazy_hub
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
JWT_SECRET=${JWT}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${PWD}
ADMIN_NAME=TeamCrazy Admin
EOF

echo "Your admin password is: ${PWD}"
```

### 7. Frontend build

```bash
cd /var/www/teamcrazy-hub/frontend

cat > .env <<EOF
REACT_APP_BACKEND_URL=https://your-domain.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
EOF

yarn install --frozen-lockfile
yarn build
# Output: /var/www/teamcrazy-hub/frontend/build/
```

### 8. PM2 — keep backend alive

```bash
sudo mkdir -p /var/log/teamcrazy
sudo chown -R $USER:$USER /var/log/teamcrazy

cd /var/www/teamcrazy-hub
pm2 start ecosystem.config.js
pm2 save

# Auto-start on reboot
pm2 startup systemd -u $USER --hp $HOME
# It prints a sudo command — copy & run it

# Verify
pm2 status
pm2 logs teamcrazy-backend --lines 20
```

### 9. Nginx config

```bash
sudo cp /var/www/teamcrazy-hub/deploy/nginx.conf \
        /etc/nginx/sites-available/teamcrazy-hub

# Replace placeholder with your real domain
sudo sed -i 's/your-domain.com/REAL-DOMAIN.com/g' \
        /etc/nginx/sites-available/teamcrazy-hub

sudo ln -sf /etc/nginx/sites-available/teamcrazy-hub \
            /etc/nginx/sites-enabled/teamcrazy-hub
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
```

### 10. SSL cert (Let's Encrypt — free, auto-renewing)

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com \
    --non-interactive --agree-tos --email you@your-domain.com

# Auto-renewal is set up automatically by certbot
sudo systemctl status certbot.timer
```

Done. Visit `https://your-domain.com`.

---

## 🌍 Environment Variables Reference

### `backend/.env`

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `MONGO_URL` | ✅ | `mongodb://localhost:27017` | Local Mongo, OR Atlas URI `mongodb+srv://...` |
| `DB_NAME` | ✅ | `teamcrazy_hub` | Database name |
| `CORS_ORIGINS` | ✅ | `https://your-domain.com,https://www.your-domain.com` | Comma-separated origins |
| `JWT_SECRET` | ✅ | (32-byte hex) | Generate: `python3 -c "import secrets;print(secrets.token_hex(32))"` |
| `ADMIN_USERNAME` | ✅ | `admin` | Login username |
| `ADMIN_PASSWORD` | ✅ | (strong random) | Auto-seeded on first start; can change in .env + restart |
| `ADMIN_NAME` | ✅ | `TeamCrazy Admin` | Display name shown in admin UI |

### `frontend/.env` (used only at **build time**)

| Variable | Required | Example |
| --- | --- | --- |
| `REACT_APP_BACKEND_URL` | ✅ | `https://your-domain.com` (NO trailing slash, NO `/api` suffix) |
| `WDS_SOCKET_PORT` | optional | `443` (dev only — for hot reload) |

> ⚠️ React env vars are baked into the bundle at `yarn build`. If you change them later, **rebuild** the frontend.

---

## 🗄 Database Setup

### Schema (auto-created on first backend boot)

| Collection | Purpose | Key fields |
| --- | --- | --- |
| `admins` | Admin users | `id, username (unique), password_hash (bcrypt), name, created_at` |
| `users` | Worker users | `id, name, telegram (unique), created_at, last_login` |
| `salary_slabs` | Worker-type salary rules | `id, worker_type, min, max (null=unlimited), salary, label, enabled, order` |
| `reports` | Daily work submissions | `id, user_id, name, telegram, worker_type, member_count, ai_count, salary, status, slab_label, video_filename, members_detected[], created_at` |
| `audit_logs` | Admin actions trail | `id, admin_id, admin_name, worker_type, action, slab_label, old_value, new_value, created_at` |
| `settings` | Key-value configs (e.g. Telegram) | `key, bot_token, chat_id, enabled, notify_on_report, daily_summary` |

### Indexes (auto-created on startup)
- `admins.username` (unique)
- `users.telegram` (unique)
- `salary_slabs (worker_type, order)`
- `reports.created_at` (desc), `reports.telegram`
- `audit_logs.created_at` (desc)

### Backups (cron-based daily)

```bash
sudo mkdir -p /var/backups/mongodb
sudo crontab -e
```

Add this line (runs every day at 3 AM, keeps last 14 days):

```cron
0 3 * * * mongodump --db=teamcrazy_hub --out=/var/backups/mongodb/$(date +\%F) && find /var/backups/mongodb/ -maxdepth 1 -type d -mtime +14 -exec rm -rf {} \;
```

Restore example:
```bash
mongorestore --db=teamcrazy_hub /var/backups/mongodb/2026-06-25/teamcrazy_hub
```

### Alternative — MongoDB Atlas (managed, free tier)

If you don't want to manage Mongo on the VPS:

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster (512 MB)
3. Network Access → Add your VPS IP (or `0.0.0.0/0` if dynamic)
4. Database Access → Create user with read/write
5. Copy connection string → put in `backend/.env`:
   ```
   MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=teamcrazy_hub
   ```
6. Restart: `pm2 restart teamcrazy-backend`

---

## 🔁 Daily Operations

### View logs
```bash
pm2 logs teamcrazy-backend --lines 100
pm2 logs teamcrazy-backend --err          # errors only
sudo tail -f /var/log/nginx/teamcrazy-access.log
sudo tail -f /var/log/nginx/teamcrazy-error.log
```

### Restart / reload
```bash
pm2 restart teamcrazy-backend             # backend
pm2 reload teamcrazy-backend              # zero-downtime
sudo systemctl reload nginx               # nginx config reload
sudo systemctl restart mongod             # mongo restart
```

### Status
```bash
pm2 status
sudo systemctl status nginx mongod
df -h && free -h        # disk + memory check
```

### Deploy updates (after pushing changes)
```bash
cd /var/www/teamcrazy-hub
bash deploy/update.sh   # pulls git, rebuilds frontend, restarts backend
```

### Reset admin password
```bash
nano /var/www/teamcrazy-hub/backend/.env   # change ADMIN_PASSWORD
pm2 restart teamcrazy-backend              # password is re-seeded
```

---

## 🛡 Security Hardening

```bash
# 1. Disable root SSH login + password auth (use SSH keys only)
sudo nano /etc/ssh/sshd_config
# Set:
#   PermitRootLogin no
#   PasswordAuthentication no
sudo systemctl restart sshd

# 2. Fail2ban for brute-force protection
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban

# 3. Automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# 4. Bind Mongo to localhost only (default in our setup — verify)
grep "bindIp" /etc/mongod.conf
# Should show: bindIp: 127.0.0.1

# 5. (Optional) Enable Mongo auth
mongosh
> use admin
> db.createUser({user:"root",pwd:"STRONG_PASSWORD",roles:["root"]})
> exit
sudo nano /etc/mongod.conf  # add: security: \n  authorization: enabled
sudo systemctl restart mongod
# Then update MONGO_URL in backend/.env to:
# mongodb://root:STRONG_PASSWORD@localhost:27017/?authSource=admin
```

---

## 🆘 Troubleshooting

| Problem | Fix |
| --- | --- |
| `502 Bad Gateway` from Nginx | Backend not running → `pm2 status` → `pm2 logs teamcrazy-backend` |
| Blank white page | Frontend not built → `cd frontend && yarn build` → check `frontend/build/index.html` exists |
| `Mixed content` error in browser | `REACT_APP_BACKEND_URL` is `http://...` but site is `https://` → fix `.env` + rebuild |
| `CORS error` in browser | `CORS_ORIGINS` in `backend/.env` doesn't include your domain → fix + restart backend |
| `Could not get a peer cert` (Mongo) | Mongo not running → `sudo systemctl restart mongod` |
| Admin login fails | Wrong password → check `cat backend/.env \| grep ADMIN` |
| SSL cert renewal fails | Test: `sudo certbot renew --dry-run` |
| PM2 doesn't start on reboot | Re-run: `pm2 startup systemd -u $USER --hp $HOME` and execute the sudo command it prints |
| Telegram messages not sending | Admin → Telegram Bot → click **🧪 Save & Send Test Message** — check error toast |

---

## 🌐 Free vs Paid Hosting Options Comparison

| Provider | Type | Cost | Pros | Cons |
| --- | --- | --- | --- | --- |
| **Hetzner CX22** | VPS | €4.5/mo | Best value, 4 GB RAM, 40 GB SSD | EU/US only |
| **DigitalOcean Droplet** | VPS | $6/mo | Great UI, marketplace, 1-click backups | Slightly pricier |
| **Vultr Cloud Compute** | VPS | $6/mo | Many regions | — |
| **Contabo VPS S** | VPS | €5/mo | Cheap, lots of RAM | Slower IO |
| **AWS Lightsail** | VPS | $5/mo | AWS ecosystem | Bandwidth limits |
| **Oracle Cloud Free Tier** | VPS | Free | 4 OCPU ARM, 24 GB RAM forever free | Account approval can take time |
| **Railway** | PaaS | $5/mo | No server mgmt | Less control |
| **Render** | PaaS | Free → $7/mo | Easy, free tier sleeps after 15 min | Cold starts on free |
| **Vercel** (frontend only) | PaaS | Free | Fast CDN | Need separate backend (e.g. Railway) |
| **MongoDB Atlas M0** | DB only | Free | 512 MB free forever | Combine with VPS for compute |

### Recommended budget setup (~$0–6/month)
- **Oracle Cloud Free Tier ARM VPS** (forever free, 4 cores / 24 GB RAM)
- **MongoDB Atlas M0** (free 512 MB)
- **Cloudflare DNS** (free, also gives CDN + DDoS protection)
- **Let's Encrypt SSL** (free)

### Recommended split setup
- Frontend → **Vercel** (free, global CDN)
- Backend → **Render** Web Service ($7/mo, persistent)
- Database → **MongoDB Atlas M0** (free)

In split mode, update `frontend/.env`:
```
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```
And set `CORS_ORIGINS` on backend to the Vercel URL.

---

## ✅ Deployment Checklist

Print this and tick as you go:

- [ ] VPS provisioned (Ubuntu 22.04/24.04)
- [ ] Domain A record points to VPS IP
- [ ] DNS propagated (check `dig your-domain.com`)
- [ ] SSH access confirmed
- [ ] `bash deploy/bootstrap.sh your-domain.com` completed without errors
- [ ] `pm2 status` shows `teamcrazy-backend` online
- [ ] `curl https://your-domain.com/api/health` returns `{"status":"ok"}`
- [ ] `https://your-domain.com/` loads the landing page
- [ ] Admin login works (`/admin/login` with creds from `backend/.env`)
- [ ] User login works (any name + @telegram)
- [ ] Submit a test report → appears in admin Reports
- [ ] Add/edit/delete a salary slab → reflects in user panel within 8 seconds
- [ ] Export CSV + Excel from admin Reports works
- [ ] (Optional) Telegram bot connected → test message received
- [ ] SSL valid (`https://` shows lock icon, no warnings)
- [ ] SSL auto-renewal scheduled (`sudo systemctl status certbot.timer`)
- [ ] MongoDB daily backup cron added
- [ ] Server timezone correct (`timedatectl` shows IST or UTC as expected)
- [ ] PM2 startup-on-reboot configured (`pm2 startup` executed)
- [ ] UFW firewall enabled with only 22/80/443 allowed

---

## 🧪 Smoke Test Commands

After deployment, run these from your VPS or laptop to validate:

```bash
# 1. Backend health
curl -s https://your-domain.com/api/health
# Expected: {"status":"ok","time":"..."}

# 2. Admin login
curl -s -X POST https://your-domain.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}'
# Expected: { "token": "...", "role": "admin", ... }

# 3. Get salary charts (public)
curl -s https://your-domain.com/api/charts | python3 -m json.tool

# 4. User login (creates user automatically)
curl -s -X POST https://your-domain.com/api/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","telegram":"@test_user"}'

# 5. SSL cert validity
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

If all 5 commands succeed, your deployment is rock solid. 🎉

---

## 🆔 Domain & SSL Quick Reference

### Buy domain
- **Namecheap** (~$10/yr) · **Cloudflare** (~$8.5/yr, no markup) · **Porkbun** (~$9/yr) · **Hostinger** (~$10/yr)

### Point domain to VPS
1. Go to your domain registrar's DNS panel
2. Add two A records:
   - `@`   → `YOUR.VPS.IP.HERE`  (root domain)
   - `www` → `YOUR.VPS.IP.HERE`  (www subdomain)
3. Wait 5–30 min for propagation (check: `dig your-domain.com`)

### Free SSL (already handled by bootstrap.sh)
- Let's Encrypt cert via Certbot
- Auto-renews every 60 days via `systemd` timer
- Manual renewal: `sudo certbot renew`

---

**Built with ❤️ for self-hosting freedom.** Questions? Check `pm2 logs` first, then read this doc again — 95% of issues are documented above.

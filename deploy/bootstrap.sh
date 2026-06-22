#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# TeamCrazy Hub — One-shot VPS bootstrap script
# Tested on: Ubuntu 22.04 / 24.04 LTS (fresh VPS)
# Run as a sudo-capable user (NOT root): bash bootstrap.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:-your-domain.com}"
APP_DIR="/var/www/teamcrazy-hub"
APP_USER="$USER"
NODE_VERSION="20"

echo "▶ Domain         : $DOMAIN"
echo "▶ App dir        : $APP_DIR"
echo "▶ Running as user: $APP_USER"
echo

# ── 1. System update + base packages ─────────────────────────
echo "═══ 1/9 Installing system packages..."
sudo apt update
sudo apt install -y curl wget git build-essential ufw \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx \
    gnupg ca-certificates lsb-release

# ── 2. Node.js 20 + yarn ─────────────────────────────────────
echo "═══ 2/9 Installing Node.js $NODE_VERSION + yarn..."
if ! command -v node >/dev/null || [[ "$(node -v)" != v$NODE_VERSION* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
fi
sudo npm install -g yarn pm2

# ── 3. MongoDB 7.0 (Community Edition) ───────────────────────
echo "═══ 3/9 Installing MongoDB 7.0..."
if ! command -v mongod >/dev/null; then
    UBUNTU_CODENAME=$(lsb_release -cs)
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $UBUNTU_CODENAME/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update
    sudo apt install -y mongodb-org
fi
sudo systemctl enable mongod
sudo systemctl start mongod

# ── 4. Firewall ──────────────────────────────────────────────
echo "═══ 4/9 Configuring UFW firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# ── 5. App directory + clone/copy code ───────────────────────
echo "═══ 5/9 Setting up app directory at $APP_DIR..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
sudo mkdir -p /var/log/teamcrazy
sudo chown -R "$APP_USER":"$APP_USER" /var/log/teamcrazy

# Copy current repo to app dir if running from inside repo
if [ -d "./backend" ] && [ -d "./frontend" ]; then
    echo "  Copying source files..."
    rsync -a --exclude node_modules --exclude __pycache__ --exclude build \
        --exclude .git --exclude venv ./ "$APP_DIR/"
fi

# ── 6. Backend setup ─────────────────────────────────────────
echo "═══ 6/9 Setting up backend (Python venv + deps)..."
cd "$APP_DIR/backend"
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

if [ ! -f .env ]; then
    JWT=$(python3 -c "import secrets;print(secrets.token_hex(32))")
    cat > .env <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=teamcrazy_hub
CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
JWT_SECRET=${JWT}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -base64 12)
ADMIN_NAME=TeamCrazy Admin
EOF
    echo "  ✔ Created backend/.env (admin password auto-generated — view with: cat backend/.env)"
fi

# ── 7. Frontend setup + build ────────────────────────────────
echo "═══ 7/9 Setting up frontend (yarn install + build)..."
cd "$APP_DIR/frontend"
if [ ! -f .env ]; then
    cat > .env <<EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
EOF
fi
yarn install --frozen-lockfile
yarn build

# ── 8. PM2 (backend daemon) ──────────────────────────────────
echo "═══ 8/9 Starting backend via PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u "$APP_USER" --hp "$HOME" | tail -n 1 | sudo bash || true

# ── 9. Nginx + SSL ───────────────────────────────────────────
echo "═══ 9/9 Configuring Nginx + SSL..."
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/teamcrazy-hub
sudo sed -i "s/your-domain.com/${DOMAIN}/g" /etc/nginx/sites-available/teamcrazy-hub
sudo ln -sf /etc/nginx/sites-available/teamcrazy-hub /etc/nginx/sites-enabled/teamcrazy-hub
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/certbot

# First-time: temporarily disable SSL block and use HTTP for ACME challenge
sudo tee /etc/nginx/sites-available/teamcrazy-temp > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root /var/www/certbot;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "OK"; }
}
EOF
sudo ln -sf /etc/nginx/sites-available/teamcrazy-temp /etc/nginx/sites-enabled/teamcrazy-temp
sudo rm -f /etc/nginx/sites-enabled/teamcrazy-hub
sudo nginx -t && sudo systemctl reload nginx

echo
echo "─────────────────────────────────────────────────────"
echo "▶ Requesting SSL cert (Let's Encrypt)..."
sudo certbot certonly --webroot -w /var/www/certbot \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos --email "admin@${DOMAIN}" || \
    echo "⚠ Certbot failed — re-run manually: sudo certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN}"

# Swap back to real config
sudo rm -f /etc/nginx/sites-enabled/teamcrazy-temp
sudo ln -sf /etc/nginx/sites-available/teamcrazy-hub /etc/nginx/sites-enabled/teamcrazy-hub
sudo nginx -t && sudo systemctl reload nginx

echo
echo "═════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE"
echo "═════════════════════════════════════════════════════"
echo
echo "▶ Site:      https://${DOMAIN}"
echo "▶ Admin:     https://${DOMAIN}/admin/login"
echo "▶ Logs:      pm2 logs teamcrazy-backend"
echo "▶ Restart:   pm2 restart teamcrazy-backend"
echo "▶ Nginx:     sudo systemctl reload nginx"
echo
echo "▶ Admin credentials saved in: $APP_DIR/backend/.env"
echo "  (cat $APP_DIR/backend/.env | grep ADMIN)"
echo

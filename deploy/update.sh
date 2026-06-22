#!/usr/bin/env bash
# Update script — pulls latest code, rebuilds frontend, restarts backend
# Usage: bash deploy/update.sh
set -euo pipefail

APP_DIR="/var/www/teamcrazy-hub"
cd "$APP_DIR"

echo "▶ Pulling latest code..."
git pull origin main || echo "⚠ git pull skipped (manual upload?)"

echo "▶ Backend: updating deps..."
cd "$APP_DIR/backend"
./venv/bin/pip install -r requirements.txt --upgrade

echo "▶ Frontend: installing deps + rebuilding..."
cd "$APP_DIR/frontend"
yarn install --frozen-lockfile
yarn build

echo "▶ Restarting backend (PM2)..."
pm2 restart teamcrazy-backend

echo "▶ Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Update complete"
pm2 status

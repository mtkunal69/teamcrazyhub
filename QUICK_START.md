# 🚀 QUICK START — VPS Deploy in 3 Commands

After buying a VPS (Ubuntu 22.04 or 24.04) and pointing your domain to its IP:

## On your LOCAL machine (one-time, to upload code to VPS):

```bash
# Replace USER@VPS_IP with your real VPS SSH credentials
scp teamcrazy-hub-production.tar.gz USER@VPS_IP:~/
ssh USER@VPS_IP
```

## On the VPS:

```bash
# 1. Extract
mkdir -p ~/teamcrazy && tar -xzf teamcrazy-hub-production.tar.gz -C ~/teamcrazy && cd ~/teamcrazy

# 2. Bootstrap (auto-installs everything + SSL)
#    Replace your-domain.com with your REAL domain
bash deploy/bootstrap.sh your-domain.com
```

That's it. Watch the output — at the end you'll see:
- Your auto-generated **admin password** (also saved in `/var/www/teamcrazy-hub/backend/.env`)
- URL to login: `https://your-domain.com/admin/login`

## Verify it works:

```bash
curl https://your-domain.com/api/health
# Should print: {"status":"ok","time":"..."}
```

Then open `https://your-domain.com` in your browser.

---

## Common post-deploy commands

```bash
# View backend logs
pm2 logs teamcrazy-backend

# View admin credentials
cat /var/www/teamcrazy-hub/backend/.env | grep ADMIN

# Restart backend
pm2 restart teamcrazy-backend

# Reload Nginx
sudo systemctl reload nginx

# After code changes (rebuilds + restarts everything)
cd /var/www/teamcrazy-hub && bash deploy/update.sh
```

## If something breaks

Read **DEPLOYMENT.md** — section "Troubleshooting" covers every common issue with the exact fix.

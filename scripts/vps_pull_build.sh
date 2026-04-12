#!/usr/bin/env bash
# Run on VPS: bash scripts/vps_pull_build.sh
# Or from your PC: Get-Content scripts/vps_pull_build.sh -Raw | ssh root@72.62.91.240 bash
set -euo pipefail

REPO="${STREAMCAST_ROOT:-/root/streamcast}"
cd "$REPO"

echo "==> git pull"
git pull origin master

if [[ -f "$REPO/nginx_production_hls.conf" ]]; then
  echo "==> nginx site"
  cp "$REPO/nginx_production_hls.conf" /etc/nginx/sites-available/default
  nginx -t
  systemctl reload nginx
fi

echo "==> Go API"
cd "$REPO/backend"
go build -o main cmd/api/main.go
pkill -f '/root/streamcast/backend/main' 2>/dev/null || true
nohup ./main > app.log 2>&1 &
sleep 1

echo "==> Frontend"
cd "$REPO/frontend"
npm install
npm run build
rm -rf /var/www/frontend_static
mkdir -p /var/www/frontend_static
cp -r .next/static/* /var/www/frontend_static/
chown -R www-data:www-data /var/www/frontend_static

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart streamcast-frontend 2>/dev/null || pm2 restart all 2>/dev/null || true
fi

echo "==> Sports engine (port 8001)"
cd "$REPO/services/sports_engine"
python3 -m pip install -q -r requirements.txt 2>/dev/null || pip3 install -q -r requirements.txt
pkill -f 'uvicorn main:app' 2>/dev/null || true
pkill -f 'uvicorn.*8001' 2>/dev/null || true
sleep 1
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 >> sports_engine.log 2>&1 &
sleep 1
curl -sf "http://127.0.0.1:8001/" >/dev/null && echo "Sports engine: OK" || echo "Sports engine: check sports_engine.log"

echo "==> Done"

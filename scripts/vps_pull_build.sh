#!/usr/bin/env bash
# Run on VPS: bash scripts/vps_pull_build.sh
# Or from your PC: Get-Content scripts/vps_pull_build.sh -Raw | ssh root@72.62.91.240 bash
set -euo pipefail

REPO="${STREAMCAST_ROOT:-/opt/streamcast}"
SITE="/etc/nginx/sites-available/sportevent.online"
cd "$REPO"

echo "==> git pull"
git pull origin master

if [[ -f "$REPO/deploy/nginx/sportevent.online.conf" ]]; then
  echo "==> nginx isolated site"
  cp "$REPO/deploy/nginx/sportevent.online.conf" "$SITE"
  ln -sfn "$SITE" /etc/nginx/sites-enabled/sportevent.online
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
fi

echo "==> Go API"
cd "$REPO/backend"
chmod +x start.sh
go build -o main cmd/api/main.go
if command -v pm2 >/dev/null 2>&1 && pm2 describe streamcast-backend >/dev/null 2>&1; then
  pm2 restart streamcast-backend
else
  pkill -f '/opt/streamcast/backend/main' 2>/dev/null || true
  nohup ./start.sh > app.log 2>&1 &
fi
sleep 1

echo "==> Frontend"
cd "$REPO/frontend"
npm install
npm run build
if command -v pm2 >/dev/null 2>&1 && pm2 describe streamcast-frontend >/dev/null 2>&1; then
  pm2 restart streamcast-frontend
fi

echo "==> Sports engine (port 8001)"
cd "$REPO/services/sports_engine"
if [[ -x venv/bin/pip ]]; then
  venv/bin/pip install -q -r requirements.txt
else
  python3 -m venv venv
  venv/bin/pip install -q -r requirements.txt
fi
if command -v pm2 >/dev/null 2>&1 && pm2 describe streamcast-sports-engine >/dev/null 2>&1; then
  pm2 restart streamcast-sports-engine
else
  pkill -f 'uvicorn main:app' 2>/dev/null || true
  nohup ./venv/bin/python main.py >> sports_engine.log 2>&1 &
fi
sleep 2
curl -sf "http://127.0.0.1:8001/" >/dev/null && echo "Sports engine: OK" || echo "Sports engine: check sports_engine.log"

echo "==> Done"

#!/usr/bin/env bash
set -euo pipefail
REPO=/opt/streamcast

echo "==> backend go build"
cd "$REPO/backend"
go build -o main cmd/api/main.go

echo "==> sports engine venv"
cd "$REPO/services/sports_engine"
python3 -m venv venv
./venv/bin/pip install -q -U pip
./venv/bin/pip install -q -r requirements.txt

echo "==> frontend npm"
cd "$REPO/frontend"
npm install
npm run build

echo "==> pm2"
npm install -g pm2
cd "$REPO"
pm2 delete all >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 50M || true
pm2 set pm2-logrotate:retain 5 || true
pm2 set pm2-logrotate:compress true || true
pm2 status

echo BUILD_OK

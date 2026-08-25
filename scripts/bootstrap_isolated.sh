#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
REPO=/opt/streamcast

mkdir -p /dev/shm/hls "$REPO/backend/uploads"
chmod 755 /dev/shm/hls

# --- Postgres (dedicated DB/user, not the default cluster apps) ---
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'streamcast') THEN
    CREATE ROLE streamcast LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE streamcast WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE streamcast OWNER streamcast'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'streamcast')\gexec
GRANT ALL PRIVILEGES ON DATABASE streamcast TO streamcast;
SQL

sudo -u postgres psql -d streamcast -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO streamcast; ALTER SCHEMA public OWNER TO streamcast;"

echo "DATABASE_URL='host=127.0.0.1 user=streamcast password=${DB_PASS} dbname=streamcast port=5432 sslmode=disable'" > "$REPO/backend/.env"
chmod 600 "$REPO/backend/.env"

echo "==> restoring database"
sudo -u postgres pg_restore -d streamcast --no-owner --no-acl --role=streamcast /tmp/streamcast.dump || \
  sudo -u postgres pg_restore -d streamcast --no-owner --no-acl /tmp/streamcast.dump || true
sudo -u postgres psql -d streamcast -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO streamcast; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO streamcast; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO streamcast;"

# --- App env files ---
cp -a /tmp/sports_engine.env.local "$REPO/services/sports_engine/.env.local"
chmod 600 "$REPO/services/sports_engine/.env.local"
cat > "$REPO/frontend/.env.local" <<EOF
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_RTMP_URL=rtmp://sportevent.online:1935/live
NEXT_PUBLIC_SITE_URL=https://sportevent.online
EOF

chmod +x "$REPO/backend/start.sh"

# --- Isolated nginx vhost (leave nginx.conf for other sites) ---
SITE=/etc/nginx/sites-available/sportevent.online
cp "$REPO/deploy/nginx/sportevent.online.conf" "$SITE"
ln -sfn "$SITE" /etc/nginx/sites-enabled/sportevent.online
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo BOOTSTRAP_OK

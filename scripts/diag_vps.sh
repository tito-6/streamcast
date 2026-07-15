#!/bin/bash
echo '=== PM2 DUMP PROCESSES ==='
python3 - <<'EOF'
import json
d = json.load(open('/root/.pm2/dump.pm2'))
for p in d:
    print(p.get('name'), '|', p.get('pm_exec_path'), '|', p.get('pm_cwd'), '|', p.get('args') or '')
EOF
echo '=== LISTENING PORTS ==='
ss -tlnp | grep -E '3000|8080|8001' || echo 'NONE of 3000/8080/8001 listening'
echo '=== PM2 STARTUP UNITS ==='
systemctl list-unit-files | grep -i pm2 || echo 'no pm2 systemd unit'
echo '=== NGINX ERROR LOG (last 15) ==='
tail -n 15 /var/log/nginx/error.log
echo '=== POSTGRES STATUS ==='
systemctl is-active postgresql || true

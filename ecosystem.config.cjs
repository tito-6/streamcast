module.exports = {
  apps: [
    {
      name: 'streamcast-sports-engine',
      cwd: '/opt/streamcast/services/sports_engine',
      script: '/opt/streamcast/services/sports_engine/venv/bin/python',
      args: 'main.py',
      interpreter: 'none',
      autorestart: true,
      max_memory_restart: '512M',
    },
    {
      name: 'streamcast-backend',
      cwd: '/opt/streamcast/backend',
      script: '/opt/streamcast/backend/start.sh',
      interpreter: 'bash',
      autorestart: true,
      max_memory_restart: '512M',
    },
    {
      name: 'streamcast-frontend',
      cwd: '/opt/streamcast/frontend',
      script: 'npm',
      args: 'start',
      interpreter: 'node',
      autorestart: true,
      max_memory_restart: '512M',
    },
  ],
};

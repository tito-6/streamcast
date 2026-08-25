module.exports = {
  apps: [
    {
      name: 'streamcast-sports-engine',
      cwd: '/opt/streamcast/services/sports_engine',
      script: '/usr/bin/bash',
      args: '-c ./venv/bin/python main.py',
      autorestart: true,
      max_memory_restart: '512M',
    },
    {
      name: 'streamcast-backend',
      cwd: '/opt/streamcast/backend',
      script: './start.sh',
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

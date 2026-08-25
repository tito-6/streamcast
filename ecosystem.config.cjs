module.exports = {
  apps: [
    {
      name: 'sports-engine',
      cwd: '/root/streamcast/services/sports_engine',
      script: '/usr/bin/bash',
      args: '-c ./venv/bin/python main.py',
      autorestart: true,
    },
    {
      name: 'streamcast-backend',
      cwd: '/root/streamcast/backend',
      script: './main',
      autorestart: true,
    },
    {
      name: 'streamcast-frontend',
      cwd: '/root/streamcast/frontend',
      script: 'npm',
      args: 'start',
      interpreter: 'node',
      autorestart: true,
    },
  ],
};

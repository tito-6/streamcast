#!/bin/bash
cd /root/streamcast/frontend
npm run build
pkill -f "next-server" || true
pkill -f "npm start" || true
nohup npm start > frontend.log 2>&1 &
echo "Deployment finished and server started."

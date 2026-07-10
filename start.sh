#!/bin/bash
# ClipAI Start Script — Production Mode

# Start services
sudo service postgresql start
sudo service redis-server start

# Start Python backend
cd /home/je3393/clipai/python-backend
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /home/je3393/clipai/backend.log 2>&1 &
echo "[$(date)] Python backend started (PID: $!)"

# Start Next.js PRODUCTION
cd /home/je3393/clipai
NODE_ENV=production nohup npm run start -- --port 3000 > /home/je3393/clipai/nextjs.log 2>&1 &
echo "[$(date)] Next.js production started (PID: $!)"

echo "✅ ClipAI started in PRODUCTION mode"
echo "   Frontend : http://localhost:3000"
echo "   Backend  : http://localhost:8000"

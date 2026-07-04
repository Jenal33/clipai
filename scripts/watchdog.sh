#!/bin/bash
# ClipAI Watchdog — restart services kalo mati
# Jalan tiap 5 menit via cron

cd /home/je3393/clipai

# ── Helper function ──
start_nextjs() {
  echo "[$(date)] Starting Next.js..."
  cd /home/je3393/clipai
  nohup npx next dev -p 3000 > /tmp/nextjs.log 2>&1 &
  sleep 3
}

start_python() {
  echo "[$(date)] Starting Python backend..."
  cd /home/je3393/clipai/python-backend
  nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/python.log 2>&1 &
  sleep 2
}

start_tunnel() {
  echo "[$(date)] Starting Cloudflared tunnel..."
  nohup cloudflared tunnel --url http://localhost:3000 > /tmp/tunnel.log 2>&1 &
  sleep 5
}

# ── 1. Cek Next.js ──
if ! curl -s -o /dev/null -w "" http://localhost:3000 2>/dev/null; then
  start_nextjs
fi

# ── 2. Cek Python ──
if ! curl -s -o /dev/null -w "" http://localhost:8000/health 2>/dev/null; then
  start_python
fi

# ── 3. Cek Tunnel ──
# Cek apakah ada proses cloudflared yang masih hidup
if ! pgrep -f "cloudflared tunnel" > /dev/null; then
  start_tunnel
fi

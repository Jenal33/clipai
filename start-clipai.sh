#!/usr/bin/bash
# ===========================================
# ClipAI Startup Script
# Jalanin semua service ClipAI sekaligus
# ===========================================
DIR="/home/je3393/clipai"
LOG_DIR="/home/je3393/logs"
mkdir -p "$LOG_DIR"

echo "==========================================="
echo "[$(date)] ClipAI Starting..."
echo "==========================================="

# 1. Pastiin port 3000 gak kepake
kill $(lsof -ti:3000 2>/dev/null) 2>/dev/null

# 2. Python backend (sudah jalan? cek dulu)
if lsof -Pi:8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Python backend (uvicorn) sudah jalan di port 8000"
else
    echo "▶️  Memulai Python backend (uvicorn) di port 8000..."
    cd "$DIR/python-backend"
    PATH="$HOME/.local/bin:$PATH" python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 >> "$LOG_DIR/python.log" 2>&1 &
    sleep 2
    echo "✅ Python backend started (PID: $(lsof -ti:8000))"
fi

# 3. Next.js frontend
echo "▶️  Memulai Next.js di port 3000..."
cd "$DIR"
PATH="$HOME/.local/bin:$PATH" npm run dev >> "$LOG_DIR/nextjs.log" 2>&1 &
sleep 3
echo "✅ Next.js started (PID: $(lsof -ti:3000))"

# 4. Cloudflare Tunnel
echo "▶️  Memulai Cloudflare Tunnel..."
rm -f "$DIR/tunnel_url.txt"
cloudflared tunnel --url http://localhost:3000 --no-autoupdate >> "$DIR/tunnel.log" 2>&1 &
sleep 15

# 5. Ambil URL tunnel
TUNNEL_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$DIR/tunnel.log" | head -1)
echo "$TUNNEL_URL" > "$DIR/tunnel_url.txt"

echo ""
echo "==========================================="
echo "✅ CLIPAI READY!"
echo "   Frontend : $TUNNEL_URL"
echo "   Backend  : http://localhost:8000"
echo "==========================================="
echo ""
echo "Cek dari HP / Termux:"
echo "  curl $TUNNEL_URL              # Frontend"
echo "  curl $TUNNEL_URL/api/health   # Backend (via Next.js)"

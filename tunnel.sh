#!/bin/bash
# ClipAI Tunnel Auto-Restart Script
# Menggunakan cloudflared tunnel ke localhost:3000
# Auto-restart jika tunnel mati

TUNNEL_LOG="/home/je3393/clipai/tunnel.log"
URL_FILE="/home/je3393/clipai/tunnel_url.txt"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

echo "===========================================" >> "$TUNNEL_LOG"
echo "[$(date)] ClipAI Tunnel dimulai..." >> "$TUNNEL_LOG"
echo "===========================================" >> "$TUNNEL_LOG"

while true; do
    echo "[$(date)] Memulai cloudflared tunnel..." >> "$TUNNEL_LOG"
    
    # Jalankan cloudflared, tangkap URL dari output
    cloudflared tunnel --url http://localhost:3000 --no-autoupdate 2>&1 | \
    while IFS= read -r line; do
        echo "$line" >> "$TUNNEL_LOG"
        # Deteksi URL tunnel
        if [[ "$line" =~ https://[a-z0-9-]+\.trycloudflare\.com ]]; then
            TUNNEL_URL="${BASH_REMATCH[0]}"
            echo "$TUNNEL_URL" > "$URL_FILE"
            echo "[$(date)] ✓ TUNNEL URL: $TUNNEL_URL" >> "$TUNNEL_LOG"
            echo "[$(date)] ✓ URL disimpan di $URL_FILE" >> "$TUNNEL_LOG"
        fi
    done
    
    EXIT_CODE=$?
    echo "[$(date)] ✗ Tunnel mati (exit code: $EXIT_CODE). Restart dalam 3 detik..." >> "$TUNNEL_LOG"
    sleep 3
done

#!/bin/bash
# ClipAI Tunnel — proper tunnel ke clipai.toolje.my.id
# Auto-restart jika tunnel mati

TUNNEL_LOG="/home/je3393/clipai/tunnel.log"
TUNNEL_ID="ada97804-5fbb-4941-acda-8315bd87cdce"
CREDS_FILE="$HOME/.cloudflared/${TUNNEL_ID}.json"

echo "===========================================" >> "$TUNNEL_LOG"
echo "[$(date)] ClipAI Tunnel dimulai..." >> "$TUNNEL_LOG"
echo "===========================================" >> "$TUNNEL_LOG"

while true; do
    echo "[$(date)] Memulai cloudflared tunnel ke clipai.toolje.my.id..." >> "$TUNNEL_LOG"

    cloudflared tunnel run \
      --credentials-file "$CREDS_FILE" \
      --url http://localhost:3000 \
      "$TUNNEL_ID" 2>&1 | while IFS= read -r line; do
        echo "$line" >> "$TUNNEL_LOG"
    done

    EXIT_CODE=${PIPESTATUS[0]}
    echo "[$(date)] ✗ Tunnel mati (exit code: $EXIT_CODE). Restart dalam 3 detik..." >> "$TUNNEL_LOG"
    sleep 3
done

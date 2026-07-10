#!/bin/bash
# Monitor Midtrans webhook callback & DB changes
# Runs in background, outputs structured JSON lines

NEXT_PID=23779
LOG_FILE=/tmp/midtrans_monitor.log

echo "[$(date '+%H:%M:%S')] MONITOR STARTED — watching for Midtrans callback..." | tee -a "$LOG_FILE"

# Start tcpdump in background watching for POST to webhook
sudo tcpdump -i lo -A -c 1 "tcp port 3000 and (tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x504f5354)" 2>/dev/null | while read line; do
  if echo "$line" | grep -qi "payments/webhook"; then
    echo "[$(date '+%H:%M:%S')] 📡 WEBHOOK REQUEST DETECTED!" | tee -a "$LOG_FILE"
    echo "$line" | tee -a "$LOG_FILE"
  fi
done &

TCPDUMP_PID=$!

# Poll the DB every 2 seconds
LAST_CHECK=$(date +%s)
while true; do
  sleep 2
  NOW=$(date '+%H:%M:%S')
  
  # Get latest payment that's not FAILED or UNKNOWN
  PAYMENT_INFO=$(psql -U postgres -d clipai -t -A -c "
    SELECT p.id, p.status, p.\"snapToken\", p.amount, p.\"tokenAmount\", p.\"userId\", u.\"tokenBalance\", u.plan, u.name
    FROM \"Payment\" p
    JOIN \"User\" u ON u.id = p.\"userId\"
    WHERE p.status != 'PENDING'
    ORDER BY p.\"updatedAt\" DESC
    LIMIT 1;
  " 2>/dev/null)
  
  if [ -n "$PAYMENT_INFO" ]; then
    echo "[$NOW] 💰 DB UPDATE: $PAYMENT_INFO" | tee -a "$LOG_FILE"
    
    # Try to tail Next.js logs from pts
    # The pts might be readable
    break
  fi
  
  # Show heartbeat
  echo "[$NOW] ⏳ Menunggu callback..." | tee -a "$LOG_FILE"
done 2>&1 | head -50

echo "=== MONITOR LOG ==="
cat "$LOG_FILE"

#!/bin/bash
# Midtrans payment watchdog — tracks payment status changes
# Runs via no_agent cron. Only outputs on changes (quiet when no change)

PGPASS=$(cat /home/je3393/.hermes/scripts/.pgpass 2>/dev/null)
[ -z "$PGPASS" ] && { echo "[watchdog] No pgpass found"; exit 1; }

DB_QUERY="SELECT p.id, p.status, p.amount, p.\"tokenAmount\", u.\"tokenBalance\", u.plan FROM \"Payment\" p JOIN \"User\" u ON u.id = p.\"userId\" WHERE p.status != 'PENDING' ORDER BY p.\"createdAt\" DESC LIMIT 3;"
PREV_FILE=/tmp/watchdog_prev.txt
CUR_FILE=/tmp/watchdog_cur.txt

# Get current state
PGPASSWORD="$PGPASS" psql -h localhost -U postgres -d clipai -t -A -c "$DB_QUERY" 2>/dev/null > "$CUR_FILE"
CUR_CONTENT=$(cat "$CUR_FILE" 2>/dev/null)

# First run — init
if [ ! -f "$PREV_FILE" ]; then
    cp "$CUR_FILE" "$PREV_FILE"
    exit 0
fi

# Compare
PREV_CONTENT=$(cat "$PREV_FILE" 2>/dev/null)
if [ "$CUR_CONTENT" != "$PREV_CONTENT" ] && [ -n "$CUR_CONTENT" ]; then
    echo "🚨 PAYMENT STATUS CHANGE DETECTED!"
    echo "$CUR_CONTENT"
    cp "$CUR_FILE" "$PREV_FILE"
fi
# No change = silent (no_agent watchdog pattern)

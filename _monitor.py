#!/usr/bin/env python3
"""
Midtrans Webhook Monitor — polls DB every 2s for payment status changes
and tails Next.js logs via /proc filesystem.
"""
import subprocess, time, sys, os, json
from datetime import datetime

DB_QUERY = 'SELECT p.id, p.status, p."snapToken", p.amount, p."tokenAmount", p."userId", u."tokenBalance", u.plan, u.name, p."createdAt" FROM "Payment" p JOIN "User" u ON u.id = p."userId" WHERE p.status != \'PENDING\' ORDER BY p."createdAt" DESC LIMIT 5'

def run_psql(query):
    env = os.environ.copy()
    env['PGPASSWORD'] = PGPASS
    r = subprocess.run(
        ['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'clipai', '-t', '-A', '-c', query],
        capture_output=True, text=True, env=env, timeout=5
    )
    return r.stdout.strip()

def get_ts(): return datetime.now().strftime('%H:%M:%S')

def watch_next_logs(pid=23779):
    """Try to read from Next.js process stdout"""
    try:
        fd_path = f'/proc/{pid}/fd/1'
        if os.path.exists(fd_path):
            target = os.readlink(fd_path)
            # Try reading from the pts
            with open(target, 'r') as f:
                # Non-blocking
                import fcntl
                flag = fcntl.fcntl(f.fileno(), fcntl.F_GETFL)
                fcntl.fcntl(f.fileno(), fcntl.F_SETFL, flag | os.O_NONBLOCK)
                data = f.read()
                if data:
                    lines = data.strip().split('\n')
                    for l in lines[-5:]:
                        if 'payments/webhook' in l.lower() or 'POST' in l:
                            print(f"[{get_ts()}] 📡 LOG: {l.strip()}")
                    return True
    except: pass
    return False

# Extract DB password
with open('/home/je3393/clipai/.env.local') as f:
    for line in f:
        if 'DATABASE_URL' in line:
            url = line.split('=', 1)[1].strip()
            pwd_start = url.find('://') + 3
            pwd_start = url.find(':', pwd_start) + 1
            pwd_end = url.find('@', pwd_start)
            PGPASS = url[pwd_start:pwd_end]
            break

print(f"[{get_ts()}] 🟢 MONITOR STARTED — polling DB every 2s")
print(f"[{get_ts()}] 👀 Watching for POST to https://clipai.toolje.my.id/api/payments/webhook")
print(f"[{get_ts()}] {'─'*50}")
sys.stdout.flush()

known_payments = set()
poll_count = 0

while True:
    time.sleep(2)
    poll_count += 1
    
    # Check DB for any new non-PENDING payments
    try:
        result = run_psql(DB_QUERY)
        if result:
            for line in result.split('\n'):
                if line.strip():
                    parts = line.split('|')
                    if len(parts) >= 10:
                        pid, status, snap, amt, tokens, uid, balance, plan, name, created = parts
                        if pid not in known_payments:
                            known_payments.add(pid)
                            print(f"\n[{get_ts()}] 🚨 PAYMENT STATUS CHANGE!")
                            print(f"    ID:     {pid}")
                            print(f"    Status: {status}")
                            print(f"    Amount: Rp {int(amt):,}")
                            print(f"    Tokens: {tokens}")
                            print(f"    User:   {name} ({uid[:8]}...)")
                            print(f"    Token Balance: {balance}")
                            print(f"    Plan:   {plan}")
                            print(f"{'─'*50}")
                            sys.stdout.flush()
    except Exception as e:
        pass
    
    # Try reading Next.js logs
    watch_next_logs()
    
    if poll_count % 15 == 0:  # Every 30s
        print(f"[{get_ts()}] ⏳ Masih memantau... ({poll_count}s)")


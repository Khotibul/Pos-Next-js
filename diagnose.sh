#!/bin/bash
# Diagnostic script for posqupro.co-id.id 503 error
# Run this on the server via SSH to diagnose the issue

APP="/home/ucv04la6/Pos-Next-Js"
NODE="/home/ucv04la6/nodevenv/Pos-Next-Js/cpanel-runtime/22/bin/node"
NPM="/home/ucv04la6/nodevenv/Pos-Next-Js/cpanel-runtime/22/bin/npm"

echo "========================================="
echo "  DIAGNOSTIC: posqupro.co-id.id"
echo "========================================="

cd "$APP" 2>/dev/null || { echo "ERROR: App dir not found: $APP"; exit 1; }

echo ""
echo "=== 1. Node.js Version ==="
"$NODE" --version 2>&1 || echo "ERROR: Node.js not found at $NODE"

echo ""
echo "=== 2. File Check ==="
for f in server.js package.json; do
  [ -f "$f" ] && echo "  OK: $f ($(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo '?') bytes)" || echo "  MISSING: $f"
done
for d in .next .next/standalone node_modules .next/static public; do
  [ -d "$d" ] && echo "  OK: $d/" || echo "  MISSING: $d/"
done

echo ""
echo "=== 3. .env Check ==="
[ -f ".env" ] && {
  echo "  .env exists ($(wc -l < ".env") lines)"
  grep -E '^(DATABASE_URL|DIRECT_URL|HOSTNAME|NODE_ENV|AUTH_SECRET|NEXTAUTH_URL)=' ".env" 2>/dev/null | sed 's/=.*/=<set>/'
  # Check for empty critical vars
  grep -E '^DATABASE_URL=$' ".env" 2>/dev/null && echo "  WARNING: DATABASE_URL is empty!"
  grep -E '^AUTH_SECRET=$' ".env" 2>/dev/null && echo "  WARNING: AUTH_SECRET is empty!"
  grep -E '^NEXTAUTH_URL=$' ".env" 2>/dev/null && echo "  WARNING: NEXTAUTH_URL is empty!"
} || echo "  ERROR: .env NOT FOUND!"

echo ""
echo "=== 4. Prisma Client Check ==="
[ -d "node_modules/.prisma/client" ] && {
  echo "  OK: node_modules/.prisma/client exists"
  ls -la node_modules/.prisma/client/index.js 2>/dev/null || echo "  WARNING: index.js missing"
} || echo "  ERROR: node_modules/.prisma/client MISSING - run: prisma generate"

echo ""
echo "=== 5. Passenger Status ==="
[ -f "tmp/restart.txt" ] && echo "  Last restart: $(stat -c%y "tmp/restart.txt" 2>/dev/null || stat -f%m "tmp/restart.txt" 2>/dev/null || echo 'unknown')" || echo "  No restart.txt found"

echo ""
echo "=== 6. Passenger Process ==="
ps aux 2>/dev/null | grep -E 'node.*server\.js|Passenger' | grep -v grep || echo "  No Passenger/node server.js process found"
# Also check with pgrep
pgrep -a -f "server.js" 2>/dev/null || echo "  (pgrep found nothing)"

echo ""
echo "=== 7. Port 3210 Listener ==="
netstat -tlnp 2>/dev/null | grep -E ':3210|:3000' || ss -tlnp 2>/dev/null | grep -E ':3210|:3000' || echo "  No listener on port 3210/3000"

echo ""
echo "=== 8. Recent Error Logs ==="
for logfile in "logs/error.log" "stderr.log" "error.log" "passenger-error.log"; do
  if [ -f "$logfile" ]; then
    echo "  --- $logfile (last 20 lines) ---"
    tail -20 "$logfile"
    echo ""
  fi
done
# Also check cPanel passenger logs
for dir in "/home/ucv04la6/logs" "/home/ucv04la6/public_html/logs"; do
  if [ -d "$dir" ]; then
    echo "  --- Files in $dir ---"
    ls -lt "$dir"/ 2>/dev/null | head -10
  fi
done

echo ""
echo "=== 9. Git Status ==="
git log --oneline -3 2>&1
echo "  Branch: $(git branch --show-current 2>/dev/null)"
echo "  Remote: $(git remote get-url origin 2>/dev/null)"

echo ""
echo "=== 10. Disk Space ==="
df -h . 2>/dev/null || echo "  df not available"

echo ""
echo "=== 11. Test Node.js Server Directly ==="
cd "$APP"
timeout 10 "$NODE" -e "
  process.env.DATABASE_URL = process.env.DATABASE_URL || '';
  try {
    require('./.next/standalone/server.js');
    console.log('Server started OK (will timeout in 10s)');
  } catch(e) {
    console.error('Server FAILED to start:', e.message);
    console.error(e.stack);
  }
" 2>&1 || echo "  (Process exited/timeout - this is normal)"

echo ""
echo "========================================="
echo "  DIAGNOSTIC COMPLETE"
echo "========================================="
echo ""
echo "NEXT STEPS based on findings above:"
echo "  - If .env missing: Copy .env.example to .env and fill in values"
echo "  - If .prisma/client missing: run 'prisma generate'"
echo "  - If server.js missing: run deploy.sh"
echo "  - If no process listening: run 'touch tmp/restart.txt'"
echo "  - If errors in logs: fix the specific error"

#!/bin/bash
set -e

APP="/home/ucv04la6/Pos-Next-Js"
NODE="/home/ucv04la6/nodevenv/Pos-Next-Js/cpanel-runtime/22/bin/node"
NPM="/home/ucv04la6/nodevenv/Pos-Next-Js/cpanel-runtime/22/bin/npm"

echo "========================================="
echo "  DEPLOY TO CPANEL"
echo "========================================="

# 1. Navigate to app
cd "$APP"
echo "[1/8] In: $APP"

# 2. Ensure .env has required vars
grep -q '^NODE_ENV=' "$APP/.env" 2>/dev/null || echo 'NODE_ENV=production' >> "$APP/.env"
grep -q '^HOSTNAME=' "$APP/.env" 2>/dev/null || echo 'HOSTNAME=0.0.0.0' >> "$APP/.env"
echo "[2/8] .env checked"

# 3. Backup
BACKUP="/home/ucv04la6/backups/posqupro-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp -a .next "$BACKUP/" 2>/dev/null || true
cp -a server.js "$BACKUP/" 2>/dev/null || true
cp -a package.json "$BACKUP/" 2>/dev/null || true
echo "[3/8] Backup: $BACKUP"

# 4. Pull latest code
echo "[4/8] Pulling from GitHub..."
git pull origin main

# 5. Install ALL dependencies (prisma is devDependency, needed for build)
echo "[5/8] Installing dependencies (full, for build)..."
"$NPM" ci 2>&1

# 6. Load env and build
echo "[6/8] Building Next.js..."
export $(grep -E '^(DATABASE_URL|DIRECT_URL|NODE_ENV|HOSTNAME)=' "$APP/.env" | xargs)
NODE_ENV=production "$NPM" run build 2>&1

# 7. Prune dev dependencies to save disk space
echo "[7/8] Pruning dev dependencies..."
"$NPM" prune --omit=dev 2>&1 || true

# Re-run prisma generate after prune (prisma was removed by prune)
echo "  Regenerating Prisma client..."
"$NPM" exec --yes -- prisma generate --schema src/prisma/schema.prisma 2>&1

# 8. Run Prisma migration (needs DATABASE_URL + DIRECT_URL from .env)
echo "[8/8] Running database migration..."
"$NPM" exec --yes -- prisma migrate deploy --schema src/prisma/schema.prisma 2>&1

# 9. Restart Passenger
mkdir -p tmp
touch tmp/restart.txt

echo ""
echo "========================================="
echo "  DEPLOY COMPLETE"
echo "  https://posqupro.co-id.id"
echo "========================================="

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
echo "[1/6] In: $APP"

# 2. Backup
BACKUP="/home/ucv04la6/backups/posqupro-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp -a .next "$BACKUP/" 2>/dev/null || true
cp -a server.js "$BACKUP/" 2>/dev/null || true
cp -a package.json "$BACKUP/" 2>/dev/null || true
echo "[2/6] Backup: $BACKUP"

# 3. Pull latest code
echo "[3/6] Pulling from GitHub..."
git pull origin main

# 4. Generate Prisma Client (no npm install — standalone build has all deps)
echo "[4/6] Generating Prisma Client..."
"$NPM" exec --yes -- prisma generate --schema src/prisma/schema.prisma 2>&1

# 5. Run migration
echo "[5/6] Running migration..."
"$NPM" exec --yes -- prisma migrate deploy --schema src/prisma/schema.prisma 2>&1

# 6. Restart Passenger
mkdir -p tmp
touch tmp/restart.txt

echo ""
echo "========================================="
echo "  DEPLOY COMPLETE"
echo "  https://posqupro.co-id.id"
echo "========================================="

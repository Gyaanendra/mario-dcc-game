#!/bin/bash
# =============================================================================
# Mario Career Quest - Production Deployment & Update Script
# Usage on server: bash deploy_update.sh  (or ./deploy_update.sh)
# =============================================================================
set -e

echo "======================================================"
echo " MARIO CAREER QUEST — DEPLOYMENT UPDATE"
echo "======================================================"

# Determine repo directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 [1/5] Pulling latest updates from branch main..."
git fetch origin main
git checkout main
git pull origin main

echo "📦 [2/5] Building client frontend (Vite)..."
cd "$SCRIPT_DIR/client"
npm ci
npm run build

echo "⚙️ [3/5] Building server backend (TypeScript)..."
cd "$SCRIPT_DIR/server"
npm ci
npm run build

echo "🔄 [4/5] Restarting Mario systemd service..."
sudo systemctl daemon-reload
sudo systemctl restart mario
sleep 2

echo "🩺 [5/5] Checking service health..."
if curl -s http://127.0.0.1:3001/health | grep -q '"status":"ok"'; then
  echo "✅ Game Server is HEALTHY and RUNNING on port 3001!"
else
  echo "⚠️ Health check did not return ok. Recent service logs:"
  journalctl -u mario -n 25 --no-pager
  exit 1
fi

echo ""
echo "======================================================"
echo "🎉 UPDATE COMPLETE & VERIFIED!"
echo "🌐 Main:      https://mario.budcc.tech"
echo "🎮 Play:      https://mario.budcc.tech/play"
echo "🕹️ Host:      https://mario.budcc.tech/host"
echo "📽️ Projector: https://mario.budcc.tech/projector"
echo "======================================================"


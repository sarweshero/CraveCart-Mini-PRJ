#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  CraveCart — Zero-Downtime EC2 Deploy Script
#  Run this on the EC2 server for every code update.
#
#  Usage (from EC2, in the app directory):
#    cd /home/ubuntu/cravecart-backend
#    git pull origin main
#    ./deploy/deploy.sh
#
#  Or from your local machine (push-to-deploy via SSH):
#    ssh -i your-key.pem ubuntu@YOUR_EC2_IP "cd ~/cravecart-backend && git pull && ./deploy/deploy.sh"
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
IFS=$'\n\t'

APP_DIR="/home/ubuntu/cravecart-backend"
VENV_DIR="$APP_DIR/.venv"

echo "🚀 CraveCart Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "─────────────────────────────────────────────"

cd "$APP_DIR"

# ── 1. Install / update Python dependencies ───────────────────────────────────
echo "[1/6] Installing Python dependencies..."
"$VENV_DIR/bin/pip" install -q --upgrade pip
"$VENV_DIR/bin/pip" install -q -r requirements.txt

# ── 2. Run database migrations ────────────────────────────────────────────────
echo "[2/6] Running database migrations..."
"$VENV_DIR/bin/python" manage.py migrate --noinput

# ── 3. Collect static files ───────────────────────────────────────────────────
echo "[3/6] Collecting static files..."
"$VENV_DIR/bin/python" manage.py collectstatic --noinput --clear

# ── 4. Reload Gunicorn (zero-downtime — HUP sends graceful worker restart) ────
echo "[4/6] Reloading Gunicorn workers (zero-downtime)..."
sudo systemctl kill -s HUP cravecart-gunicorn
# Give workers time to drain in-flight requests
sleep 3
# Verify it's still running
if ! systemctl is-active --quiet cravecart-gunicorn; then
  echo "❌ Gunicorn failed to restart! Rolling back..."
  sudo systemctl restart cravecart-gunicorn
  exit 1
fi

# ── 5. Restart Celery workers (they don't support zero-downtime HUP) ──────────
echo "[5/6] Restarting Celery workers..."
sudo systemctl restart cravecart-celery-worker
sudo systemctl restart cravecart-celery-beat

# ── 6. Health check ───────────────────────────────────────────────────────────
echo "[6/6] Running health check..."
sleep 2
HEALTH=$(curl -sf http://127.0.0.1/health/ 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"status": *"ok"'; then
  echo "✅ Deploy successful! Health check passed."
else
  echo "⚠️  Deploy done but health check returned: $HEALTH"
  echo "   Check logs: sudo journalctl -u cravecart-gunicorn -n 50"
fi

echo "─────────────────────────────────────────────"
echo "Service status:"
echo "  Gunicorn:      $(systemctl is-active cravecart-gunicorn)"
echo "  Celery worker: $(systemctl is-active cravecart-celery-worker)"
echo "  Celery beat:   $(systemctl is-active cravecart-celery-beat)"
echo "  Nginx:         $(systemctl is-active nginx)"

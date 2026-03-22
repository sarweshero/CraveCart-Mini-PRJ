#!/usr/bin/env bash
# CraveCart deploy script — run on EC2 after git pull
set -euo pipefail

APP=/home/ubuntu/cravecart-backend
VENV=/home/ubuntu/.genv

echo "=== CraveCart Deploy $(date) ==="
cd $APP

echo "[1/4] Installing dependencies..."
$VENV/bin/pip install -q -r requirements.txt

echo "[2/4] Running migrations..."
$VENV/bin/python manage.py migrate --noinput

echo "[3/4] Collecting static files..."
$VENV/bin/python manage.py collectstatic --noinput

echo "[4/4] Restarting services..."
sudo systemctl restart cravecart-gunicorn
sudo systemctl restart cravecart-celery-worker
sudo systemctl restart cravecart-celery-beat

sleep 2
echo "=== Health check ==="
curl -s http://127.0.0.1:8000/health/ || echo "Health check failed"

echo ""
echo "=== Service status ==="
systemctl is-active cravecart-gunicorn cravecart-celery-worker cravecart-celery-beat nginx

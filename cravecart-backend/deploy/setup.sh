#!/usr/bin/env bash
# ============================================================
#  CraveCart — Fresh EC2 Setup Script
#  Run once on a clean Ubuntu 24.04 instance.
#  Usage: sudo bash deploy/setup.sh
# ============================================================
set -euo pipefail

APP_DIR="/home/ubuntu/cravecart-backend"
VENV_DIR="/home/ubuntu/.genv"

echo "╔══════════════════════════════════════╗"
echo "║   CraveCart EC2 Setup                ║"
echo "╚══════════════════════════════════════╝"

# 1. System packages
echo "[1/7] Installing system packages..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  python3.12 python3.12-venv python3-pip \
  build-essential libpq-dev \
  nginx redis-server \
  certbot python3-certbot-nginx \
  git curl ufw fail2ban

# 2. Firewall
echo "[2/7] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# 3. Redis — bind to localhost only
echo "[3/7] Securing Redis..."
sed -i 's/^bind 127.0.0.1 -::1/bind 127.0.0.1/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server

# 4. Python virtualenv (if not exists)
echo "[4/7] Setting up Python environment..."
if [ ! -d "$VENV_DIR" ]; then
  sudo -u ubuntu python3.12 -m venv "$VENV_DIR"
fi
sudo -u ubuntu "$VENV_DIR/bin/pip" install --upgrade pip wheel -q
sudo -u ubuntu "$VENV_DIR/bin/pip" install -r "$APP_DIR/requirements.txt" -q

# 5. Django setup
echo "[5/7] Setting up Django..."
cd "$APP_DIR"
sudo -u ubuntu "$VENV_DIR/bin/python" manage.py migrate --noinput
sudo -u ubuntu "$VENV_DIR/bin/python" manage.py collectstatic --noinput
sudo -u ubuntu "$VENV_DIR/bin/python" manage.py seed_data

# 6. Systemd services
echo "[6/7] Installing systemd services..."
cp "$APP_DIR/deploy/systemd/"*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable cravecart-gunicorn cravecart-celery-worker cravecart-celery-beat
systemctl start  cravecart-gunicorn cravecart-celery-worker cravecart-celery-beat

# 7. Nginx
echo "[7/7] Configuring Nginx..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/cravecart
ln -sf /etc/nginx/sites-available/cravecart /etc/nginx/sites-enabled/cravecart
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Test
echo ""
sleep 2
echo "=== Health check ==="
curl -s http://127.0.0.1:8000/health/

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Setup complete!                                     ║"
echo "║                                                      ║"
echo "║  NEXT: Get SSL certificate:                         ║"
echo "║    sudo certbot --nginx -d api.sarweshero.me        ║"
echo "║                                                      ║"
echo "║  Then test:                                          ║"
echo "║    curl https://api.sarweshero.me/health/           ║"
echo "╚══════════════════════════════════════════════════════╝"

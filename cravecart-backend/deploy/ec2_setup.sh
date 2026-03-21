#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  CraveCart — EC2 Server Bootstrap Script
#  Run this ONCE on a fresh Ubuntu 24.04 LTS EC2 instance.
#
#  Usage:
#    chmod +x ec2_setup.sh
#    sudo ./ec2_setup.sh
#
#  What it does:
#    1. Updates the OS and installs system deps
#    2. Installs Python 3.12, Nginx, Redis, Certbot
#    3. Creates the ubuntu user directory structure
#    4. Clones / copies the app
#    5. Creates the virtualenv and installs Python deps
#    6. Installs and enables systemd services
#    7. Configures Nginx
#    8. Opens EC2 security group ports (manual step reminded)
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
IFS=$'\n\t'

# Resolve script location so APP_DIR can be auto-detected reliably.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
DEFAULT_APP_DIR="$(cd -- "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"

# ── Configurable variables ────────────────────────────────────────────────────
APP_DIR="/home/ubuntu/Projects/CraveCart-Mini-PRJ/cravecart-backend"
APP_USER="ubuntu"
VENV_DIR="${VENV_DIR:-/home/$APP_USER/.genv}"
DOMAIN="api.sarweshero.me"    # ← replace with your domain BEFORE running

echo "╔══════════════════════════════════════════╗"
echo "║  CraveCart EC2 Setup — Ubuntu 24.04      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. System update ──────────────────────────────────────────────────────────
echo "[1/9] Updating system packages..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# ── 2. Install system dependencies ───────────────────────────────────────────
echo "[2/9] Installing system dependencies..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  python3.12 python3.12-dev python3.12-venv python3-pip \
  build-essential libpq-dev pkg-config libssl-dev \
  nginx redis-server \
  certbot python3-certbot-nginx \
  git curl unzip acl \
  logrotate fail2ban ufw

# ── 3. Configure firewall ─────────────────────────────────────────────────────
echo "[3/9] Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh          # port 22
ufw allow 'Nginx Full' # ports 80 + 443
ufw --force enable

# ── 4. Secure Redis (bind to localhost only) ──────────────────────────────────
echo "[4/9] Hardening Redis..."
sed -i 's/^bind 127.0.0.1 -::1/bind 127.0.0.1/' /etc/redis/redis.conf
sed -i 's/^# requirepass.*/requirepass ""/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server

# ── 5. Create runtime directories ────────────────────────────────────────────
echo "[5/9] Creating runtime directories..."
mkdir -p /run/gunicorn /run/celery /var/log/cravecart
chown ubuntu:www-data /run/gunicorn /run/celery
chmod 770 /run/gunicorn /run/celery
chown ubuntu:ubuntu /var/log/cravecart

# Add ubuntu user to www-data group so Nginx can read socket
usermod -aG www-data ubuntu

# ── 6. Virtualenv and Python dependencies ────────────────────────────────────
echo "[6/9] Setting up Python virtualenv..."
if [ ! -d "$VENV_DIR" ]; then
  sudo -u "$APP_USER" python3.12 -m venv "$VENV_DIR"
fi

if [ ! -f "$APP_DIR/requirements.txt" ]; then
  echo "ERROR: requirements.txt not found at '$APP_DIR/requirements.txt'"
  echo "Hint: run this script from the repository's deploy directory or set APP_DIR explicitly."
  exit 1
fi

sudo -u "$APP_USER" "$VENV_DIR/bin/pip" install --upgrade pip wheel
sudo -u "$APP_USER" "$VENV_DIR/bin/pip" install -r "$APP_DIR/requirements.txt"

# ── 7. Django setup ───────────────────────────────────────────────────────────
echo "[7/9] Running Django migrations and collectstatic..."
cd "$APP_DIR"
sudo -u "$APP_USER" "$VENV_DIR/bin/python" manage.py migrate --noinput
sudo -u "$APP_USER" "$VENV_DIR/bin/python" manage.py collectstatic --noinput
sudo -u "$APP_USER" "$VENV_DIR/bin/python" manage.py seed_data

# ── 8. Install systemd services ───────────────────────────────────────────────
echo "[8/9] Installing systemd services..."
cp "$APP_DIR/deploy/systemd/cravecart-gunicorn.service"      /etc/systemd/system/
cp "$APP_DIR/deploy/systemd/cravecart-gunicorn.socket"       /etc/systemd/system/
cp "$APP_DIR/deploy/systemd/cravecart-celery-worker.service" /etc/systemd/system/
cp "$APP_DIR/deploy/systemd/cravecart-celery-beat.service"   /etc/systemd/system/

systemctl daemon-reload
systemctl enable  cravecart-gunicorn.socket
systemctl start   cravecart-gunicorn.socket
systemctl enable  cravecart-gunicorn
systemctl start   cravecart-gunicorn
systemctl enable  cravecart-celery-worker
systemctl start   cravecart-celery-worker
systemctl enable  cravecart-celery-beat
systemctl start   cravecart-celery-beat

# ── 9. Nginx configuration ────────────────────────────────────────────────────
echo "[9/9] Configuring Nginx..."
cp "$APP_DIR/deploy/nginx.conf"    /etc/nginx/sites-available/cravecart
cp "$APP_DIR/deploy/proxy_params"  /etc/nginx/proxy_params

# Enable site (remove default if present)
ln -sf /etc/nginx/sites-available/cravecart /etc/nginx/sites-enabled/cravecart
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  Setup complete!                                                     ║"
echo "║                                                                      ║"
echo "║  NEXT STEPS:                                                         ║"
echo "║  1. Point $DOMAIN DNS A-record to this EC2 Elastic IP    ║"
echo "║  2. Run SSL cert: sudo certbot --nginx -d $DOMAIN         ║"
echo "║  3. Update ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS in .env            ║"
echo "║  4. EC2 Security Group: ensure ports 22, 80, 443 are open            ║"
echo "║  5. Check services:                                                  ║"
echo "║       sudo systemctl status cravecart-gunicorn                       ║"
echo "║       sudo systemctl status cravecart-celery-worker                  ║"
echo "║       curl http://localhost/health/                                  ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"

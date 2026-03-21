# CraveCart — Production Deployment Guide
### Stack: AWS EC2 (Backend) + Vercel (Frontend)

```
cravecart.vercel.app         ─── customer-app  (Vercel)
hotel-cravecart.vercel.app   ─── hotel-app     (Vercel)
api.cravecart.app            ─── EC2 (Nginx → Gunicorn → Django)
                                  └─ Redis (local)
db.xxx.supabase.co           ─── Supabase Postgres
vjrfme...storage.supabase.co ─── Supabase S3 Storage
```

---

## Part 1 — Backend on AWS EC2

### 1.1 Launch EC2 Instance

| Setting | Value |
|---------|-------|
| AMI | Ubuntu Server 24.04 LTS (64-bit x86) |
| Instance type | **t3.small** minimum; **t3.medium** recommended |
| Storage | 20 GB gp3 SSD |
| Security Group | Inbound: SSH (22), HTTP (80), HTTPS (443) |
| Key pair | Create and download a `.pem` key |
| Elastic IP | Allocate one and associate it to the instance |

### 1.2 Connect and deploy

```bash
# Copy project to EC2
scp -i your-key.pem -r ./cravecart-backend ubuntu@YOUR_EC2_IP:~/

# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Configure environment (fill in all values)
cd ~/cravecart-backend
cp .env .env.backup   # already configured for EC2
nano .env             # set ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS to your domain

# Run one-time server bootstrap (~3 minutes)
chmod +x deploy/ec2_setup.sh
sudo ./deploy/ec2_setup.sh
```

### 1.3 Configure DNS

In your DNS provider (Route 53 / Cloudflare / GoDaddy):

| Record | Type | Value |
|--------|------|-------|
| `api.cravecart.app` | A | Your EC2 Elastic IP |

Wait for DNS propagation (~5 minutes), then:

```bash
# Issue SSL certificate (free via Let's Encrypt)
sudo certbot --nginx -d api.cravecart.app

# Nginx will auto-configure SSL and reload
# Certificate auto-renews every 90 days via a cron job Certbot installs
```

### 1.4 Update .env with final domain

```bash
nano ~/cravecart-backend/.env

# Update these two lines:
ALLOWED_HOSTS=api.cravecart.app,YOUR_EC2_IP,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://cravecart.vercel.app,https://hotel-cravecart.vercel.app
```

Then reload:
```bash
sudo systemctl reload cravecart-gunicorn
```

### 1.5 Verify services

```bash
# All should show "active (running)"
sudo systemctl status cravecart-gunicorn
sudo systemctl status cravecart-celery-worker
sudo systemctl status cravecart-celery-beat
sudo systemctl status nginx
sudo systemctl status redis

# Health check
curl https://api.cravecart.app/health/
# → {"status": "ok", "db": true}

# Test API
curl https://api.cravecart.app/api/restaurants/
```

### 1.6 All future deploys

```bash
# On EC2 — after git pull
cd ~/cravecart-backend
git pull origin main
./deploy/deploy.sh

# Or from your laptop
ssh -i your-key.pem ubuntu@YOUR_EC2_IP \
  "cd ~/cravecart-backend && git pull origin main && ./deploy/deploy.sh"
```

### 1.7 Useful commands

```bash
# View live logs
sudo journalctl -u cravecart-gunicorn    -f
sudo journalctl -u cravecart-celery-worker -f
sudo journalctl -u cravecart-celery-beat   -f
sudo tail -f /var/log/nginx/cravecart-error.log

# Restart individual services
sudo systemctl restart cravecart-gunicorn
sudo systemctl restart cravecart-celery-worker

# Django management
cd ~/cravecart-backend
.venv/bin/python manage.py createsuperuser
.venv/bin/python manage.py shell
```

---

## Part 2 — Frontend on Vercel

### 2.1 Import projects

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the **customer-app** folder as one project
3. Import the **hotel-app** folder as a second project

Vercel auto-detects Next.js — no framework configuration needed.

### 2.2 Set environment variables

For **both** projects, add in Vercel dashboard → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_MODE` | `live` |
| `NEXT_PUBLIC_API_URL` | `https://api.cravecart.app` |
| `NEXT_PUBLIC_APP_URL` | *(your Vercel URL)* |

For **customer-app** only:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | `313712863940-67sfpli7k0dt1esf4t6963eb131iste7.apps.googleusercontent.com` |

### 2.3 Custom domains (optional)

In Vercel dashboard → Project → Settings → Domains:
- customer-app → `cravecart.app`
- hotel-app → `hotel.cravecart.app`

Add CNAME records in DNS pointing to `cname.vercel-dns.com`.

### 2.4 Redeploy after backend domain is set

Once your EC2 `api.cravecart.app` is live:
```bash
# Trigger redeploy with updated env vars
vercel --prod  # or just push to main branch
```

### 2.5 Update CORS on EC2 backend

After your Vercel deployment URLs are known:
```bash
# SSH into EC2
nano ~/cravecart-backend/.env

# Update to final Vercel URLs:
CORS_ALLOWED_ORIGINS=https://cravecart.app,https://hotel.cravecart.app,https://cravecart.vercel.app,https://hotel-cravecart.vercel.app

sudo systemctl reload cravecart-gunicorn
```

---

## Part 3 — Google OAuth Setup

Add these redirect URIs in [Google Cloud Console](https://console.cloud.google.com) →
APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs:

```
https://api.cravecart.app/accounts/google/login/callback/
http://localhost:8000/accounts/google/login/callback/
```

Add these to Authorized JavaScript origins:
```
https://cravecart.app
https://hotel.cravecart.app
http://localhost:3000
http://localhost:3001
```

---

## Part 4 — Gmail SMTP Setup

The platform sends AI-response emails via Gmail SMTP.

1. Sign in to the Gmail account you want to send from
2. Enable **2-Step Verification** (required for App Passwords)
3. Google Account → Security → **App passwords** → Generate for "CraveCart"
4. Copy the 16-character password
5. Update on EC2: `nano ~/cravecart-backend/.env`
   ```
   EMAIL_HOST_USER=your-gmail@gmail.com
   EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
   ```
6. `sudo systemctl reload cravecart-gunicorn`

---

## Part 5 — First Deploy Checklist

### EC2 Backend
- [ ] EC2 instance launched (t3.medium recommended)
- [ ] Elastic IP associated
- [ ] Security Group: ports 22, 80, 443 open
- [ ] `ec2_setup.sh` ran successfully
- [ ] `.env` updated with real domain and email password
- [ ] DNS A-record `api.cravecart.app` → EC2 Elastic IP
- [ ] `sudo certbot --nginx -d api.cravecart.app` succeeded
- [ ] `curl https://api.cravecart.app/health/` returns `{"status":"ok","db":true}`
- [ ] `python manage.py createsuperuser` done
- [ ] Login with demo credentials works
- [ ] Submit test review → AI response email received

### Vercel Frontend
- [ ] customer-app deployed to Vercel
- [ ] hotel-app deployed to Vercel
- [ ] Environment variables set in both dashboards
- [ ] Custom domains configured (optional)
- [ ] CORS_ALLOWED_ORIGINS on EC2 updated with Vercel URLs
- [ ] Login flow works end-to-end

---

## EC2 File Structure

```
/home/ubuntu/cravecart-backend/
├── .env                     ← environment variables (chmod 600)
├── .venv/                   ← Python virtualenv
├── gunicorn.conf.py         ← Gunicorn config (Unix socket)
├── deploy/
│   ├── ec2_setup.sh         ← one-time server bootstrap
│   ├── deploy.sh            ← zero-downtime deploy
│   ├── nginx.conf           ← copied to /etc/nginx/sites-available/cravecart
│   ├── proxy_params         ← copied to /etc/nginx/proxy_params
│   ├── logrotate.conf       ← copied to /etc/logrotate.d/cravecart
│   ├── fail2ban-cravecart.conf  ← brute-force protection
│   └── systemd/
│       ├── cravecart-gunicorn.service
│       ├── cravecart-gunicorn.socket
│       ├── cravecart-celery-worker.service
│       └── cravecart-celery-beat.service

/etc/nginx/sites-enabled/cravecart → ../sites-available/cravecart
/run/gunicorn/cravecart.sock       ← Unix socket (Nginx ↔ Gunicorn)
/var/log/cravecart/                ← Celery logs
```

"""
gunicorn.conf.py — AWS EC2 Production Configuration
Gunicorn binds to a Unix socket so Nginx can communicate without
the overhead of TCP loopback. Nginx reads from the socket and
handles SSL, compression, and static file serving.

Socket path: /run/gunicorn/cravecart.sock
             (created by the cravecart-gunicorn.service unit)
"""
import os
import multiprocessing

# ── Binding ───────────────────────────────────────────────────────────────────
# Unix socket: faster than TCP loopback, no port conflicts
bind = "unix:/run/gunicorn/cravecart.sock"

# ── Workers ───────────────────────────────────────────────────────────────────
# Formula: 2 × vCPU + 1
# t3.small/medium (2 vCPU)  → 5 workers
# t3.large/xlarge (2/4 vCPU) → 5–9 workers
workers     = int(os.environ.get("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
worker_class = "gthread"
threads     = 2           # threads per worker (handles concurrent I/O within one worker)
worker_connections = 1000

# ── Timeouts ──────────────────────────────────────────────────────────────────
timeout          = 30   # Gemini/Celery calls happen async — no sync long-poll needed
graceful_timeout = 30   # seconds for in-flight requests during reload
keepalive        = 75   # match Nginx keepalive_timeout

# ── Lifecycle ─────────────────────────────────────────────────────────────────
max_requests        = 1000  # recycle worker after N requests (prevents memory leaks)
max_requests_jitter = 100   # randomise so all workers don't recycle simultaneously
preload_app         = True  # load Django app once in master → fork to workers (saves RAM)

# ── Logging ───────────────────────────────────────────────────────────────────
# Logs are captured by systemd journal on EC2
# View with: sudo journalctl -u cravecart-gunicorn -f
accesslog   = "-"
errorlog    = "-"
loglevel    = "info"
access_log_format = (
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s '
    '"%(f)s" "%(a)s" %(D)sµs'
)

# ── Process ───────────────────────────────────────────────────────────────────
proc_name = "cravecart-api"
user      = "ubuntu"
group     = "www-data"

# ── Hooks ─────────────────────────────────────────────────────────────────────
def post_fork(server, worker):
    """Discard any DB / Redis connections inherited from the master process."""
    from django.db import connections
    for conn in connections.all():
        conn.close()

def worker_abort(worker):
    """Log worker abort for debugging."""
    import logging
    logging.getLogger("gunicorn.error").error(
        f"Worker {worker.pid} aborted — investigate for possible timeout or OOM."
    )

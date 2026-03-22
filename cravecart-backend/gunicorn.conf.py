import os, multiprocessing
bind         = f"127.0.0.1:{os.environ.get('PORT', '8000')}"
workers      = int(os.environ.get("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
worker_class = "sync"
timeout      = 30
keepalive    = 5
max_requests = 1000
max_requests_jitter = 100
preload_app  = True
accesslog    = "-"
errorlog     = "-"
loglevel     = "info"
proc_name    = "cravecart"

def post_fork(server, worker):
    from django.db import connections
    for conn in connections.all():
        conn.close()

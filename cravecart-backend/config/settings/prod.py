"""
CraveCart — Production Settings (AWS EC2 + Nginx)
Nginx terminates SSL and forwards to Gunicorn via Unix socket.
"""
from .base import *  # noqa: F401, F403
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration

# ── Core ──────────────────────────────────────────────────────────────────────
DEBUG = False

# ── Database — Supabase via PgBouncer ────────────────────────────────────────
# Port 6543 = PgBouncer transaction mode (connection pooling)
DATABASES["default"]["CONN_MAX_AGE"]      = 600   # keep connection alive 10 min
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True  # discard broken connections
DATABASES["default"]["OPTIONS"] = {
    "sslmode":         "require",
    "connect_timeout": 10,
    "options":         "-c statement_timeout=30000",  # 30s query limit
}

# ── Security ──────────────────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER      = True
SECURE_CONTENT_TYPE_NOSNIFF    = True
X_FRAME_OPTIONS                = "DENY"
REFERRER_POLICY                = "strict-origin-when-cross-origin"

SECURE_HSTS_SECONDS            = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD            = True

# EC2 sits behind Nginx which terminates TLS.
# Nginx sets X-Forwarded-Proto: https — Django reads this to know the
# original request was HTTPS and avoids an infinite redirect loop.
SECURE_PROXY_SSL_HEADER        = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT            = True

SESSION_COOKIE_SECURE          = True
SESSION_COOKIE_HTTPONLY        = True
SESSION_COOKIE_SAMESITE        = "Lax"
CSRF_COOKIE_SECURE             = True
CSRF_COOKIE_HTTPONLY           = True
CSRF_COOKIE_SAMESITE           = "Strict"

# ── Supabase S3 Storage ───────────────────────────────────────────────────────
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        # Whitenoise serves static files directly from Nginx-mounted path
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
AWS_ACCESS_KEY_ID        = env("SUPABASE_S3_KEY_ID")
AWS_SECRET_ACCESS_KEY    = env("SUPABASE_S3_SECRET")
AWS_STORAGE_BUCKET_NAME  = env("SUPABASE_STORAGE_BUCKET")
AWS_S3_ENDPOINT_URL      = env("SUPABASE_S3_ENDPOINT")
AWS_S3_CUSTOM_DOMAIN     = env("SUPABASE_S3_CUSTOM_DOMAIN", default="")
AWS_QUERYSTRING_AUTH     = False
AWS_S3_FILE_OVERWRITE    = False
AWS_DEFAULT_ACL          = "public-read"
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

# ── Cache — Redis running on EC2 locally ─────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND":  "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_CACHE_URL", default="redis://127.0.0.1:6379/1"),
        "OPTIONS": {
            # Use redis-py option names expected by Django's built-in Redis cache backend.
            "socket_connect_timeout": 5,
            "socket_timeout": 5,
        },
        "TIMEOUT": 600,
    }
}

# ── Celery — production hardening ─────────────────────────────────────────────
CELERY_WORKER_MAX_TASKS_PER_CHILD = 200
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_ALWAYS_EAGER          = False
CELERY_TASK_ACKS_LATE             = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True

# ── DRF — tighter throttles ───────────────────────────────────────────────────
REST_FRAMEWORK.update({  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon":          "60/hour",
        "user":          "1000/hour",
        "login":         "5/min",
        "review_submit": "3/hour",
    },
    # Remove BrowsableAPI renderer in production
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
})

# ── Sentry ────────────────────────────────────────────────────────────────────
_sentry_dsn = env("SENTRY_DSN", default="")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[
            DjangoIntegration(transaction_style="url"),
            CeleryIntegration(monitor_beat_tasks=True),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.05,
        send_default_pii=False,
        environment="production",
    )

# ── Logging — structured for EC2 journal / CloudWatch ────────────────────────
LOGGING = {
    "version":                  1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format":  "[{asctime}] {levelname} {name}: {message}",
            "style":   "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class":     "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django":          {"handlers": ["console"], "level": "WARNING",  "propagate": False},
        "django.request":  {"handlers": ["console"], "level": "ERROR",    "propagate": False},
        "django.security": {"handlers": ["console"], "level": "ERROR",    "propagate": False},
        "apps":            {"handlers": ["console"], "level": "INFO",     "propagate": False},
        "celery":          {"handlers": ["console"], "level": "INFO",     "propagate": False},
        "gunicorn.error":  {"handlers": ["console"], "level": "INFO",     "propagate": False},
        "gunicorn.access": {"handlers": ["console"], "level": "INFO",     "propagate": False},
    },
}
